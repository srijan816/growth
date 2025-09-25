import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RecordingsLibrary } from '@/components/recording/RecordingsLibrary';

export default async function RecordingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'instructor') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recordings & Transcripts</h1>
          <p className="text-muted-foreground">
            Access and manage all recorded speeches, debates, and their transcripts
          </p>
        </div>
      </div>

      <RecordingsLibrary />
    </div>
  );
}