import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('Checking actual database record count...');
    
    // Get exact count using count query
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('parsed_student_feedback')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Get a sample of records with higher limit
    const { data: sampleData, error: dataError } = await supabaseAdmin
      .from('parsed_student_feedback')
      .select('student_name, unit_number, feedback_type, parsed_at')
      .limit(2000)
      .order('parsed_at', { ascending: false }); // Get most recent first

    if (dataError) {
      return NextResponse.json({ error: dataError.message }, { status: 500 });
    }

    // Count unique students in the sample
    const uniqueStudents = [...new Set(sampleData?.map(r => r.student_name))];
    
    // Look for our target students in the sample
    const targetStudents = {
      melody: sampleData?.filter(r => r.student_name.toLowerCase().includes('melody')) || [],
      selina: sampleData?.filter(r => r.student_name.toLowerCase().includes('selina')) || [],
      kaye: sampleData?.filter(r => r.student_name.toLowerCase().includes('kaye')) || [],
      marcus: sampleData?.filter(r => r.student_name.toLowerCase().includes('marcus')) || [],
      isabelle: sampleData?.filter(r => r.student_name.toLowerCase().includes('isabelle')) || []
    };

    // Get the earliest and latest parsed_at timestamps
    const timestamps = sampleData?.map(r => r.parsed_at).sort() || [];
    
    return NextResponse.json({
      actualDatabaseCount: totalCount,
      sampleDataRetrieved: sampleData?.length || 0,
      uniqueStudentsInSample: uniqueStudents.length,
      targetStudentsFound: {
        melody: targetStudents.melody.length,
        selina: targetStudents.selina.length,
        kaye: targetStudents.kaye.length,
        marcus: targetStudents.marcus.length,
        isabelle: targetStudents.isabelle.length
      },
      targetStudentDetails: {
        melody: targetStudents.melody.slice(0, 3),
        selina: targetStudents.selina.slice(0, 3),
        kaye: targetStudents.kaye.slice(0, 3),
        marcus: targetStudents.marcus.slice(0, 3),
        isabelle: targetStudents.isabelle.slice(0, 3)
      },
      timeRange: {
        earliest: timestamps[0],
        latest: timestamps[timestamps.length - 1]
      },
      sampleUniqueStudents: uniqueStudents.sort()
    });

  } catch (error) {
    console.error('Error checking database count:', error);
    return NextResponse.json(
      { error: 'Failed to check database count', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}