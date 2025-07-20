const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://tikaram@localhost:5432/growth_compass'
});

async function verifyTopicCoverage() {
  try {
    console.log('=== PRIMARY FEEDBACK TOPIC COVERAGE ===\n');
    
    const stats = await pool.query(`
      SELECT 
        instructor,
        COUNT(*) as total,
        COUNT(CASE WHEN topic IS NOT NULL AND topic != '' THEN 1 END) as has_topic,
        ROUND(100.0 * COUNT(CASE WHEN topic IS NOT NULL AND topic != '' THEN 1 END) / COUNT(*), 1) as percent_with_topic
      FROM parsed_student_feedback
      WHERE feedback_type = 'primary'
      GROUP BY instructor
      ORDER BY instructor
    `);
    
    stats.rows.forEach(r => {
      console.log(`${r.instructor}: ${r.total} entries, ${r.has_topic} with topics (${r.percent_with_topic}%)`);
    });
    
    // Show some sample topics
    const samples = await pool.query(`
      SELECT student_name, topic, unit_number, lesson_number
      FROM parsed_student_feedback
      WHERE feedback_type = 'primary'
      AND instructor = 'Srijan'
      AND topic IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 10
    `);
    
    console.log('\n\nSample topics from Srijan primary feedback:');
    samples.rows.forEach(r => {
      const topicPreview = r.topic.length > 60 ? r.topic.substring(0, 60) + '...' : r.topic;
      console.log(`- ${r.student_name} (Unit ${r.unit_number}.${r.lesson_number}): "${topicPreview}"`);
    });
    
    // Overall summary
    const overall = await pool.query(`
      SELECT 
        feedback_type,
        COUNT(*) as total,
        COUNT(CASE WHEN topic IS NOT NULL AND topic != '' THEN 1 END) as has_topic
      FROM parsed_student_feedback
      GROUP BY feedback_type
      ORDER BY feedback_type
    `);
    
    console.log('\n\n=== OVERALL TOPIC COVERAGE ===');
    overall.rows.forEach(r => {
      const percent = ((r.has_topic / r.total) * 100).toFixed(1);
      console.log(`${r.feedback_type.toUpperCase()}: ${r.total} entries, ${r.has_topic} with topics (${percent}%)`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyTopicCoverage();