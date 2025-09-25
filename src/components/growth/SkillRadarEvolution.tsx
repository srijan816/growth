'use client';

import { useState } from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { SkillType } from '@/lib/analytics/growth-engine';
import { ScoreBreakdown, ScoreInfoButton } from './ScoreBreakdown';
import { getContentScoreBreakdown, getStyleScoreBreakdown, getStrategyScoreBreakdown } from '@/lib/analytics/score-calculations';

interface SkillRadarEvolutionProps {
  current: any; // Can be either old skills format or new debate dimensions
  trajectory: {
    projected3Months?: number;
    projected6Months?: number;
    confidenceInterval?: [number, number];
    nextMonth?: number;
    nextQuarter?: number;
    confidence?: number;
  };
}

export function SkillRadarEvolution({ current, trajectory }: SkillRadarEvolutionProps) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'current' | 'growth' | 'projected'>('current');
  const [activeBreakdown, setActiveBreakdown] = useState<'content' | 'style' | 'strategy' | null>(null);
  
  // Check if we have the new debate format (content, style, strategy) or old format (skills)
  const isDebateFormat = current && (current.content || current.style || current.strategy);
  
  // Transform data for recharts based on format
  const data = isDebateFormat ? [
    { 
      skill: 'Content', 
      current: current.content?.score || 0,
      previous: Math.max(0, (current.content?.score || 0) - (current.content?.growthRate || 0)),
      growth: current.content?.growthRate || 0,
      projected: Math.min(100, (current.content?.score || 0) + ((trajectory.nextMonth || 0) - (current.content?.score || 0)) * 0.3)
    },
    { 
      skill: 'Style', 
      current: current.style?.score || 0,
      previous: Math.max(0, (current.style?.score || 0) - (current.style?.growthRate || 0)),
      growth: current.style?.growthRate || 0,
      projected: Math.min(100, (current.style?.score || 0) + ((trajectory.nextMonth || 0) - (current.style?.score || 0)) * 0.3)
    },
    { 
      skill: 'Strategy', 
      current: current.strategy?.score || 0,
      previous: Math.max(0, (current.strategy?.score || 0) - (current.strategy?.growthRate || 0)),
      growth: current.strategy?.growthRate || 0,
      projected: Math.min(100, (current.strategy?.score || 0) + ((trajectory.nextMonth || 0) - (current.strategy?.score || 0)) * 0.3)
    }
  ] : [
    // Fallback to old format if needed
    { 
      skill: 'Speaking', 
      current: current?.speaking?.currentLevel || 0,
      previous: current?.speaking?.previousLevel || 0,
      growth: current?.speaking?.growthRate || 0,
      projected: Math.min(100, (current?.speaking?.currentLevel || 0) + ((trajectory.projected3Months || trajectory.nextMonth || 0) - (current?.speaking?.currentLevel || 0)) * 0.2)
    },
    { 
      skill: 'Argumentation', 
      current: current?.argumentation?.currentLevel || 0,
      previous: current?.argumentation?.previousLevel || 0,
      growth: current?.argumentation?.growthRate || 0,
      projected: Math.min(100, (current?.argumentation?.currentLevel || 0) + ((trajectory.projected3Months || trajectory.nextMonth || 0) - (current?.argumentation?.currentLevel || 0)) * 0.2)
    },
    { 
      skill: 'Critical Thinking', 
      current: current?.critical_thinking?.currentLevel || 0,
      previous: current?.critical_thinking?.previousLevel || 0,
      growth: current?.critical_thinking?.growthRate || 0,
      projected: Math.min(100, (current?.critical_thinking?.currentLevel || 0) + ((trajectory.projected3Months || trajectory.nextMonth || 0) - (current?.critical_thinking?.currentLevel || 0)) * 0.2)
    },
    { 
      skill: 'Research', 
      current: current?.research?.currentLevel || 0,
      previous: current?.research?.previousLevel || 0,
      growth: current?.research?.growthRate || 0,
      projected: Math.min(100, (current?.research?.currentLevel || 0) + ((trajectory.projected3Months || trajectory.nextMonth || 0) - (current?.research?.currentLevel || 0)) * 0.2)
    },
    { 
      skill: 'Writing', 
      current: current?.writing?.currentLevel || 0,
      previous: current?.writing?.previousLevel || 0,
      growth: current?.writing?.growthRate || 0,
      projected: Math.min(100, (current?.writing?.currentLevel || 0) + ((trajectory.projected3Months || trajectory.nextMonth || 0) - (current?.writing?.currentLevel || 0)) * 0.2)
    },
    { 
      skill: 'Confidence', 
      current: current?.confidence?.currentLevel || 0,
      previous: current?.confidence?.previousLevel || 0,
      growth: current?.confidence?.growthRate || 0,
      projected: Math.min(100, (current?.confidence?.currentLevel || 0) + ((trajectory.projected3Months || trajectory.nextMonth || 0) - (current?.confidence?.currentLevel || 0)) * 0.2)
    }
  ];

  const getSkillDetails = (skillName: string) => {
    if (isDebateFormat) {
      // For debate format, map the skill name to the dimension
      const skillMap: Record<string, string> = {
        'Content': 'content',
        'Style': 'style',
        'Strategy': 'strategy'
      };
      return current[skillMap[skillName]];
    } else {
      // For old format
      const skillKey = skillName.toLowerCase().replace(' ', '_') as SkillType;
      return current[skillKey];
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const skill = payload[0].payload.skill;
      const details = getSkillDetails(skill);
      
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold mb-1">{skill}</p>
          <p className="text-sm">Current: {payload[0].value}%</p>
          {details && (
            <>
              <p className="text-sm">Growth: {details.growthRate > 0 ? '+' : ''}{details.growthRate?.toFixed(1) || 0}%</p>
              <p className="text-sm capitalize">Trend: {details.trend || 'stable'}</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Skill Evolution</h3>
        <div className="flex gap-2">
          {['current', 'growth', 'projected'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`px-4 py-2 rounded-lg transition-all text-sm ${
                viewMode === mode 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-96">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis 
              dataKey="skill" 
              tick={{ fontSize: 12 }}
              className="cursor-pointer"
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {viewMode === 'current' && (
              <>
                <Radar
                  name="Previous"
                  dataKey="previous"
                  stroke="#9ca3af"
                  fill="#9ca3af"
                  fillOpacity={0.2}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                />
                <Radar
                  name="Current"
                  dataKey="current"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.5}
                  strokeWidth={2}
                />
              </>
            )}
            
            {viewMode === 'growth' && (
              <Radar
                name="Growth Rate"
                dataKey="growth"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.5}
                strokeWidth={2}
              />
            )}
            
            {viewMode === 'projected' && (
              <>
                <Radar
                  name="Current"
                  dataKey="current"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="3-Month Projection"
                  dataKey="projected"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.4}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </>
            )}
            
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
        
        {/* Skill Detail Popup */}
        <AnimatePresence>
          {selectedSkill && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-xl border max-w-xs z-10"
            >
              <h4 className="font-bold mb-2">{selectedSkill}</h4>
              {(() => {
                const details = getSkillDetails(selectedSkill);
                if (!details) return null;
                
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Current Level:</span>
                      <span className="font-semibold">{details.currentLevel}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Growth Rate:</span>
                      <span className={`font-semibold ${details.growthRate > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {details.growthRate > 0 ? '+' : ''}{details.growthRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consistency:</span>
                      <span className="font-semibold">{details.consistency}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Milestone:</span>
                      <span className="font-semibold">{details.nextMilestone?.level}%</span>
                    </div>
                    {details.nextMilestone && (
                      <p className="text-xs text-gray-600 mt-2">
                        Estimated {details.nextMilestone.estimatedWeeks} weeks to reach
                      </p>
                    )}
                  </div>
                );
              })()}
              <button 
                onClick={() => setSelectedSkill(null)}
                className="mt-3 text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Growth Insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Key Insights</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          {(() => {
            const strongestSkill = data.reduce((prev, curr) => 
              curr.current > prev.current ? curr : prev
            );
            const weakestSkill = data.reduce((prev, curr) => 
              curr.current < prev.current ? curr : prev
            );
            const fastestGrowth = data.reduce((prev, curr) => 
              curr.growth > prev.growth ? curr : prev
            );
            
            return (
              <>
                <li>• Strongest skill: {strongestSkill.skill} ({strongestSkill.current}%)</li>
                <li>• Focus area: {weakestSkill.skill} ({weakestSkill.current}%)</li>
                {fastestGrowth.growth > 0 && (
                  <li>• Fastest growth: {fastestGrowth.skill} (+{fastestGrowth.growth}%)</li>
                )}
                <li>• 3-month projection: {trajectory.projected3Months}% overall</li>
              </>
            );
          })()}
        </ul>
      </div>

      {/* Skill Cards - Only show for debate format with breakdown buttons */}
      {isDebateFormat && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {/* Content Card */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Content</span>
                <ScoreInfoButton onClick={() => setActiveBreakdown('content')} />
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                current.content?.momentum > 0 ? 'bg-green-100 text-green-700' :
                current.content?.momentum < 0 ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {current.content?.momentum > 0 ? 'improving' : 
                 current.content?.momentum < 0 ? 'declining' : 'stable'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold">{Math.round(current.content?.score || 0)}</span>
              <span className="text-sm text-gray-500">/ 100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${current.content?.score || 0}%` }}
              />
            </div>
          </div>

          {/* Style Card */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Style</span>
                <ScoreInfoButton onClick={() => setActiveBreakdown('style')} />
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                current.style?.momentum > 0 ? 'bg-green-100 text-green-700' :
                current.style?.momentum < 0 ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {current.style?.momentum > 0 ? 'improving' : 
                 current.style?.momentum < 0 ? 'declining' : 'stable'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold">{Math.round(current.style?.score || 0)}</span>
              <span className="text-sm text-gray-500">/ 100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${current.style?.score || 0}%` }}
              />
            </div>
          </div>

          {/* Strategy Card */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Strategy</span>
                <ScoreInfoButton onClick={() => setActiveBreakdown('strategy')} />
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                current.strategy?.momentum > 0 ? 'bg-green-100 text-green-700' :
                current.strategy?.momentum < 0 ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {current.strategy?.momentum > 0 ? 'improving' : 
                 current.strategy?.momentum < 0 ? 'declining' : 'stable'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold">{Math.round(current.strategy?.score || 0)}</span>
              <span className="text-sm text-gray-500">/ 100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${current.strategy?.score || 0}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Score Breakdown Modals */}
      {isDebateFormat && (
        <>
          <ScoreBreakdown
            title="Content"
            score={Math.round(current.content?.score || 0)}
            breakdownData={getContentScoreBreakdown(current.content)}
            studentName={current.studentName}
            isOpen={activeBreakdown === 'content'}
            onClose={() => setActiveBreakdown(null)}
          />
          
          <ScoreBreakdown
            title="Style"
            score={Math.round(current.style?.score || 0)}
            breakdownData={getStyleScoreBreakdown(current.style)}
            studentName={current.studentName}
            isOpen={activeBreakdown === 'style'}
            onClose={() => setActiveBreakdown(null)}
          />
          
          <ScoreBreakdown
            title="Strategy"
            score={Math.round(current.strategy?.score || 0)}
            breakdownData={getStrategyScoreBreakdown(current.strategy)}
            studentName={current.studentName}
            isOpen={activeBreakdown === 'strategy'}
            onClose={() => setActiveBreakdown(null)}
          />
        </>
      )}
    </div>
  );
}