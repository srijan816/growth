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
  // Add rubric scores extracted from bold formatting
  rubricScores?: { [key: string]: number };
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
           baseName.toLowerCase().includes('feedback') ||
           baseName.toLowerCase().includes('primary feedback sheet') ||
           baseName.toLowerCase().includes('psd ii') ||
           baseName.toLowerCase().includes('psd iii') ||
           baseName.toLowerCase().includes('copy of');
  }

  /**
   * Parse directory recursively for feedback files
   */
  async parseDirectoryRecursive(
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
  async parseDocumentFile(
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
   * Extract rubric scores from HTML content by finding bold text in table structure
   */
  private extractRubricScores(htmlContent: string, studentName: string): { [key: string]: number } {
    const scores: { [key: string]: number } = {};
    
    if (!htmlContent) return scores;
    
    const rubricItems = [
      'Student spoke for the duration of the specified time frame',
      'Student offered and/or accepted a point of information', 
      'Student spoke in a stylistic and persuasive manner',
      'Student\'s argument is complete in that it has relevant Claims',
      'Student argument reflects application of theory',
      'Student\'s rebuttal is effective',
      'Student ably supported teammate',
      'Student applied feedback from previous debate'
    ];
    
    console.log(`🔍 Extracting rubric scores for ${studentName} from ${htmlContent.length} chars of HTML`);
    
    // Debug: Check what bold items we have in this section
    const allBoldItems = htmlContent.match(/<strong>([^<]+)<\/strong>/g) || [];
    console.log(`   📌 Bold items in this section: ${allBoldItems.map(b => b.replace(/<\/?strong>/g, '')).join(', ')}`);
    
    // Split by table rows - this format uses </tr> to properly separate rows
    const tableRows = htmlContent.split('</tr>').map(row => row + '</tr>');
    console.log(`   📊 Found ${tableRows.length} table rows`);
    
    rubricItems.forEach((item, index) => {
      const itemKey = `rubric_${index + 1}`;
      
      // Create specific search patterns for each rubric item
      const searchPatterns = {
        0: ['spoke for the duration', 'specified time frame'],
        1: ['point of information', 'offered and/or accepted'],
        2: ['stylistic and persuasive', 'volume, speed, tone'],
        3: ['argument is complete', 'Claims', 'Evidence/Warrants'],
        4: ['application of theory', 'theory taught'],
        5: ['rebuttal is effective', 'directly responds'],
        6: ['ably supported teammate', 'teammate\'s case'],
        7: ['applied feedback', 'previous debate']
      };
      
      let foundRow = null;
      
      // Find the row containing this rubric item
      const patterns = searchPatterns[index] || [];
      for (const row of tableRows) {
        let matchFound = false;
        for (const pattern of patterns) {
          if (row.toLowerCase().includes(pattern.toLowerCase())) {
            matchFound = true;
            break;
          }
        }
        if (matchFound) {
          foundRow = row;
          break;
        }
      }
      
      if (foundRow) {
        console.log(`✅ Found row for rubric ${index + 1}`);
        
        // Debug: show first 100 chars of the row
        console.log(`   📝 Row preview: ${foundRow.substring(0, 100)}...`);
        
        // Split the row by table cells to find the score columns
        const cells = foundRow.split(/<th[^>]*>|<td[^>]*>/);
        
        // Look for bold content in each cell - take the FIRST bold match found
        let score = null;
        for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
          const cell = cells[cellIndex];
          // Check if this cell contains bold content
          const boldMatch = cell.match(/<strong>([^<]+)<\/strong>/);
          if (boldMatch && score === null) { // Only take the first match
            const boldContent = boldMatch[1].trim();
            
            // Check if it's a score (1-5)
            if (/^[1-5]$/.test(boldContent)) {
              score = parseInt(boldContent);
              console.log(`   ✅ Found score ${score} in cell ${cellIndex}`);
              break; // Stop after finding the first bold score
            }
            // Check if it's N/A
            else if (/^(n\/a|na)$/i.test(boldContent)) {
              score = 0; // Use 0 for N/A
              console.log(`   ✅ Found N/A in cell ${cellIndex}`);
              break; // Stop after finding N/A
            }
          }
        }
        
        if (score !== null) {
          scores[itemKey] = score;
        } else {
          console.log(`   ⚠️ No score found for rubric ${index + 1}`);
        }
      }
    });
    
    console.log(`🎯 Final extracted scores for ${studentName}:`, scores);
    return scores;
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
            // Split HTML by student sections more precisely
            const htmlParts = htmlContent.split(/<strong>Student Name:/);
            
            // Find the section that contains this student
            for (let j = 1; j < htmlParts.length; j++) {
              const part = '<strong>Student Name:' + htmlParts[j];
              if (part.includes(studentName)) {
                // Extract just this student's section (up to the next student or end)
                let endIndex = part.length;
                
                // Look for the next student section or the end of this student's feedback
                // Student sections are separated by tables, so find the end of this student's tables
                const tables = part.split('</table>');
                if (tables.length >= 3) {
                  // Typically: name table, motion table, rubric table
                  // Take up to the third closing table tag
                  endIndex = part.indexOf('</table>');
                  endIndex = part.indexOf('</table>', endIndex + 1);
                  endIndex = part.indexOf('</table>', endIndex + 1);
                  if (endIndex > 0) {
                    endIndex += 8; // Include the </table> tag
                  }
                }
                
                htmlSection = part.substring(0, endIndex);
                console.log(`   📄 Extracted HTML section for ${studentName}: ${htmlSection.length} chars`);
                break;
              }
            }
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
    let studentName = '';
    
    // Look for the actual student name in the first few lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      let potentialName = lines[i];
      
      if (!potentialName) continue;
      
      // Clean up potential name
      potentialName = potentialName
        .replace(/^(Student|Name|Student Name):\s*/i, '')  // Remove delimiter parts
        .replace(/[^\w\s\-'\.]/g, ' ')  // Replace punctuation with spaces (keep name characters)
        .replace(/\s+/g, ' ')  // Normalize spaces
        .trim();
      
      // Remove trailing non-name content
      potentialName = potentialName.replace(/\s+(Unit|Feedback|Class|Topic|Motion|Session|Lesson|PSD|Speaking|Time|What|My|Teacher|Observations).*$/i, '').trim();
      
      // Handle dashes - split and analyze
      const dashParts = potentialName.split(/\s*[-–—]\s*/);
      if (dashParts.length > 1) {
        const firstPart = dashParts[0].trim();
        const secondPart = dashParts[1].trim();
        
        // If second part looks like metadata, take only first part
        if (secondPart.match(/^(Unit|Lesson|Session|\d+\.\d+|Feedback|Class)/i)) {
          potentialName = firstPart;
        }
      }
      
      // Clean up obvious artifacts
      potentialName = potentialName
        .replace(/^(Copy of|copy of)\s+/i, '')
        .replace(/\s+(docx|doc)$/i, '')
        .trim();
      
      // Check if this looks like a real name
      if (this.isValidStudentName(potentialName)) {
        studentName = potentialName;
        break;
      }
    }
    
    // If no valid name found in first few lines, try the original first line approach
    if (!studentName && lines.length > 0) {
      studentName = lines[0]
        .replace(/^(Student|Name|Student Name):\s*/i, '')
        .replace(/[^\w\s\-'\.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\s+(Unit|Feedback|Class|Topic|Motion|Session|Lesson).*$/i, '')
        .trim();
    }
    
    // Apply name normalizations
    if (studentName) {
      // Handle common name variations
      if (studentName.toLowerCase() === 'selena' || studentName.toLowerCase() === 'selina') {
        studentName = 'Selina';
      }
      if (studentName.toLowerCase() === 'selena ke' || studentName.toLowerCase() === 'selina ke') {
        studentName = 'Selina Ke';
      }
    }
    
    // More robust name validation - filter out obvious non-names
    if (!studentName || 
        studentName.length < 2 || 
        /^\d+$/.test(studentName) || // Just numbers
        studentName.toLowerCase() === 'student' ||
        studentName.toLowerCase() === 'feedback' ||
        studentName.toLowerCase().startsWith('psd ') || // PSD I, PSD II, PSD III
        studentName.toLowerCase().match(/^psd\s*(i{1,3}|1|2|3)$/i) || // PSD variants
        studentName.toLowerCase().includes('clearing') ||
        studentName.toLowerCase().includes('class') ||
        studentName.toLowerCase().includes('unit') ||
        studentName.toLowerCase().includes('lesson') ||
        studentName.toLowerCase().includes('topic') ||
        studentName.toLowerCase().includes('motion') ||
        studentName.toLowerCase().includes('teacher') ||
        studentName.toLowerCase().includes('comments') ||
        studentName.toLowerCase().includes('speaking time') ||
        studentName.toLowerCase().includes('what was') ||
        studentName.toLowerCase().includes('what part') ||
        studentName.toLowerCase().match(/^\d+\.\d+/) || // Unit numbers like 1.1, 2.3
        studentName.toLowerCase().match(/^copy\s+of/i) || // Copy of...
        /^[^a-zA-Z]*$/.test(studentName) // No letters at all
    ) {
      console.log(`Filtered out invalid name: "${studentName}"`);
      return null;
    }

    // Extract topic/motion
    let topic = '';
    let motion = '';
    let duration = '';
    
    // For secondary feedback, extract motion and duration from HTML if available
    if (feedbackType === 'secondary' && htmlSection) {
      // Extract motion from HTML structure
      const motionTableRegex = /<table[^>]*>[\s\S]*?<strong>Motion<\/strong>:\s*([^<]+)[\s\S]*?<\/table>/i;
      const motionMatch = htmlSection.match(motionTableRegex);
      
      if (motionMatch && motionMatch[1]) {
        motion = motionMatch[1].trim();
      } else {
        // Fallback: Look for Motion: pattern in any paragraph
        const motionParagraphRegex = /<p[^>]*>[\s\S]*?Motion:\s*([^<]+)[\s\S]*?<\/p>/i;
        const paragraphMatch = htmlSection.match(motionParagraphRegex);
        
        if (paragraphMatch && paragraphMatch[1]) {
          motion = paragraphMatch[1].trim();
        }
      }
      
      // Extract duration from HTML (at the end of teacher comments)
      // Look for standalone <p> tags with time format at the end
      const timeRegex = /<p>(\d{1,2}:\d{2})<\/p>/g;
      const allTimeMatches = [...htmlSection.matchAll(timeRegex)];
      
      if (allTimeMatches.length > 0) {
        // Take the last time match (should be the speech duration)
        const lastMatch = allTimeMatches[allTimeMatches.length - 1];
        duration = lastMatch[1];
        console.log(`   ⏱️ Found speech duration: ${duration}`);
      } else {
        // Fallback: look for time patterns in the content
        const fallbackTimeMatch = htmlSection.match(/(\d{1,2}:\d{2})(?!.*\d{1,2}:\d{2})/);
        if (fallbackTimeMatch) {
          duration = fallbackTimeMatch[1];
          console.log(`   ⏱️ Found duration via fallback: ${duration}`);
        }
      }
    } else if (feedbackType === 'secondary') {
      // Motion is typically after student name and before the rubric
      const beforeRubric = section.split('Student spoke for')[0];
      const motionLines = beforeRubric.split('\n').filter(line => line.trim().length > 0);
      
      // Skip the student name line (first line) and get the motion
      if (motionLines.length > 1) {
        // Look for explicit "Motion:" or "MOTION:" prefix first
        const motionPrefixIndex = motionLines.findIndex(line => 
          line.toLowerCase().trim().startsWith('motion:')
        );
        
        if (motionPrefixIndex !== -1) {
          // Found "Motion:" or "MOTION:" line
          const motionLine = motionLines[motionPrefixIndex];
          const colonIndex = motionLine.indexOf(':');
          const afterColon = motionLine.substring(colonIndex + 1).trim();
          
          // Check if the content after colon looks like a name (short, single word, capitalized)
          if (afterColon && afterColon.length < 15 && !afterColon.includes(' ') && /^[A-Z]/.test(afterColon)) {
            // This is likely "MOTION: StudentName" pattern
            // The actual motion should be on the next line
            if (motionPrefixIndex + 1 < motionLines.length) {
              motion = motionLines[motionPrefixIndex + 1].trim();
            }
          } else {
            // The motion is on the same line after the colon
            motion = afterColon;
          }
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
                line.match(/^\d+$/) ||
                line.length < 10) {
              continue;
            }
            
            // Check if this looks like a motion
            if (line.toLowerCase().startsWith('that ') || 
                line.toLowerCase().startsWith('this house') ||
                line.toLowerCase().startsWith('thbt ') ||
                line.toLowerCase().startsWith('thw ') ||
                line.toLowerCase().startsWith('th ') ||
                (line.length > 20 && line.includes(' ') && !line.includes(':'))) {
              motion = line;
              break;
            }
          }
        }
        
        // Clean up motion text
        if (motion) {
          // Standardize debate motion prefixes
          motion = motion.replace(/^TH(BT|W|B)/i, (match) => match.toUpperCase());
          motion = motion.replace(/This [Hh]ouse/i, 'This House');
          
          // Remove common prefixes that might have been included
          motion = motion.replace(/^(Motion:\s*)/i, '');
          
          // Validate that this doesn't look like a section header or other content
          if (motion.toLowerCase().includes('class activity') ||
              motion.toLowerCase().includes('student spoke') ||
              motion.toLowerCase().includes('rubric') ||
              motion.match(/^\d+$/) ||
              motion.length < 10 ||
              motion.toLowerCase() === studentName.toLowerCase()) {
            motion = '';
          }
        }
      }
      
      // Look for duration at the end of the feedback
      // First try to find time format (H:MM or HH:MM)
      const timeFormatMatch = section.match(/\b(\d{1,2}:\d{2})\b(?!.*\b\d{1,2}:\d{2}\b)/);
      if (timeFormatMatch) {
        duration = timeFormatMatch[1];
      } else {
        // Fallback: look for "X minutes" pattern
        const minutesMatch = section.match(/speech (?:length|duration)[^\d]*(\d+)\s*minutes?/i);
        if (minutesMatch) {
          duration = `${minutesMatch[1]} minutes`;
        }
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
    const cleanContent = this.cleanFeedbackContent(section, feedbackType, htmlSection);

    // Generate unique ID combining student name, feedback type, class code, file info, content hash, and timestamp
    const fileBaseName = path.basename(filePath, path.extname(filePath));
    const contentHash = require('crypto').createHash('md5').update(section + filePath).digest('hex').substring(0, 8);
    const instructorName = instructor || 'unknown';
    const timestamp = Date.now().toString(36); // Base36 timestamp for shorter string
    const motionStr = motion || 'no-motion';
    const topicStr = topic || 'no-topic';
    const uniqueId = `${studentName}_${feedbackType}_${classInfo.classCode}_${classInfo.lessonNumber}_${fileBaseName}_${instructorName}_${motionStr.substring(0, 10)}_${topicStr.substring(0, 10)}_${contentHash}_${timestamp}`.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Extract rubric scores for secondary feedback
    let rubricScores = {};
    if (feedbackType === 'secondary' && htmlSection) {
      rubricScores = this.extractRubricScores(htmlSection, studentName);
    }
    
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
      instructor: instructor || undefined,
      rubricScores: Object.keys(rubricScores).length > 0 ? rubricScores : undefined
    };

    return feedback;
  }

  /**
   * Clean feedback content by removing table formatting and artifacts
   */
  private cleanFeedbackContent(content: string, feedbackType: 'primary' | 'secondary' = 'primary', htmlContent?: string): string {
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
      // Secondary feedback cleaning - use HTML content if available
      let teacherComments = '';
      let motion = '';
      
      if (htmlContent) {
        // Extract teacher comments from HTML
        const comments: string[] = [];
        const teacherCommentsRegex = /<p>Teacher comments?:\s*<\/p>\s*<ul>([\s\S]*?)<\/ul>/i;
        const commentsMatch = htmlContent.match(teacherCommentsRegex);
        
        if (commentsMatch && commentsMatch[1]) {
          // Extract individual list items
          const listItemRegex = /<li>([^<]+)<\/li>/g;
          let match;
          while ((match = listItemRegex.exec(commentsMatch[1])) !== null) {
            if (match[1]) {
              comments.push(match[1].trim());
            }
          }
        }
        
        if (comments.length > 0) {
          teacherComments = comments.join('\n• ');
        }
        
        // Extract motion from HTML
        const motionTableRegex = /<table[^>]*>[\s\S]*?<strong>Motion<\/strong>:\s*([^<]+)[\s\S]*?<\/table>/i;
        const motionMatch = htmlContent.match(motionTableRegex);
        
        if (motionMatch && motionMatch[1]) {
          motion = motionMatch[1].trim();
        }
      } else {
        // Fallback to text-based extraction
        const teacherCommentsMatch = cleaned.match(/Teacher comments?:([\s\S]*?)(?:Student Name:|$)/i);
        teacherComments = teacherCommentsMatch ? teacherCommentsMatch[1].trim() : '';
        
        const motionMatch = cleaned.match(/^[\s\S]*?(?=Student spoke for)/i);
        motion = motionMatch ? motionMatch[0].trim() : '';
      }
      
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
        cleaned += `\n\nTEACHER COMMENTS:\n`;
        if (htmlContent && teacherComments.includes('\n•')) {
          cleaned += `• ${teacherComments}`;
        } else {
          cleaned += teacherComments;
        }
      }
      
      // Extract and add duration if found in HTML
      if (htmlContent) {
        const timeRegex = /<p>(\d{1,2}:\d{2})<\/p>/g;
        const allTimeMatches = [...htmlContent.matchAll(timeRegex)];
        if (allTimeMatches.length > 0) {
          const lastMatch = allTimeMatches[allTimeMatches.length - 1];
          cleaned += `\n\nSPEECH DURATION: ${lastMatch[1]}`;
        }
      }
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
      
      // Check for known instructor folders
      if (lowerPart === 'saurav') return 'Saurav';
      if (lowerPart === 'srijan') return 'Srijan';
      if (lowerPart === 'jami') return 'Jami';
      if (lowerPart === 'mai') return 'Mai';
      if (lowerPart === 'tamkeen') return 'Tamkeen';
      if (lowerPart === 'naveen') return 'Naveen';
      
      // Also check for variations
      if (lowerPart.includes('saurav')) return 'Saurav';
      if (lowerPart.includes('srijan')) return 'Srijan';
      if (lowerPart.includes('jami')) return 'Jami';
      if (lowerPart.includes('mai')) return 'Mai';
      if (lowerPart.includes('tamkeen')) return 'Tamkeen';
      if (lowerPart.includes('naveen')) return 'Naveen';
    }
    
    // If no instructor folder found, try to infer from file patterns
    // Files with "Subbed by" often indicate substitute teachers
    const fileName = path.basename(filePath);
    if (fileName.toLowerCase().includes('subbed by gabi')) return 'Gabi (Sub)';
    if (fileName.toLowerCase().includes('subbed by saurav')) return 'Saurav (Sub)';
    if (fileName.toLowerCase().includes('subbed by naveen')) return 'Naveen (Sub)';
    if (fileName.toLowerCase().includes('subbed by mai')) return 'Mai (Sub)';
    
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
    // First check if this is actually a consolidated file
    if (this.isConsolidatedFile(fileName)) {
      return false;
    }
    
    // More flexible patterns for individual student files
    // But exclude obvious consolidated patterns
    const lowerFileName = fileName.toLowerCase();
    
    // Exclude files that are clearly consolidated based on their names
    if (lowerFileName.includes('primary feedback sheet') ||
        lowerFileName.includes('secondary feedback sheet') ||
        lowerFileName.match(/^psd\s*(i{1,3}|1|2|3)\s*[-\s]/i) ||
        lowerFileName.includes('feedback sheet') ||
        lowerFileName.includes('copy of')) {
      return false;
    }
    
    // Now check for individual file patterns
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
   * Check if a string looks like a valid student name
   */
  private isValidStudentName(name: string): boolean {
    if (!name || name.length < 2) return false;
    
    const nameLower = name.toLowerCase();
    
    // Reject obvious non-names
    if (nameLower === 'student' ||
        nameLower === 'feedback' ||
        nameLower.startsWith('psd ') ||
        nameLower.match(/^psd\s*(i{1,3}|1|2|3)$/i) ||
        nameLower.includes('clearing') ||
        nameLower.includes('class') ||
        nameLower.includes('unit') ||
        nameLower.includes('lesson') ||
        nameLower.includes('topic') ||
        nameLower.includes('motion') ||
        nameLower.includes('teacher') ||
        nameLower.includes('comments') ||
        nameLower.includes('speaking time') ||
        nameLower.includes('what was') ||
        nameLower.includes('what part') ||
        nameLower.includes('observations') ||
        nameLower.includes('feedback') ||
        nameLower.match(/^\d+\.\d+/) || // Unit numbers
        nameLower.match(/^copy\s+of/i) ||
        /^[^a-zA-Z]*$/.test(name) || // No letters
        /^\d+$/.test(name) // Just numbers
    ) {
      return false;
    }
    
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(name)) return false;
    
    // Check for name-like patterns
    // Should start with a capital letter or contain typical name characters
    const hasNameCharacters = /^[A-Z][a-z]/.test(name) || // Starts with capital
                             /[A-Z][a-z].*\s+[A-Z][a-z]/.test(name) || // First Last pattern
                             /^[a-z]+$/i.test(name.replace(/\s+/g, '')); // Simple name
    
    // Length should be reasonable for a name (2-30 characters)
    const reasonableLength = name.length >= 2 && name.length <= 30;
    
    // Should not be all caps (unless it's an abbreviation, but those aren't names)
    const notAllCaps = name !== name.toUpperCase() || name.length <= 4;
    
    return hasNameCharacters && reasonableLength && notAllCaps;
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
    
    const cleanContent = this.cleanFeedbackContent(content, feedbackType, htmlContent);
    
    // Extract rubric scores from HTML content if available
    const rubricScores = htmlContent ? this.extractRubricScores(htmlContent, studentName) : {};
    
    // Generate unique ID combining student name, feedback type, class code, file info, content hash, and timestamp
    const fileBaseName = path.basename(filePath, path.extname(filePath));
    const contentHash = require('crypto').createHash('md5').update(section + filePath).digest('hex').substring(0, 8);
    const instructorName = instructor || 'unknown';
    const timestamp = Date.now().toString(36); // Base36 timestamp for shorter string
    const motionStr = motion || 'no-motion';
    const topicStr = topic || 'no-topic';
    const uniqueId = `${studentName}_${feedbackType}_${classInfo.classCode}_${classInfo.lessonNumber}_${fileBaseName}_${instructorName}_${motionStr.substring(0, 10)}_${topicStr.substring(0, 10)}_${contentHash}_${timestamp}`.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
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
      instructor: instructor || undefined,
      rubricScores: Object.keys(rubricScores).length > 0 ? rubricScores : undefined
    };

    return feedback;
  }
}

export default FeedbackParser;