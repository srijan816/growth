import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('Testing fixed query with increased limit...');
    
    // Test the query with the new limit
    const { data, error } = await supabaseAdmin
      .from('parsed_student_feedback')
      .select('student_name, class_code, class_name, unit_number, feedback_type, parsed_at')
      .limit(10000) // Set high limit to get all records
      .order('student_name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique students
    const uniqueStudents = [...new Set(data?.map(r => r.student_name))];
    
    // Check for our target students
    const targetStudents = {
      melody: data?.filter(r => r.student_name.toLowerCase().includes('melody')).length || 0,
      selina: data?.filter(r => r.student_name.toLowerCase().includes('selina')).length || 0,
      kaye: data?.filter(r => r.student_name.toLowerCase().includes('kaye')).length || 0,
      marcus: data?.filter(r => r.student_name.toLowerCase().includes('marcus')).length || 0,
      isabelle: data?.filter(r => r.student_name.toLowerCase().includes('isabelle')).length || 0
    };

    return NextResponse.json({
      success: true,
      totalRecords: data?.length || 0,
      uniqueStudents: uniqueStudents.length,
      targetStudents,
      foundTargetStudents: uniqueStudents.filter(name => 
        ['melody', 'selina', 'kaye', 'marcus', 'isabelle'].some(target => 
          name.toLowerCase().includes(target)
        )
      ),
      allStudents: uniqueStudents.sort()
    });

  } catch (error) {
    console.error('Error testing fixed query:', error);
    return NextResponse.json(
      { error: 'Failed to test query', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}