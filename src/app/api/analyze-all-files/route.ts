import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

interface FileAnalysis {
  filePath: string;
  fileName: string;
  fileSize: number;
  folderPath: string;
  feedbackType: 'primary' | 'secondary' | 'unknown';
  unitNumber: string;
  lessonNumber: string;
  classCode: string;
  students: string[];
  contentPreview: string;
  errors: string[];
  processed: boolean;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Starting comprehensive analysis of ALL docx files...');
    
    const dataPath = path.join(process.cwd(), 'data');
    const allFiles: FileAnalysis[] = [];
    
    // Recursively find ALL .docx files
    const findAllDocxFiles = (dir: string): string[] => {
      const files: string[] = [];
      
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            files.push(...findAllDocxFiles(fullPath));
          } else if (item.toLowerCase().endsWith('.docx') && !item.startsWith('~$')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
      }
      
      return files;
    };
    
    console.log('Scanning for all .docx files...');
    const allDocxFiles = findAllDocxFiles(dataPath);
    console.log(`Found ${allDocxFiles.length} .docx files total`);
    
    // Analyze each file
    for (const filePath of allDocxFiles) {
      const fileName = path.basename(filePath);
      const folderPath = path.dirname(filePath);
      const relativePath = path.relative(dataPath, filePath);
      
      console.log(`Analyzing: ${relativePath}`);
      
      const analysis: FileAnalysis = {
        filePath: relativePath,
        fileName,
        fileSize: 0,
        folderPath: path.relative(dataPath, folderPath),
        feedbackType: 'unknown',
        unitNumber: '',
        lessonNumber: '',
        classCode: '',
        students: [],
        contentPreview: '',
        errors: [],
        processed: false
      };
      
      try {
        // Get file size
        const stats = fs.statSync(filePath);
        analysis.fileSize = stats.size;
        
        // Determine feedback type from path
        if (filePath.includes('/primary/')) {
          analysis.feedbackType = 'primary';
        } else if (filePath.includes('/secondary/')) {
          analysis.feedbackType = 'secondary';
        }
        
        // Extract class code from path
        const pathParts = filePath.split(path.sep);
        for (const part of pathParts) {
          const match = part.match(/(\d{2}[A-Z]{5}\d{4})/);
          if (match) {
            analysis.classCode = match[1];
            break;
          }
        }
        
        // Extract unit/lesson from filename or folder
        const fileMatch = fileName.match(/(\d+\.\d+)/);
        if (fileMatch) {
          analysis.lessonNumber = fileMatch[1];
          analysis.unitNumber = fileMatch[1].split('.')[0];
        } else {
          // Check folder names
          for (const part of pathParts.reverse()) {
            const unitMatch = part.match(/Unit\s+(\d+)/i);
            if (unitMatch) {
              analysis.unitNumber = unitMatch[1];
              break;
            }
            const lessonMatch = part.match(/(\d+\.\d+)/);
            if (lessonMatch) {
              analysis.lessonNumber = lessonMatch[1];
              analysis.unitNumber = lessonMatch[1].split('.')[0];
              break;
            }
          }
        }
        
        // Extract content
        const result = await mammoth.extractRawText({path: filePath});
        const content = result.value;
        analysis.contentPreview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
        
        // Try multiple methods to extract student names
        const students = new Set<string>();
        
        // Method 1: Split by "Student:" or "Student Name:"
        const primaryDelimiter = 'Student:';
        const secondaryDelimiter = 'Student Name:';
        
        if (content.includes(primaryDelimiter)) {
          const sections = content.split(primaryDelimiter);
          for (let i = 1; i < sections.length; i++) {
            const studentName = extractStudentName(sections[i]);
            if (studentName) students.add(studentName);
          }
        }
        
        if (content.includes(secondaryDelimiter)) {
          const sections = content.split(secondaryDelimiter);
          for (let i = 1; i < sections.length; i++) {
            const studentName = extractStudentName(sections[i]);
            if (studentName) students.add(studentName);
          }
        }
        
        // Method 2: Check if filename contains student name (individual files)
        const fileNameStudentMatch = fileName.match(/^([A-Za-z\s]+) - (Unit )?[\d\.]+/i);
        if (fileNameStudentMatch) {
          students.add(fileNameStudentMatch[1].trim());
        }
        
        // Method 3: Look for any names in the content (fallback)
        if (students.size === 0) {
          // Try to find lines that might be student names
          const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          for (let i = 0; i < Math.min(lines.length, 20); i++) {
            const line = lines[i];
            // Skip common headers/footers
            if (line.match(/^[A-Z][a-z]+\s+[A-Z][a-z]*$/) && 
                !line.match(/^(Motion|Topic|Class|Unit|Student|Name|Feedback|Teacher|Comments|Date|Time)$/i)) {
              students.add(line);
            }
          }
        }
        
        analysis.students = Array.from(students);
        analysis.processed = true;
        
      } catch (error) {
        analysis.errors.push(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error processing ${relativePath}:`, error);
      }
      
      allFiles.push(analysis);
    }
    
    // Generate summary statistics
    const summary = {
      totalFiles: allFiles.length,
      processedFiles: allFiles.filter(f => f.processed).length,
      errorFiles: allFiles.filter(f => f.errors.length > 0).length,
      primaryFiles: allFiles.filter(f => f.feedbackType === 'primary').length,
      secondaryFiles: allFiles.filter(f => f.feedbackType === 'secondary').length,
      unknownTypeFiles: allFiles.filter(f => f.feedbackType === 'unknown').length,
      totalStudentsFound: [...new Set(allFiles.flatMap(f => f.students))].length,
      filesWithNoStudents: allFiles.filter(f => f.students.length === 0).length
    };
    
    // Find all unique students
    const allStudents = [...new Set(allFiles.flatMap(f => f.students))].sort();
    
    // Group files by whether they have students or not
    const filesWithStudents = allFiles.filter(f => f.students.length > 0);
    const filesWithoutStudents = allFiles.filter(f => f.students.length === 0);
    
    console.log('Analysis complete:', summary);
    
    return NextResponse.json({
      summary,
      allStudents,
      allFiles,
      filesWithStudents,
      filesWithoutStudents,
      sampleStudentsByFile: filesWithStudents.slice(0, 10).map(f => ({
        file: f.fileName,
        path: f.filePath,
        students: f.students,
        type: f.feedbackType
      }))
    });

  } catch (error) {
    console.error('Error in comprehensive analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze files', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}

function extractStudentName(section: string): string | null {
  const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) return null;
  
  let studentName = lines[0];
  
  // Clean up student name
  if (studentName) {
    studentName = studentName
      .replace(/^(Student|Name|Student Name):\s*/i, '')
      .replace(/[^\w\s\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Handle names with dashes
    const nameParts = studentName.split(/\s*[-–—]\s*/);
    if (nameParts.length > 1) {
      const firstPart = nameParts[0].trim();
      if (firstPart.length > 1 && /^[A-Za-z\s]+$/.test(firstPart)) {
        studentName = firstPart;
      }
    }
    
    // Remove trailing text
    studentName = studentName.replace(/\s+(Unit|Feedback|Class|Topic|Motion).*$/i, '').trim();
  }
  
  return studentName && studentName.length > 1 ? studentName : null;
}