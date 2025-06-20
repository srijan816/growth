import { NextResponse } from 'next/server';
import FeedbackParser from '@/lib/feedback-parser';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log('=== INVESTIGATING STORAGE FAILURE ===');
    
    const investigation = {
      preStorageCheck: {} as any,
      storageSimulation: {} as any,
      batchFailureAnalysis: {} as any,
      targetStudentAnalysis: {} as any
    };

    // ===== PRE-STORAGE CHECK =====
    console.log('Step 1: Pre-storage database state...');
    const { count: initialCount } = await supabaseAdmin
      .from('parsed_student_feedback')
      .select('*', { count: 'exact', head: true });

    investigation.preStorageCheck = {
      initialRecordCount: initialCount || 0
    };

    // ===== PARSE TARGET STUDENTS =====
    console.log('Step 2: Parsing and finding target students...');
    const dataPath = path.join(process.cwd(), 'data');
    const parser = new FeedbackParser(dataPath);
    const parseResult = await parser.parseAllFeedback();

    // Find our target missing students
    const targetStudents = ['Melody', 'Selina', 'Kaye', 'Marcus', 'Isabelle'];
    const targetFeedbacks = parseResult.feedbacks.filter(f => 
      targetStudents.some(target => f.studentName.toLowerCase().includes(target.toLowerCase()))
    );

    investigation.targetStudentAnalysis = {
      totalTargetFeedbacks: targetFeedbacks.length,
      byStudent: targetStudents.map(student => ({
        name: student,
        feedbacks: parseResult.feedbacks.filter(f => 
          f.studentName.toLowerCase().includes(student.toLowerCase())
        ).map(f => ({
          studentName: f.studentName,
          feedbackType: f.feedbackType,
          classCode: f.classCode,
          unitNumber: f.unitNumber,
          uniqueId: f.uniqueId,
          filePath: f.filePath
        }))
      }))
    };

    // ===== STORAGE SIMULATION =====
    console.log('Step 3: Simulating storage for target students...');
    
    const storageResults = [];
    
    // Try to store just the target student feedbacks one by one
    for (let i = 0; i < Math.min(10, targetFeedbacks.length); i++) {
      const feedback = targetFeedbacks[i];
      
      try {
        // Process the feedback like the storage class does
        const processedRecord = {
          student_name: feedback.studentName,
          class_code: feedback.classCode,
          class_name: feedback.className,
          unit_number: feedback.unitNumber,
          lesson_number: feedback.lessonNumber,
          topic: feedback.topic,
          motion: feedback.motion,
          feedback_type: feedback.feedbackType,
          content: feedback.content,
          raw_content: feedback.rawContent,
          html_content: feedback.htmlContent,
          duration: feedback.duration,
          file_path: feedback.filePath,
          parsed_at: feedback.extractedAt.toISOString(),
          unique_id: feedback.uniqueId
        };

        // Try to insert
        const { data, error } = await supabaseAdmin
          .from('parsed_student_feedback')
          .insert([processedRecord])
          .select();

        storageResults.push({
          studentName: feedback.studentName,
          success: !error,
          error: error?.message || null,
          data: data ? 'inserted' : null,
          processedRecord: {
            student_name: processedRecord.student_name,
            class_code: processedRecord.class_code,
            feedback_type: processedRecord.feedback_type,
            unit_number: processedRecord.unit_number,
            hasContent: !!processedRecord.content,
            hasFilePath: !!processedRecord.file_path,
            contentLength: processedRecord.content?.length || 0
          }
        });

        // If successful, delete it immediately to not pollute the DB
        if (!error && data && data.length > 0) {
          await supabaseAdmin
            .from('parsed_student_feedback')
            .delete()
            .eq('id', data[0].id);
        }

      } catch (exception) {
        storageResults.push({
          studentName: feedback.studentName,
          success: false,
          error: `Exception: ${exception}`,
          data: null
        });
      }
    }

    investigation.storageSimulation = {
      totalTested: storageResults.length,
      successful: storageResults.filter(r => r.success).length,
      failed: storageResults.filter(r => !r.success).length,
      results: storageResults
    };

    // ===== BATCH FAILURE ANALYSIS =====
    console.log('Step 4: Analyzing batch processing...');
    
    // Take a small batch of target feedbacks and see what happens in batch processing
    const testBatch = targetFeedbacks.slice(0, 5);
    const batchProcessed = testBatch.map(feedback => ({
      student_name: feedback.studentName,
      class_code: feedback.classCode,
      class_name: feedback.className,
      unit_number: feedback.unitNumber,
      lesson_number: feedback.lessonNumber,
      topic: feedback.topic,
      motion: feedback.motion,
      feedback_type: feedback.feedbackType,
      content: feedback.content,
      raw_content: feedback.rawContent,
      html_content: feedback.htmlContent,
      duration: feedback.duration,
      file_path: feedback.filePath,
      parsed_at: feedback.extractedAt.toISOString(),
      unique_id: feedback.uniqueId
    }));

    // Try batch insert
    let batchResult;
    try {
      const { data, error } = await supabaseAdmin
        .from('parsed_student_feedback')
        .insert(batchProcessed)
        .select();

      batchResult = {
        success: !error,
        error: error?.message || null,
        insertedCount: data?.length || 0,
        sampleData: data?.slice(0, 2)
      };

      // Clean up
      if (!error && data && data.length > 0) {
        await supabaseAdmin
          .from('parsed_student_feedback')
          .delete()
          .in('id', data.map(d => d.id));
      }

    } catch (exception) {
      batchResult = {
        success: false,
        error: `Batch exception: ${exception}`,
        insertedCount: 0
      };
    }

    investigation.batchFailureAnalysis = {
      batchSize: testBatch.length,
      batchResult,
      sampleBatchData: batchProcessed.slice(0, 2).map(r => ({
        student_name: r.student_name,
        class_code: r.class_code,
        feedback_type: r.feedback_type,
        hasContent: !!r.content,
        hasFilePath: !!r.file_path,
        contentLength: r.content?.length || 0
      }))
    };

    console.log('=== STORAGE FAILURE INVESTIGATION COMPLETE ===');

    return NextResponse.json(investigation);

  } catch (error) {
    console.error('Error in storage failure investigation:', error);
    return NextResponse.json(
      { error: 'Failed to investigate storage failure', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}