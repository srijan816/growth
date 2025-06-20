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
  htmlContent?: string;
  duration?: string;
  filePath: string;
  extractedAt: Date;
  // Add unique identifier to prevent name collisions
  uniqueId: string;
  // Add instructor information
  instructor?: string;
}

export interface FeedbackExtractionResult {
  success: boolean;
  feedbacks: StudentFeedback[];
  errors: string[];
}

export class FeedbackParser {
  private dataPath: string;

  constructor(dataPath: string = './data/Overall') {
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
      console.log('Starting feedback parsing from Overall folder...');
      const startTime = Date.now();
      
      const primaryPath = path.join(this.dataPath, 'Primary');
      const secondaryPath = path.join(this.dataPath, 'Secondary');

      // Parse primary feedback
      if (fs.existsSync(primaryPath)) {
        console.log('Parsing primary feedback from Overall/Primary...');
        const primaryResults = await this.parseDirectoryRecursive(primaryPath, 'primary');
        result.feedbacks.push(...primaryResults.feedbacks);
        result.errors.push(...primaryResults.errors);
        console.log(`Primary parsing completed: ${primaryResults.feedbacks.length} feedbacks`);
      }

      // Parse secondary feedback
      if (fs.existsSync(secondaryPath)) {
        console.log('Parsing secondary feedback from Overall/Secondary...');
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
  async getStudentFeedback(studentName: string, feedbackType?: 'primary' | 'secondary', classCode?: string): Promise<StudentFeedback[]> {
    console.log(`Getting feedback for student: ${studentName} (type: ${feedbackType || 'all'}, class: ${classCode || 'all'})`);
    const startTime = Date.now();
    
    // Instead of parsing all files, search more efficiently
    let result = await this.searchStudentFeedback(studentName);
    
    // Filter by feedback type if specified
    if (feedbackType) {
      result = result.filter(f => f.feedbackType === feedbackType);
    }
    
    // Filter by class code if specified
    if (classCode) {
      result = result.filter(f => f.classCode === classCode);
    }
    
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
      const primaryPath = path.join(this.dataPath, 'Primary');
      const secondaryPath = path.join(this.dataPath, 'Secondary');

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
      
      // Extract instructor info from path
      const instructor = this.extractInstructorFromPath(filePath);
      
      // Read document content (plain text)
      const content = await this.readDocumentContent(filePath);
      
      // For secondary feedback, also read HTML content to extract bold formatting
      let htmlContent = '';
      if (feedbackType === 'secondary') {
        try {
          htmlContent = await this.readDocumentContentWithFormatting(filePath);
        } catch (error) {
          console.warn(`Could not extract HTML formatting from ${filePath}:`, error);
        }
      }
      
      // Parse student feedback from content
      const studentFeedbacks = this.extractStudentFeedbacks(
        content, 
        filePath, 
        feedbackType, 
        classInfo,
        htmlContent,
        instructor
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
   * Read document content with HTML formatting for rubric score extraction
   */
  private async readDocumentContentWithFormatting(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.docx') {
      const result = await mammoth.convertToHtml({path: filePath});
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
    classInfo: any,
    htmlContent: string = '',
    instructor?: string
  ): StudentFeedback[] {
    const feedbacks: StudentFeedback[] = [];
    
    // Check if this is an individual student file (like "Melody - Unit 1.1 Feedback.docx")
    const fileName = path.basename(filePath, path.extname(filePath));
    const isIndividualFile = this.isIndividualStudentFile(fileName);
    
    if (isIndividualFile) {
      // Extract student name from filename for individual files
      const studentNameFromFile = this.extractStudentNameFromFilename(fileName);
      if (studentNameFromFile) {
        console.log(`Processing individual student file: ${fileName} -> ${studentNameFromFile}`);
        const feedback = this.parseIndividualStudentFile(
          content,
          filePath,
          feedbackType,
          classInfo,
          studentNameFromFile,
          htmlContent,
          instructor
        );
        if (feedback) {
          feedbacks.push(feedback);
        }
        return feedbacks;
      }
    }
    
    // Define delimiters based on feedback type for consolidated files
    const delimiter = feedbackType === 'primary' ? 'Student:' : 'Student Name:';
    
    // Split content by student delimiter
    const sections = content.split(delimiter);
    
    // Skip first section (header content before first student)
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i].trim();
      
      if (section.length === 0) continue;
      
      try {
        // Extract corresponding HTML section for this student
        let htmlSection = '';
        if (htmlContent && feedbackType === 'secondary') {
          // Find the HTML section for this student
          const studentName = section.split('\n')[0]?.trim();
          if (studentName) {
            // Look for the student name in HTML and extract their section
            const htmlSections = htmlContent.split('Student Name:');
            const matchingHtmlSection = htmlSections.find(htmlSect => 
              htmlSect.includes(studentName)
            );
            htmlSection = matchingHtmlSection || '';
          }
        }
        
        const feedback = this.parseStudentSection(
          section,
          filePath,
          feedbackType,
          classInfo,
          delimiter,
          htmlSection,
          instructor
        );
        
        if (feedback) {
          // Use the lesson number from classInfo which comes from filename
          // This already has the proper numbering (e.g., 7.1, 7.2)
          feedback.unitNumber = classInfo.lessonNumber || classInfo.unitNumber;
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
    delimiter: string,
    htmlSection: string = '',
    instructor?: string
  ): StudentFeedback | null {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) return null;

    // Extract student name (first line after delimiter) - more robust extraction
    let studentName = lines[0];
    
    // Clean up student name more carefully but less aggressively
    if (studentName) {
      // Remove common prefixes and suffixes
      studentName = studentName
        .replace(/^(Student|Name|Student Name):\s*/i, '')  // Remove any remaining delimiter parts
        .replace(/[^\w\s\-'\.]/g, ' ')  // Replace punctuation with spaces (keep hyphens, apostrophes, and periods for names)
        .replace(/\s+/g, ' ')  // Normalize spaces
        .trim();
      
      // Remove any trailing text that doesn't look like a name (but be less aggressive)
      studentName = studentName.replace(/\s+(Unit|Feedback|Class|Topic|Motion|Session|Lesson).*$/i, '').trim();
      
      // Handle names with potential suffixes or extra text - but keep full names
      // Only split on dashes if the content after dash doesn't look like part of a name
      const dashParts = studentName.split(/\s*[-–—]\s*/);
      if (dashParts.length > 1) {
        const firstPart = dashParts[0].trim();
        const secondPart = dashParts[1].trim();
        
        // If second part looks like unit info or other metadata, take only first part
        if (secondPart.match(/^(Unit|Lesson|Session|\d+\.\d+)/i)) {
          studentName = firstPart;
        }
        // Otherwise keep the full name (might be a hyphenated name)
      }
      
      // Handle common name variations
      // Selena/Selina normalization
      if (studentName.toLowerCase() === 'selena' || studentName.toLowerCase() === 'selina') {
        studentName = 'Selina';  // Normalize to Selina
      }
      if (studentName.toLowerCase() === 'selena ke' || studentName.toLowerCase() === 'selina ke') {
        studentName = 'Selina Ke';
      }
      
      // Clean up obvious parsing artifacts but preserve real names
      studentName = studentName
        .replace(/^(Copy of|copy of)\s+/i, '')  // Remove "Copy of" prefix
        .replace(/\s+(docx|doc)$/i, '')  // Remove file extensions
        .trim();
    }
    
    // Be more lenient with name validation - only reject if obviously not a name
    if (!studentName || studentName.length < 1 || /^\d+$/.test(studentName) || studentName.toLowerCase() === 'student') {
      console.log(`Filtered out invalid name: "${studentName}"`);
      return null;
    }

    // Extract topic/motion
    let topic = '';
    let motion = '';
    let duration = '';
    
    // For secondary feedback, extract motion from the beginning of content
    if (feedbackType === 'secondary') {
      // Motion is typically after student name and before the rubric
      const beforeRubric = section.split('Student spoke for')[0];
      const motionLines = beforeRubric.split('\n').filter(line => line.trim().length > 0);
      
      // Skip the student name line (first line) and get the motion
      if (motionLines.length > 1) {
        // Look for explicit "Motion:" prefix first
        const motionPrefixLine = motionLines.find(line => 
          line.toLowerCase().startsWith('motion:')
        );
        
        if (motionPrefixLine) {
          motion = motionPrefixLine.substring(motionPrefixLine.indexOf(':') + 1).trim();
        } else {
          // If no "Motion:" prefix, look for the actual motion content
          // Motion is usually the first substantial line after student name
          for (let i = 1; i < Math.min(motionLines.length, 4); i++) {
            const line = motionLines[i].trim();
            
            // Skip common non-motion content
            if (!line ||
                line.toLowerCase().includes('student spoke') ||
                line.toLowerCase().includes('class activity') ||
                line.toLowerCase().includes('rubric') ||
                line.toLowerCase().includes('n/a') ||
                line.match(/^\d+$/)) {
              continue;
            }
            
            // Check if this looks like a motion
            if (line.toLowerCase().startsWith('that ') || 
                line.toLowerCase().startsWith('this house') ||
                (line.length > 15 && line.includes(' '))) {
              motion = line;
              break;
            }
          }
        }
        
        // Clean up motion text
        if (motion) {
          motion = motion.replace(/This [Hh]ouse/i, 'This House');
          
          // Remove common prefixes that might have been included
          motion = motion.replace(/^(Motion:\s*)/i, '');
          
          // Validate that this doesn't look like a section header or other content
          if (motion.toLowerCase().includes('class activity') ||
              motion.toLowerCase().includes('student spoke') ||
              motion.toLowerCase().includes('rubric') ||
              motion.match(/^\d+$/) ||
              motion.length < 10) {
            motion = '';
          }
        }
      }
      
      // Look for duration in teacher comments
      const durationMatch = section.match(/speech length[^\d]*(\d+)\s*minutes?/i);
      if (durationMatch) {
        duration = `${durationMatch[1]} minutes`;
      }
    } else {
      // Primary feedback parsing
      for (const line of lines) {
        if (line.toLowerCase().startsWith('topic:')) {
          topic = line.substring(6).trim();
        } else if (line.toLowerCase().startsWith('motion:')) {
          motion = line.substring(7).trim();
        } else if (line.match(/^\d+:\d+$/)) {
          duration = line;
        }
      }
      
      // If no motion found with "Motion:" prefix, try to extract from structure
      if (!motion && lines.length >= 2) {
        // In primary feedback, motion is often the second line after student name
        // Skip the first line (student name) and look for motion pattern
        for (let i = 1; i < Math.min(lines.length, 5); i++) {
          const line = lines[i].trim();
          
          // Skip empty lines and common headers
          if (!line || 
              line.toLowerCase().includes('my teacher') ||
              line.toLowerCase().includes('observations') ||
              line.toLowerCase().includes('feedback') ||
              line.toLowerCase().includes('best thing') ||
              line.toLowerCase().includes('improvement') ||
              line.match(/^\d+:\d+$/)) {
            continue;
          }
          
          // Check if this looks like a motion (starts with "That" or "This House")
          if (line.toLowerCase().startsWith('that ') || 
              line.toLowerCase().startsWith('this house')) {
            motion = line;
            break;
          }
          
          // If it's a substantial line that doesn't look like feedback content,
          // it might be the motion
          if (line.length > 10 && 
              !line.toLowerCase().includes('what was') &&
              !line.toLowerCase().includes('what part') &&
              !line.toLowerCase().includes('nice work') &&
              !line.toLowerCase().includes('good work')) {
            motion = line;
            break;
          }
        }
      }
    }

    // Clean content - remove tables and formatting artifacts
    const cleanContent = this.cleanFeedbackContent(section, feedbackType);

    // Generate unique ID combining student name, feedback type, class code, and file info
    const fileBaseName = path.basename(filePath, path.extname(filePath));
    const uniqueId = `${studentName}_${feedbackType}_${classInfo.classCode}_${classInfo.lessonNumber}_${fileBaseName}`.toLowerCase().replace(/\s+/g, '_');
    
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
      htmlContent: htmlSection || undefined,
      filePath,
      extractedAt: new Date(),
      uniqueId,
      instructor: instructor || undefined
    };

    return feedback;
  }

  /**
   * Clean feedback content by removing table formatting and artifacts
   */
  private cleanFeedbackContent(content: string, feedbackType: 'primary' | 'secondary' = 'primary'): string {
    let cleaned = content;
    
    if (feedbackType === 'primary') {
      // Primary feedback cleaning
      cleaned = cleaned
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
        .replace(/\s*Teacher Comments:\s*/gi, '\n\nTEACHER COMMENTS:\n');
    } else {
      // Secondary feedback cleaning - preserve rubric structure and extract comments
      // Extract teacher comments first
      const teacherCommentsMatch = cleaned.match(/Teacher comments?:([\s\S]*?)(?:Student Name:|$)/i);
      const teacherComments = teacherCommentsMatch ? teacherCommentsMatch[1].trim() : '';
      
      // Extract motion if present at the beginning
      const motionMatch = cleaned.match(/^[\s\S]*?(?=Student spoke for)/i);
      const motion = motionMatch ? motionMatch[0].trim() : '';
      
      // Build structured content
      cleaned = '';
      if (motion) {
        cleaned += `MOTION: ${motion}\n\n`;
      }
      
      // Add rubric section header
      cleaned += 'RUBRIC EVALUATION:\n';
      
      // Extract each rubric item (we can't get the actual scores without Word formatting)
      const rubricItems = [
        'Student spoke for the duration of the specified time frame',
        'Student offered and/or accepted a point of information',
        'Student spoke in a stylistic and persuasive manner',
        'Student\'s argument is complete',
        'Student argument reflects application of theory',
        'Student\'s rebuttal is effective',
        'Student ably supported teammate',
        'Student applied feedback from previous debate'
      ];
      
      rubricItems.forEach((item, index) => {
        const itemRegex = new RegExp(item.substring(0, 30) + '[\\s\\S]*?(?:N/A[\\s]*1[\\s]*2[\\s]*3[\\s]*4[\\s]*5)', 'i');
        if (content.match(itemRegex)) {
          cleaned += `${index + 1}. ${item}\n`;
        }
      });
      
      // Add teacher comments
      if (teacherComments) {
        cleaned += `\n\nTEACHER COMMENTS:\n${teacherComments}`;
      };
    }
    
    // Common cleanup for both types
    return cleaned
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Extract instructor name from file path
   */
  private extractInstructorFromPath(filePath: string): string | undefined {
    const pathParts = filePath.split(path.sep);
    
    // Look for instructor folder names
    for (const part of pathParts) {
      const lowerPart = part.toLowerCase();
      
      // Check for known instructor folders (you mentioned: Jami, Srijan/you, Tamkeen)
      if (lowerPart === 'jami') return 'Jami';
      if (lowerPart === 'srijan') return 'Srijan';
      if (lowerPart === 'tamkeen') return 'Tamkeen';
      
      // Also check for variations
      if (lowerPart.includes('srijan')) return 'Srijan';
      if (lowerPart.includes('jami')) return 'Jami';
      if (lowerPart.includes('tamkeen')) return 'Tamkeen';
    }
    
    // If no instructor folder found, try to infer from file patterns
    // Files with "Subbed by" often indicate substitute teachers
    const fileName = path.basename(filePath);
    if (fileName.toLowerCase().includes('subbed by gabi')) return 'Gabi (Sub)';
    if (fileName.toLowerCase().includes('subbed by saurav')) return 'Saurav (Sub)';
    if (fileName.toLowerCase().includes('subbed by naveen')) return 'Naveen (Sub)';
    
    return undefined; // Unknown instructor
  }

  /**
   * Extract class information from file path
   */
  private extractClassInfoFromPath(filePath: string): any {
    const pathParts = filePath.split(path.sep);
    const fileName = path.basename(filePath, path.extname(filePath));
    
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

    // First priority: Extract from filename (e.g., "7.1.docx", "3.4 - 23rd November.docx")
    let fileMatch = fileName.match(/(\d+\.\d+)/);
    if (fileMatch) {
      lessonNumber = fileMatch[1];
      unitNumber = fileMatch[1].split('.')[0];
    } else {
      // Second priority: Check parent folder name
      for (let i = pathParts.length - 2; i >= 0; i--) {
        const part = pathParts[i];
        
        // Check for unit patterns (Unit 5, Unit 6, etc.)
        if (part.match(/^Unit\s+(\d+)$/i)) {
          const match = part.match(/^Unit\s+(\d+)$/i);
          if (match && !unitNumber) {
            unitNumber = match[1];
          }
        }
        
        // Check for lesson patterns in folder names (1.1, 1.2, etc.)
        const lessonMatch = part.match(/^(\d+\.\d+)/);
        if (lessonMatch) {
          lessonNumber = lessonMatch[1];
          unitNumber = lessonMatch[1].split('.')[0];
          break;
        }
      }
    }

    // If we have a unit but no lesson number, default to unit.1
    if (unitNumber && !lessonNumber) {
      lessonNumber = `${unitNumber}.1`;
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
    
    // Handle Selena/Selina variations
    if ((search === 'selena' || search === 'selina') && 
        (full === 'selena' || full === 'selina' || full === 'selina ke' || full === 'selena ke')) {
      return true;
    }
    
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

  /**
   * Check if this is an individual student file
   */
  private isIndividualStudentFile(fileName: string): boolean {
    // More flexible patterns for individual student files
    return fileName.match(/^[A-Za-z\s']+ - (Unit )?[\d\.]+/i) !== null ||
           fileName.match(/^[A-Za-z\s']+ \d+\.\d+/i) !== null;
  }

  /**
   * Extract student name from individual file filename
   */
  private extractStudentNameFromFilename(fileName: string): string | null {
    // Try multiple patterns for student names in filenames
    let match = fileName.match(/^([A-Za-z\s']+) - (Unit )?[\d\.]+/i);
    if (match) {
      return match[1].trim();
    }
    
    // Try pattern without "Unit"
    match = fileName.match(/^([A-Za-z\s']+) [\d\.]+/i);
    if (match) {
      return match[1].trim();
    }
    
    // Try pattern with different separators
    match = fileName.match(/^([A-Za-z\s']+)\s*[-–—]\s*(Unit )?[\d\.]+/i);
    if (match) {
      return match[1].trim();
    }
    
    return null;
  }

  /**
   * Parse individual student file (entire file is for one student)
   */
  private parseIndividualStudentFile(
    content: string,
    filePath: string,
    feedbackType: 'primary' | 'secondary',
    classInfo: any,
    studentName: string,
    htmlContent: string = '',
    instructor?: string
  ): StudentFeedback | null {
    // For individual files, the entire content is the student's feedback
    // Clean content and extract relevant parts
    let topic = '';
    let motion = '';
    let duration = '';
    
    if (feedbackType === 'secondary') {
      // Extract motion from content
      const motionMatch = content.match(/Motion:\s*(.+?)(?:\n|$)/i);
      if (motionMatch) {
        motion = motionMatch[1].trim();
      } else {
        // Try to find motion pattern without "Motion:" prefix
        const lines = content.split('\n').filter(line => line.trim());
        for (const line of lines.slice(0, 10)) { // Check first 10 lines
          if (line.toLowerCase().includes('this house')) {
            motion = line.trim();
            break;
          }
        }
      }
      
      // Look for duration
      const durationMatch = content.match(/speech length[^\d]*(\d+)\s*minutes?/i);
      if (durationMatch) {
        duration = `${durationMatch[1]} minutes`;
      }
    } else {
      // Primary feedback parsing
      const lines = content.split('\n');
      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.toLowerCase().startsWith('topic:')) {
          topic = cleanLine.substring(6).trim();
        } else if (cleanLine.toLowerCase().startsWith('motion:')) {
          motion = cleanLine.substring(7).trim();
        } else if (cleanLine.match(/^\d+:\d+$/)) {
          duration = cleanLine;
        }
      }
    }
    
    const cleanContent = this.cleanFeedbackContent(content, feedbackType);
    
    // Generate unique ID combining student name, feedback type, class code, and file info
    const fileBaseName = path.basename(filePath, path.extname(filePath));
    const uniqueId = `${studentName}_${feedbackType}_${classInfo.classCode}_${classInfo.lessonNumber}_${fileBaseName}`.toLowerCase().replace(/\s+/g, '_');
    
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
      rawContent: content,
      htmlContent: htmlContent || undefined,
      filePath,
      extractedAt: new Date(),
      uniqueId,
      instructor: instructor || undefined
    };

    return feedback;
  }
}

export default FeedbackParser;