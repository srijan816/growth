#!/usr/bin/env python3
"""
Comprehensive Student Feedback Analysis Script
Extracts student names, tracks progression, and analyzes course structures
"""

import os
import re
from collections import defaultdict, Counter
from docx import Document
import json
from pathlib import Path

class FeedbackAnalyzer:
    def __init__(self, data_path):
        self.data_path = Path(data_path)
        self.students = set()
        self.course_mapping = defaultdict(dict)
        self.student_progression = defaultdict(list)
        self.course_codes = set()
        self.feedback_texts = defaultdict(dict)
        
    def extract_course_info(self, folder_path):
        """Extract course code and schedule from folder name"""
        folder_name = folder_path.name
        
        # Pattern to match: Day - Time - CourseCode - Level
        pattern = r'(\w+)\s*-\s*([\d\s\.\-:]+)\s*-\s*([A-Z0-9]+)\s*-\s*(.*)'
        match = re.search(pattern, folder_name)
        
        if match:
            day = match.group(1).strip()
            time = match.group(2).strip()
            course_code = match.group(3).strip()
            level = match.group(4).strip()
            
            return {
                'day': day,
                'time': time,
                'course_code': course_code,
                'level': level,
                'full_schedule': f"{day} {time}"
            }
        return None
    
    def read_docx_content(self, file_path):
        """Read content from a .docx file"""
        try:
            doc = Document(file_path)
            content = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    content.append(paragraph.text.strip())
            return '\n'.join(content)
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return ""
    
    def extract_student_names_from_content(self, content):
        """Extract potential student names from feedback content"""
        names = []
        
        # Look for patterns like "Student: Name" or "Name:" at start of lines
        patterns = [
            r'Student:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*):\s*',
            r'Name:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*-\s*Unit',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            for match in matches:
                if len(match.split()) <= 3:  # Reasonable name length
                    names.append(match.strip())
        
        return names
    
    def analyze_folder(self, folder_path, course_info):
        """Analyze a course folder and extract student data"""
        if not folder_path.is_dir():
            return
            
        print(f"Analyzing: {folder_path.name}")
        
        # Look for unit folders
        unit_folders = [f for f in folder_path.iterdir() if f.is_dir() and 
                       (f.name.startswith(('1.', '2.', '3.', '4.', 'Unit')) or 
                        re.match(r'^\d+\.\d+$', f.name))]
        
        for unit_folder in sorted(unit_folders):
            unit_name = unit_folder.name
            
            # Look for individual student files
            student_files = [f for f in unit_folder.iterdir() if f.suffix == '.docx']
            
            for student_file in student_files:
                filename = student_file.stem
                
                # Extract student name from filename
                if ' - ' in filename:
                    potential_name = filename.split(' - ')[0].strip()
                elif filename.endswith('Feedback') or filename.endswith('Sheet'):
                    potential_name = filename.replace('Feedback', '').replace('Sheet', '').replace('Primary', '').strip()
                    potential_name = re.sub(r'\s*-\s*Unit.*', '', potential_name).strip()
                else:
                    potential_name = filename
                
                # Clean up the name
                potential_name = re.sub(r'^\d+\.\d+\s*-?\s*', '', potential_name)  # Remove unit numbers
                potential_name = potential_name.strip()
                
                if potential_name and not potential_name.isdigit() and len(potential_name) > 1:
                    # Read the content
                    content = self.read_docx_content(student_file)
                    
                    # Store student info
                    if potential_name not in ['Copy of', 'Unit']:
                        self.students.add(potential_name)
                        
                        student_key = f"{potential_name}_{course_info['course_code']}"
                        
                        self.course_mapping[potential_name].update({
                            'course_code': course_info['course_code'],
                            'schedule': course_info['full_schedule'],
                            'level': course_info['level']
                        })
                        
                        self.student_progression[student_key].append({
                            'unit': unit_name,
                            'content': content,
                            'file_path': str(student_file)
                        })
                        
                        self.feedback_texts[student_key][unit_name] = content
        
        # Also look for group feedback files in unit folders
        for unit_folder in unit_folders:
            group_files = [f for f in unit_folder.iterdir() if f.suffix == '.docx' and 
                          not any(name in f.stem for name in ['Copy of', 'Unit'] if name)]
            
            for group_file in group_files:
                content = self.read_docx_content(group_file)
                
                # Extract names from group feedback
                extracted_names = self.extract_student_names_from_content(content)
                for name in extracted_names:
                    self.students.add(name)
                    self.course_mapping[name].update({
                        'course_code': course_info['course_code'],
                        'schedule': course_info['full_schedule'],
                        'level': course_info['level']
                    })
    
    def run_analysis(self):
        """Main analysis function"""
        print("Starting comprehensive feedback analysis...")
        
        # Analyze primary courses
        primary_path = self.data_path / 'primary'
        if primary_path.exists():
            for course_folder in primary_path.iterdir():
                if course_folder.is_dir() and ' - ' in course_folder.name:
                    course_info = self.extract_course_info(course_folder)
                    if course_info:
                        self.course_codes.add(course_info['course_code'])
                        self.analyze_folder(course_folder, course_info)
        
        # Analyze secondary courses
        secondary_path = self.data_path / 'secondary'
        if secondary_path.exists():
            for course_folder in secondary_path.iterdir():
                if course_folder.is_dir() and ' - ' in course_folder.name:
                    course_info = self.extract_course_info(course_folder)
                    if course_info:
                        self.course_codes.add(course_info['course_code'])
                        self.analyze_folder(course_folder, course_info)
    
    def generate_student_progression_analysis(self, student_name, course_code, max_students=3):
        """Generate detailed progression analysis for specific students"""
        student_key = f"{student_name}_{course_code}"
        
        if student_key not in self.student_progression:
            return None
        
        progression = self.student_progression[student_key]
        progression = sorted(progression, key=lambda x: x['unit'])
        
        analysis = {
            'student': student_name,
            'course_code': course_code,
            'total_units': len(progression),
            'progression': []
        }
        
        for entry in progression:
            unit_analysis = {
                'unit': entry['unit'],
                'content_length': len(entry['content']),
                'key_quotes': [],
                'themes': []
            }
            
            # Extract key quotes (first few sentences)
            sentences = entry['content'].split('.')[:3]
            unit_analysis['key_quotes'] = [s.strip() + '.' for s in sentences if s.strip()]
            
            # Look for common themes
            content_lower = entry['content'].lower()
            themes = []
            if 'confidence' in content_lower:
                themes.append('confidence')
            if 'participation' in content_lower:
                themes.append('participation')
            if 'improvement' in content_lower or 'better' in content_lower:
                themes.append('improvement')
            if 'challenge' in content_lower or 'difficult' in content_lower:
                themes.append('challenges')
            
            unit_analysis['themes'] = themes
            analysis['progression'].append(unit_analysis)
        
        return analysis
    
    def print_comprehensive_report(self):
        """Print a comprehensive analysis report"""
        print("\n" + "="*80)
        print("COMPREHENSIVE STUDENT FEEDBACK ANALYSIS REPORT")
        print("="*80)
        
        print(f"\n1. OVERVIEW")
        print(f"   Total unique students found: {len(self.students)}")
        print(f"   Total course codes: {len(self.course_codes)}")
        print(f"   Course codes: {sorted(self.course_codes)}")
        
        # Course-Student mapping
        print(f"\n2. COURSE-STUDENT MAPPING")
        course_students = defaultdict(list)
        for student, info in self.course_mapping.items():
            if 'course_code' in info:
                course_students[info['course_code']].append({
                    'name': student,
                    'schedule': info.get('schedule', 'Unknown'),
                    'level': info.get('level', 'Unknown')
                })
        
        for course_code, students in sorted(course_students.items()):
            print(f"\n   Course: {course_code}")
            if students:
                schedule = students[0]['schedule']
                level = students[0]['level']
                print(f"   Schedule: {schedule}")
                print(f"   Level: {level}")
                print(f"   Students ({len(students)}):")
                for student in sorted(students, key=lambda x: x['name']):
                    print(f"     - {student['name']}")
        
        # Student progression analysis for selected students
        print(f"\n3. DETAILED STUDENT PROGRESSION ANALYSIS")
        
        # Find students with the most units for detailed analysis
        progression_counts = [(key, len(units)) for key, units in self.student_progression.items()]
        progression_counts.sort(key=lambda x: x[1], reverse=True)
        
        analyzed_count = 0
        for student_key, unit_count in progression_counts[:5]:  # Top 5 students with most data
            if analyzed_count >= 3:  # Limit to 3 detailed analyses
                break
                
            student_name, course_code = student_key.rsplit('_', 1)
            analysis = self.generate_student_progression_analysis(student_name, course_code)
            
            if analysis and analysis['total_units'] >= 3:  # Only analyze students with 3+ units
                print(f"\n   Student: {analysis['student']}")
                print(f"   Course: {analysis['course_code']}")
                print(f"   Total Units: {analysis['total_units']}")
                print(f"   Progression Timeline:")
                
                for prog in analysis['progression'][:6]:  # Show first 6 units
                    print(f"     Unit {prog['unit']}:")
                    print(f"       Content length: {prog['content_length']} characters")
                    if prog['key_quotes']:
                        print(f"       Key feedback: {prog['key_quotes'][0][:100]}...")
                    if prog['themes']:
                        print(f"       Themes: {', '.join(prog['themes'])}")
                
                analyzed_count += 1
        
        # Summary statistics
        print(f"\n4. STATISTICAL SUMMARY")
        all_students = list(self.students)
        print(f"   Students by first letter:")
        letter_count = Counter(name[0] for name in all_students if name)
        for letter, count in sorted(letter_count.items()):
            print(f"     {letter}: {count}")
        
        print(f"\n   Students with progression data: {len(self.student_progression)}")
        
        unit_counts = [len(units) for units in self.student_progression.values()]
        if unit_counts:
            print(f"   Average units per student: {sum(unit_counts)/len(unit_counts):.1f}")
            print(f"   Max units for one student: {max(unit_counts)}")
            print(f"   Min units for one student: {min(unit_counts)}")
        
        return {
            'total_students': len(self.students),
            'course_codes': sorted(self.course_codes),
            'course_student_mapping': dict(course_students),
            'progression_data': len(self.student_progression)
        }

def main():
    data_path = "/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/data"
    analyzer = FeedbackAnalyzer(data_path)
    analyzer.run_analysis()
    results = analyzer.print_comprehensive_report()
    
    # Save detailed results to JSON
    output_file = "/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/feedback_analysis_results.json"
    with open(output_file, 'w') as f:
        json.dump({
            'students': sorted(list(analyzer.students)),
            'course_mapping': dict(analyzer.course_mapping),
            'course_codes': sorted(list(analyzer.course_codes)),
            'student_progression_summary': {k: len(v) for k, v in analyzer.student_progression.items()}
        }, f, indent=2)
    
    print(f"\nDetailed results saved to: {output_file}")

if __name__ == "__main__":
    main()