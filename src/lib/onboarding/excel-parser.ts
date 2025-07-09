import * as XLSX from 'xlsx';
import { z } from 'zod';

// Schema definitions for validation
const CourseSchema = z.object({
  course_code: z.string().min(1, 'Course code is required'),
  course_name: z.string().min(1, 'Course name is required'),
  division: z.enum(['Primary', 'Secondary'], {
    errorMap: () => ({ message: 'Division must be Primary or Secondary' })
  }),
  grade_group: z.enum(['G3-4', 'G5-6', 'G7-9', 'G7-12'], {
    errorMap: () => ({ message: 'Invalid grade group' })
  }),
  skill_level: z.enum(['PSD I', 'PSD II', 'PSD III', 'JOT', 'OT'], {
    errorMap: () => ({ message: 'Invalid skill level' })
  }),
  unit_summary: z.string().min(1, 'Unit summary is required'),
  program_type: z.enum(['PSD', 'Writing', 'RAPS', 'Critical']).optional(),
  instructor_name: z.string().optional(),
  location: z.string().optional(),
  max_students: z.coerce.number().positive().optional(),
});

const EnrollmentSchema = z.object({
  student_name: z.string().min(1, 'Student name is required'),
  student_id: z.string().min(1, 'Student ID is required'),
  course_code: z.string().min(1, 'Course code is required'),
  enrollment_start: z.string().transform((str, ctx) => {
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return z.NEVER;
    }
    return date;
  }),
  enrollment_end: z.string().optional().transform((str, ctx) => {
    if (!str) return undefined;
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return z.NEVER;
    }
    return date;
  }),
  student_email: z.string().email().optional(),
  grade_level: z.coerce.number().min(1).max(12).optional(),
});

const LessonMaterialSchema = z.object({
  course_code: z.string().min(1, 'Course code is required'),
  lesson_number: z.coerce.number().positive('Lesson number must be positive'),
  lesson_title: z.string().min(1, 'Lesson title is required'),
  lesson_objectives: z.string().optional(),
  student_id: z.string().min(1, 'Student ID is required'),
  speech_recording_url: z.string().url().optional().or(z.literal('')),
  worksheet_url: z.string().url().optional().or(z.literal('')),
  feedback_document: z.string().optional(),
  submission_date: z.string().optional().transform((str, ctx) => {
    if (!str) return undefined;
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return z.NEVER;
    }
    return date;
  }),
});

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface ParseResult<T> {
  data: T[];
  errors: ValidationError[];
  warnings: string[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
  };
}

export class ExcelParser {
  private readExcelFile(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(workbook);
        } catch (error) {
          reject(new Error('Failed to read Excel file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private extractSheetData(workbook: XLSX.WorkBook, sheetName?: string): any[] {
    const sheet = sheetName 
      ? workbook.Sheets[sheetName] 
      : workbook.Sheets[workbook.SheetNames[0]];
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName || 'first sheet'}" not found`);
    }

    return XLSX.utils.sheet_to_json(sheet, { 
      header: 1,
      defval: '',
      blankrows: false 
    });
  }

  private normalizeHeaders(headers: string[]): string[] {
    return headers.map(header => 
      header
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')
    );
  }

  private validateAndTransform<T>(
    rawData: any[][],
    schema: z.ZodSchema<T>
  ): ParseResult<T> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const validData: T[] = [];

    if (rawData.length === 0) {
      throw new Error('No data found in Excel file');
    }

    const headers = this.normalizeHeaders(rawData[0]);
    const dataRows = rawData.slice(1);

    dataRows.forEach((row, index) => {
      const rowIndex = index + 2; // +2 because we start from row 2 (after header)
      
      // Convert row array to object using headers
      const rowObject: any = {};
      headers.forEach((header, colIndex) => {
        rowObject[header] = row[colIndex] || '';
      });

      // Skip completely empty rows
      const hasData = Object.values(rowObject).some(value => 
        value !== null && value !== undefined && value !== ''
      );
      
      if (!hasData) {
        warnings.push(`Row ${rowIndex}: Skipped empty row`);
        return;
      }

      // Validate row data
      const result = schema.safeParse(rowObject);
      
      if (result.success) {
        validData.push(result.data);
      } else {
        result.error.errors.forEach(error => {
          errors.push({
            row: rowIndex,
            field: error.path.join('.'),
            message: error.message,
            value: error.path.reduce((obj, key) => obj?.[key], rowObject)
          });
        });
      }
    });

