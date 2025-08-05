import { db } from '@/lib/postgres';

async function updateCourseSchedules() {
  console.log('Updating course schedules...\n');

  const updates = [
    {
      code: '02IPDEB2401',
      name: 'G3-4 PSD I',
      day_of_week: 'Tuesday',
      start_time: '16:30:00',
      end_time: '18:00:00',
      location: null
    },
    {
      code: '02IPDDC2402',
      name: 'PSD II Intermediate',
      day_of_week: 'Saturday',
      start_time: '09:30:00',
      end_time: '11:00:00',
      location: null
    },
    {
      code: '02IPDEC2401',
      name: 'Keep Thursday',
      day_of_week: 'Thursday',
      start_time: '18:00:00',
      end_time: '19:30:00',
      location: null
    },
    {
      code: '02IPDEC2402',
      name: 'Move to Friday',
      day_of_week: 'Friday',
      start_time: '16:30:00',
      end_time: '18:00:00',
      location: null
    },
    {
      code: '02OPDEC2401',
      name: 'Online Course',
      day_of_week: 'Wednesday',
      start_time: '16:30:00',
      end_time: '18:00:00',
      location: 'Online'
    },
    {
      code: '01IPDED2401',
      name: 'Wednesday Evening',
      day_of_week: 'Wednesday',
      start_time: '18:00:00',
      end_time: '19:30:00',
      location: null
    },
    {
      code: '01IPDED2405',
      name: 'Saturday Late Afternoon',
      day_of_week: 'Saturday',
      start_time: '16:45:00',
      end_time: '18:15:00',
      location: null
    }
  ];

  try {
    // Start a transaction
    await db.transaction(async (client) => {
      for (const update of updates) {
        // First, check if the course exists and get its current details
        const checkResult = await client.query(
          'SELECT code, name, day_of_week, start_time, location FROM courses WHERE code = $1',
          [update.code]
        );

        if (checkResult.rows.length === 0) {
          console.log(`Course ${update.code} not found - skipping`);
          continue;
        }

        const current = checkResult.rows[0];
        console.log(`\nUpdating ${update.code} (${current.name}):`);
        console.log(`  From: ${current.day_of_week} ${current.start_time}`);
        console.log(`  To: ${update.day_of_week} ${update.start_time} - ${update.end_time}`);
        
        if (update.location) {
          console.log(`  Location: ${update.location}`);
        }

        // Update the course
        const updateQuery = update.location 
          ? `UPDATE courses 
             SET day_of_week = $1, start_time = $2::time, location = $3, updated_at = CURRENT_TIMESTAMP
             WHERE code = $4`
          : `UPDATE courses 
             SET day_of_week = $1, start_time = $2::time, updated_at = CURRENT_TIMESTAMP
             WHERE code = $3`;

        const params = update.location 
          ? [update.day_of_week, update.start_time, update.location, update.code]
          : [update.day_of_week, update.start_time, update.code];

        await client.query(updateQuery, params);
        console.log(`  ✓ Updated successfully`);
      }
    });

    console.log('\n✅ All course schedules updated successfully!');
    
    // Verify the updates
    console.log('\n📋 Verifying updates:');
    const verifyResult = await db.query(
      `SELECT code, name, day_of_week, start_time, location 
       FROM courses 
       WHERE code IN ($1, $2, $3, $4, $5, $6, $7) 
       ORDER BY code`,
      ['02IPDEB2401', '02IPDDC2402', '02IPDEC2401', '02IPDEC2402', '02OPDEC2401', '01IPDED2401', '01IPDED2405']
    );

    console.log('\nUpdated course schedules:');
    verifyResult.rows.forEach((course: any) => {
      console.log(`${course.code}: ${course.day_of_week} ${course.start_time}${course.location ? ` (${course.location})` : ''}`);
    });

  } catch (error) {
    console.error('Error updating course schedules:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run the update
updateCourseSchedules();