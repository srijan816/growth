import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/postgres';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get unique students from parsed_student_feedback
    const uniqueStudentsQuery = `
      SELECT DISTINCT 
        student_name,
        COUNT(*) as feedback_count
      FROM parsed_student_feedback
      WHERE student_name IS NOT NULL
      GROUP BY student_name
      ORDER BY student_name
    `;
    const uniqueStudents = await executeQuery(uniqueStudentsQuery);

    let addedCount = 0;
    let skippedCount = 0;
    const errors: any[] = [];

    // Insert each student if they don't exist
    for (const student of uniqueStudents.rows) {
      try {
        // Check if student already exists
        const existingCheck = await executeQuery(
          'SELECT id FROM students WHERE LOWER(name) = LOWER($1)',
          [student.student_name]
        );

        if (existingCheck.rows.length === 0) {
          // Generate a unique external ID
          const externalId = `STU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Insert the student
          await executeQuery(
            `INSERT INTO students (student_number, name, created_at) 
             VALUES ($1, $2, NOW())`,
            [externalId, student.student_name]
          );
          
          addedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error adding student ${student.student_name}:`, error);
        errors.push({ student: student.student_name, error: String(error) });
      }
    }

    // Update the student_id field in parsed_student_feedback to link to the students table
    await executeQuery(`
      UPDATE parsed_student_feedback psf
      SET student_id = s.id
      FROM students s
      WHERE LOWER(psf.student_name) = LOWER(s.name)
      AND psf.student_id IS NULL
    `);

    return NextResponse.json({
      success: true,
      totalStudentsInFeedback: uniqueStudents.rows.length,
      addedToStudentsTable: addedCount,
      alreadyExisted: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully populated students table with ${addedCount} new students`
    });

  } catch (error) {
    console.error('Error populating students:', error);
    return NextResponse.json(
      { error: 'Failed to populate students table' }, 
      { status: 500 }
    );
  }
}