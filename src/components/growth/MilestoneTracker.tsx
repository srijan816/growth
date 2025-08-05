'use client';

import { motion } from 'framer-motion';
import { Trophy, Target, Clock, ChevronRight } from 'lucide-react';

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

interface MilestoneTrackerProps {
  achieved: Milestone[];
  upcoming: Milestone[];
  studentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export function MilestoneTracker({ achieved, upcoming, studentLevel }: MilestoneTrackerProps) {
  const totalMilestones = achieved.length + upcoming.length;
  const achievementRate = totalMilestones > 0 ? Math.round((achieved.length / totalMilestones) * 100) : 0;

  const getLevelColor = () => {
    switch (studentLevel) {
      case 'beginner':
        return 'from-green-500 to-blue-500';
      case 'intermediate':
        return 'from-blue-500 to-purple-500';
      case 'advanced':
        return 'from-purple-500 to-pink-500';
      case 'expert':
        return 'from-pink-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getNextMilestoneTime = (progress: number) => {
    if (progress >= 90) return 'Very Soon';
    if (progress >= 75) return '1-2 Weeks';
    if (progress >= 50) return '3-4 Weeks';
    if (progress >= 25) return '1-2 Months';
    return '2-3 Months';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Milestone Tracker</h3>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${getLevelColor()} text-white`}>
            {studentLevel.charAt(0).toUpperCase() + studentLevel.slice(1)} Level
          </span>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700">Overall Achievement Rate</span>
          <span className="text-2xl font-bold text-blue-900">{achievementRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <motion.div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${achievementRate}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>{achieved.length} Achieved</span>
          <span>{upcoming.length} Remaining</span>
        </div>
      </div>

      {/* Recent Achievements */}
      {achieved.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h4 className="font-semibold text-gray-900">Recent Achievements</h4>
          </div>
          <div className="space-y-3">
            {achieved.slice(0, 3).map((milestone, index) => (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{milestone.title}</p>
                  <p className="text-sm text-gray-600">
                    {milestone.achievedDate && new Date(milestone.achievedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Milestones */}
      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-gray-900">Next Milestones</h4>
          </div>
          <div className="space-y-3">
            {upcoming.slice(0, 3).map((milestone, index) => (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{milestone.title}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{getNextMilestoneTime(milestone.progress)}</span>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{milestone.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <motion.div 
                      className="bg-blue-500 h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${milestone.progress}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.5 }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {milestone.skills.slice(0, 2).map(skill => (
                    <span 
                      key={skill}
                      className="px-2 py-0.5 bg-white text-xs text-gray-600 rounded"
                    >
                      {skill}
                    </span>
                  ))}
                  {milestone.skills.length > 2 && (
                    <span className="px-2 py-0.5 text-xs text-gray-500">
                      +{milestone.skills.length - 2} more
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Motivational Message */}
      <motion.div
        className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-sm text-gray-700">
          {achievementRate >= 75 
            ? "🌟 Outstanding progress! You're achieving milestones at an exceptional rate."
            : achievementRate >= 50
            ? '💪 Great momentum! Keep up the consistent effort to reach more milestones.'
            : achievementRate >= 25
            ? "📈 You're building strong foundations. Each milestone brings you closer to mastery."
            : '🚀 Your journey is just beginning. Focus on the next milestone and celebrate small wins!'}
        </p>
      </motion.div>
    </div>
  );
}