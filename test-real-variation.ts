import { drizzleDb } from './src/lib/database/drizzle';
import { parsedStudentFeedback } from './src/lib/database/schema';
import { sql, isNotNull } from 'drizzle-orm';

async function testRealVariation() {
  console.log('Testing Real Score Variation\n');
  console.log('=' .repeat(60));
  
  // Get unique students by name (since many have null IDs)
  const uniqueStudents = await drizzleDb
    .select({
      studentName: parsedStudentFeedback.studentName,
      count: sql<number>`count(*)`,
      hasRubrics: sql<boolean>`bool_or(rubric_scores is not null)`
    })
    .from(parsedStudentFeedback)
    .groupBy(parsedStudentFeedback.studentName)
    .having(sql`bool_or(rubric_scores is not null)`)
    .limit(20);
  
  console.log(`Found ${uniqueStudents.length} students with rubric data\n`);
  
  const allScores: any[] = [];
  
  for (const student of uniqueStudents) {
    // Get latest feedback with rubrics for this student
    const feedback = await drizzleDb
      .select()
      .from(parsedStudentFeedback)
      .where(sql`${parsedStudentFeedback.studentName} = ${student.studentName} 
        AND ${parsedStudentFeedback.rubricScores} IS NOT NULL`)
      .orderBy(sql`${parsedStudentFeedback.feedbackDate} DESC NULLS LAST`)
      .limit(1);
    
    if (feedback.length > 0 && feedback[0].rubricScores) {
      const rubrics = feedback[0].rubricScores as any;
      
      // Calculate scores
      const content = calculateContent(rubrics);
      const style = calculateStyle(rubrics);
      const strategy = calculateStrategy(rubrics);
      const overall = Math.round(content * 0.4 + style * 0.3 + strategy * 0.3);
      
      console.log(`${student.studentName.padEnd(25)} Overall: ${overall}% (C:${content.toFixed(0)}% S:${style.toFixed(0)}% St:${strategy.toFixed(0)}%)`);
      
      allScores.push({ 
        name: student.studentName, 
        content: Math.round(content),
        style: Math.round(style),
        strategy: Math.round(strategy),
        overall 
      });
    }
  }
  
  // Show distribution analysis
  console.log('\n' + '=' .repeat(60));
  console.log('SCORE DISTRIBUTION ANALYSIS:\n');
  
  if (allScores.length > 0) {
    ['overall', 'content', 'style', 'strategy'].forEach(dimension => {
      const scores = allScores.map(s => s[dimension]);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const stdDev = Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length);
      
      console.log(`${dimension.toUpperCase()}:`);
      console.log(`  Range: ${min}% - ${max}%`);
      console.log(`  Average: ${avg.toFixed(1)}%`);
      console.log(`  Std Dev: ${stdDev.toFixed(1)}%`);
      
      // Show distribution buckets
      const buckets: Record<string, number> = {};
      scores.forEach(score => {
        const bucket = `${Math.floor(score / 10) * 10}-${Math.floor(score / 10) * 10 + 10}`;
        buckets[bucket] = (buckets[bucket] || 0) + 1;
      });
      
      console.log('  Distribution:');
      Object.entries(buckets)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([range, count]) => {
          const bar = '█'.repeat(count);
          console.log(`    ${range.padEnd(7)}% ${bar} (${count})`);
        });
      console.log();
    });
  }
  
  process.exit(0);
}

function calculateContent(rubrics: any): number {
  let score = 0;
  let maxScore = 0;
  
  if (rubrics.rubric_4 !== null && rubrics.rubric_4 !== undefined) {
    score += rubrics.rubric_4;
    maxScore += 5;
  }
  if (rubrics.rubric_5 !== null && rubrics.rubric_5 !== undefined) {
    score += rubrics.rubric_5;
    maxScore += 5;
  }
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
  
  if (rubrics.rubric_1 !== null && rubrics.rubric_1 !== undefined) {
    score += rubrics.rubric_1;
    count++;
  }
  if (rubrics.rubric_3 !== null && rubrics.rubric_3 !== undefined) {
    score += rubrics.rubric_3;
    count++;
  }
  if (rubrics.rubric_8 !== null && rubrics.rubric_8 !== undefined) {
    score += rubrics.rubric_8;
    count++;
  }
  
  return count > 0 ? (score / (count * 5)) * 100 : 50;
}

function calculateStrategy(rubrics: any): number {
  let strategyScore = 0;
  let maxScore = 0;
  
  if (rubrics.rubric_2 !== null && rubrics.rubric_2 !== undefined) {
    strategyScore += rubrics.rubric_2;
    maxScore += 5;
  }
  if (rubrics.rubric_6 !== null && rubrics.rubric_6 !== undefined) {
    strategyScore += rubrics.rubric_6;
    maxScore += 5;
  }
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

testRealVariation();