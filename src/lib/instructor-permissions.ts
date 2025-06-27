import { StudentFeedback } from './feedback-parser';

export interface InstructorPermissions {
  canAccessAllData: boolean
  allowedInstructors: string[]
  instructorName: string
}

/**
 * Get instructor permissions based on name
 */
export function getInstructorPermissions(instructorName: string): InstructorPermissions {
  // Test instructor and Srijan have access to all data
  if (instructorName.toLowerCase() === 'test instructor') {
    return {
      instructorName: 'Test Instructor',
      canAccessAllData: true,
      allowedInstructors: ['*'] // All instructors
    };
  }
  
  if (instructorName.toLowerCase() === 'srijan') {
    return {
      instructorName: 'Srijan',
      canAccessAllData: true,
      allowedInstructors: ['*'] // All instructors
    };
  }
  
  // Map of instructor names to their allowed data access
  const instructorMappings: Record<string, string[]> = {
    'saurav': ['Saurav', 'Saurav (Sub)'],
    'srijan': ['Srijan'],
    'jami': ['Jami'],
    'mai': ['Mai', 'Mai (Sub)'],
    'tamkeen': ['Tamkeen'],
    'naveen': ['Naveen', 'Naveen (Sub)'],
    'gabi': ['Gabi (Sub)'] // Gabi only sees their substitutions
  };
  
  // Find the instructor in mappings
  const lowerName = instructorName.toLowerCase();
  for (const [key, allowedInstructors] of Object.entries(instructorMappings)) {
    if (lowerName.includes(key)) {
      return {
        instructorName: instructorName,
        canAccessAllData: false,
        allowedInstructors
      };
    }
  }
  
  // Default: instructor can only see feedback where instructor field is undefined or matches their name
  return {
    instructorName: instructorName,
    canAccessAllData: false,
    allowedInstructors: [instructorName, undefined as any]
  };
}

/**
 * Map user account to instructor name for filtering
 */
function mapUserToInstructorName(name: string, email: string): string {
  // You can customize this mapping based on your user accounts
  const nameLower = name?.toLowerCase() || ''
  const emailLower = email?.toLowerCase() || ''
  
  if (nameLower.includes('jami') || emailLower.includes('jami')) {
    return 'Jami'
  }
  
  if (nameLower.includes('srijan') || emailLower.includes('srijan') || emailLower.includes('saurav')) {
    return 'Srijan'
  }
  
  if (nameLower.includes('tamkeen') || emailLower.includes('tamkeen')) {
    return 'Tamkeen'
  }
  
  // Default fallback - could be enhanced to check against database
  return name || 'Unknown'
}

/**
 * Filter feedback data based on instructor permissions
 */
export function filterFeedbackByPermissions(
  feedbackData: any[], 
  permissions: InstructorPermissions
): any[] {
  if (permissions.canAccessAllData) {
    return feedbackData // Test instructor sees everything
  }
  
  // Regular instructors only see their own data
  return feedbackData.filter(feedback => {
    if (!feedback.instructor) {
      return false // Skip feedback without instructor attribution
    }
    
    return permissions.allowedInstructors.includes(feedback.instructor)
  })
}

/**
 * Check if instructor can access specific student data
 */
export function canAccessStudent(
  studentInstructor: string | undefined,
  permissions: InstructorPermissions
): boolean {
  if (permissions.canAccessAllData) {
    return true
  }
  
  if (!studentInstructor) {
    return false
  }
  
  return permissions.allowedInstructors.includes(studentInstructor)
}