    return {
      data: validData,
      errors,
      warnings,
      summary: {
        totalRows: dataRows.length,
        validRows: validData.length,
        errorRows: dataRows.length - validData.length
      }
    };
  }

  async parseCourseCatalog(file: File): Promise<ParseResult<z.infer<typeof CourseSchema>>> {
    try {
      const workbook = await this.readExcelFile(file);
      const rawData = this.extractSheetData(workbook);
      
      return this.validateAndTransform(rawData, CourseSchema);
    } catch (error) {
      throw new Error(`Failed to parse course catalog: ${error.message}`);
    }
  }

  async parseEnrollments(file: File): Promise<ParseResult<z.infer<typeof EnrollmentSchema>>> {
    try {
      const workbook = await this.readExcelFile(file);
      const rawData = this.extractSheetData(workbook);
      
      return this.validateAndTransform(rawData, EnrollmentSchema);
    } catch (error) {
      throw new Error(`Failed to parse enrollments: ${error.message}`);
    }
  }

  async parseLessonMaterials(file: File): Promise<ParseResult<z.infer<typeof LessonMaterialSchema>>> {
    try {
      const workbook = await this.readExcelFile(file);
      const rawData = this.extractSheetData(workbook);
      
      return this.validateAndTransform(rawData, LessonMaterialSchema);
    } catch (error) {
      throw new Error(`Failed to parse lesson materials: ${error.message}`);
    }
  }

  // Helper method to generate template data
  generateTemplateData(type: 'courses' | 'enrollments' | 'lessons'): any[] {
    switch (type) {
      case 'courses':
        return [
          ['course_code', 'course_name', 'division', 'grade_group', 'skill_level', 'unit_summary', 'program_type', 'instructor_name', 'location', 'max_students'],
          ['PSD-101', 'Public Speaking & Debate I', 'Primary', 'G3-4', 'PSD I', 'Introduction to public speaking fundamentals...', 'PSD', 'John Smith', 'Room A', '20']
        ];
      
      case 'enrollments':
        return [
          ['student_name', 'student_id', 'course_code', 'enrollment_start', 'enrollment_end', 'student_email', 'grade_level'],
          ['John Doe', 'STU001', 'PSD-101', '2024-01-15', '2024-12-20', 'john.doe@email.com', '4']
        ];
      
      case 'lessons':
        return [
          ['course_code', 'lesson_number', 'lesson_title', 'lesson_objectives', 'student_id', 'speech_recording_url', 'worksheet_url', 'feedback_document', 'submission_date'],
          ['PSD-101', '1', 'Introduction to Debate', 'Learn basic debate structure', 'STU001', '', '', 'feedback_001.docx', '2024-02-01']
        ];
      
      default:
        return [];
    }
  }

  // Generate downloadable template
  generateTemplate(type: 'courses' | 'enrollments' | 'lessons'): Uint8Array {
    const templateData = this.generateTemplateData(type);
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    
    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  }

  // Cross-reference validation
  async validateCrossReferences(
    enrollments: z.infer<typeof EnrollmentSchema>[],
    courses: z.infer<typeof CourseSchema>[]
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const courseCodes = new Set(courses.map(c => c.course_code));
    
    enrollments.forEach((enrollment, index) => {
      if (!courseCodes.has(enrollment.course_code)) {
        errors.push({
          row: index + 2,
          field: 'course_code',
          message: `Course code "${enrollment.course_code}" not found in course catalog`,
          value: enrollment.course_code
        });
      }
    });
    
    return errors;
  }
}

export const excelParser = new ExcelParser();

// Export schemas for API routes
export { CourseSchema, EnrollmentSchema, LessonMaterialSchema };

// Export helper function for template generation
export function generateExcelTemplate(type: 'courses' | 'enrollments' | 'lessons'): any[] {
  const templateData = excelParser.generateTemplateData(type);
  const headers = templateData[0];
  const sampleRow = templateData[1];
  
  // Create an object with headers as keys and sample values
  const templateObject: any = {};
  headers.forEach((header, index) => {
    templateObject[header] = sampleRow[index] || '';
  });
  
  return [templateObject]; // Return array with one sample object
}