# Growth Compass Feedback System Documentation

## Overview
The Growth Compass feedback system processes Word documents containing student feedback from multiple instructors and transforms them into structured data for growth analytics. This document captures the complete feedback acquisition and processing workflow.

## Data Sources & Structure

### File Organization
```
data/Overall/
├── Primary/                    # Primary school feedback
│   ├── Jami/                  # Instructor-specific folders
│   ├── Srijan/                # (organized instructors)
│   ├── Tamkeen/
│   ├── Intensives/            # Special programs
│   └── [Class-specific folders with course codes]
└── Secondary/                 # Secondary school feedback
    ├── Jami/                  # Instructor-specific folders
    ├── Srijan/                # (organized instructors) 
    ├── Tamkeen/
    └── [Class-specific folders with course codes]
```

### File Types Supported
- **Individual Student Files**: `"StudentName - Unit X.Y Feedback.docx"`
- **Consolidated Files**: `"X.Y.docx"` containing multiple students
- **Class-specific Files**: Named with lesson numbers like `"3.2 - 9th November.docx"`

### Instructor Detection Logic
The system automatically detects instructors from:
1. **Folder Structure**: Files in `/Jami/`, `/Srijan/`, `/Tamkeen/` folders
2. **Filename Patterns**: "Subbed by [Name]" indicates substitute teachers
3. **Variations**: Case-insensitive matching for instructor names

## Feedback Processing Workflow

### 1. File Discovery (`FeedbackParser`)
```typescript
parseAllFeedback() → parseDirectoryRecursive() → parseDocumentFile()
```

**Process:**
- Recursively scans `data/Overall/Primary` and `data/Overall/Secondary`
- Identifies `.docx` files using mammoth library
- Extracts instructor from file path
- Determines if file contains individual or consolidated feedback

### 2. Content Extraction

**For Individual Files:**
- Entire document content = one student's feedback
- Student name extracted from filename
- Processes content as single feedback record

**For Consolidated Files:**
- Splits content by delimiter:
  - Primary: `"Student:"`
  - Secondary: `"Student Name:"`
- Processes each section as separate student feedback

### 3. Data Extraction & Cleaning

**Class Information Extraction:**
- **Course Code**: Pattern matching `\d{2}[A-Z]{5}\d{4}` (e.g., "02IPDEC2401")
- **Unit/Lesson Numbers**: From filename (`X.Y` pattern) or parent folder names
- **Class Names**: Derived from folder structure

**Content Processing:**
- **Motion Extraction**: For debate classes
  - Primary: Looks for "Motion:" prefix or "That..." patterns
  - Secondary: Extracts from before rubric section
- **Topic Extraction**: For non-debate content
- **Duration**: Parses speech/presentation timing
- **Student Name Normalization**: Handles variations like "Selena/Selina"

### 4. Feedback Type Differentiation

**Primary Feedback:**
- Simple format with strengths and improvement areas
- Table structure cleaned to: `STRENGTHS:` and `AREAS FOR IMPROVEMENT:`
- Contains basic teacher observations

**Secondary Feedback:**
- Structured rubric format with 8 assessment categories:
  1. Time management
  2. Point of information handling
  3. Speaking style and persuasion
  4. Argument completeness
  5. Theory application
  6. Rebuttal effectiveness
  7. Team support
  8. Feedback application
- Contains teacher comments section
- Motion/topic at beginning

### 5. Storage Processing (`FeedbackStorage`)

**Database Schema Integration:**
```sql
parsed_student_feedback (
  student_name, class_code, class_name, unit_number, 
  lesson_number, topic, motion, feedback_type, content,
  raw_content, html_content, best_aspects, improvement_areas,
  teacher_comments, rubric_scores, duration, file_path,
  parsed_at, unique_id, instructor
)
```

