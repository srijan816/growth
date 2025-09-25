import { drizzleDb } from './src/lib/database/drizzle';
import { parsedStudentFeedback, students, users } from './src/lib/database/schema';
import { sql, eq, isNull, and } from 'drizzle-orm';

async function fixStudentLinks() {
  console.log('Fixing Student ID Links in Feedback\n');
  console.log('=' .repeat(60));
  
  // Count feedback records with null student_id
  const nullCount = await drizzleDb
    .select({ count: sql<number>`count(*)` })
    .from(parsedStudentFeedback)
    .where(isNull(parsedStudentFeedback.studentId));
  
  console.log(`Found ${nullCount[0].count} feedback records with NULL student_id\n`);
  
  // Get all students with their names
  const studentMap = await drizzleDb
    .select({
      studentId: students.id,
      userName: users.name
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId));
  
  console.log(`Found ${studentMap.length} students in the system\n`);
  
  // Create a name to ID mapping
  const nameToId = new Map<string, string>();
  studentMap.forEach(s => {
    if (s.userName) {
      // Store various name formats
      nameToId.set(s.userName.toLowerCase(), s.studentId);
      nameToId.set(s.userName.toLowerCase().replace(/\s+/g, ''), s.studentId);
      
      // Try first name only
      const firstName = s.userName.split(' ')[0];
      if (!nameToId.has(firstName.toLowerCase())) {
        nameToId.set(firstName.toLowerCase(), s.studentId);
      }
    }
  });
  
  // Get feedback records with null student_id
  const feedbackToFix = await drizzleDb
    .select({
      id: parsedStudentFeedback.id,
      studentName: parsedStudentFeedback.studentName
    })
    .from(parsedStudentFeedback)
    .where(isNull(parsedStudentFeedback.studentId))
    .limit(100);
  
  console.log(`Attempting to fix ${feedbackToFix.length} feedback records...\n`);
  
  let fixed = 0;
  let notFound: string[] = [];
  
  for (const feedback of feedbackToFix) {
    if (!feedback.studentName) continue;
    
    // Try to find matching student
    const nameLower = feedback.studentName.toLowerCase();
    const nameNoSpace = nameLower.replace(/\s+/g, '');
    
    let studentId = nameToId.get(nameLower) || 
                    nameToId.get(nameNoSpace) ||
                    nameToId.get(feedback.studentName.split(' ')[0].toLowerCase());
    
    if (studentId) {
      // Update the feedback record
      await drizzleDb
        .update(parsedStudentFeedback)
        .set({ studentId })
        .where(eq(parsedStudentFeedback.id, feedback.id));
      
      console.log(`  ✓ Linked "${feedback.studentName}" to student ID ${studentId}`);
      fixed++;
    } else {
      if (!notFound.includes(feedback.studentName)) {
        notFound.push(feedback.studentName);
      }
    }
  }
  
  console.log(`\n${'-'.repeat(60)}`);
  console.log(`Fixed ${fixed} feedback records`);
  
  if (notFound.length > 0) {
    console.log(`\nCould not find students for ${notFound.length} names:`);
    notFound.slice(0, 10).forEach(name => {
      console.log(`  - ${name}`);
    });
    if (notFound.length > 10) {
      console.log(`  ... and ${notFound.length - 10} more`);
    }
  }
  
  // Show updated stats
  const newNullCount = await drizzleDb
    .select({ count: sql<number>`count(*)` })
    .from(parsedStudentFeedback)
    .where(isNull(parsedStudentFeedback.studentId));
  
  console.log(`\nRemaining NULL student_ids: ${newNullCount[0].count}`);
  
  process.exit(0);
}

fixStudentLinks();