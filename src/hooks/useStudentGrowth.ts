'use client';

import { useState, useEffect } from 'react';
import { StudentGrowthData, TimeFrame } from '@/lib/analytics/growth-engine';

export function useStudentGrowth(studentId: string | null, timeframe: TimeFrame = 'month') {
  const [data, setData] = useState<StudentGrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!studentId) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchGrowthData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/analytics/growth/${studentId}?timeframe=${timeframe}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch growth data: ${response.statusText}`);
        }

        const growthData = await response.json();
        setData(growthData);
      } catch (err) {
        console.error('Error fetching growth data:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchGrowthData();
  }, [studentId, timeframe]);

  const refresh = async () => {
    if (!studentId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/growth/${studentId}?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch growth data: ${response.statusText}`);
      }

      const growthData = await response.json();
      setData(growthData);
    } catch (err) {
      console.error('Error refreshing growth data:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    refresh
  };
}