import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/postgres';

export async function GET() {
  try {
    // First check if there's any data
    const countQuery = `SELECT COUNT(*) as total FROM parsed_student_feedback`;
    const countResult = await executeQuery(countQuery);
    const totalRows = parseInt(countResult.rows[0]?.total || 0);
    
    if (totalRows === 0) {
      return NextResponse.json({
        message: "No feedback data found in the database",
        summary: {
          totalFeedbackEntries: 0,
          uniqueStudentsWithId: 0,
          uniqueStudentNames: 0,
          uniqueInstructors: 0,
          unlinkedFeedbackCount: 0
        },
        studentsWithFeedback: [],
        feedbackByInstructor: [],
        sampleFeedback: [],
        debateSpecificFeedback: [],
        unlinkedFeedback: [],
        instructions: "To populate feedback data, please use the 'Import Feedback' feature in the admin dashboard or call the /api/feedback POST endpoint."
      }, { status: 200 });
    }

    // Query 1: Get all students with feedback and count
    const studentsQuery = `
      SELECT 
        psf.student_id,
        s.id as student_table_id,
        s.name as student_name,
        psf.student_name as parsed_name,
        COUNT(psf.id) as feedback_count,
        MIN(psf.created_at) as first_feedback,
        MAX(psf.created_at) as latest_feedback
      FROM parsed_student_feedback psf
      LEFT JOIN students s ON psf.student_id = s.id
      GROUP BY psf.student_id, s.id, s.name, psf.student_name
      ORDER BY feedback_count DESC
    `;
    
    const studentsResult = await executeQuery(studentsQuery);

    // Query 2: Get sample feedback content with details
    const sampleQuery = `
      SELECT 
        psf.id,
        psf.student_id,
        psf.student_name as parsed_student_name,
        s.name as linked_student_name,
        psf.strengths,
        psf.improvement_areas,
        psf.teacher_comments,
        psf.content,
        psf.instructor,
        psf.created_at,
        psf.feedback_type,
        psf.class_code,
        psf.class_name,
        psf.topic,
        psf.motion,
        psf.rubric_scores,
        psf.skill_assessments
      FROM parsed_student_feedback psf
      LEFT JOIN students s ON psf.student_id = s.id
      ORDER BY psf.created_at DESC
      LIMIT 20
    `;
    
    const sampleResult = await executeQuery(sampleQuery);

    // Query 3: Check for unlinked feedback (student_id is null)
    const unlinkedQuery = `
      SELECT 
        id,
        student_name,
        strengths,
        improvement_areas,
        instructor,
        created_at
      FROM parsed_student_feedback
      WHERE student_id IS NULL
      LIMIT 10
    `;
    
    const unlinkedResult = await executeQuery(unlinkedQuery);

    // Query 4: Total statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_feedback_entries,
        COUNT(DISTINCT student_id) as unique_students_with_id,
        COUNT(DISTINCT student_name) as unique_student_names,
        COUNT(DISTINCT instructor) as unique_instructors,
        COUNT(CASE WHEN student_id IS NULL THEN 1 END) as unlinked_feedback_count
      FROM parsed_student_feedback
    `;
    
    const statsResult = await executeQuery(statsQuery);

    // Query 5: Feedback by instructor
    const instructorQuery = `
      SELECT 
        instructor,
        COUNT(*) as feedback_count,
        COUNT(DISTINCT student_name) as unique_students
      FROM parsed_student_feedback
      GROUP BY instructor
      ORDER BY feedback_count DESC
    `;
    
    const instructorResult = await executeQuery(instructorQuery);

    // Query 6: Check for debate-specific content
    const debateQuery = `
      SELECT 
        psf.id,
        psf.student_name,
        psf.strengths,
        psf.improvement_areas,
        psf.teacher_comments,
        psf.content,
        psf.topic,
        psf.motion,
        psf.instructor,
        psf.created_at,
        psf.class_code
      FROM parsed_student_feedback psf
      WHERE 
        (LOWER(COALESCE(psf.content, '')) LIKE '%debate%' OR 
         LOWER(COALESCE(psf.content, '')) LIKE '%motion%' OR 
         LOWER(COALESCE(psf.content, '')) LIKE '%rebuttal%' OR
         LOWER(COALESCE(psf.content, '')) LIKE '%argument%' OR
         LOWER(COALESCE(psf.topic, '')) LIKE '%debate%' OR
         LOWER(COALESCE(psf.motion, '')) LIKE '%thbt%' OR
         LOWER(COALESCE(psf.motion, '')) LIKE '%this house%')
      LIMIT 20
    `;
    
    const debateResult = await executeQuery(debateQuery);

    // Format the response
    const response = {
      summary: {
        totalFeedbackEntries: parseInt(statsResult.rows[0]?.total_feedback_entries || 0),
        uniqueStudentsWithId: parseInt(statsResult.rows[0]?.unique_students_with_id || 0),
        uniqueStudentNames: parseInt(statsResult.rows[0]?.unique_student_names || 0),
        uniqueInstructors: parseInt(statsResult.rows[0]?.unique_instructors || 0),
        unlinkedFeedbackCount: parseInt(statsResult.rows[0]?.unlinked_feedback_count || 0)
      },
      studentsWithFeedback: studentsResult.rows.map(row => ({
        studentId: row.student_id,
        studentName: row.student_name || row.parsed_name || 'Unknown',
        feedbackCount: parseInt(row.feedback_count),
        firstFeedback: row.first_feedback,
        latestFeedback: row.latest_feedback,
        hasLinkedAccount: !!row.student_table_id
      })),
      feedbackByInstructor: instructorResult.rows.map(row => ({
        instructor: row.instructor,
        feedbackCount: parseInt(row.feedback_count),
        uniqueStudents: parseInt(row.unique_students)
      })),
      sampleFeedback: sampleResult.rows.map(feedback => ({
        id: feedback.id,
        studentName: feedback.linked_student_name || feedback.parsed_student_name || 'Unknown',
        studentId: feedback.student_id,
        instructor: feedback.instructor,
        classCode: feedback.class_code,
        className: feedback.class_name,
        topic: feedback.topic,
        motion: feedback.motion,
        feedbackType: feedback.feedback_type,
        createdAt: feedback.created_at,
        strengths: feedback.strengths?.substring(0, 300) + (feedback.strengths?.length > 300 ? '...' : ''),
        improvementAreas: feedback.improvement_areas?.substring(0, 300) + (feedback.improvement_areas?.length > 300 ? '...' : ''),
        teacherComments: feedback.teacher_comments?.substring(0, 300) + (feedback.teacher_comments?.length > 300 ? '...' : ''),
        content: feedback.content?.substring(0, 500) + (feedback.content?.length > 500 ? '...' : ''),
        rubricScores: feedback.rubric_scores,
        skillAssessments: feedback.skill_assessments
      })),
      debateSpecificFeedback: debateResult.rows.map(feedback => ({
        studentName: feedback.student_name,
        instructor: feedback.instructor,
        classCode: feedback.class_code,
        topic: feedback.topic,
        motion: feedback.motion,
        createdAt: feedback.created_at,
        strengths: feedback.strengths?.substring(0, 400) + (feedback.strengths?.length > 400 ? '...' : ''),
        improvementAreas: feedback.improvement_areas?.substring(0, 400) + (feedback.improvement_areas?.length > 400 ? '...' : ''),
        teacherComments: feedback.teacher_comments?.substring(0, 400) + (feedback.teacher_comments?.length > 400 ? '...' : ''),
        content: feedback.content?.substring(0, 600) + (feedback.content?.length > 600 ? '...' : '')
      })),
      unlinkedFeedback: unlinkedResult.rows.map(f => ({
        id: f.id,
        studentName: f.student_name,
        instructor: f.instructor,
        createdAt: f.created_at,
        strengthsPreview: f.strengths?.substring(0, 150) + '...',
        improvementAreasPreview: f.improvement_areas?.substring(0, 150) + '...'
      }))
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}