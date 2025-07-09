import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { DAL } from '@/lib/dal';
import { authOptions } from '@/lib/auth';
import { LessonMaterialSchema } from '@/lib/onboarding/excel-parser';

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
        const validated = LessonMaterialSchema.parse(row);
        
        // Find course and its configuration
        const course = await dal.courses.findByCode(validated.course_code);
        if (!course) {
          throw new Error(`Course with code ${validated.course_code} not found`);
        }

        // Find or create lesson plan
        let lessonPlan = await dal.courses.findLessonPlan(
          course.id,
          validated.lesson_number
        );

        if (!lessonPlan) {
          lessonPlan = await dal.courses.createLessonPlan({
            course_id: course.id,
            lesson_number: validated.lesson_number,
            title: validated.lesson_title,
            objectives: validated.objectives,
            materials: validated.materials,
            duration_minutes: validated.duration_minutes
          });
        }

        // If student submission data is provided
        if (validated.student_email) {
          const student = await dal.students.findByEmail(validated.student_email);
          if (!student) {
            throw new Error(`Student with email ${validated.student_email} not found`);
          }

          // Create lesson submission
          await dal.courses.createLessonSubmission({
            student_id: student.id,
            lesson_plan_id: lessonPlan.id,
            session_date: validated.session_date ? new Date(validated.session_date) : undefined,
            speech_recording_url: validated.speech_recording_url,
            worksheet_url: validated.worksheet_url,
            feedback_document_url: validated.feedback_document_url
          });
        }

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
    console.error('Lesson materials upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to process lesson materials upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}