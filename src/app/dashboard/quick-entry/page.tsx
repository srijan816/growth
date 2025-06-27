import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import QuickEntry from '@/components/quick-entry/QuickEntry';

export default function QuickEntryPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <QuickEntry />
    </Suspense>
  );
}