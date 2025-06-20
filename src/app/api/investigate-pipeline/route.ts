import { NextResponse } from 'next/server';
import FeedbackParser from '@/lib/feedback-parser';
import FeedbackStorage from '@/lib/feedback-storage';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('=== STARTING PIPELINE INVESTIGATION ===');
    
    const investigation = {
      stage1_parsing: {} as any,
      stage2_processing: {} as any,
      stage3_database: {} as any,
      stage4_api: {} as any,
      discrepancies: [] as string[]
    };

    // ===== STAGE 1: PARSING =====
    console.log('STAGE 1: Testing raw parsing...');
    const dataPath = path.join(process.cwd(), 'data');
    const parser = new FeedbackParser(dataPath);
    
    const parseResult = await parser.parseAllFeedback();
    
    // Get detailed parsing stats
    const studentCounts = new Map<string, number>();
    const feedbackTypeCounts = new Map<string, number>();
    const classCounts = new Map<string, number>();
    
    parseResult.feedbacks.forEach(feedback => {
      studentCounts.set(feedback.studentName, (studentCounts.get(feedback.studentName) || 0) + 1);
      feedbackTypeCounts.set(feedback.feedbackType, (feedbackTypeCounts.get(feedback.feedbackType) || 0) + 1);
      classCounts.set(feedback.classCode, (classCounts.get(feedback.classCode) || 0) + 1);
    });
    
    investigation.stage1_parsing = {
      success: parseResult.success,
      totalFeedbacks: parseResult.feedbacks.length,
      uniqueStudents: studentCounts.size,
      errors: parseResult.errors,
      feedbackTypeBreakdown: Object.fromEntries(feedbackTypeCounts),
      topStudentsByFeedbackCount: Array.from(studentCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20),
      missingTargetStudents: {
        melody: studentCounts.get('Melody') || 0,
        selina: studentCounts.get('Selina') || 0,
        selina_ke: studentCounts.get('Selina Ke') || 0,
        kaye: studentCounts.get('Kaye') || 0,
        marcus: studentCounts.get('Marcus') || 0,
        isabelle: studentCounts.get('Isabelle') || 0
      },
      sampleFeedbacks: parseResult.feedbacks.slice(0, 5).map(f => ({
        studentName: f.studentName,
        feedbackType: f.feedbackType,
        classCode: f.classCode,
        unitNumber: f.unitNumber,
        uniqueId: f.uniqueId
      }))
    };

    console.log(`STAGE 1 RESULTS: ${parseResult.feedbacks.length} feedbacks, ${studentCounts.size} students`);
    
    // ===== STAGE 2: PROCESSING FOR STORAGE =====
    console.log('STAGE 2: Testing storage processing...');
    const storage = new FeedbackStorage();
    
    // Access the private method through type assertion to test processing
    const processBatch = (storage as any).processFeedbackBatch(parseResult.feedbacks);
    
    investigation.stage2_processing = {
      totalProcessed: processBatch.length,
      sampleProcessed: processBatch.slice(0, 5).map((record: any) => ({
        student_name: record.student_name,
        feedback_type: record.feedback_type,
        class_code: record.class_code,
        unit_number: record.unit_number,
        unique_id: record.unique_id,
        hasContent: !!record.content,
        hasFilePath: !!record.file_path
      })),
      processingErrors: processBatch.filter((record: any) => !record.student_name || !record.content).length
    };

    console.log(`STAGE 2 RESULTS: ${processBatch.length} records processed`);

    // ===== STAGE 3: CURRENT DATABASE STATE =====
    console.log('STAGE 3: Testing database state...');
    
    // Get raw count from database
    const { count: totalRecords } = await supabaseAdmin
      .from('parsed_student_feedback')
      .select('*', { count: 'exact', head: true });

    // Get unique students from database
    const { data: dbRecords } = await supabaseAdmin
      .from('parsed_student_feedback')
      .select('student_name, feedback_type, class_code, unit_number, parsed_at')
      .order('student_name');

    const dbStudentCounts = new Map<string, number>();
    const dbFeedbackTypeCounts = new Map<string, number>();
    
    dbRecords?.forEach(record => {
      dbStudentCounts.set(record.student_name, (dbStudentCounts.get(record.student_name) || 0) + 1);
      dbFeedbackTypeCounts.set(record.feedback_type, (dbFeedbackTypeCounts.get(record.feedback_type) || 0) + 1);
    });

    investigation.stage3_database = {
      totalRecords: totalRecords || 0,
      uniqueStudents: dbStudentCounts.size,
      feedbackTypeBreakdown: Object.fromEntries(dbFeedbackTypeCounts),
      topStudentsByFeedbackCount: Array.from(dbStudentCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20),
      missingTargetStudents: {
        melody: dbStudentCounts.get('Melody') || 0,
        selina: dbStudentCounts.get('Selina') || 0,
        selina_ke: dbStudentCounts.get('Selina Ke') || 0,
        kaye: dbStudentCounts.get('Kaye') || 0,
        marcus: dbStudentCounts.get('Marcus') || 0,
        isabelle: dbStudentCounts.get('Isabelle') || 0
      },
      sampleRecords: dbRecords?.slice(0, 5)
    };

    console.log(`STAGE 3 RESULTS: ${totalRecords} records, ${dbStudentCounts.size} students in DB`);

    // ===== STAGE 4: API AGGREGATION =====
    console.log('STAGE 4: Testing API aggregation...');
    const students = await storage.getStudentsWithFeedback();
    
    investigation.stage4_api = {
      totalStudents: students.length,
      totalFeedbackSessions: students.reduce((sum, s) => sum + s.total_feedback_sessions, 0),
      missingTargetStudents: {
        melody: students.find(s => s.student_name === 'Melody')?.total_feedback_sessions || 0,
        selina: students.find(s => s.student_name === 'Selina')?.total_feedback_sessions || 0,
        selina_ke: students.find(s => s.student_name === 'Selina Ke')?.total_feedback_sessions || 0,
        kaye: students.find(s => s.student_name === 'Kaye')?.total_feedback_sessions || 0,
        marcus: students.find(s => s.student_name === 'Marcus')?.total_feedback_sessions || 0,
        isabelle: students.find(s => s.student_name === 'Isabelle')?.total_feedback_sessions || 0
      },
      topStudents: students.slice(0, 10).map(s => ({
        name: s.student_name,
        feedbacks: s.total_feedback_sessions
      }))
    };

    console.log(`STAGE 4 RESULTS: ${students.length} students from API`);

    // ===== IDENTIFY DISCREPANCIES =====
    if (investigation.stage1_parsing.totalFeedbacks !== investigation.stage3_database.totalRecords) {
      investigation.discrepancies.push(`Parsing found ${investigation.stage1_parsing.totalFeedbacks} feedbacks but database has ${investigation.stage3_database.totalRecords}`);
    }
    
    if (investigation.stage1_parsing.uniqueStudents !== investigation.stage3_database.uniqueStudents) {
      investigation.discrepancies.push(`Parsing found ${investigation.stage1_parsing.uniqueStudents} students but database has ${investigation.stage3_database.uniqueStudents}`);
    }
    
    if (investigation.stage3_database.totalRecords !== investigation.stage4_api.totalFeedbackSessions) {
      investigation.discrepancies.push(`Database has ${investigation.stage3_database.totalRecords} records but API reports ${investigation.stage4_api.totalFeedbackSessions} feedback sessions`);
    }

    // Check specific missing students
    const targetStudents = ['Melody', 'Selina', 'Kaye', 'Marcus', 'Isabelle'];
    for (const student of targetStudents) {
      const inParsing = investigation.stage1_parsing.missingTargetStudents[student.toLowerCase()] || 0;
      const inDB = investigation.stage3_database.missingTargetStudents[student.toLowerCase()] || 0;
      const inAPI = investigation.stage4_api.missingTargetStudents[student.toLowerCase()] || 0;
      
      if (inParsing > 0 && inDB === 0) {
        investigation.discrepancies.push(`${student}: Found ${inParsing} feedbacks in parsing but 0 in database`);
      }
      if (inDB > 0 && inAPI === 0) {
        investigation.discrepancies.push(`${student}: Found ${inDB} feedbacks in database but 0 in API`);
      }
    }

    console.log('=== INVESTIGATION COMPLETE ===');
    console.log(`Discrepancies found: ${investigation.discrepancies.length}`);

    return NextResponse.json(investigation);

  } catch (error) {
    console.error('Error in pipeline investigation:', error);
    return NextResponse.json(
      { error: 'Failed to investigate pipeline', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}