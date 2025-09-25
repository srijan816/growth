import { drizzleDb } from './src/lib/database/drizzle';
import { sql } from 'drizzle-orm';
import { debateGrowthEngine } from './src/lib/analytics/debate-growth-engine';

async function checkSpecificStudents() {
  console.log('Checking Specific Secondary Students\n');
  console.log('=' .repeat(70));
  
  // Find these students by name
  const targetNames = ['Albert', 'Selina', 'Isaiah', 'Marcel'];
  
  for (const name of targetNames) {
    const students = await drizzleDb.execute(sql`
      SELECT 
        s.id,
        s.name,
        s.grade_level,
        COUNT(f.id) as feedback_count,
        COUNT(f.rubric_scores) as rubric_count
      FROM students s
      LEFT JOIN parsed_student_feedback f ON f.student_id = s.id
      WHERE s.name ILIKE ${`%${name}%`}
      GROUP BY s.id, s.name, s.grade_level
      LIMIT 5
    `);
    
    for (const student of students.rows) {
      if (!student.id) continue;
      
      console.log(`\n${'-'.repeat(70)}`);
      console.log(`Student: ${student.name} (${student.grade_level})`);
      console.log(`ID: ${student.id}`);
      console.log(`Feedback records: ${student.feedback_count}, With rubrics: ${student.rubric_count}`);
      
      // Get their latest feedback with rubrics
      const feedback = await drizzleDb.execute(sql`
        SELECT 
          rubric_scores,
          feedback_date
        FROM parsed_student_feedback
        WHERE student_id = ${student.id}
        AND rubric_scores IS NOT NULL
        ORDER BY feedback_date DESC NULLS LAST
        LIMIT 1
      `);
      
      if (feedback.rows.length > 0 && feedback.rows[0].rubric_scores) {
        const rubrics = feedback.rows[0].rubric_scores as any;
        console.log('\nLatest Rubric Scores:');
        Object.entries(rubrics).forEach(([key, value]) => {
          if (value !== null && value !== 'N/A') {
            console.log(`  ${key}: ${value}`);
          }
        });
        
        // Calculate what the scores SHOULD be
        const content = calculateContent(rubrics);
        const style = calculateStyle(rubrics);
        const strategy = calculateStrategy(rubrics);
        const overall = Math.round(content * 0.4 + style * 0.3 + strategy * 0.3);
        
        console.log('\nCalculated Scores (from rubrics):');
        console.log(`  Content: ${content.toFixed(1)}%`);
        console.log(`  Style: ${style.toFixed(1)}%`);
        console.log(`  Strategy: ${strategy.toFixed(1)}%`);
        console.log(`  Overall: ${overall}%`);
      }
      
      // Now get what the growth engine returns
      try {
        console.log('\nGrowth Engine Output:');
        const growth = await debateGrowthEngine.calculateStudentGrowth(student.id as string, 'month');
        console.log(`  Content: ${growth.content.score}%`);
        console.log(`  Style: ${growth.style.score}%`);
        console.log(`  Strategy: ${growth.strategy.score}%`);
        console.log(`  Overall: ${growth.overall.score}%`);
        
        // Check if it matches our calculation
        if (feedback.rows.length > 0) {
          const rubrics = feedback.rows[0].rubric_scores as any;
          const expectedOverall = Math.round(
            calculateContent(rubrics) * 0.4 + 
            calculateStyle(rubrics) * 0.3 + 
            calculateStrategy(rubrics) * 0.3
          );
          
          if (growth.overall.score !== expectedOverall) {
            console.log(`\n⚠️  MISMATCH: Engine says ${growth.overall.score}%, should be ${expectedOverall}%`);
          }
        }
      } catch (e: any) {
        console.log(`  Error: ${e.message}`);
      }
    }
  }
  
  // Now let's check all students who have exactly 60% or 50%
  console.log(`\n${'='.repeat(70)}`);
  console.log('Checking for pattern in 50% and 60% scores...\n');
  
  // Get a batch of students and calculate their scores
  const batch = await drizzleDb.execute(sql`
    SELECT DISTINCT
      s.id,
      s.name,
      s.grade_level
    FROM students s
    INNER JOIN parsed_student_feedback f ON f.student_id = s.id
    WHERE f.rubric_scores IS NOT NULL
    AND s.grade_level LIKE '%7%' OR s.grade_level LIKE '%8%' OR s.grade_level LIKE '%9%'
    LIMIT 20
  `);
  
  const scoreDistribution: Record<number, string[]> = {};
  
  for (const student of batch.rows) {
    try {
      const growth = await debateGrowthEngine.calculateStudentGrowth(student.id as string, 'month');
      const score = growth.overall.score;
      
      if (!scoreDistribution[score]) {
        scoreDistribution[score] = [];
      }
      scoreDistribution[score].push(student.name || 'Unknown');
      
      // If it's exactly 50 or 60, show details
      if (score === 50 || score === 60) {
        console.log(`${student.name} (${student.grade_level}): ${score}%`);
        console.log(`  Components: C=${growth.content.score}% S=${growth.style.score}% St=${growth.strategy.score}%`);
      }
    } catch (e) {
      // Skip errors
    }
  }
  
  console.log('\nScore Distribution:');
  Object.entries(scoreDistribution)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([score, names]) => {
      console.log(`  ${score}%: ${names.length} students`);
      if (Number(score) === 50 || Number(score) === 60) {
        console.log(`    -> ${names.join(', ')}`);
      }
    });
  
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

checkSpecificStudents();