**Content Segmentation:**
- **Best Aspects**: Text after "STRENGTHS:" before "AREAS FOR IMPROVEMENT:"
- **Improvement Areas**: Text after "AREAS FOR IMPROVEMENT:" before "TEACHER COMMENTS:"
- **Teacher Comments**: Text after "TEACHER COMMENTS:"
- **Rubric Scores**: Extracted from HTML formatting (bolded scores)

### 6. Batch Processing Logic

**Error Handling Strategy:**
1. **Batch Insert**: Attempt to insert 25 records at once
2. **Individual Fallback**: If batch fails, try each record individually
3. **Data Cleaning**: Clean problematic fields and retry
4. **Error Logging**: Comprehensive error tracking for debugging

**Duplicate Prevention:**
- Uses `unique_id` field combining student name, feedback type, class code, lesson number, and filename
- Prevents duplicate processing of same feedback

## Integration Points

### Re-parsing Workflow
**Trigger**: "Re-parse Data" button on Growth Tracking page
**Process:**
1. `POST /api/feedback/reparse` → `FeedbackStorage.forceReparse()`
2. Clears existing `parsed_student_feedback` and `feedback_parsing_status` tables
3. Re-runs complete parsing workflow with latest files
4. Updates UI with processing results

### Growth Analytics Integration
**Data Flow:**
1. Parsed feedback → `parsed_student_feedback` table
2. Growth analytics queries this table for trends and patterns
3. AI analysis (Gemini) processes feedback content for insights

### Course Management Integration
**Class Codes**: Link feedback to existing course structure
**Enrollment Data**: Cross-reference with student enrollments
**Instructor Assignment**: Maps feedback to correct instructor records

## Key Features

### Multi-Instructor Support
- Automatic instructor detection from folder structure
- Handles substitute teachers via filename patterns
- Maintains instructor attribution throughout processing

### Robust Error Handling
- Graceful handling of malformed documents
- Individual record fallback for batch failures
- Comprehensive error logging and user feedback

### Flexible File Formats
- Supports both individual and consolidated feedback files
- Handles various naming conventions
- Adapts to different folder organizations

### Data Quality Assurance
- Student name normalization and deduplication
- Content cleaning and standardization
- Validation of required fields before storage

## Usage Instructions

### For Instructors
1. **File Organization**: Place feedback files in appropriate instructor folders
2. **Naming Convention**: Use consistent naming for easy parsing
3. **Content Structure**: Maintain standard feedback format for optimal parsing

### For System Administrators
1. **Re-parsing**: Use "Re-parse Data" button after adding new files
2. **Monitoring**: Check parsing status and error logs
3. **Data Validation**: Verify instructor attribution and content extraction

### For Developers
1. **Extending Parsers**: Add new instructor detection patterns in `extractInstructorFromPath()`
2. **Content Processing**: Modify extraction methods for new feedback formats
3. **Error Handling**: Enhance batch processing logic as needed

## Future Enhancements

### Planned Features
- **Real-time File Monitoring**: Automatic parsing of new files
- **Advanced Rubric Parsing**: Extract actual scores from Word formatting
- **Custom Feedback Templates**: Support for different feedback structures
- **Bulk Operations**: Mass operations across multiple instructors

### Technical Improvements
- **Performance Optimization**: Parallel processing for large datasets
- **Memory Management**: Streaming for very large files
- **Validation Rules**: Enhanced data quality checks
- **Audit Trail**: Complete change history for feedback records

## Troubleshooting

### Common Issues
1. **File Not Found**: Check file path and folder structure
2. **Parsing Errors**: Verify document format and content structure
3. **Duplicate Records**: Ensure unique_id generation is working
4. **Missing Instructor**: Check folder naming and path detection logic

### Debug Tools
- **Test API Endpoints**: Various debugging endpoints for testing components
- **Logging**: Comprehensive console logging throughout processing
- **Error Collection**: Centralized error tracking and reporting
- **Status Monitoring**: Real-time parsing status and progress tracking