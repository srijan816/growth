import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

export interface StudentFeedback {
  studentName: string;
  classCode: string;
  className: string;
  unitNumber: string;
  lessonNumber: string;
  date?: string;
  topic?: string;
  motion?: string;
  feedbackType: 'primary' | 'secondary';
  content: string;
  rawContent: string;
  duration?: string;
  filePath: string;
  extractedAt: Date;
}

export interface FeedbackExtractionResult {
  success: boolean;
  feedbacks: StudentFeedback[];
  errors: string[];
}

export class FeedbackParser {
  private dataPath: string;

  constructor(dataPath: string = './data') {
    this.dataPath = dataPath;
  }

  /**
   * Parse all feedback files and extract individual student feedback
   */
  async parseAllFeedback(): Promise<FeedbackExtractionResult> {
    const result: FeedbackExtractionResult = {
      success: true,
      feedbacks: [],
      errors: []
    };

    try {
      console.log('Starting feedback parsing...');
      const startTime = Date.now();
      
      const primaryPath = path.join(this.dataPath, 'primary');
      const secondaryPath = path.join(this.dataPath, 'secondary');

      // Parse primary feedback
      if (fs.existsSync(primaryPath)) {
        console.log('Parsing primary feedback...');
        const primaryResults = await this.parseDirectoryRecursive(primaryPath, 'primary');
        result.feedbacks.push(...primaryResults.feedbacks);
        result.errors.push(...primaryResults.errors);
        console.log(`Primary parsing completed: ${primaryResults.feedbacks.length} feedbacks`);
      }

      // Parse secondary feedback
      if (fs.existsSync(secondaryPath)) {
        console.log('Parsing secondary feedback...');
        const secondaryResults = await this.parseDirectoryRecursive(secondaryPath, 'secondary');
        result.feedbacks.push(...secondaryResults.feedbacks);
        result.errors.push(...secondaryResults.errors);
        console.log(`Secondary parsing completed: ${secondaryResults.feedbacks.length} feedbacks`);
      }

      // Sort feedback chronologically
      result.feedbacks.sort((a, b) => this.compareUnits(a.unitNumber, b.unitNumber));

      const endTime = Date.now();
      console.log(`Total parsing completed in ${endTime - startTime}ms: ${result.feedbacks.length} total feedbacks`);

    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to parse feedback: ${error}`);
    }

    return result;
  }

  /**
   * Get feedback for a specific student in chronological order (optimized)
   */
  async getStudentFeedback(studentName: string): Promise<StudentFeedback[]> {
    console.log(`Getting feedback for student: ${studentName}`);
    const startTime = Date.now();
    
    // Instead of parsing all files, search more efficiently
    const result = await this.searchStudentFeedback(studentName);
    
    const endTime = Date.now();
    console.log(`Student feedback retrieval completed in ${endTime - startTime}ms: ${result.length} feedbacks found`);
    
    return result;
  }

  /**
   * Search for a specific student's feedback more efficiently
   */
  private async searchStudentFeedback(studentName: string): Promise<StudentFeedback[]> {
    const feedbacks: StudentFeedback[] = [];
    
    try {
      const primaryPath = path.join(this.dataPath, 'primary');
      const secondaryPath = path.join(this.dataPath, 'secondary');

      // Search in primary folder
      if (fs.existsSync(primaryPath)) {
        const primaryFeedbacks = await this.searchInDirectory(primaryPath, 'primary', studentName);
        feedbacks.push(...primaryFeedbacks);
      }

      // Search in secondary folder
      if (fs.existsSync(secondaryPath)) {
        const secondaryFeedbacks = await this.searchInDirectory(secondaryPath, 'secondary', studentName);
        feedbacks.push(...secondaryFeedbacks);
      }

      // Sort chronologically
      return feedbacks.sort((a, b) => this.compareUnits(a.unitNumber, b.unitNumber));
      
    } catch (error) {
      console.error('Error searching student feedback:', error);
      return [];
    }
  }

  /**
   * Search for student feedback in a specific directory
   */
  private async searchInDirectory(
    dirPath: string, 
    feedbackType: 'primary' | 'secondary',
    studentName: string
  ): Promise<StudentFeedback[]> {
    const feedbacks: StudentFeedback[] = [];
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          // Recursively search subdirectories
          const subFeedbacks = await this.searchInDirectory(itemPath, feedbackType, studentName);
          feedbacks.push(...subFeedbacks);
        } else if (this.isDocumentFile(item)) {
          // Check if filename contains student name (for individual files)
          if (this.filenameContainsStudent(item, studentName)) {
            console.log(`Found potential match in filename: ${item}`);
            const fileResult = await this.parseDocumentFile(itemPath, feedbackType);
            const matchingFeedbacks = fileResult.feedbacks.filter(f => 
              this.isNameMatch(f.studentName, studentName)
            );
            feedbacks.push(...matchingFeedbacks);
          } else {
            // Check consolidated files (like 1.4.docx, 2.1.docx, etc.)
            if (this.isConsolidatedFile(item)) {
              console.log(`Checking consolidated file: ${item}`);
              const fileResult = await this.parseDocumentFile(itemPath, feedbackType);
              const matchingFeedbacks = fileResult.feedbacks.filter(f => 
                this.isNameMatch(f.studentName, studentName)
              );
              if (matchingFeedbacks.length > 0) {
                console.log(`Found ${matchingFeedbacks.length} matches in ${item}`);
                feedbacks.push(...matchingFeedbacks);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error searching directory ${dirPath}:`, error);
    }

