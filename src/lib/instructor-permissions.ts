import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"

export interface InstructorPermissions {
  canAccessAllData: boolean
  allowedInstructors: string[]
  instructorName: string
}

/**
 * Get instructor permissions based on session
 */
export async function getInstructorPermissions(): Promise<InstructorPermissions> {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    throw new Error('No session found')
  }

  const isTestInstructor = session.user.instructorType === 'all_access'
  
  if (isTestInstructor) {
    return {
      canAccessAllData: true,
      allowedInstructors: ['Jami', 'Srijan', 'Tamkeen', 'all'], // 'all' for files not in specific folders
      instructorName: 'Test Instructor'
    }
  }

  // For regular instructors, map their name to allowed data
  // This would typically come from the database or be inferred from their email/name
  const instructorName = mapUserToInstructorName(session.user.name, session.user.email)
  
  return {
    canAccessAllData: false,
    allowedInstructors: [instructorName],
    instructorName: instructorName
  }
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