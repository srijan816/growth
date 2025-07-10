'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic, 
  Clock, 
  Brain, 
  MessageSquare, 
  Target,
  Users,
  Eye,
  Volume2,
  FileText,
  Activity,
  Sparkles
} from 'lucide-react'
import { DEBATE_METRICS } from '@/types/debate-metrics'

interface DebateMetricsAnimationProps {
  isVisible: boolean
  studentName: string
  onComplete?: () => void
  duration?: number
}

const metricIcons: Record<string, React.ReactNode> = {
  'hook': <Sparkles className="w-5 h-5" />,
  'speech_time': <Clock className="w-5 h-5" />,
  'vocal_projection': <Volume2 className="w-5 h-5" />,
  'clarity_fluency': <Mic className="w-5 h-5" />,
  'argument_structure': <Brain className="w-5 h-5" />,
  'rebuttal': <MessageSquare className="w-5 h-5" />,
  'relevance': <Target className="w-5 h-5" />,
  'pois': <Users className="w-5 h-5" />,
  'speech_structure': <FileText className="w-5 h-5" />,
  'strategy': <Activity className="w-5 h-5" />,
  'non_verbal': <Eye className="w-5 h-5" />
}

export default function DebateMetricsAnimation({
  isVisible,
  studentName,
  onComplete,
  duration = 11000 // 1 second per metric
}: DebateMetricsAnimationProps) {
  const [currentMetricIndex, setCurrentMetricIndex] = useState(-1)
  const [completedMetrics, setCompletedMetrics] = useState<string[]>([])
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setCurrentMetricIndex(0)
      setCompletedMetrics([])
      setShowSummary(false)
      
      // Animate through each metric
      const interval = setInterval(() => {
        setCurrentMetricIndex((prev) => {
          if (prev < DEBATE_METRICS.length - 1) {
            setCompletedMetrics((completed) => [...completed, DEBATE_METRICS[prev].id])
            return prev + 1
          } else {
            clearInterval(interval)
            setCompletedMetrics((completed) => [...completed, DEBATE_METRICS[prev].id])
            
            // Show summary after last metric
            setTimeout(() => {
              setShowSummary(true)
              setTimeout(() => {
                onComplete?.()
              }, 2000)
            }, 500)
            
            return prev
          }
        })
      }, duration / DEBATE_METRICS.length)

      return () => clearInterval(interval)
    }
  }, [isVisible, duration, onComplete])

  if (!isVisible) return null

  const currentMetric = currentMetricIndex >= 0 ? DEBATE_METRICS[currentMetricIndex] : null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="w-full max-w-4xl p-8"
        >
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold text-white mb-2">
              Analyzing Debate Performance
            </h2>
            <p className="text-gray-300">
              Evaluating {studentName}'s skills across 11 key metrics
            </p>
          </motion.div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {DEBATE_METRICS.map((metric, index) => {
              const isActive = index === currentMetricIndex
              const isCompleted = completedMetrics.includes(metric.id)
              
              return (
                <motion.div
                  key={metric.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: isActive || isCompleted ? 1 : 0.3,
                    scale: isActive ? 1.1 : 1
                  }}
                  transition={{ duration: 0.3 }}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${isActive 
                      ? 'bg-white/20 border-white shadow-lg shadow-white/20' 
                      : isCompleted 
                        ? 'bg-green-500/20 border-green-500' 
                        : 'bg-gray-800/50 border-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      p-2 rounded-full
                      ${isActive 
                        ? 'bg-white text-black' 
                        : isCompleted 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-700 text-gray-400'
                      }
                    `}>
                      {metricIcons[metric.id]}
                    </div>
                    <div className="flex-1">
                      <h4 className={`
                        text-sm font-medium
                        ${isActive || isCompleted ? 'text-white' : 'text-gray-400'}
                      `}>
                        {metric.name}
                      </h4>
                      {isActive && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: duration / DEBATE_METRICS.length / 1000 }}
                          className="h-1 bg-white rounded-full mt-1"
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Checkmark for completed */}
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Current Metric Detail */}
          {currentMetric && !showSummary && (
            <motion.div
              key={currentMetric.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-center"
            >
              <div className="mb-4">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 rounded-full">
                  <div className="p-2 bg-white rounded-full text-black">
                    {metricIcons[currentMetric.id]}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-white">
                      {currentMetric.name}
                    </h3>
                    <p className="text-sm text-gray-300">
                      {currentMetric.description}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="w-2 h-2 bg-white/50 rounded-full animate-pulse"
                    />
                  ))}
                </div>
                <span className="text-white/70 text-sm ml-2">Analyzing...</span>
              </div>
            </motion.div>
          )}

          {/* Summary */}
          {showSummary && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Analysis Complete!
              </h3>
              <p className="text-gray-300">
                All 11 debate metrics have been evaluated
              </p>
            </motion.div>
          )}

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: `${((completedMetrics.length) / DEBATE_METRICS.length) * 100}%` 
                }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              />
            </div>
            <p className="text-center text-sm text-gray-400 mt-2">
              {completedMetrics.length} of {DEBATE_METRICS.length} metrics analyzed
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}