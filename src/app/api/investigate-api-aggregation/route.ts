import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('=== INVESTIGATING API AGGREGATION ===');
    
    const investigation = {
      rawQuery: {} as any,
      groupingTest: {} as any,
      duplicateAnalysis: {} as any,
      missingStudents: {} as any
    };

    // ===== TEST 1: RAW QUERY (same as getStudentsWithFeedback) =====
    console.log('TEST 1: Raw query analysis...');
    
    const { data: rawData, error } = await supabaseAdmin
      .from('parsed_student_feedback')
      .select('student_name, class_code, class_name, unit_number, feedback_type, parsed_at')
      .order('student_name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    investigation.rawQuery = {
      totalRecords: rawData?.length || 0,
      uniqueStudents: [...new Set(rawData?.map(r => r.student_name))].length,
      sampleRecords: rawData?.slice(0, 10),
      targetStudents: {
        melody: rawData?.filter(r => r.student_name.toLowerCase().includes('melody')).length || 0,
        selina: rawData?.filter(r => r.student_name.toLowerCase().includes('selina')).length || 0,
        kaye: rawData?.filter(r => r.student_name.toLowerCase().includes('kaye')).length || 0,
        marcus: rawData?.filter(r => r.student_name.toLowerCase().includes('marcus')).length || 0,
        isabelle: rawData?.filter(r => r.student_name.toLowerCase().includes('isabelle')).length || 0
      }
    };

    // ===== TEST 2: GROUPING LOGIC TEST =====
    console.log('TEST 2: Grouping logic test...');
    
    const studentMap = new Map();
    let totalFeedbackSessions = 0;
    
    rawData?.forEach(record => {
      const key = record.student_name;
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          student_name: record.student_name,
          total_feedback_sessions: 0,
          earliest_unit: 999,
          latest_unit: 0,
          class_codes: new Set(),
          class_names: new Set(),
          feedback_types: new Set(),
          last_updated: record.parsed_at
        });
      }
      
      const student = studentMap.get(key);
      student.total_feedback_sessions++;
      totalFeedbackSessions++;
      student.class_codes.add(record.class_code);
      student.class_names.add(record.class_name);
      student.feedback_types.add(record.feedback_type);
      
      // Parse unit number for sorting
      const unitNum = parseFloat(record.unit_number || '0');
      if (unitNum > 0) {
        student.earliest_unit = Math.min(student.earliest_unit, unitNum);
        student.latest_unit = Math.max(student.latest_unit, unitNum);
      }
      
      if (record.parsed_at > student.last_updated) {
        student.last_updated = record.parsed_at;
      }
    });

    const groupedStudents = Array.from(studentMap.values());
    
    investigation.groupingTest = {
      totalStudentsFromGrouping: groupedStudents.length,
      totalFeedbackSessionsFromGrouping: totalFeedbackSessions,
      targetStudents: {
        melody: groupedStudents.find(s => s.student_name.toLowerCase().includes('melody'))?.total_feedback_sessions || 0,
        selina: groupedStudents.find(s => s.student_name.toLowerCase().includes('selina'))?.total_feedback_sessions || 0,
        kaye: groupedStudents.find(s => s.student_name.toLowerCase().includes('kaye'))?.total_feedback_sessions || 0,
        marcus: groupedStudents.find(s => s.student_name.toLowerCase().includes('marcus'))?.total_feedback_sessions || 0,
        isabelle: groupedStudents.find(s => s.student_name.toLowerCase().includes('isabelle'))?.total_feedback_sessions || 0
      },
      sampleGroupedStudents: groupedStudents.slice(0, 10).map(s => ({
        name: s.student_name,
        feedbacks: s.total_feedback_sessions,
        classes: Array.from(s.class_codes).join(', '),
        types: Array.from(s.feedback_types).join(', ')
      }))
    };

    // ===== TEST 3: DUPLICATE ANALYSIS =====
    console.log('TEST 3: Duplicate analysis...');
    
    const duplicateAnalysis = new Map<string, any[]>();
    
    rawData?.forEach(record => {
      const key = `${record.student_name}_${record.unit_number}_${record.feedback_type}_${record.class_code}`;
      if (!duplicateAnalysis.has(key)) {
        duplicateAnalysis.set(key, []);
      }
      duplicateAnalysis.get(key)!.push(record);
    });
    
    const duplicates = Array.from(duplicateAnalysis.entries()).filter(([key, records]) => records.length > 1);
    
    investigation.duplicateAnalysis = {
      totalUniqueKeys: duplicateAnalysis.size,
      totalDuplicateKeys: duplicates.length,
      totalDuplicateRecords: duplicates.reduce((sum, [key, records]) => sum + records.length, 0),
      sampleDuplicates: duplicates.slice(0, 5).map(([key, records]) => ({
        key,
        count: records.length,
        records: records.map(r => ({
          student: r.student_name,
          unit: r.unit_number,
          type: r.feedback_type,
          class: r.class_code,
          parsed_at: r.parsed_at
        }))
      }))
    };

    // ===== TEST 4: MISSING STUDENTS DETAILED SEARCH =====
    console.log('TEST 4: Missing students detailed search...');
    
    const targetNames = ['melody', 'selina', 'kaye', 'marcus', 'isabelle'];
    const missingStudentsDetail = {};
    
    for (const name of targetNames) {
      const matches = rawData?.filter(r => 
        r.student_name.toLowerCase().includes(name) ||
        r.student_name.toLowerCase() === name
      ) || [];
      
      (missingStudentsDetail as any)[name] = {
        totalMatches: matches.length,
        uniqueNames: [...new Set(matches.map(r => r.student_name))],
        sampleRecords: matches.slice(0, 5).map(r => ({
          name: r.student_name,
          unit: r.unit_number,
          type: r.feedback_type,
          class: r.class_code
        }))
      };
    }
    
    investigation.missingStudents = missingStudentsDetail;

    console.log('=== API AGGREGATION INVESTIGATION COMPLETE ===');

    return NextResponse.json(investigation);

  } catch (error) {
    console.error('Error in API aggregation investigation:', error);
    return NextResponse.json(
      { error: 'Failed to investigate API aggregation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}