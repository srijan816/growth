const { drizzleDb } = require('./src/lib/database/drizzle');
const { students, users, parsedStudentFeedback, attendances } = require('./src/lib/database/schema');
const { eq, desc, sql } = require('drizzle-orm');

async function testStudentScores() {
  console.log('Testing Student Scores and Data Variation\n');
  console.log('=' .repeat(80));
  
  try {
    // Get a sample of students
    const studentList = await drizzleDb
      .select({
        id: students.id,
        name: sql`${users.name}`,
        gradeLevel: students.gradeLevel
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .limit(10);
    
    console.log(`\nAnalyzing ${studentList.length} students...\n`);
    
    for (const student of studentList) {
      console.log(`\n--- ${student.name} (${student.gradeLevel}) ---`);
      
      // Get feedback data
      const feedback = await drizzleDb
        .select()
        .from(parsedStudentFeedback)
        .where(eq(parsedStudentFeedback.studentId, student.id))
        .orderBy(desc(parsedStudentFeedback.feedbackDate));
      
      console.log(`  Feedback records: ${feedback.length}`);
      
      if (feedback.length > 0) {
        // Check rubric scores
        const latestFeedback = feedback[0];
        if (latestFeedback.rubricScores) {
          try {
            const rubrics = typeof latestFeedback.rubricScores === 'string' 
              ? JSON.parse(latestFeedback.rubricScores) 
              : latestFeedback.rubricScores;
            
            console.log(`  Latest Rubric Scores:`);
            Object.entries(rubrics).forEach(([key, value]) => {
              if (value !== 'N/A' && value !== null) {
                console.log(`    ${key}: ${value}/5`);
              }
            });
            
            // Calculate dimension scores
            const content = calculateContent(rubrics);
            const style = calculateStyle(rubrics);
            const strategy = calculateStrategy(rubrics);
            
            console.log(`  Calculated Dimensions:`);
            console.log(`    Content: ${content.toFixed(1)}%`);
            console.log(`    Style: ${style.toFixed(1)}%`);
            console.log(`    Strategy: ${strategy.toFixed(1)}%`);
            console.log(`    Overall: ${((content + style + strategy) / 3).toFixed(1)}%`);
          } catch (e) {
            console.log(`  Error parsing rubrics: ${e.message}`);
          }
        } else {
          console.log(`  No rubric scores available`);
        }
      }
      
      // Get attendance data
      const attendance = await drizzleDb
        .select({
          attitude: attendances.attitudeEfforts,
          questions: attendances.askingQuestions,
          skills: attendances.applicationSkills,
          feedback: attendances.applicationFeedback
        })
        .from(attendances)
        .where(eq(attendances.studentId, student.id))
        .limit(5);
      
      if (attendance.length > 0) {
        console.log(`  Attendance scores (last ${attendance.length} sessions):`);
        const avgScores = {
          attitude: 0,
          questions: 0,
          skills: 0,
          feedback: 0
        };
        
        attendance.forEach(a => {
          Object.keys(avgScores).forEach(key => {
            if (a[key]) avgScores[key] += a[key];
          });
        });
        
        Object.keys(avgScores).forEach(key => {
          avgScores[key] = avgScores[key] / attendance.length;
          console.log(`    Avg ${key}: ${avgScores[key].toFixed(2)}/5 (${(avgScores[key] * 20).toFixed(0)}%)`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

function calculateContent(rubrics) {
  let score = 0;
  let count = 0;
  
  if (rubrics.rubric_4 !== null && rubrics.rubric_4 !== 'N/A') {
    score += parseFloat(rubrics.rubric_4);
    count++;
  }
  if (rubrics.rubric_5 !== null && rubrics.rubric_5 !== 'N/A') {
    score += parseFloat(rubrics.rubric_5);
    count++;
  }
  if (rubrics.rubric_7 !== null && rubrics.rubric_7 !== 'N/A') {
    const rebuttal = parseFloat(rubrics.rubric_7);
    if (rebuttal < 4) {
      score += rebuttal;
    } else {
      score += rebuttal * 0.8;
    }
    count++;
  }
  
  return count > 0 ? (score / (count * 5)) * 100 : 50;
}

function calculateStyle(rubrics) {
  let score = 0;
  let count = 0;
  
  if (rubrics.rubric_1 !== null && rubrics.rubric_1 !== 'N/A') {
    score += parseFloat(rubrics.rubric_1);
    count++;
  }
  if (rubrics.rubric_3 !== null && rubrics.rubric_3 !== 'N/A') {
    score += parseFloat(rubrics.rubric_3);
    count++;
  }
  if (rubrics.rubric_8 !== null && rubrics.rubric_8 !== 'N/A') {
    score += parseFloat(rubrics.rubric_8);
    count++;
  }
  
  return count > 0 ? (score / (count * 5)) * 100 : 50;
}

function calculateStrategy(rubrics) {
  let score = 0;
  let count = 0;
  
  if (rubrics.rubric_2 !== null && rubrics.rubric_2 !== 'N/A') {
    score += parseFloat(rubrics.rubric_2);
    count++;
  }
  if (rubrics.rubric_6 !== null && rubrics.rubric_6 !== 'N/A') {
    score += parseFloat(rubrics.rubric_6);
    count++;
  }
  if (rubrics.rubric_7 !== null && rubrics.rubric_7 !== 'N/A') {
    const rebuttal = parseFloat(rubrics.rubric_7);
    if (rebuttal >= 4) {
      score += rebuttal;
    } else {
      score += rebuttal * 0.2;
    }
    count++;
  }
  
  return count > 0 ? (score / (count * 5)) * 100 : 50;
}

testStudentScores();