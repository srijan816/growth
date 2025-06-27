/**
 * Infer instructor from class code patterns
 * This is a temporary solution until we add the instructor column to the database
 */
export function inferInstructorFromClassCode(classCode: string): string | null {
  if (!classCode) return null;
  
  const code = classCode.toLowerCase();
  
  // Common patterns for instructor assignment based on class codes
  // These patterns can be updated based on actual class code structure
  
  // Jami's classes
  if (code.includes('jami') || 
      code.match(/01ipded240[1-5]/)) {
    return 'Jami';
  }
  
  // Srijan's classes  
  if (code.includes('srijan') ||
      code.match(/02ipdec240[1-4]/) ||
      code.match(/02ipddc240[1-2]/)) {
    return 'Srijan';
  }
  
  // Tamkeen's classes
  if (code.includes('tamkeen') ||
      code.match(/01opdcd240[1-3]/) ||
      code.match(/02opdec240[1]/)) {
    return 'Tamkeen';
  }
  
  return null;
}

/**
 * Create a mapping of class codes to instructors based on feedback data
 */
export function createClassCodeInstructorMapping(feedbackData: any[]): Map<string, string> {
  const mapping = new Map<string, string>();
  
  feedbackData.forEach(feedback => {
    if (feedback.instructor && feedback.classCode) {
      mapping.set(feedback.classCode, feedback.instructor);
    }
  });
  
  return mapping;
}

/**
 * Get instructor for a class code, trying multiple approaches
 */
export function getInstructorForClassCode(
  classCode: string, 
  mapping?: Map<string, string>
): string | null {
  // First try the mapping if available
  if (mapping && mapping.has(classCode)) {
    return mapping.get(classCode)!;
  }
  
  // Fall back to inference
  return inferInstructorFromClassCode(classCode);
}