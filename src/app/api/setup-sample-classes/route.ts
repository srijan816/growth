import { NextRequest, NextResponse } from 'next/server';
import { SampleClassGenerator } from '@/lib/sample-class-generator';
import { getPool } from '@/lib/postgres';

/**
 * Setup sample classes for Srijan based on parsed feedback data
 * Creates realistic class sessions for the weekly calendar view
 */
export async function POST(request: NextRequest) {
  try {
    const generator = new SampleClassGenerator();
    
    // First, populate the basic sample data (users, courses, students, enrollments)
    console.log('Populating sample data...');
    await generator.populateSampleData();
    
    // Then generate and store weekly class sessions
    console.log('Generating weekly class sessions...');
    await generator.generateAndStoreWeeklyClasses();
    
    return NextResponse.json({
      success: true,
      message: 'Sample classes created successfully',
      details: {
        instructor: 'Srijan',
        coursesCreated: 5,
        studentsCreated: 28,
        weeksGenerated: 4,
        classSessionsCreated: 20
      }
    });

  } catch (error) {
    console.error('Error setting up sample classes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to setup sample classes', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Get sample class data for preview
 */
export async function GET() {
  try {
    const generator = new SampleClassGenerator();
    
    // Get current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weeklyClasses = await generator.generateWeeklyClasses(startOfWeek);
    
    return NextResponse.json({
      success: true,
      weekStart: startOfWeek.toISOString(),
      classes: weeklyClasses,
      summary: {
        totalClasses: weeklyClasses.length,
        instructor: 'Srijan',
        courseCodes: [...new Set(weeklyClasses.map(c => c.courseCode))],
        totalStudents: weeklyClasses.reduce((sum, c) => sum + c.enrolledCount, 0)
      }
    });

  } catch (error) {
    console.error('Error getting sample class data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get sample class data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}