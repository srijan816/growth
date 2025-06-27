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

    const { searchParams } = new URL(request.url);
    const instructor = searchParams.get('instructor');
    const student = searchParams.get('student');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const feedbackType = searchParams.get('feedbackType');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build dynamic query
    let query = `
      SELECT 
        id,
        student_name,
        instructor,
        class_code,
        class_name,
        unit_number,
        lesson_number,
        topic,
        motion,
        feedback_type,
        LEFT(content, 200) as content_preview,
        content,
        duration,
        file_path,
        parsed_at,
        unique_id,
        rubric_scores
      FROM parsed_student_feedback 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (instructor) {
      query += ` AND instructor ILIKE $${paramIndex}`;
      params.push(`%${instructor}%`);
      paramIndex++;
    }

    if (student) {
      query += ` AND student_name ILIKE $${paramIndex}`;
      params.push(`%${student}%`);
      paramIndex++;
    }

    if (feedbackType && (feedbackType === 'primary' || feedbackType === 'secondary')) {
      query += ` AND feedback_type = $${paramIndex}`;
      params.push(feedbackType);
      paramIndex++;
    }

    if (dateFrom) {
      query += ` AND parsed_at >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND parsed_at <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    // Add ordering and pagination
    query += ` ORDER BY instructor, student_name, unit_number::decimal, parsed_at`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    console.log('Database viewer query:', query);
    console.log('Parameters:', params);

    const result = await executeQuery(query, params);

    // Also get summary statistics
    let summaryQuery = `
      SELECT 
        instructor,
        feedback_type,
        COUNT(*) as record_count,
        COUNT(DISTINCT student_name) as unique_students,
        MIN(parsed_at) as earliest_record,
        MAX(parsed_at) as latest_record
      FROM parsed_student_feedback 
      WHERE 1=1
    `;
    
    const summaryParams: any[] = [];
    let summaryParamIndex = 1;

    if (instructor) {
      summaryQuery += ` AND instructor ILIKE $${summaryParamIndex}`;
      summaryParams.push(`%${instructor}%`);
      summaryParamIndex++;
    }

    if (student) {
      summaryQuery += ` AND student_name ILIKE $${summaryParamIndex}`;
      summaryParams.push(`%${student}%`);
      summaryParamIndex++;
    }

    if (feedbackType && (feedbackType === 'primary' || feedbackType === 'secondary')) {
      summaryQuery += ` AND feedback_type = $${summaryParamIndex}`;
      summaryParams.push(feedbackType);
      summaryParamIndex++;
    }

    summaryQuery += ` GROUP BY instructor, feedback_type ORDER BY instructor, feedback_type`;

    const summaryResult = await executeQuery(summaryQuery, summaryParams);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM parsed_student_feedback WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (instructor) {
      countQuery += ` AND instructor ILIKE $${countParamIndex}`;
      countParams.push(`%${instructor}%`);
      countParamIndex++;
    }

    if (student) {
      countQuery += ` AND student_name ILIKE $${countParamIndex}`;
      countParams.push(`%${student}%`);
      countParamIndex++;
    }

    if (feedbackType && (feedbackType === 'primary' || feedbackType === 'secondary')) {
      countQuery += ` AND feedback_type = $${countParamIndex}`;
      countParams.push(feedbackType);
      countParamIndex++;
    }

    const countResult = await executeQuery(countQuery, countParams);
    const totalRecords = parseInt(countResult.rows[0]?.total || '0');

    return NextResponse.json({
      success: true,
      data: result.rows,
      summary: summaryResult.rows,
      pagination: {
        total: totalRecords,
        limit,
        offset,
        hasMore: offset + limit < totalRecords
      },
      filters: {
        instructor,
        student,
        feedbackType,
        dateFrom,
        dateTo
      }
    });

  } catch (error) {
    console.error('Error in database viewer:', error);
    return NextResponse.json({ 
      error: 'Failed to query database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}