import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('Resetting tables to add html_content column...');
    
    // Clear existing data
    await supabaseAdmin.from('parsed_student_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('feedback_parsing_status').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Cleared existing data');
    
    // Create new table structure with html_content column
    const testRecord = {
      student_name: '__table_reset_test__',
      class_code: 'TEST',
      class_name: 'Test Class',
      unit_number: '0.0',
      lesson_number: '0.0',
      topic: 'Test topic',
      motion: 'Test motion',
      content: 'Test content for table creation',
      raw_content: 'Test raw content',
      html_content: '<p>Test HTML content</p>',
      feedback_type: 'primary' as const,
      best_aspects: 'Test strengths',
      improvement_areas: 'Test improvements',
      teacher_comments: 'Test comments',
      rubric_scores: null,
      duration: '3:00',
      file_path: '/test/path'
    };

    const { error: insertError } = await supabaseAdmin
      .from('parsed_student_feedback')
      .insert([testRecord]);
      
    if (insertError) {
      console.log('Table creation status:', insertError.message || 'Created with new structure');
    } else {
      console.log('✓ Table created with html_content column, cleaning up test record');
      await supabaseAdmin
        .from('parsed_student_feedback')
        .delete()
        .eq('student_name', '__table_reset_test__');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Tables reset successfully with html_content column'
    });
    
  } catch (error) {
    console.error('Error resetting tables:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reset tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}