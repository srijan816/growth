require('dotenv').config();
const { Client } = require('pg');

async function fixCourseAssignments() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Find Saurav's user ID
    const sauravQuery = `SELECT id, name FROM users WHERE name ILIKE '%saurav%' LIMIT 1`;
    const sauravResult = await client.query(sauravQuery);
    
    if (sauravResult.rows.length === 0) {
      console.log('Creating Saurav\'s user account...');
      // Create Saurav's account if it doesn't exist
      const createSauravQuery = `
        INSERT INTO users (name, email, password, role)
        VALUES ('Saurav', 'saurav@example.com', 'temp_password', 'instructor')
        RETURNING id, name
      `;
      const createResult = await client.query(createSauravQuery);
      console.log(`Created account for ${createResult.rows[0].name} with ID: ${createResult.rows[0].id}`);
      var sauravId = createResult.rows[0].id;
    } else {
      var sauravId = sauravResult.rows[0].id;
      console.log(`Found ${sauravResult.rows[0].name} with ID: ${sauravId}`);
    }
    
    // Update 02IPDEB2403 to assign it to Saurav
    console.log('\nUpdating course 02IPDEB2403 to assign it to Saurav...');
    const updateQuery = `
      UPDATE courses 
      SET instructor_id = $1
      WHERE code = '02IPDEB2403'
      RETURNING code, name, instructor_id
    `;
    
    const updateResult = await client.query(updateQuery, [sauravId]);
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Successfully updated course assignment');
      console.log(`   ${updateResult.rows[0].code} - ${updateResult.rows[0].name}`);
      console.log(`   New instructor ID: ${updateResult.rows[0].instructor_id}`);
    } else {
      console.log('❌ Course 02IPDEB2403 not found');
    }
    
    // Now check Friday's class sessions for duplicates
    console.log('\n=== CHECKING FRIDAY CLASS SESSIONS ===');
    const fridaySessionsQuery = `
      SELECT 
        cs.id as session_id,
        c.code,
        c.name,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        c.instructor_id,
        u.name as instructor_name
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE cs.session_date = '2025-07-25'
        AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002'
      ORDER BY cs.start_time
    `;
    
    const fridayResult = await client.query(fridaySessionsQuery);
    
    console.log(`Found ${fridayResult.rows.length} sessions for Srijan on Friday (2025-07-25):`);
    fridayResult.rows.forEach(row => {
      console.log(`- ${row.code}: ${row.name}`);
      console.log(`  Time: ${row.start_time} - ${row.end_time}`);
      console.log(`  Session ID: ${row.session_id}`);
    });
    
    // Check for duplicate sessions on the same day
    console.log('\n=== CHECKING FOR DUPLICATE SESSIONS ===');
    const duplicateCheckQuery = `
      SELECT 
        c.code,
        c.name,
        COUNT(*) as session_count,
        array_agg(cs.id) as session_ids
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.session_date = '2025-07-25'
        AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002'
      GROUP BY c.code, c.name
      HAVING COUNT(*) > 1
    `;
    
    const duplicateResult = await client.query(duplicateCheckQuery);
    
    if (duplicateResult.rows.length > 0) {
      console.log('⚠️  Found duplicate sessions:');
      duplicateResult.rows.forEach(row => {
        console.log(`\n${row.code}: ${row.name} has ${row.session_count} sessions`);
        console.log(`Session IDs: ${row.session_ids.join(', ')}`);
      });
    } else {
      console.log('✅ No duplicate sessions found for Srijan on Friday');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixCourseAssignments().catch(console.error);