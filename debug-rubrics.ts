import { drizzleDb } from './src/lib/database/drizzle';
import { parsedStudentFeedback, attendances } from './src/lib/database/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import { debateGrowthEngine } from './src/lib/analytics/debate-growth-engine';
import { subMonths } from 'date-fns';

async function debugRubrics() {
  console.log('Debugging Why Rubrics Are Not Being Used\n');
  console.log('=' .repeat(70));
  
  // Find a student with attendance average of 3.0 (will get 60%)
  const targetStudent = await drizzleDb.execute(sql`
    SELECT 
      s.id,
      s.name,
      s.grade_level,
      AVG(a.application_feedback) as avg_feedback,
      AVG(a.application_skills) as avg_skills
    FROM students s
    INNER JOIN attendances a ON a.student_id = s.id
    WHERE (s.grade_level LIKE '%7%' OR s.grade_level LIKE '%8%')
    GROUP BY s.id, s.name, s.grade_level
    HAVING AVG(a.application_feedback) BETWEEN 2.95 AND 3.05
    AND AVG(a.application_skills) BETWEEN 2.95 AND 3.05
    LIMIT 1
  `);
  
  if (targetStudent.rows.length === 0) {
    console.log('No student found with 3.0 attendance average');
    process.exit(0);
  }
  
  const student = targetStudent.rows[0];
  const studentId = student.id as string;
  
  console.log('Testing with student:', student.name || 'Unknown');
  console.log('ID:', studentId);
  console.log('Grade:', student.grade_level);
  console.log('Attendance averages: Feedback=', student.avg_feedback, 'Skills=', student.avg_skills);
  
  // 1. Check what feedback exists
  const allFeedback = await drizzleDb
    .select()
    .from(parsedStudentFeedback)
    .where(eq(parsedStudentFeedback.studentId, studentId));
  
  console.log('\nFeedback Analysis:');
  console.log('Total feedback records:', allFeedback.length);
  
  const withRubrics = allFeedback.filter(f => f.rubricScores !== null);
  console.log('Records with rubricScores field:', withRubrics.length);
  
  if (withRubrics.length > 0) {
    console.log('\nFirst feedback with rubrics:');
    const first = withRubrics[0];
    console.log('  rubricScores type:', typeof first.rubricScores);
    console.log('  rubricScores value:', first.rubricScores);
    
    // Check the condition used in the engine
    const isObject = typeof first.rubricScores === 'object';
    console.log('  Is object?', isObject);
    
    // Try to parse if string
    if (typeof first.rubricScores === 'string') {
      try {
        const parsed = JSON.parse(first.rubricScores);
        console.log('  Parsed successfully:', parsed);
      } catch (e) {
        console.log('  Failed to parse as JSON');
      }
    }
  }
  
  // 2. Simulate what the engine does
  console.log('\n' + '-'.repeat(70));
  console.log('Simulating Engine Behavior:\n');
  
  // Fetch like the engine does
  const startDate = subMonths(new Date(), 1);
  const engineFeedback = await drizzleDb
    .select()
    .from(parsedStudentFeedback)
    .where(
      and(
        eq(parsedStudentFeedback.studentId, studentId),
        gte(parsedStudentFeedback.createdAt, startDate)
      )
    );
  
  console.log('Engine would fetch:', engineFeedback.length, 'records (last month)');
  
  // Check the rubric detection
  const debatesWithRubrics = engineFeedback
    .filter(f => f.rubricScores)
    .map(f => {
      let rubrics: any = {};
      try {
        const rawRubrics = typeof f.rubricScores === 'string' 
          ? JSON.parse(f.rubricScores) 
          : f.rubricScores;
        
        if (rawRubrics && typeof rawRubrics === 'object') {
          Object.keys(rawRubrics).forEach(key => {
            const value = rawRubrics[key];
            if (value !== 'N/A' && value !== null && value !== undefined && value !== '') {
              const numValue = typeof value === 'number' ? value : parseFloat(value);
              rubrics[key] = isNaN(numValue) ? null : numValue;
            } else {
              rubrics[key] = null;
            }
          });
        }
      } catch (e) {
        console.log('  Error processing rubrics:', e);
        rubrics = {};
      }
      return {
        date: f.feedbackDate || f.createdAt,
        rubrics,
        content: f.content
      };
    })
    .filter(d => d.rubrics && Object.keys(d.rubrics).length > 0);
  
  console.log('After processing, debates with valid rubrics:', debatesWithRubrics.length);
  
  if (debatesWithRubrics.length > 0) {
    console.log('\nFirst processed debate:');
    console.log('  Rubrics:', debatesWithRubrics[0].rubrics);
  }
  
  // 3. Check the actual calculation
  console.log('\n' + '-'.repeat(70));
  console.log('Actual Engine Calculation:\n');
  
  try {
    const growth = await debateGrowthEngine.calculateStudentGrowth(studentId, 'month');
    console.log('Engine returned:');
    console.log('  Content:', growth.content.score, '%');
    console.log('  Style:', growth.style.score, '%');
    console.log('  Strategy:', growth.strategy.score, '%');
    console.log('  Overall:', growth.overall.score, '%');
    
    if (growth.content.score === 60 && growth.style.score === 60 && growth.strategy.score === 60) {
      console.log('\n⚠️  ALL DIMENSIONS ARE 60% - USING ATTENDANCE FALLBACK!');
      console.log('This means no valid rubric data was found for this student.');
    }
  } catch (e: any) {
    console.log('Engine error:', e.message);
  }
  
  // 4. Check date filtering issue
  console.log('\n' + '-'.repeat(70));
  console.log('Date Filtering Analysis:\n');
  
  const allTimeFeedback = await drizzleDb
    .select({
      createdAt: parsedStudentFeedback.createdAt,
      feedbackDate: parsedStudentFeedback.feedbackDate,
      hasRubrics: sql<boolean>`rubric_scores IS NOT NULL`
    })
    .from(parsedStudentFeedback)
    .where(eq(parsedStudentFeedback.studentId, studentId));
  
  console.log('All feedback dates:');
  allTimeFeedback.forEach((f, i) => {
    console.log(`  Record ${i + 1}:`);
    console.log(`    Created: ${f.createdAt}`);
    console.log(`    Feedback Date: ${f.feedbackDate}`);
    console.log(`    Has Rubrics: ${f.hasRubrics}`);
    console.log(`    Within last month: ${f.createdAt ? f.createdAt >= startDate : 'N/A'}`);
  });
  
  process.exit(0);
}

debugRubrics();