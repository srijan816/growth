'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Session } from 'next-auth';
import { DashboardData } from '@/types/data-models';

const DashboardClient = dynamic(() => import('./dashboard-client-v3'), {
  loading: () => (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  ),
  ssr: false,
});

import dynamic from 'next/dynamic';

interface DashboardWrapperProps {
  initialData: {
    students?: any[];
    dashboardData?: DashboardData | null;
    analysisData?: any;
    session: Session;
    error?: string;
  };
}

export function DashboardWrapper({ initialData }: DashboardWrapperProps) {
  return (
    <Suspense fallback={
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    }>
      <DashboardClient initialData={initialData} />
    </Suspense>
  );
}