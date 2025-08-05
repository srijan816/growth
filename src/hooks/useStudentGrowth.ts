import { useState, useEffect } from 'react';
import { StudentGrowthData, TimeFrame } from '@/lib/analytics/growth-engine';

interface UseStudentGrowthReturn {
  data: StudentGrowthData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStudentGrowth(
  studentId: string,
  timeframe: TimeFrame = 'month'
): UseStudentGrowthReturn {
  const [data, setData] = useState<StudentGrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrowthData = async () => {
    if (!studentId) {
      setError('No student ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/students/${studentId}/growth?timeframe=${timeframe}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch growth data');
      }
      
      const growthData = await response.json();
      setData(growthData);
    } catch (err) {
      console.error('Error fetching student growth:', err);
      setError(err instanceof Error ? err.message : 'Failed to load growth data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrowthData();
  }, [studentId, timeframe]);

  return {
    data,
    loading,
    error,
    refetch: fetchGrowthData
  };
}