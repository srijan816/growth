import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/postgres';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get today's date
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // For now, return mock data since the course tables might not be set up
    const mockClasses = [
      {
        id: '1',
        code: 'PSD-101',
        name: 'Public Speaking & Debating',
        start_time: '09:00',
        end_time: '10:30',
        location: 'Room A',
        student_count: 12,
        instructor_name: session.user.name || 'Instructor',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        code: 'AW-201',
        name: 'Academic Writing',
        start_time: '11:00',
        end_time: '12:30',
        location: 'Room B',
        student_count: 8,
        instructor_name: session.user.name || 'Instructor',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      classes: mockClasses,
      date: today.toISOString().split('T')[0],
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
    });

  } catch (error) {
    console.error('Today\'s classes fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch today\'s classes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}