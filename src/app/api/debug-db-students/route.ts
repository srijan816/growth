import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get all unique students from the database
    const { data: allRecords, error: recordsError } = await supabaseAdmin
      .from('parsed_student_feedback')
      .select('student_name, feedback_type, class_code')
      .order('student_name');

    if (recordsError) {
      console.error('Error fetching records:', recordsError);
      return NextResponse.json({ error: recordsError.message }, { status: 500 });
    }

    // Get unique students
    const uniqueStudents = new Set<string>();
    const studentDetails = new Map<string, any>();

    allRecords?.forEach(record => {
      uniqueStudents.add(record.student_name);
      
      if (!studentDetails.has(record.student_name)) {
        studentDetails.set(record.student_name, {
          name: record.student_name,
          feedbackTypes: new Set(),
          classCodes: new Set(),
          recordCount: 0
        });
      }
      
      const student = studentDetails.get(record.student_name);
      student.feedbackTypes.add(record.feedback_type);
      student.classCodes.add(record.class_code);
      student.recordCount++;
    });

    // Convert to array and add computed fields
    const studentsArray = Array.from(studentDetails.values()).map(student => ({
      ...student,
      feedbackTypes: Array.from(student.feedbackTypes),
      classCodes: Array.from(student.classCodes)
    }));

    // Sort by name
    studentsArray.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      totalUniqueStudents: uniqueStudents.size,
      totalRecords: allRecords?.length || 0,
      students: studentsArray,
      sampleStudents: studentsArray.slice(0, 10) // First 10 for quick view
    });

  } catch (error) {
    console.error('Error in debug-db-students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}