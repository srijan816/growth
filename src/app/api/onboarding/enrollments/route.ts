import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { DAL } from '@/lib/dal';
import { authOptions } from '@/lib/auth';
import { EnrollmentSchema } from '@/lib/onboarding/excel-parser';

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
        const validated = EnrollmentSchema.parse(row);
        
        // Find or create student
        let student = await dal.students.findByEmail(validated.student_email);
        
        if (!student) {
          // Create student with parent user
          const parentUser = await dal.students.createParentUser({
            email: validated.parent_email,
            name: validated.parent_name,
            phone: validated.parent_phone
          });

          student = await dal.students.create({
            name: validated.student_name,
            email: validated.student_email,
            date_of_birth: validated.date_of_birth ? new Date(validated.date_of_birth) : undefined,
            grade: validated.grade,
            school: validated.school,
            parent_id: parentUser.id
          });
        }

        // Find course
        const course = await dal.courses.findByCode(validated.course_code);
        if (!course) {
          throw new Error(`Course with code ${validated.course_code} not found`);
        }

        // Create enrollment
        await dal.courses.enrollStudent({
          student_id: student.id,
          course_id: course.id,
          enrollment_date: validated.enrollment_date ? new Date(validated.enrollment_date) : new Date(),
          status: validated.status || 'active'
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
    console.error('Enrollment upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to process enrollment upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}