import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get all student names from database with pagination to get all records
    console.log('DEBUG: Fetching all records with pagination');
    
    let allData: any[] = [];
    let hasMore = true;
    let offset = 0;
    const pageSize = 1000;
    
    while (hasMore) {
      const { data, error } = await supabaseAdmin
        .from('parsed_student_feedback')
        .select('student_name')
        .range(offset, offset + pageSize - 1)
        .order('student_name');
      
      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      if (data && data.length > 0) {
        allData = allData.concat(data);
        offset += pageSize;
        hasMore = data.length === pageSize;
        console.log(`DEBUG: Fetched ${data.length} records, total so far: ${allData.length}`);
      } else {
        hasMore = false;
      }
    }
    
    const data = allData;
    console.log('DEBUG: Final total records:', data?.length);

    // Get unique student names
    const uniqueNames = [...new Set(data?.map(row => row.student_name) || [])];
    
    // Group by first letter
    const namesByLetter = uniqueNames.reduce((acc, name) => {
      const firstLetter = name.charAt(0).toUpperCase();
      if (!acc[firstLetter]) acc[firstLetter] = [];
      acc[firstLetter].push(name);
      return acc;
    }, {} as Record<string, string[]>);

    return NextResponse.json({
      totalUniqueStudents: uniqueNames.length,
      totalRecords: data?.length || 0,
      namesByLetter,
      allNames: uniqueNames,
      sample: uniqueNames.slice(0, 20)
    });

  } catch (error) {
    console.error('Error in debug-students:', error);
    return NextResponse.json(
      { error: 'Failed to debug students' }, 
      { status: 500 }
    );
  }
}