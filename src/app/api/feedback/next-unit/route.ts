import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Get the next unit/lesson number based on existing feedback for a class
 * Logic: Find the highest unit.lesson from existing feedback and suggest the next one
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get('courseCode');
    const instructorName = searchParams.get('instructor');

    if (!courseCode) {
      return NextResponse.json(
        { error: 'courseCode is required' },
        { status: 400 }
      );
    }

    // Query to find the highest unit and lesson from existing feedback
    const query = `
      SELECT 
        unit_number,
        lesson_number,
        COUNT(*) as feedback_count,
        MAX(parsed_at) as latest_feedback
      FROM parsed_student_feedback 
      WHERE class_code = $1
        AND ($2::text IS NULL OR instructor = $2)
        AND unit_number IS NOT NULL 
        AND unit_number != ''
      GROUP BY unit_number, lesson_number
      ORDER BY 
        unit_number::decimal DESC, 
        lesson_number::decimal DESC
      LIMIT 5
    `;

    const result = await executeQuery(query, [courseCode, instructorName]);

    if (!result.rows.length) {
      // No existing feedback, start with 1.1
      return NextResponse.json({
        currentUnit: null,
        currentLesson: null,
        suggestedNext: {
          unit: '1',
          lesson: '1',
          unitLesson: '1.1'
        },
        message: 'No existing feedback found, starting with Unit 1.1'
      });
    }

    // Get the latest/highest unit and lesson
    const latest = result.rows[0];
    const currentUnit = parseFloat(latest.unit_number);
    const currentLessonStr = latest.lesson_number || '';
    
    // Parse lesson number (could be like "1", "1.1", "2", etc.)
    let currentLesson = 1;
    if (currentLessonStr.includes('.')) {
      const lessonParts = currentLessonStr.split('.');
      currentLesson = parseFloat(lessonParts[lessonParts.length - 1]);
    } else {
      currentLesson = parseFloat(currentLessonStr) || 1;
    }

    // Suggest next unit/lesson
    let suggestedUnit = currentUnit;
    let suggestedLesson = currentLesson + 1;

    // If lesson goes beyond 4, move to next unit
    if (suggestedLesson > 4) {
      suggestedUnit = currentUnit + 1;
      suggestedLesson = 1;
    }

    const suggestedUnitLesson = `${suggestedUnit}.${suggestedLesson}`;

    return NextResponse.json({
      currentUnit: latest.unit_number,
      currentLesson: latest.lesson_number,
      latestFeedbackDate: latest.latest_feedback,
      feedbackCount: parseInt(latest.feedback_count),
      suggestedNext: {
        unit: suggestedUnit.toString(),
        lesson: suggestedLesson.toString(),
        unitLesson: suggestedUnitLesson
      },
      recentProgress: result.rows.map(row => ({
        unitLesson: row.lesson_number ? `${row.unit_number}.${row.lesson_number}` : row.unit_number,
        feedbackCount: parseInt(row.feedback_count),
        latestDate: row.latest_feedback
      })),
      courseCode,
      instructor: instructorName
    });

  } catch (error) {
    console.error('Error getting next unit:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get next unit',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}