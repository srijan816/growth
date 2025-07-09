import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { DAL } from '@/lib/dal';
import { authOptions } from '@/lib/auth';
import { CourseSchema } from '@/lib/onboarding/excel-parser';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Validate and process data
    const results = {
      total: data.length,
      succeeded: 0,
      failed: 0,
      errors: [] as any[]
    };

    const dal = DAL.getInstance();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel rows start at 1, plus header

      try {
        // Validate row data
        const validated = CourseSchema.parse(row);
        
        // Create or update course
        await dal.courses.upsertCourse({
          code: validated.course_code,
          name: validated.course_name,
          description: validated.description,
          program_type: validated.program_type || 'PSD',
          instructor_id: session.user.id,
          schedule_day: validated.day_of_week,
          start_time: validated.start_time,
          end_time: validated.end_time,
          max_students: validated.max_students || 12,
          division: validated.division,
          grade_group: validated.grade_group,
          skill_level: validated.skill_level
        });

        results.succeeded++;
      } catch (error) {
        results.failed++;
        
        if (error instanceof z.ZodError) {
          results.errors.push({
            row: rowNumber,
            errors: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          });
        } else {
          results.errors.push({
            row: rowNumber,
            errors: [{ field: 'general', message: String(error) }]
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Course upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to process course upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}