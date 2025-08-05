'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useRef } from 'react';
import { CheckCircle, Circle, Target, Trophy, Star, Medal, Award } from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  description: string;
  achievedDate?: Date;
  achieved: boolean;
  progress: number;
  skills: string[];
  icon?: string;
}

interface GrowthTimelineProps {
  milestones: {
    achieved: Milestone[];
    upcoming: Milestone[];
  };
  currentPosition: number;
}

const getMilestoneIcon = (icon?: string, achieved?: boolean) => {
  const iconClass = `w-6 h-6 ${achieved ? 'text-white' : 'text-gray-400'}`;
  
  switch (icon) {
    case '🌱':
      return <Star className={iconClass} />;
    case '📈':
      return <Target className={iconClass} />;
    case '🎯':
      return <Medal className={iconClass} />;
    case '🏆':
      return <Trophy className={iconClass} />;
    case '👑':
      return <Award className={iconClass} />;
    default:
      return achieved ? <CheckCircle className={iconClass} /> : <Circle className={iconClass} />;
  }
};

export function GrowthTimeline({ milestones, currentPosition }: GrowthTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  
  // Combine and sort milestones
  const allMilestones = [
    ...milestones.achieved.map(m => ({ ...m, type: 'achieved' as const })),
    ...milestones.upcoming.map(m => ({ ...m, type: 'upcoming' as const }))
  ].sort((a, b) => {
    // Sort by progress/achievement
    if (a.achieved && !b.achieved) return -1;
    if (!a.achieved && b.achieved) return 1;
    if (a.achieved && b.achieved) {
      return (b.achievedDate?.getTime() || 0) - (a.achievedDate?.getTime() || 0);
    }
    return b.progress - a.progress;
  });

  return (
    <div ref={containerRef} className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-bold">Growth Journey</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600" />
            <span className="text-gray-600">Achieved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300" />
            <span className="text-gray-600">Upcoming</span>
          </div>
        </div>
      </div>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-gray-200">
          <motion.div 
            className="w-full bg-gradient-to-b from-blue-600 to-purple-600"
            style={{
              height: useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
            }}
          />
        </div>
        
        {/* Current Position Indicator */}
        <motion.div
          className="absolute left-6 w-5 h-5 bg-blue-600 rounded-full border-4 border-white shadow-lg z-10"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            top: `${(currentPosition / 100) * 80}%`
          }}
        >
          <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping" />
        </motion.div>
        
        {/* Milestones */}
        <div className="space-y-8">
          {allMilestones.map((milestone, index) => (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex items-start gap-6"
            >
              {/* Milestone Marker */}
              <div className="relative flex-shrink-0">
                <motion.div
                  className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                    milestone.achieved 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-400 border-2 border-dashed border-gray-300 hover:border-gray-400'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMilestone(milestone)}
                >
                  {getMilestoneIcon(milestone.icon, milestone.achieved)}
                </motion.div>
                
                {milestone.achieved && (
                  <motion.div 
                    className="absolute -top-2 -right-2 bg-green-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    ✓
                  </motion.div>
                )}
              </div>
              
              {/* Milestone Content */}
              <div className="flex-1 pb-8">
                <div className="flex items-center gap-4 mb-2">
                  <h4 className="text-lg font-semibold">{milestone.title}</h4>
                  {milestone.achievedDate && (
                    <span className="text-sm text-gray-500">
                      {new Date(milestone.achievedDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 mb-3">{milestone.description}</p>
                
                {/* Skills Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {milestone.skills.map(skill => (
                    <span 
                      key={skill}
                      className={`px-3 py-1 rounded-full text-sm ${
                        milestone.achieved
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                
                {/* Progress Bar for Upcoming Milestones */}
                {!milestone.achieved && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress to milestone</span>
                      <span className="font-semibold text-gray-900">{milestone.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${milestone.progress}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        viewport={{ once: true }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Next Milestone Prediction */}
      {milestones.upcoming.length > 0 && (
        <motion.div 
          className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h4 className="font-semibold text-blue-900 mb-2">Next Milestone Prediction</h4>
          {(() => {
            const nextMilestone = milestones.upcoming[0];
            const weeksToComplete = nextMilestone.progress > 0 
              ? Math.ceil((100 - nextMilestone.progress) / 5) // Assuming 5% growth per week
              : 12; // Default estimate
            
            return (
              <div>
                <p className="text-blue-800 mb-3">
                  Based on current growth velocity, you'll reach <span className="font-bold">{nextMilestone.title}</span> in 
                  approximately <span className="font-bold">{weeksToComplete} weeks</span>.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-gray-600 mb-1">Current Progress</p>
                    <p className="text-xl font-bold text-blue-900">{nextMilestone.progress}%</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-gray-600 mb-1">Estimated Date</p>
                    <p className="text-xl font-bold text-blue-900">
                      {new Date(Date.now() + weeksToComplete * 7 * 24 * 60 * 60 * 1000)
                        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Milestone Detail Modal */}
      {selectedMilestone && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setSelectedMilestone(null)}
        >
          <motion.div
            className="bg-white rounded-xl p-6 max-w-md w-full"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                selectedMilestone.achieved 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {getMilestoneIcon(selectedMilestone.icon, selectedMilestone.achieved)}
              </div>
              <h3 className="text-xl font-bold">{selectedMilestone.title}</h3>
            </div>
            
            <p className="text-gray-600 mb-4">{selectedMilestone.description}</p>
            
            {selectedMilestone.achieved && selectedMilestone.achievedDate && (
              <p className="text-sm text-gray-500 mb-4">
                Achieved on {new Date(selectedMilestone.achievedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
            
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedMilestone.skills.map(skill => (
                <span 
                  key={skill}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
            
            <button
              onClick={() => setSelectedMilestone(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}