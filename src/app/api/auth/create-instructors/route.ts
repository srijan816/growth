import { NextRequest, NextResponse } from 'next/server';
import { db, findOne, insertOne } from '@/lib/postgres';
import bcrypt from 'bcryptjs';

const INSTRUCTORS = [
  { name: 'Saurav', email: 'saurav@instructor.com' },
  { name: 'Srijan', email: 'srijan@instructor.com' },
  { name: 'Jami', email: 'jami@instructor.com' },
  { name: 'Mai', email: 'mai@instructor.com' },
  { name: 'Tamkeen', email: 'tamkeen@instructor.com' },
  { name: 'Naveen', email: 'naveen@instructor.com' }
];

export async function POST(request: NextRequest) {
  try {
    const hashedPassword = await bcrypt.hash('password', 10);
    const results = [];

    for (const instructor of INSTRUCTORS) {
      const existingUser = await findOne('users', { email: instructor.email });

      if (existingUser) {
        results.push({
          name: instructor.name,
          email: instructor.email,
          status: 'already exists',
          id: existingUser.id
        });
        continue;
      }

      const newUser = await insertOne('users', {
        email: instructor.email,
        name: instructor.name,
        password_hash: hashedPassword,
        role: 'instructor'
      });

      results.push({
        name: instructor.name,
        email: instructor.email,
        status: 'created',
        id: newUser.id
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Instructor accounts processed',
      results
    });

  } catch (error) {
    console.error('Error creating instructors:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create instructor accounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
