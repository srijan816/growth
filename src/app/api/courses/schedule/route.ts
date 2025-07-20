import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/postgres';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all courses with their schedule information
    const query = `
      SELECT 
        id,
        course_code,
        course_name,
        course_level,
        course_type,
        student_count,
        start_time,
        end_time,
        day_of_week,
        is_active,
        schedule_updated_at,
        schedule_updated_by
      FROM courses
      ORDER BY 
        CASE 
          WHEN start_time IS NOT NULL THEN 0 
          ELSE 1 
        END,
        start_time,
        course_code
    `;

    const result = await executeQuery(query);
    
    return NextResponse.json({
      courses: result.rows.map(row => ({
        id: row.id,
        courseCode: row.course_code,
        courseName: row.course_name,
        courseLevel: row.course_level,
        courseType: row.course_type,
        studentCount: row.student_count,
        startTime: row.start_time,
        endTime: row.end_time,
        dayOfWeek: row.day_of_week || [],
        isActive: row.is_active !== false,
        scheduleUpdatedAt: row.schedule_updated_at,
        scheduleUpdatedBy: row.schedule_updated_by
      }))
    });

  } catch (error) {
    console.error('Error fetching course schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course schedules' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();
    const instructorName = session.user.name || 'Unknown';
    
    // Validate input
    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid input: expected array of course updates' },
        { status: 400 }
      );
    }

    // Update each course
    const results = [];
    for (const update of updates) {
      const { courseId, startTime, endTime, dayOfWeek, isActive } = update;
      
      if (!courseId) continue;

      // Validate time format if provided
      if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
        results.push({ courseId, error: 'Invalid start time format' });
        continue;
      }
      
      if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) {
        results.push({ courseId, error: 'Invalid end time format' });
        continue;
      }

      try {
        const query = `
          UPDATE courses
          SET 
            start_time = $2,
            end_time = $3,
            day_of_week = $4,
            is_active = $5,
            schedule_updated_at = NOW(),
            schedule_updated_by = $6
          WHERE id = $1
          RETURNING id, course_code
        `;

        const result = await executeQuery(query, [
          courseId,
          startTime || null,
          endTime || null,
          dayOfWeek || null,
          isActive !== false,
          instructorName
        ]);

        if (result.rows.length > 0) {
          results.push({ 
            courseId, 
            courseCode: result.rows[0].course_code,
            success: true 
          });
        } else {
          results.push({ courseId, error: 'Course not found' });
        }
      } catch (error) {
        console.error(`Error updating course ${courseId}:`, error);
        results.push({ courseId, error: 'Update failed' });
      }
    }

    return NextResponse.json({ 
      message: 'Schedule updates processed',
      results,
      updatedBy: instructorName
    });

  } catch (error) {
    console.error('Error updating course schedules:', error);
    return NextResponse.json(
      { error: 'Failed to update course schedules' }, 
      { status: 500 }
    );
  }
}