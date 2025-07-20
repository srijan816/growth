# Feedback Extraction Documentation

This document explains how feedback is extracted from Word documents for both secondary and primary students in the Capstone Evolve platform.

## Overview

The feedback extraction system processes Word documents containing instructor feedback and converts them into structured data stored in the PostgreSQL database. The system handles two distinct formats:

1. **Secondary Students (Grade 7-12)**: Rubric-based scoring system with 8 criteria
2. **Primary Students (Grade 2-6)**: Qualitative feedback with "What was BEST" and "Needs IMPROVEMENT" sections

## Database Structure

All feedback is stored in the `parsed_student_feedback` table with the following key fields:
- `student_id`: Links to the students table
- `student_name`: Full name of the student
- `feedback_type`: Either 'primary' or 'secondary'
- `unit_number` & `lesson_number`: Extracted from filename
- `topic`/`motion`: The debate topic or motion
- `rubric_scores`: JSON field (rubric scores for secondary, feedback presence for primary)
- `teacher_comments`: Text feedback from instructor
- `duration`: Speaking time (format: MM:SS)
- `instructor`: Teacher name extracted from file path

## Secondary Student Feedback Extraction

### File Structure
Files are organized by instructor and course:
```
data/Overall/Secondary/
└── Srijan/
    └── Saturday - 3_00 - 4_30 - 01IPDED2404 - PSD I/
        └── Unit 8/
            └── 8.1 - April 5.docx
```

### Extraction Process

1. **Student Name Detection**: 
   - Searches for patterns like `Student Name: FirstName`
   - Secondary students are matched by first name only (no duplicates exist)

2. **Motion Extraction**:
   - The debate motion appears immediately after the student name
   - Extracted as the first non-empty line after the name

3. **Rubric Score Extraction**:
   - Looks for 8 specific rubric criteria in table rows
   - Extracts scores from bold text: `<strong>1-5</strong>` or `<strong>N/A</strong>`
   - Rubric categories:
     - Time Management
     - POI Handling
     - Speaking Style
     - Argument Completeness
     - Theory Application
     - Rebuttal Effectiveness
     - Team Support
     - Feedback Application

4. **Additional Data**:
   - Teacher comments: Text after "Teacher comments:"
   - Duration: Format MM:SS extracted from the document
   - Unit/Lesson: Parsed from filename (e.g., "8.1" → unit: 8, lesson: 1)

### Code Reference
See `/scripts/import-secondary-feedback-v2.js` for implementation

## Primary Student Feedback Extraction

### File Structure
Files are organized by instructor type:
```
data/Overall/Primary/
├── Intensives/
├── Jami/
├── Saurav/
└── Srijan/
```

### Extraction Process

1. **Student Name Detection**:
   - Searches for pattern `Student: FirstName`
   - Only processes students with unique first names to avoid conflicts

2. **Topic Extraction**:
   - Appears after `Topic:` in the student section

3. **Feedback Categories**:
   - **What was BEST**: Positive feedback about the speech
   - **Needs IMPROVEMENT**: Areas for development
   - Both sections are extracted as multi-line text

4. **Additional Data**:
   - Speaking time: After "Speaking time:" (format: MM:SS.ms)
   - Unit/Lesson: From filename or defaults to 0

### Special Handling
- Primary feedback doesn't have rubric scores
- `rubric_scores` field is repurposed to store feedback presence:
  ```json
  {
    "what_was_good": "Yes/No",
    "needs_improvement": "Yes/No"
  }
  ```

### Code Reference
See `/scripts/import-primary-feedback.js` for implementation

## Name Conflict Resolution

### Secondary Students
- All secondary students have unique first names
- Direct matching by first name is reliable

### Primary Students
- 11 first names have conflicts (2-3 students each)
- Current implementation only imports non-conflicting students
- Conflicting names require manual resolution or full name matching

### Conflicting Primary Names
- Alexis, Annette, Charlotte, Chloe, Claire
- Ethan (3 students), Henry (3 students)
- Isabella, Lucas, Luke, Michelle

## Import Statistics

### Secondary Students
- **35 students** with feedback imported
- **770 total entries**
- **452 entries with motions** (58.7% coverage)
- Multiple instructors, primarily Srijan

### Primary Students  
- **71 non-conflicting students** processed
- **24 students skipped** due to name conflicts
- Feedback from 4 instructors: Intensives, Jami, Saurav, Srijan

## Usage in Application

The extracted feedback appears in:
1. **Student Profile Pages** (`/dashboard/students/[id]`)
2. **Feedback History Tab** component
3. **Growth Analytics** (future integration)

### Display Features
- Sorted by unit and lesson number
- Color-coded rubric scores (secondary)
- Expandable teacher comments
- Speech duration display
- Instructor attribution

## Technical Notes

### Unique ID Generation
Each feedback entry has a unique ID based on:
- Student name
- Class code
- Unit/lesson
- Occurrence index (for multiple entries in same file)
- Filename
- Instructor
- Feedback type (primary/secondary)

### Error Handling
- Duplicate entries are updated, not duplicated
- Missing data fields default to 'N/A' or null
- Malformed files are logged and skipped

### Performance
- Batch processing with progress logging
- ~100-200 entries processed per minute
- Automatic deduplication via unique constraints

## Future Improvements

1. **Name Disambiguation**: Implement full-name matching for primary students with conflicts
2. **Audio Integration**: Link feedback to recorded speeches
3. **AI Analysis**: Use Gemini to extract insights from teacher comments
4. **Parent Portal**: Format feedback for parent-friendly reports
5. **Trend Analysis**: Track improvement over time per rubric category