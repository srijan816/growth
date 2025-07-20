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

    // Get all courses with enrollment counts
    const query = `
      SELECT 
        c.id,
        c.course_code as code,
        c.course_name as name,
        c.term,
        c.year,
        c.day_of_week,
        c.time,
        c.room,
        c.description,
        COUNT(DISTINCT e.student_id) as student_count,
        CASE 
          WHEN c.course_code LIKE '%PSD%' OR c.course_code LIKE '%PST%' THEN 'debate'
          WHEN c.course_code LIKE '%AW%' OR c.course_code LIKE '%Writing%' THEN 'writing'
          WHEN c.course_code LIKE '%RAPS%' THEN 'raps'
          WHEN c.course_code LIKE '%CT%' OR c.course_code LIKE '%Mentorship%' OR c.course_code LIKE '%WDT%' THEN 'critical-thinking'
          ELSE 'other'
        END as subject,
        CASE 
          WHEN c.course_code LIKE 'G2%' OR c.course_code LIKE 'G3%' OR c.course_code LIKE 'G4%' OR c.course_code LIKE 'G5%' OR c.course_code LIKE 'G6%' THEN 'primary'
          ELSE 'secondary'
        END as level
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      GROUP BY c.id, c.course_code, c.course_name, c.term, c.year, c.day_of_week, c.time, c.room, c.description
      ORDER BY c.course_code
    `;

    const result = await executeQuery(query);
    
    const courses = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      term: row.term || 'Spring',
      year: row.year || 2025,
      schedule: row.day_of_week && row.time ? `${row.day_of_week} ${row.time}` : null,
      room: row.room,
      description: row.description,
      studentCount: parseInt(row.student_count) || 0,
      subject: row.subject,
      level: row.level
    }));

    return NextResponse.json({
      courses,
      total: courses.length
    });

  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' }, 
      { status: 500 }
    );
  }
}