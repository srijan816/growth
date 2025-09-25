'use client';

import { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, Target } from 'lucide-react';

interface GrowthVelocityChartProps {
  data: Array<{
    week: string;
    velocity: number;
    benchmark: number;
  }>;
  comparisons: {
    toPeers: {
      percentile: number;
      ranking: number;
      totalPeers: number;
      aboveAverage: boolean;
    };
    toPrevious: {
      improvement: number;
      consistencyChange: number;
      momentumChange: number;
    };
    toGoals: {
      onTrack: boolean;
      progressPercentage: number;
      estimatedCompletion: Date | null;
    };
  };
}

interface MomentumCardProps {
  title: string;
  value: string | number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'above' | 'below';
  description: string;
  icon?: React.ReactNode;
}

function MomentumCard({ title, value, trend, description, icon }: MomentumCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'increasing':
      case 'above':
        return 'text-green-600 bg-green-50';
      case 'decreasing':
      case 'below':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`p-4 rounded-lg ${getTrendColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-75">{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-xs opacity-75">{description}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload[0]) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function GrowthVelocityChart({ data, comparisons }: GrowthVelocityChartProps) {
  const [timeRange, setTimeRange] = useState<'1m' | '3m' | '6m' | '1y'>('3m');
  
  // Handle missing data
  if (!data || !Array.isArray(data)) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4">Growth Velocity</h3>
        <p className="text-gray-500">No velocity data available</p>
      </div>
    );
  }
  
  // Filter data based on time range
  const filteredData = (() => {
    const ranges = {
      '1m': 4,
      '3m': 12,
      '6m': 24,
      '1y': 52
    };
    return data.slice(-ranges[timeRange]);
  })();

  // Calculate momentum metrics
  const calculateMomentum = () => {
    if (filteredData.length < 2) return 0;
    const recent = filteredData.slice(-3).reduce((sum, d) => sum + d.velocity, 0) / 3;
    const older = filteredData.slice(-6, -3).reduce((sum, d) => sum + d.velocity, 0) / 3;
    return Math.round((recent - older) * 10) / 10;
  };

  const calculateConsistency = () => {
    if (filteredData.length === 0) return 0;
    const velocities = filteredData.map(d => d.velocity);
    const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, Math.min(100, Math.round(100 - (stdDev * 20))));
  };

  const momentum = calculateMomentum();
  const consistency = calculateConsistency();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold">Growth Velocity</h3>
          <p className="text-sm text-gray-600">How fast skills are improving</p>
        </div>
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="1m">Last Month</option>
          <option value="3m">Last 3 Months</option>
          <option value="6m">Last 6 Months</option>
          <option value="1y">Last Year</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={filteredData}>
          <defs>
            <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="week" 
            tick={{ fontSize: 12 }}
            tickMargin={10}
          />
          <YAxis 
            label={{ 
              value: 'Growth Rate (%)', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: 12 }
            }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <ReferenceLine 
            y={0} 
            stroke="#6b7280" 
            strokeDasharray="3 3"
            label={{ value: "Baseline", position: "right", style: { fontSize: 10 } }}
          />
          
          <Area
            type="monotone"
            dataKey="benchmark"
            stroke="#10b981"
            fill="url(#benchmarkGradient)"
            strokeWidth={1}
            name="Grade Average"
          />
          
          <Area
            type="monotone"
            dataKey="velocity"
            stroke="#3b82f6"
            fill="url(#velocityGradient)"
            strokeWidth={2}
            name="Your Growth"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Momentum Indicators */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <MomentumCard
          title="Current Momentum"
          value={`${momentum > 0 ? '+' : ''}${momentum}%`}
          trend={momentum > 0 ? 'increasing' : momentum < 0 ? 'decreasing' : 'stable'}
          description={
            momentum > 0 ? 'Growth is accelerating' :
            momentum < 0 ? 'Growth is slowing' :
            'Steady growth rate'
          }
          icon={<Activity className="w-4 h-4" />}
        />
        <MomentumCard
          title="Consistency Score"
          value={`${consistency}%`}
          trend={consistency > 70 ? 'above' : consistency < 40 ? 'below' : 'stable'}
          description={
            consistency > 70 ? 'Very consistent' :
            consistency < 40 ? 'Needs improvement' :
            'Moderate consistency'
          }
          icon={<Target className="w-4 h-4" />}
        />
        <MomentumCard
          title="Peer Comparison"
          value={`Top ${100 - comparisons.toPeers.percentile}%`}
          trend={comparisons.toPeers.aboveAverage ? 'above' : 'below'}
          description={`Rank ${comparisons.toPeers.ranking} of ${comparisons.toPeers.totalPeers}`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Progress to Goals */}
      {comparisons.toGoals && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-900">Progress to Goals</h4>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              comparisons.toGoals.onTrack 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {comparisons.toGoals.onTrack ? 'On Track' : 'Needs Attention'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, comparisons.toGoals.progressPercentage)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>{comparisons.toGoals.progressPercentage}% Complete</span>
            {comparisons.toGoals.estimatedCompletion && (
              <span>
                Est. {new Date(comparisons.toGoals.estimatedCompletion).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recent Performance Summary */}
      <div className="mt-4 text-sm text-gray-600">
        <p>
          {comparisons.toPrevious.improvement > 0 
            ? `📈 ${comparisons.toPrevious.improvement}% improvement from last period`
            : comparisons.toPrevious.improvement < 0
            ? `📉 ${Math.abs(comparisons.toPrevious.improvement)}% decrease from last period`
            : '➡️ Performance stable from last period'
          }
        </p>
      </div>
    </div>
  );
}