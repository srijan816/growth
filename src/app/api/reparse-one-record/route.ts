import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/postgres';
import { FeedbackParser } from '@/lib/feedback-parser';
import FeedbackStoragePostgres from '@/lib/feedback-storage-postgres';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recordId } = await request.json();

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
    }

    // Get the record details
    const result = await executeQuery(`
      SELECT file_path, feedback_type, student_name, rubric_scores
      FROM parsed_student_feedback 
      WHERE id = $1
    `, [recordId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const record = result.rows[0];
    console.log(`🔄 Re-parsing record for ${record.student_name} from ${record.file_path}`);

    // Re-parse the file
    const parser = new FeedbackParser();
    const parseResult = await parser.parseDocumentFile(record.file_path, record.feedback_type);

    if (parseResult.success && parseResult.feedbacks.length > 0) {
      const feedback = parseResult.feedbacks[0];
      
      console.log(`📊 Extracted rubric scores:`, feedback.rubricScores);

      // Update the record with new rubric scores
      const updateResult = await executeQuery(`
        UPDATE parsed_student_feedback 
        SET rubric_scores = $1
        WHERE id = $2
        RETURNING rubric_scores
      `, [
        feedback.rubricScores ? JSON.stringify(feedback.rubricScores) : null,
        recordId
      ]);

      return NextResponse.json({
        success: true,
        recordId,
        studentName: record.student_name,
        filePath: record.file_path,
        oldRubricScores: record.rubric_scores,
        newRubricScores: feedback.rubricScores,
        updatedRecord: updateResult.rows[0]
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to re-parse file',
        parseErrors: parseResult.errors
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error re-parsing record:', error);
    return NextResponse.json({ 
      error: 'Failed to re-parse record',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}