    return feedbacks;
  }

  /**
   * Check if filename might contain the student name
   */
  private filenameContainsStudent(filename: string, studentName: string): boolean {
    const baseName = path.basename(filename, path.extname(filename)).toLowerCase();
    const searchName = studentName.toLowerCase();
    
    // Check if filename starts with student name
    return baseName.startsWith(searchName) || baseName.includes(searchName);
  }

  /**
   * Check if this is a consolidated feedback file
   */
  private isConsolidatedFile(filename: string): boolean {
    const baseName = path.basename(filename, path.extname(filename));
    
    // Match patterns like: 1.4, 2.1, Unit 5.1, etc.
    return baseName.match(/^\d+\.\d+/) !== null || 
           baseName.match(/^Unit \d+\.\d+/) !== null ||
           baseName.toLowerCase().includes('feedback');
  }

  /**
   * Parse directory recursively for feedback files
   */
  private async parseDirectoryRecursive(
    dirPath: string, 
    feedbackType: 'primary' | 'secondary'
  ): Promise<FeedbackExtractionResult> {
    const result: FeedbackExtractionResult = {
      success: true,
      feedbacks: [],
      errors: []
    };

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          // Recursively parse subdirectories
          const subResult = await this.parseDirectoryRecursive(itemPath, feedbackType);
          result.feedbacks.push(...subResult.feedbacks);
          result.errors.push(...subResult.errors);
        } else if (this.isDocumentFile(item)) {
          // Parse document file
          const fileResult = await this.parseDocumentFile(itemPath, feedbackType);
          result.feedbacks.push(...fileResult.feedbacks);
          result.errors.push(...fileResult.errors);
        }
      }
    } catch (error) {
      result.errors.push(`Error reading directory ${dirPath}: ${error}`);
    }

    return result;
  }

  /**
   * Parse a single document file
   */
  private async parseDocumentFile(
    filePath: string, 
    feedbackType: 'primary' | 'secondary'
  ): Promise<FeedbackExtractionResult> {
    const result: FeedbackExtractionResult = {
      success: true,
      feedbacks: [],
      errors: []
    };

    try {
      // Extract class info from path
      const classInfo = this.extractClassInfoFromPath(filePath);
      
      // Read document content
      const content = await this.readDocumentContent(filePath);
      
      // Parse student feedback from content
      const studentFeedbacks = this.extractStudentFeedbacks(
        content, 
        filePath, 
        feedbackType, 
        classInfo
      );

      result.feedbacks.push(...studentFeedbacks);

    } catch (error) {
      result.errors.push(`Error parsing file ${filePath}: ${error}`);
    }

    return result;
  }

  /**
   * Read document content using mammoth for .docx files
   */
  private async readDocumentContent(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({path: filePath});
      return result.value;
    } else if (ext === '.txt') {
      return fs.readFileSync(filePath, 'utf8');
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  /**
   * Extract individual student feedbacks from document content
   */
  private extractStudentFeedbacks(
    content: string,
    filePath: string,
    feedbackType: 'primary' | 'secondary',
    classInfo: any
  ): StudentFeedback[] {
    const feedbacks: StudentFeedback[] = [];
    
    // Define delimiters based on feedback type
    const delimiter = feedbackType === 'primary' ? 'Student:' : 'Student Name:';
    
    // Split content by student delimiter
    const sections = content.split(delimiter);
    
    // Skip first section (header content before first student)
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i].trim();
      
      if (section.length === 0) continue;
      
      try {
        const feedback = this.parseStudentSection(
          section,
          filePath,
          feedbackType,
          classInfo,
          delimiter
        );
        
        if (feedback) {
          feedbacks.push(feedback);
        }
      } catch (error) {
        console.warn(`Error parsing student section in ${filePath}:`, error);
      }
    }

    return feedbacks;
  }

  /**
   * Parse individual student section
   */
  private parseStudentSection(
    section: string,
    filePath: string,
    feedbackType: 'primary' | 'secondary',
    classInfo: any,
    delimiter: string
  ): StudentFeedback | null {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) return null;

    // Extract student name (first line after delimiter)
    const studentName = lines[0].replace(/[^\w\s]/g, '').trim();
    
    if (!studentName) return null;

    // Extract topic/motion
    let topic = '';
    let motion = '';
    let duration = '';
    
    for (const line of lines) {
      if (line.toLowerCase().startsWith('topic:')) {
        topic = line.substring(6).trim();
      } else if (line.toLowerCase().startsWith('motion:')) {
        motion = line.substring(7).trim();
      } else if (line.match(/^\d+:\d+$/)) {
        duration = line;
      }
    }

    // Clean content - remove tables and formatting artifacts
    const cleanContent = this.cleanFeedbackContent(section);

    const feedback: StudentFeedback = {
      studentName,
      classCode: classInfo.classCode,
      className: classInfo.className,
      unitNumber: classInfo.unitNumber,
      lessonNumber: classInfo.lessonNumber,
      topic: topic || undefined,
      motion: motion || undefined,
      duration: duration || undefined,
      feedbackType,
      content: cleanContent,
      rawContent: section,
      filePath,
      extractedAt: new Date()
    };

    return feedback;
  }

  /**
   * Clean feedback content by removing table formatting and artifacts
   */
  private cleanFeedbackContent(content: string): string {
    return content
      // Remove table separators
      .replace(/\|/g, ' ')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Remove common table headers
      .replace(/What was the BEST thing about my speech\?/gi, 'STRENGTHS:')
      .replace(/What part of my speech NEEDS IMPROVEMENT\?/gi, 'AREAS FOR IMPROVEMENT:')
      // Clean up formatting
      .replace(/\s*STRENGTHS:\s*/gi, '\n\nSTRENGTHS:\n')
      .replace(/\s*AREAS FOR IMPROVEMENT:\s*/gi, '\n\nAREAS FOR IMPROVEMENT:\n')
      .replace(/\s*Teacher Comments:\s*/gi, '\n\nTEACHER COMMENTS:\n')
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Extract class information from file path
   */
  private extractClassInfoFromPath(filePath: string): any {
    const pathParts = filePath.split(path.sep);
    
    let classCode = '';
    let className = '';
    let unitNumber = '';
    let lessonNumber = '';

    // Find class folder (contains course code pattern)
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const part = pathParts[i];
      
      // Check if this part contains a course code pattern (e.g., 02IPDEC2401)
      if (part.match(/\d{2}[A-Z]{5}\d{4}/)) {
        const match = part.match(/(\d{2}[A-Z]{5}\d{4})/);
        if (match) {
          classCode = match[1];
          className = part;
          break;
        }
      }
    }

    // Extract unit/lesson number from path
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const part = pathParts[i];
      
      // Check for unit patterns (Unit 5, Unit 6, etc.)
      if (part.match(/^Unit\s+(\d+)$/i)) {
        const match = part.match(/^Unit\s+(\d+)$/i);
        if (match) {
          unitNumber = match[1];
          break;
        }
      }
      
      // Check for lesson patterns (1.1, 1.2, etc.)
      if (part.match(/^(\d+\.\d+)/)) {
        const match = part.match(/^(\d+\.\d+)/);
        if (match) {
          lessonNumber = match[1];
          unitNumber = match[1].split('.')[0];
          break;
        }
      }
    }

    // Extract from filename if not found in path
    if (!lessonNumber) {
      const fileName = path.basename(filePath, path.extname(filePath));
      const match = fileName.match(/(\d+\.\d+)/);
      if (match) {
        lessonNumber = match[1];
        unitNumber = match[1].split('.')[0];
      }
    }

    return {
      classCode,
      className,
      unitNumber: unitNumber || '1',
      lessonNumber: lessonNumber || '1.1'
    };
  }

  /**
   * Compare unit numbers for chronological sorting
   */
  private compareUnits(a: string, b: string): number {
    const parseUnit = (unit: string) => {
      const parts = unit.split('.');
      return {
        major: parseInt(parts[0]) || 0,
        minor: parseInt(parts[1]) || 0
      };
    };

    const unitA = parseUnit(a);
    const unitB = parseUnit(b);

    if (unitA.major !== unitB.major) {
      return unitA.major - unitB.major;
    }
    return unitA.minor - unitB.minor;
  }

  /**
   * Check if a name matches (handles partial matches and case insensitivity)
   */
  private isNameMatch(fullName: string, searchName: string): boolean {
    const normalize = (name: string) => name.toLowerCase().trim();
    const full = normalize(fullName);
    const search = normalize(searchName);
    
    // Exact match
    if (full === search) return true;
    
    // Partial match (first name)
    if (full.startsWith(search)) return true;
    
    // Check if search name is contained in full name
    return full.includes(search);
  }

  /**
   * Check if file is a document we can parse
   */
  private isDocumentFile(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return ['.docx', '.txt'].includes(ext);
  }
}

export default FeedbackParser;