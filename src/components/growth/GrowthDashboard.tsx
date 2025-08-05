'use client';

import { motion } from 'framer-motion';
import { useStudentGrowth } from '@/hooks/useStudentGrowth';
import { GrowthTimeline } from './GrowthTimeline';
import { SkillRadarEvolution } from './SkillRadarEvolution';
import { GrowthVelocityChart } from './GrowthVelocityChart';
import { MilestoneTracker } from './MilestoneTracker';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface GrowthDashboardProps {
  studentId: string;
  timeframe?: 'week' | 'month' | 'term' | 'year';
}

function GrowthDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function GrowthSparkline({ data }: { data: Array<{ date: string; score: number }> }) {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data.map(d => d.score));
  const min = Math.min(...data.map(d => d.score));
  const range = max - min || 1;
  
  return (
    <svg className="w-32 h-16" viewBox="0 0 100 40">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.5"
        points={data
          .map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 40 - ((d.score - min) / range) * 40;
            return `${x},${y}`;
          })
          .join(' ')}
      />
      <polyline
        fill="url(#sparklineGradient)"
        fillOpacity="0.3"
        stroke="none"
        points={`0,40 ${data
          .map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 40 - ((d.score - min) / range) * 40;
            return `${x},${y}`;
          })
          .join(' ')} 100,40`}
      />
      <defs>
        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function GrowthDashboard({ studentId, timeframe = 'month' }: GrowthDashboardProps) {
  const { data: growth, loading, error } = useStudentGrowth(studentId, timeframe);
  
  if (loading) return <GrowthDashboardSkeleton />;
  
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load growth data: {error.message}</p>
      </div>
    );
  }
  
  if (!growth) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No growth data available</p>
      </div>
    );
  }
  
  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="w-6 h-6" />;
    if (trend < -5) return <TrendingDown className="w-6 h-6" />;
    return <Minus className="w-6 h-6" />;
  };
  
  const getTrendColor = (trend: number) => {
    if (trend > 5) return 'text-green-500';
    if (trend < -5) return 'text-red-500';
    return 'text-gray-500';
  };
  
  return (
    <div className="space-y-6">
      {/* Hero Growth Score - The Big Number */}
      <motion.div 
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-medium opacity-90 mb-3">Overall Growth Score</h2>
            <div className="flex items-baseline gap-4">
              <motion.span 
                className="text-7xl font-bold"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {growth.overall.score}
              </motion.span>
              <motion.div 
                className={`flex items-center gap-2 ${getTrendColor(growth.overall.trend)}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                {getTrendIcon(growth.overall.trend)}
                <span className="text-2xl font-semibold">
                  {growth.overall.trend > 0 ? '+' : ''}{growth.overall.trend}%
                </span>
              </motion.div>
            </div>
            <motion.p 
              className="mt-4 text-lg opacity-90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {growth.overall.description}
            </motion.p>
            <motion.div 
              className="mt-4 flex items-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div>
                <span className="text-sm opacity-75">Level</span>
                <p className="text-xl font-semibold capitalize">{growth.overall.level}</p>
              </div>
              <div>
                <span className="text-sm opacity-75">Percentile</span>
                <p className="text-xl font-semibold">{growth.overall.percentile}th</p>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            className="ml-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <GrowthSparkline data={growth.overall.history} />
          </motion.div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Interactive Skill Radar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <SkillRadarEvolution 
            current={growth.skills}
            trajectory={growth.trajectory}
          />
        </motion.div>
        
        {/* Growth Velocity - How Fast Are They Improving */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <GrowthVelocityChart 
            data={growth.velocity}
            comparisons={growth.comparisons}
          />
        </motion.div>
      </div>

      {/* Visual Growth Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <GrowthTimeline 
          milestones={growth.milestones}
          currentPosition={growth.overall.percentile}
        />
      </motion.div>
      
      {/* Achievement & Milestone Tracker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <MilestoneTracker 
          achieved={growth.milestones.achieved}
          upcoming={growth.milestones.upcoming}
          studentLevel={growth.overall.level}
        />
      </motion.div>

      {/* Growth Patterns & Insights */}
      {growth.patterns && growth.patterns.length > 0 && (
        <motion.div
          className="bg-white rounded-xl shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <h3 className="text-xl font-bold mb-4">Growth Patterns & Insights</h3>
          <div className="space-y-3">
            {growth.patterns.map((pattern, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-semibold px-2 py-1 rounded ${
                    pattern.type === 'accelerating' ? 'bg-green-100 text-green-700' :
                    pattern.type === 'consistent' ? 'bg-blue-100 text-blue-700' :
                    pattern.type === 'plateau' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {pattern.type}
                  </span>
                </div>
                <p className="text-gray-800 mb-1">{pattern.description}</p>
                <p className="text-sm text-gray-600 italic">
                  💡 {pattern.recommendation}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}