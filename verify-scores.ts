import { drizzleDb } from './src/lib/database/drizzle';
import { parsedStudentFeedback } from './src/lib/database/schema';
import { isNotNull, sql } from 'drizzle-orm';

async function verifyScores() {
  console.log('Verifying Score Calculations with Real Data\n');
  console.log('=' .repeat(60));
  
  // Get unique students with rubric scores
  const uniqueStudents = await drizzleDb
    .selectDistinct({
      studentId: parsedStudentFeedback.studentId,
      studentName: parsedStudentFeedback.studentName
    })
    .from(parsedStudentFeedback)
    .where(isNotNull(parsedStudentFeedback.rubricScores))
    .limit(10);
  
  console.log(`\nAnalyzing ${uniqueStudents.length} students with rubric data:\n`);
  
  const allScores: any[] = [];
  
  for (const student of uniqueStudents) {
    // Get all feedback for this student
    const feedbacks = await drizzleDb
      .select()
      .from(parsedStudentFeedback)
      .where(sql`${parsedStudentFeedback.studentId} = ${student.studentId}`)
      .orderBy(parsedStudentFeedback.feedbackDate);
    
    const validFeedbacks = feedbacks.filter(f => f.rubricScores);
    
    if (validFeedbacks.length > 0) {
      console.log(`\n${student.studentName}: ${validFeedbacks.length} feedback records`);
      
      // Process latest feedback
      const latest = validFeedbacks[validFeedbacks.length - 1];
      const rubrics = latest.rubricScores as any;
      
      // Show raw scores
      console.log('  Raw rubrics:', Object.entries(rubrics)
        .map(([k, v]) => `${k}=${v}`)
        .join(', '));
      
      // Calculate dimension scores exactly as the engine does
      const content = calculateContent(rubrics);
      const style = calculateStyle(rubrics);
      const strategy = calculateStrategy(rubrics);
      const overall = Math.round(content * 0.4 + style * 0.3 + strategy * 0.3);
      
      console.log(`  Content: ${content.toFixed(1)}%`);
      console.log(`  Style: ${style.toFixed(1)}%`);
      console.log(`  Strategy: ${strategy.toFixed(1)}%`);
      console.log(`  Overall: ${overall}%`);
      
      allScores.push({ name: student.studentName, content, style, strategy, overall });
    }
  }
  
  // Show distribution
  console.log('\n' + '=' .repeat(60));
  console.log('SCORE DISTRIBUTION:\n');
  
  if (allScores.length > 0) {
    const overallScores = allScores.map(s => s.overall);
    const min = Math.min(...overallScores);
    const max = Math.max(...overallScores);
    const avg = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
    
    console.log(`Range: ${min}% - ${max}%`);
    console.log(`Average: ${avg.toFixed(1)}%`);
    console.log(`Spread: ${max - min}%`);
    
    // Show all students sorted by score
    console.log('\nStudents by Overall Score:');
    allScores
      .sort((a, b) => b.overall - a.overall)
      .forEach(s => {
        console.log(`  ${s.overall}% - ${s.name}`);
      });
  }
  
  process.exit(0);
}

function calculateContent(rubrics: any): number {
  let score = 0;
  let maxScore = 0;
  
  // Rubric 4: Argument quality
  if (rubrics.rubric_4 !== null && rubrics.rubric_4 !== undefined) {
    score += rubrics.rubric_4;
    maxScore += 5;
  }
  
  // Rubric 5: Theory application  
  if (rubrics.rubric_5 !== null && rubrics.rubric_5 !== undefined) {
    score += rubrics.rubric_5;
    maxScore += 5;
  }
  
  // Rubric 7: Rebuttal (conditional contribution)
  if (rubrics.rubric_7 !== null && rubrics.rubric_7 !== undefined) {
    const rebuttal = rubrics.rubric_7;
    if (rebuttal < 4) {
      score += rebuttal;
    } else {
      score += rebuttal * 0.8;
    }
    maxScore += 5;
  }
  
  return maxScore > 0 ? (score / maxScore) * 100 : 50;
}

function calculateStyle(rubrics: any): number {
  let score = 0;
  let count = 0;
  
  // Rubric 1: Time management
  if (rubrics.rubric_1 !== null && rubrics.rubric_1 !== undefined) {
    score += rubrics.rubric_1;
    count++;
  }
  
  // Rubric 3: Style & persuasion
  if (rubrics.rubric_3 !== null && rubrics.rubric_3 !== undefined) {
    score += rubrics.rubric_3;
    count++;
  }
  
  // Rubric 8: Feedback application
  if (rubrics.rubric_8 !== null && rubrics.rubric_8 !== undefined) {
    score += rubrics.rubric_8;
    count++;
  }
  
  return count > 0 ? (score / (count * 5)) * 100 : 50;
}

function calculateStrategy(rubrics: any): number {
  let strategyScore = 0;
  let maxScore = 0;
  
  // Rubric 2: POI
  if (rubrics.rubric_2 !== null && rubrics.rubric_2 !== undefined) {
    strategyScore += rubrics.rubric_2;
    maxScore += 5;
  }
  
  // Rubric 6: Team support
  if (rubrics.rubric_6 !== null && rubrics.rubric_6 !== undefined) {
    strategyScore += rubrics.rubric_6;
    maxScore += 5;
  }
  
  // Rubric 7: Rebuttal (conditional - high scores count toward strategy)
  if (rubrics.rubric_7 !== null && rubrics.rubric_7 !== undefined) {
    const rebuttal = rubrics.rubric_7;
    if (rebuttal >= 4) {
      strategyScore += rebuttal;
    } else {
      strategyScore += rebuttal * 0.2;
    }
    maxScore += 5;
  }
  
  return maxScore > 0 ? (strategyScore / maxScore) * 100 : 50;
}

verifyScores();