import { drizzleDb } from './src/lib/database/drizzle';
import { sql } from 'drizzle-orm';
import { debateGrowthEngine } from './src/lib/analytics/debate-growth-engine';

async function compareStudents() {
  console.log('Comparing Athan and Marcel\n');
  console.log('=' .repeat(70));
  
  // Find these students
  const students = await drizzleDb.execute(sql`
    SELECT 
      s.id,
      s.name,
      s.grade_level
    FROM students s
    WHERE s.name ILIKE '%athan%' 
       OR s.name ILIKE '%marcel%'
    LIMIT 10
  `);
  
  console.log('Found students:');
  students.rows.forEach(s => {
    console.log(`  ${s.name} (${s.grade_level}): ${s.id}`);
  });
  
  // For each student, get their feedback and calculate scores
  for (const student of students.rows) {
    if (!student.name) continue;
    
    console.log(`\n${'-'.repeat(70)}`);
    console.log(`Analyzing: ${student.name} (${student.grade_level})`);
    
    // Get all their feedback with rubrics
    const feedback = await drizzleDb.execute(sql`
      SELECT 
        unit_number,
        lesson_number,
        rubric_scores,
        feedback_date
      FROM parsed_student_feedback
      WHERE student_id = ${student.id}
      AND rubric_scores IS NOT NULL
      ORDER BY unit_number, lesson_number
    `);
    
    console.log(`\nFeedback records with rubrics: ${feedback.rows.length}`);
    
    if (feedback.rows.length > 0) {
      // Calculate average rubric scores
      let totalSum = 0;
      let totalCount = 0;
      const allRubricValues: number[] = [];
      
      feedback.rows.forEach((f, idx) => {
        const rubrics = f.rubric_scores as any;
        let rowSum = 0;
        let rowCount = 0;
        
        Object.entries(rubrics).forEach(([key, value]) => {
          if (value !== null && value !== 'N/A' && value !== undefined) {
            const numVal = typeof value === 'number' ? value : parseFloat(value as string);
            if (!isNaN(numVal)) {
              rowSum += numVal;
              rowCount++;
              totalSum += numVal;
              totalCount++;
              allRubricValues.push(numVal);
            }
          }
        });
        
        if (rowCount > 0) {
          const rowAvg = rowSum / rowCount;
          console.log(`  Unit ${f.unit_number}: ${rowCount} rubrics, avg = ${rowAvg.toFixed(2)}/5 (${(rowAvg * 20).toFixed(0)}%)`);
        }
      });
      
      const overallAvg = totalCount > 0 ? totalSum / totalCount : 0;
      console.log(`\nRaw rubric average: ${overallAvg.toFixed(2)}/5 = ${(overallAvg * 20).toFixed(0)}%`);
      
      // Show min/max for context
      if (allRubricValues.length > 0) {
        console.log(`Range: ${Math.min(...allRubricValues)} - ${Math.max(...allRubricValues)}`);
        console.log(`Total rubric values counted: ${totalCount}`);
      }
    }
    
    // Now get what the growth engine calculates
    try {
      console.log('\nGrowth Engine Calculation:');
      const growth = await debateGrowthEngine.calculateStudentGrowth(student.id as string, 'month');
      
      console.log(`  Content: ${growth.content.score}%`);
      console.log(`  Style: ${growth.style.score}%`);
      console.log(`  Strategy: ${growth.strategy.score}%`);
      console.log(`  Overall: ${growth.overall.score}%`);
      
      // Calculate what the simple average would be
      const simpleAvg = Math.round((growth.content.score + growth.style.score + growth.strategy.score) / 3);
      console.log(`  Simple avg of dimensions: ${simpleAvg}%`);
      
      // Show the weighted calculation
      const weighted = Math.round(
        growth.content.score * 0.4 + 
        growth.style.score * 0.3 + 
        growth.strategy.score * 0.3
      );
      console.log(`  Weighted (40/30/30): ${weighted}%`);
      
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
    }
  }
  
  // Now let's specifically check the calculation logic for a student
  console.log(`\n${'='.repeat(70)}`);
  console.log('Detailed Calculation Check:\n');
  
  // Get one student with rubrics and trace through the calculation
  const testStudent = students.rows.find(s => s.name?.includes('than') || s.name?.includes('Marcel'));
  
  if (testStudent) {
    console.log(`Testing with: ${testStudent.name}`);
    
    const feedback = await drizzleDb.execute(sql`
      SELECT 
        rubric_scores
      FROM parsed_student_feedback
      WHERE student_id = ${testStudent.id}
      AND rubric_scores IS NOT NULL
      LIMIT 1
    `);
    
    if (feedback.rows.length > 0) {
      const rubrics = feedback.rows[0].rubric_scores as any;
      console.log('\nSample rubrics:', rubrics);
      
      // Manual calculation
      console.log('\nManual calculation:');
      
      // Content (rubrics 4, 5, 7)
      let contentScore = 0;
      let contentMax = 0;
      if (rubrics.rubric_4 !== null) {
        contentScore += rubrics.rubric_4;
        contentMax += 5;
        console.log(`  Rubric 4 (Argument): ${rubrics.rubric_4}/5`);
      }
      if (rubrics.rubric_5 !== null) {
        contentScore += rubrics.rubric_5;
        contentMax += 5;
        console.log(`  Rubric 5 (Theory): ${rubrics.rubric_5}/5`);
      }
      if (rubrics.rubric_7 !== null) {
        const reb = rubrics.rubric_7;
        if (reb < 4) {
          contentScore += reb;
        } else {
          contentScore += reb * 0.8;
        }
        contentMax += 5;
        console.log(`  Rubric 7 (Rebuttal): ${rubrics.rubric_7}/5 -> contributes ${reb < 4 ? reb : reb * 0.8}`);
      }
      const contentPct = contentMax > 0 ? (contentScore / contentMax) * 100 : 50;
      console.log(`  Content = ${contentScore}/${contentMax} = ${contentPct.toFixed(1)}%`);
      
      // Style (rubrics 1, 3, 8)
      let styleScore = 0;
      let styleCount = 0;
      if (rubrics.rubric_1 !== null) {
        styleScore += rubrics.rubric_1;
        styleCount++;
        console.log(`  Rubric 1 (Time): ${rubrics.rubric_1}/5`);
      }
      if (rubrics.rubric_3 !== null) {
        styleScore += rubrics.rubric_3;
        styleCount++;
        console.log(`  Rubric 3 (Style): ${rubrics.rubric_3}/5`);
      }
      if (rubrics.rubric_8 !== null) {
        styleScore += rubrics.rubric_8;
        styleCount++;
        console.log(`  Rubric 8 (Feedback): ${rubrics.rubric_8}/5`);
      }
      const stylePct = styleCount > 0 ? (styleScore / (styleCount * 5)) * 100 : 50;
      console.log(`  Style = ${styleScore}/${styleCount * 5} = ${stylePct.toFixed(1)}%`);
      
      // Overall
      const overall = contentPct * 0.4 + stylePct * 0.3 + (50 * 0.3); // Using 50% for strategy as placeholder
      console.log(`\nOverall = ${contentPct.toFixed(1)} * 0.4 + ${stylePct.toFixed(1)} * 0.3 + strategy * 0.3`);
      console.log(`        = ${overall.toFixed(1)}%`);
    }
  }
  
  process.exit(0);
}

compareStudents();