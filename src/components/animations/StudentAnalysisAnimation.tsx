'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Brain, BookOpen, TrendingUp, Target, Star, Zap, Award, Eye, Clock } from 'lucide-react'

interface AnimatedKeyword {
  id: string
  text: string
  icon: React.ReactNode
  position: { x: number; y: number }
  delay: number
  color: string
  category: 'feedback' | 'skills' | 'growth' | 'analysis'
}

interface StudentAnalysisAnimationProps {
  studentName: string
  studentImage?: string
  isVisible: boolean
  onComplete?: () => void
  duration?: number
}

const StudentAnalysisAnimation: React.FC<StudentAnalysisAnimationProps> = ({
  studentName,
  studentImage,
  isVisible,
  onComplete,
  duration = 8000
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [visibleKeywords, setVisibleKeywords] = useState<Set<string>>(new Set())

  // Static keyword data with fixed positions - never changes
  const keywords: AnimatedKeyword[] = [
    // Feedback Analysis
    { id: 'feedback1', text: 'Analyzing Feedback', icon: <BookOpen className="w-4 h-4" />, delay: 0.5, color: 'from-blue-400 to-blue-600', category: 'feedback', position: { x: 0, y: -200 } },
    { id: 'feedback2', text: 'Pattern Recognition', icon: <Brain className="w-4 h-4" />, delay: 1.2, color: 'from-purple-400 to-purple-600', category: 'feedback', position: { x: 150, y: -150 } },
    { id: 'feedback3', text: 'Instructor Notes', icon: <BookOpen className="w-4 h-4" />, delay: 2.1, color: 'from-green-400 to-green-600', category: 'feedback', position: { x: 200, y: 0 } },
    
    // Skills Assessment
    { id: 'skills1', text: 'Public Speaking', icon: <Star className="w-4 h-4" />, delay: 1.8, color: 'from-orange-400 to-orange-600', category: 'skills', position: { x: 150, y: 150 } },
    { id: 'skills2', text: 'Critical Thinking', icon: <Zap className="w-4 h-4" />, delay: 2.5, color: 'from-pink-400 to-pink-600', category: 'skills', position: { x: 0, y: 200 } },
    { id: 'skills3', text: 'Communication', icon: <Eye className="w-4 h-4" />, delay: 3.2, color: 'from-cyan-400 to-cyan-600', category: 'skills', position: { x: -150, y: 150 } },
    
    // Growth Tracking
    { id: 'growth1', text: 'Progress Trends', icon: <TrendingUp className="w-4 h-4" />, delay: 2.8, color: 'from-emerald-400 to-emerald-600', category: 'growth', position: { x: -200, y: 0 } },
    { id: 'growth2', text: 'Improvement Areas', icon: <Target className="w-4 h-4" />, delay: 3.5, color: 'from-red-400 to-red-600', category: 'growth', position: { x: -150, y: -150 } },
    { id: 'growth3', text: 'Strengths', icon: <Award className="w-4 h-4" />, delay: 4.2, color: 'from-yellow-400 to-yellow-600', category: 'growth', position: { x: 100, y: -100 } },
    
    // AI Analysis
    { id: 'analysis1', text: 'AI Processing', icon: <Brain className="w-4 h-4" />, delay: 4.8, color: 'from-indigo-400 to-indigo-600', category: 'analysis', position: { x: -100, y: -100 } },
    { id: 'analysis2', text: 'Recommendations', icon: <Target className="w-4 h-4" />, delay: 5.5, color: 'from-violet-400 to-violet-600', category: 'analysis', position: { x: 100, y: 100 } },
    { id: 'analysis3', text: 'Timeline Analysis', icon: <Clock className="w-4 h-4" />, delay: 6.2, color: 'from-teal-400 to-teal-600', category: 'analysis', position: { x: -100, y: 100 } }
  ]

  // Status messages that appear during the process
  const statusMessages = [
    'Gathering student data...',
    'Analyzing feedback patterns...',
    'Processing growth metrics...',
    'Identifying key strengths...',
    'Detecting improvement areas...',
    'Generating AI insights...',
    'Preparing recommendations...',
    'Analysis complete!'
  ]

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0)
      setVisibleKeywords(new Set())
      return
    }

    const totalSteps = statusMessages.length
    const stepDuration = duration / totalSteps

    // Animate through steps
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < totalSteps - 1) {
          return prev + 1
        } else {
          clearInterval(stepInterval)
          setTimeout(() => onComplete?.(), 1000)
          return prev
        }
      })
    }, stepDuration)

    // Show keywords progressively
    const keywordTimeouts: NodeJS.Timeout[] = []
    keywords.forEach(keyword => {
      const timeout = setTimeout(() => {
        setVisibleKeywords(prev => new Set([...prev, keyword.id]))
      }, keyword.delay * 1000)
      keywordTimeouts.push(timeout)
    })

    return () => {
      clearInterval(stepInterval)
      keywordTimeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [isVisible, duration, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative w-full h-full flex items-center justify-center">
        
        {/* Background gradient animation */}
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 30% 70%, rgba(147, 51, 234, 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 70% 30%, rgba(16, 185, 129, 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)'
            ]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Central student focus */}
        <motion.div
          className="relative z-10 flex flex-col items-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Student avatar with glow effect */}
          <motion.div
            className="relative mb-6"
            animate={{
              boxShadow: [
                '0 0 20px rgba(59, 130, 246, 0.5)',
                '0 0 40px rgba(147, 51, 234, 0.5)',
                '0 0 60px rgba(16, 185, 129, 0.5)',
                '0 0 20px rgba(59, 130, 246, 0.5)'
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-green-400 p-1">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-4xl font-bold text-gray-700">
                {studentImage ? (
                  <img src={studentImage} alt={studentName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-gray-600" />
                )}
              </div>
            </div>
          </motion.div>

          {/* Student name with typewriter effect */}
          <motion.h2
            className="text-2xl font-bold text-white mb-2 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            {studentName}
          </motion.h2>

          {/* Status message */}
          <motion.p
            className="text-blue-300 text-center min-h-[24px]"
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            {statusMessages[currentStep]}
          </motion.p>

          {/* Progress indicator */}
          <div className="mt-4 w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-400 to-purple-500"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep + 1) / statusMessages.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Floating keywords */}
        <AnimatePresence mode="wait">
          {keywords
            .filter(keyword => visibleKeywords.has(keyword.id))
            .map(keyword => (
              <motion.div
                key={keyword.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: '50%',
                  top: '50%'
                }}
                initial={{ 
                  scale: 0, 
                  opacity: 0,
                  x: keyword.position.x,
                  y: keyword.position.y
                }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  x: keyword.position.x,
                  y: keyword.position.y
                }}
                exit={{ 
                  scale: 0, 
                  opacity: 0,
                  x: keyword.position.x,
                  y: keyword.position.y
                }}
                transition={{
                  duration: 0.8,
                  ease: "easeOut",
                  delay: keyword.delay * 0.3
                }}
              >
                <div
                  className={`
                    px-3 py-2 rounded-full text-white text-sm font-medium
                    bg-gradient-to-r ${keyword.color}
                    shadow-lg backdrop-blur-sm
                    flex items-center space-x-2
                    border border-white/20
                  `}
                >
                  {keyword.icon}
                  <span>{keyword.text}</span>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Subtle orbital rings - reduced visibility */}
        {[1, 2].map((ring, index) => (
          <motion.div
            key={`ring-${ring}-${index}`}
            className="absolute border border-white/5 rounded-full"
            style={{
              width: `${160 + ring * 60}px`,
              height: `${160 + ring * 60}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
            animate={{
              rotate: ring % 2 === 0 ? 360 : -360
            }}
            transition={{
              duration: 30 + ring * 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}

        {/* Particle effects */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-white/40 rounded-full"
            style={{
              left: '50%',
              top: '50%'
            }}
            animate={{
              x: [0, Math.sin(i * 30 * Math.PI / 180) * 300],
              y: [0, Math.cos(i * 30 * Math.PI / 180) * 300],
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeOut"
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default StudentAnalysisAnimation