const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://tikaram@localhost:5432/growth_compass'
});

// Sample data for Henry and Selina
const feedbackData = {
  'Henry Cheng': {
    id: '4a21c761-df14-4705-9d7e-f5e03bb2b7f5',
    entries: [
      { unit: '3', lesson: '4', motion: 'This house would ban zoos', duration: '05:12', scores: { time_management: '5', poi_handling: '3', speaking_style: '3', argument_completeness: '3', theory_application: '3', rebuttal_effectiveness: '1', team_support: 'N/A', feedback_application: 'N/A' } },
      { unit: '4', lesson: '1', motion: 'This house believes that the rise of "Fandoms" has done more harm than good.', duration: '03:55', scores: { time_management: '5', poi_handling: '3', speaking_style: '3', argument_completeness: '3', theory_application: '3', rebuttal_effectiveness: '3', team_support: 'N/A', feedback_application: 'N/A' } },
      { unit: '4', lesson: '2', motion: 'This house opposes the increasingly sympathetic portrayal of villains in pop culture', duration: '06:50', scores: { time_management: '5', poi_handling: '3', speaking_style: '3', argument_completeness: '3', theory_application: '4', rebuttal_effectiveness: '4', team_support: '3', feedback_application: '3' } },
    ]
  },
  'Selina Ke': {
    id: '5e6ce1e7-c0a1-4ee2-9e3b-e89df96c8f3a',
    entries: [
      { unit: '2', lesson: '4', motion: 'This house would ban violent sports', duration: '3:25', scores: { time_management: '3', poi_handling: 'N/A', speaking_style: '3', argument_completeness: '3', theory_application: '3', rebuttal_effectiveness: '3', team_support: '3', feedback_application: '3' } },
      { unit: '3', lesson: '1', motion: 'This house, as the animal rights movement, would aggressively shame non-vegetarians', duration: '2:44', scores: { time_management: '3', poi_handling: 'N/A', speaking_style: '3', argument_completeness: '3', theory_application: '3', rebuttal_effectiveness: '3', team_support: '3', feedback_application: '3' } },
      { unit: '3', lesson: '2', motion: 'This house, as an animal advocacy group, would prioritise advocating for the humane treatment of animals', duration: '4:58', scores: { time_management: '5', poi_handling: 'N/A', speaking_style: '3', argument_completeness: '4', theory_application: '4', rebuttal_effectiveness: '3', team_support: '3', feedback_application: '3' } },
    ]
  }
};

async function insertFeedback() {
  try {
    console.log('Inserting feedback into database...\n');
    
    for (const [studentName, studentData] of Object.entries(feedbackData)) {
      console.log(`\nInserting feedback for ${studentName}:`);
      
      for (const entry of studentData.entries) {
        // Generate unique ID
        const uniqueId = `${studentName}_secondary_Srijan_${entry.unit}.${entry.lesson}_${Date.now()}`;
        
        const insertQuery = `
          INSERT INTO parsed_student_feedback (
            student_id,
            student_name,
            feedback_type,
            unit_number,
            lesson_number,
            topic,
            motion,
            rubric_scores,
            duration,
            instructor,
            unique_id,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (unique_id) DO UPDATE SET
            rubric_scores = EXCLUDED.rubric_scores,
            duration = EXCLUDED.duration
        `;
        
        try {
          await pool.query(insertQuery, [
            studentData.id,           // student_id
            studentName,              // student_name
            'secondary',              // feedback_type
            entry.unit,               // unit_number
            entry.lesson,             // lesson_number
            entry.motion,             // topic
            entry.motion,             // motion
            JSON.stringify(entry.scores), // rubric_scores as JSON
            entry.duration,           // duration
            'Srijan',                 // instructor
            uniqueId                  // unique_id
          ]);
          
          console.log(`✅ Unit ${entry.unit}.${entry.lesson}: ${entry.motion.substring(0, 50)}...`);
        } catch (err) {
          console.error(`❌ Error inserting Unit ${entry.unit}.${entry.lesson}:`, err.message);
        }
      }
    }
    
    console.log('\n\nChecking inserted data...');
    
    // Verify the data
    const checkQuery = `
      SELECT student_name, unit_number, lesson_number, motion, duration, rubric_scores
      FROM parsed_student_feedback
      WHERE student_name IN ('Henry Cheng', 'Selina Ke')
      ORDER BY student_name, CAST(unit_number AS INT), CAST(lesson_number AS INT)
    `;
    
    const result = await pool.query(checkQuery);
    console.log(`\nFound ${result.rows.length} feedback entries in database`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

insertFeedback();