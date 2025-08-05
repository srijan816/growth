import { Suspense } from 'react';
import AttendanceInterface from '@/components/attendance/AttendanceInterface';

export default function AttendancePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <AttendanceInterface />
      </Suspense>
    </div>
  );
}
