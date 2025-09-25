import { drizzleDb } from './src/lib/database/drizzle';
import { students, users, parsedStudentFeedback } from './src/lib/database/schema';
import { sql, eq } from 'drizzle-orm';

async function checkScores() {
  // Get students with their names
  const studentData = await drizzleDb
    .select({
      studentId: students.id,
      studentName: users.name,
      gradeLevel: students.gradeLevel
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .limit(5);
  
  console.log('Checking scores for', studentData.length, 'students:\n');
  
  for (const student of studentData) {
    console.log(`\n${student.studentName} (${student.gradeLevel}):`);
    console.log('-'.repeat(40));
    
    // Get their feedback
    const feedback = await drizzleDb
      .select()
      .from(parsedStudentFeedback)
      .where(eq(parsedStudentFeedback.studentId, student.studentId))
      .limit(3);
    
    if (feedback.length === 0) {
      console.log('  No feedback found');
      continue;
    }
    
    console.log(`  Found ${feedback.length} feedback records`);
    
    // Check latest feedback
    const latest = feedback[0];
    if (latest.rubricScores) {
      try {
        const rubrics = JSON.parse(latest.rubricScores as string);
        console.log('  Rubric scores:');
        
        // Show actual values
        const validRubrics: any = {};
        let hasValidScores = false;
        
        Object.entries(rubrics).forEach(([key, value]: [string, any]) => {
          if (value !== 'N/A' && value !== null && value !== undefined && value !== '') {
            validRubrics[key] = parseFloat(value);
            hasValidScores = true;
            console.log(`    ${key}: ${value}/5`);
          }
        });
        
        if (hasValidScores) {
          // Calculate what the scores should be
          const content = calculateContentScore(validRubrics);
          const style = calculateStyleScore(validRubrics);
          const strategy = calculateStrategyScore(validRubrics);
          const overall = (content * 0.4 + style * 0.3 + strategy * 0.3);
          
          console.log('  \nCalculated scores:');
          console.log(`    Content: ${content.toFixed(1)}%`);
          console.log(`    Style: ${style.toFixed(1)}%`);
          console.log(`    Strategy: ${strategy.toFixed(1)}%`);
          console.log(`    Overall: ${overall.toFixed(1)}%`);
        } else {
          console.log('  All rubrics are N/A - will use attendance fallback');
        }
      } catch (e) {
        console.log('  Error parsing rubrics:', e);
      }
    } else {
      console.log('  No rubric scores - will use attendance fallback');
    }
  }
  
  process.exit(0);
}

function calculateContentScore(rubrics: any): number {
  let score = 0;
  let maxScore = 0;
  
  // Rubric 4: Argument quality
  if (rubrics.rubric_4 !== undefined) {
    score += rubrics.rubric_4;
    maxScore += 5;
  }
  
  // Rubric 5: Theory application
  if (rubrics.rubric_5 !== undefined) {
    score += rubrics.rubric_5;
    maxScore += 5;
  }
  
  // Rubric 7: Rebuttal (partial)
  if (rubrics.rubric_7 !== undefined) {
    if (rubrics.rubric_7 < 4) {
      score += rubrics.rubric_7;
    } else {
      score += rubrics.rubric_7 * 0.8;
    }
    maxScore += 5;
  }
  
  return maxScore > 0 ? (score / maxScore) * 100 : 50;
}

function calculateStyleScore(rubrics: any): number {
  let score = 0;
  let maxScore = 0;
  
  // Rubric 1: Time management
  if (rubrics.rubric_1 !== undefined) {
    score += rubrics.rubric_1;
    maxScore += 5;
  }
  
  // Rubric 3: Style & persuasion
  if (rubrics.rubric_3 !== undefined) {
    score += rubrics.rubric_3;
    maxScore += 5;
  }
  
  // Rubric 8: Feedback application
  if (rubrics.rubric_8 !== undefined) {
    score += rubrics.rubric_8;
    maxScore += 5;
  }
  
  return maxScore > 0 ? (score / maxScore) * 100 : 50;
}

function calculateStrategyScore(rubrics: any): number {
  let score = 0;
  let maxScore = 0;
  
  // Rubric 2: POI
  if (rubrics.rubric_2 !== undefined) {
    score += rubrics.rubric_2;
    maxScore += 5;
  }
  
  // Rubric 6: Team support
  if (rubrics.rubric_6 !== undefined) {
    score += rubrics.rubric_6;
    maxScore += 5;
  }
  
  // Rubric 7: Rebuttal (if high score)
  if (rubrics.rubric_7 !== undefined) {
    if (rubrics.rubric_7 >= 4) {
      score += rubrics.rubric_7;
    } else {
      score += rubrics.rubric_7 * 0.2;
    }
    maxScore += 5;
  }
  
  return maxScore > 0 ? (score / maxScore) * 100 : 50;
}

checkScores();