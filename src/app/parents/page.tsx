import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ParentDashboard from './parent-dashboard';
import { db } from '@/lib/database/drizzle';
import { students, users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Parent Portal | Growth Compass',
  description: 'Track your child\'s growth and progress',
};

export default async function ParentPortalPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin?callbackUrl=/parents');
  }

  // Get user's linked students (children)
  const userStudents = await db
    .select({
      id: students.id,
      name: users.name,
      studentNumber: students.studentNumber,
      gradeLevel: students.gradeLevel,
      section: students.section,
      email: students.email
    })
    .from(students)
    .innerJoin(users, eq(students.id, users.id))
    .where(eq(students.parentEmail, session.user?.email || ''))
    .limit(10);

  // If no students linked, show enrollment instructions
  if (userStudents.length === 0) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to Parent Portal</h1>
          <p className="text-muted-foreground mb-8">
            No students are currently linked to your account. Please contact your child's instructor
            to link your email address ({session.user?.email}) to your child's profile.
          </p>
        </div>
      </div>
    );
  }

  return <ParentDashboard students={userStudents} userEmail={session.user?.email || ''} />;
}