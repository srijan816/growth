const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to individual environment variables
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'growth_compass',
  user: process.env.POSTGRES_USER || 'tikaram',
  password: process.env.POSTGRES_PASSWORD || '',
});

async function updateCourseSchedules() {
  console.log('Updating course schedules...\n');

  const updates = [
    {
      code: '02IPDEB2401',
      name: 'G3-4 PSD I',
      day_of_week: 'Tuesday',
      start_time: '16:30:00',
      end_time: '18:00:00'
    },
    {
      code: '02IPDDC2402',
      name: 'PSD II Intermediate',
      day_of_week: 'Saturday',
      start_time: '09:30:00',
      end_time: '11:00:00'
    },
    {
      code: '02IPDEC2401',
      name: 'Keep Thursday',
      day_of_week: 'Thursday',
      start_time: '18:00:00',
      end_time: '19:30:00'
    },
    {
      code: '02IPDEC2402',
      name: 'Move to Friday',
      day_of_week: 'Friday',
      start_time: '16:30:00',
      end_time: '18:00:00'
    },
    {
      code: '02OPDEC2401',
      name: 'Online Course',
      day_of_week: 'Wednesday',
      start_time: '16:30:00',
      end_time: '18:00:00'
    },
    {
      code: '01IPDED2401',
      name: 'Wednesday Evening',
      day_of_week: 'Wednesday',
      start_time: '18:00:00',
      end_time: '19:30:00'
    },
    {
      code: '01IPDED2405',
      name: 'Saturday Late Afternoon',
      day_of_week: 'Saturday',
      start_time: '16:45:00',
      end_time: '18:15:00'
    }
  ];

  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    for (const update of updates) {
      // First, check if the course exists and get its current details
      const checkResult = await client.query(
        'SELECT code, name, day_of_week, start_time, end_time FROM courses WHERE code = $1',
        [update.code]
      );

      if (checkResult.rows.length === 0) {
        console.log(`Course ${update.code} not found - skipping`);
        continue;
      }

      const current = checkResult.rows[0];
      console.log(`\nUpdating ${update.code} (${current.name}):`);
      console.log(`  From: ${current.day_of_week} ${current.start_time} - ${current.end_time}`);
      console.log(`  To: ${update.day_of_week} ${update.start_time} - ${update.end_time}`);

      // Update the course
      const updateQuery = `UPDATE courses 
                           SET day_of_week = $1, start_time = $2::time, end_time = $3::time, updated_at = CURRENT_TIMESTAMP
                           WHERE code = $4`;

      const params = [update.day_of_week, update.start_time, update.end_time, update.code];

      await client.query(updateQuery, params);
      console.log(`  ✓ Updated successfully`);
    }

    // Commit the transaction
    await client.query('COMMIT');
    console.log('\n✅ All course schedules updated successfully!');
    
    // Verify the updates
    console.log('\n📋 Verifying updates:');
    const verifyResult = await client.query(
      `SELECT code, name, day_of_week, start_time, end_time 
       FROM courses 
       WHERE code IN ($1, $2, $3, $4, $5, $6, $7) 
       ORDER BY code`,
      ['02IPDEB2401', '02IPDDC2402', '02IPDEC2401', '02IPDEC2402', '02OPDEC2401', '01IPDED2401', '01IPDED2405']
    );

    console.log('\nUpdated course schedules:');
    verifyResult.rows.forEach((course) => {
      console.log(`${course.code}: ${course.day_of_week} ${course.start_time} - ${course.end_time}`);
    });

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error updating course schedules:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateCourseSchedules();