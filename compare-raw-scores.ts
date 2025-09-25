import { drizzleDb } from './src/lib/database/drizzle';
import { sql } from 'drizzle-orm';

async function compareRawScores() {
  console.log('Comparing Athan vs Marcel Raw Rubric Scores\n');
  console.log('='.repeat(70));
  
  // Get Athan's data
  const athanData = await drizzleDb.execute(sql`
    SELECT 
      student_name,
      unit_number,
      rubric_scores
    FROM parsed_student_feedback
    WHERE student_name = 'Athan'
    AND rubric_scores IS NOT NULL
    ORDER BY unit_number
  `);
  
  console.log(`ATHAN: ${athanData.rows.length} records with rubrics\n`);
  
  let athanSum = 0;
  let athanCount = 0;
  const athanScores: number[] = [];
  
  athanData.rows.forEach(row => {
    const rubrics = row.rubric_scores as any;
    let rowSum = 0;
    let rowCount = 0;
    
    Object.entries(rubrics).forEach(([key, value]) => {
      if (value !== null && value !== 'N/A' && value !== undefined) {
        const num = typeof value === 'number' ? value : parseFloat(value as string);
        if (!isNaN(num)) {
          rowSum += num;
          rowCount++;
          athanSum += num;
          athanCount++;
          athanScores.push(num);
        }
      }
    });
    
    if (rowCount > 0) {
      const avg = rowSum / rowCount;
      console.log(`  Unit ${row.unit_number}: ${rowCount} scores, avg = ${avg.toFixed(2)}/5 (${(avg * 20).toFixed(0)}%)`);
    }
  });
  
  const athanAverage = athanCount > 0 ? athanSum / athanCount : 0;
  
  // Get Marcel's data
  console.log('\n' + '-'.repeat(70));
  const marcelData = await drizzleDb.execute(sql`
    SELECT 
      student_name,
      unit_number,
      rubric_scores
    FROM parsed_student_feedback
    WHERE student_name = 'Marcel'
    AND rubric_scores IS NOT NULL
    ORDER BY unit_number
  `);
  
  console.log(`MARCEL: ${marcelData.rows.length} records with rubrics\n`);
  
  let marcelSum = 0;
  let marcelCount = 0;
  const marcelScores: number[] = [];
  
  marcelData.rows.forEach(row => {
    const rubrics = row.rubric_scores as any;
    let rowSum = 0;
    let rowCount = 0;
    
    Object.entries(rubrics).forEach(([key, value]) => {
      if (value !== null && value !== 'N/A' && value !== undefined) {
        const num = typeof value === 'number' ? value : parseFloat(value as string);
        if (!isNaN(num)) {
          rowSum += num;
          rowCount++;
          marcelSum += num;
          marcelCount++;
          marcelScores.push(num);
        }
      }
    });
    
    if (rowCount > 0) {
      const avg = rowSum / rowCount;
      console.log(`  Unit ${row.unit_number}: ${rowCount} scores, avg = ${avg.toFixed(2)}/5 (${(avg * 20).toFixed(0)}%)`);
    }
  });
  
  const marcelAverage = marcelCount > 0 ? marcelSum / marcelCount : 0;
  
  // Comparison
  console.log('\n' + '='.repeat(70));
  console.log('OVERALL COMPARISON:\n');
  
  console.log(`Athan:`);
  console.log(`  Total rubric values: ${athanCount}`);
  console.log(`  Average: ${athanAverage.toFixed(2)}/5 = ${(athanAverage * 20).toFixed(1)}%`);
  console.log(`  Range: ${Math.min(...athanScores)} - ${Math.max(...athanScores)}`);
  
  console.log(`\nMarcel:`);
  console.log(`  Total rubric values: ${marcelCount}`);
  console.log(`  Average: ${marcelAverage.toFixed(2)}/5 = ${(marcelAverage * 20).toFixed(1)}%`);
  console.log(`  Range: ${Math.min(...marcelScores)} - ${Math.max(...marcelScores)}`);
  
  console.log('\n' + '='.repeat(70));
  if (athanAverage < marcelAverage) {
    console.log('✓ Marcel has HIGHER average rubric scores than Athan');
    console.log(`  Marcel: ${(marcelAverage * 20).toFixed(1)}% > Athan: ${(athanAverage * 20).toFixed(1)}%`);
  } else if (athanAverage > marcelAverage) {
    console.log('✓ Athan has HIGHER average rubric scores than Marcel');
    console.log(`  Athan: ${(athanAverage * 20).toFixed(1)}% > Marcel: ${(marcelAverage * 20).toFixed(1)}%`);
  } else {
    console.log('✓ Both have the same average');
  }
  
  // Show sample rubrics
  console.log('\n' + '='.repeat(70));
  console.log('SAMPLE RUBRICS:\n');
  
  if (athanData.rows.length > 0) {
    console.log('Athan (Unit 1.1):', JSON.stringify(athanData.rows[0].rubric_scores, null, 2));
  }
  
  if (marcelData.rows.length > 0) {
    console.log('\nMarcel (Unit 1.1):', JSON.stringify(marcelData.rows[0].rubric_scores, null, 2));
  }
  
  process.exit(0);
}

compareRawScores();