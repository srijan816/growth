'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PlaygroundLoadingProps {
  isVisible: boolean
  context?: 'general' | 'student' | 'class'
  studentName?: string
}

const keywords = {
  general: [
    'Analyzing', 'Patterns', 'Growth', 'Feedback', 'Skills', 'Progress', 
    'Insights', 'Trends', 'Development', 'Learning', 'Potential', 'Strengths'
  ],
  student: [
    'Strengths', 'Areas', 'Confidence', 'Delivery', 'Argumentation', 'Research',
    'Structure', 'Voice', 'Engagement', 'Critical Thinking', 'Improvement', 'Focus'
  ],
  class: [
    'Lesson Plan', 'Differentiation', 'Scaffolding', 'Engagement', 'Activities',
    'Assessment', 'Group Work', 'Discussion', 'Practice', 'Support', 'Challenge', 'Flow'
  ]
}

const colors = [
  'text-blue-400', 'text-purple-400', 'text-green-400', 'text-yellow-400',
  'text-pink-400', 'text-indigo-400', 'text-cyan-400', 'text-orange-400'
]

export default function PlaygroundLoading({ 
  isVisible, 
  context = 'general',
  studentName 
}: PlaygroundLoadingProps) {
  const [activeKeywords, setActiveKeywords] = useState<Array<{
    id: string
    text: string
    x: number
    y: number
    color: string
    delay: number
  }>>([])

  const contextKeywords = keywords[context]

  useEffect(() => {
    if (!isVisible) {
      setActiveKeywords([])
      return
    }

    const generateKeywords = () => {
      const newKeywords = []
      const numKeywords = Math.floor(Math.random() * 4) + 3 // 3-6 keywords

      for (let i = 0; i < numKeywords; i++) {
        const keyword = contextKeywords[Math.floor(Math.random() * contextKeywords.length)]
        const angle = (Math.PI * 2 * i) / numKeywords + Math.random() * 0.5
        const radius = 120 + Math.random() * 80
        
        newKeywords.push({
          id: `${keyword}-${i}-${Date.now()}`,
          text: keyword,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 0.5
        })
      }
      
      setActiveKeywords(newKeywords)
    }

    generateKeywords()
    const interval = setInterval(generateKeywords, 2500)

    return () => clearInterval(interval)
  }, [isVisible, contextKeywords])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="relative w-96 h-96">
        {/* Central glowing orb */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-20 h-20 -mt-10 -ml-10"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 360],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-pulse">
            <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-70 animate-spin">
              <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <motion.div
                  className="w-8 h-8 rounded-full bg-white/30"
                  animate={{
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating keywords */}
        <AnimatePresence mode="wait">
          {activeKeywords.map((keyword) => (
            <motion.div
              key={keyword.id}
              className="absolute top-1/2 left-1/2 pointer-events-none"
              initial={{ 
                opacity: 0, 
                scale: 0,
                x: 0,
                y: 0
              }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 1, 0.8],
                x: keyword.x,
                y: keyword.y,
                rotate: [0, Math.random() * 10 - 5]
              }}
              exit={{ 
                opacity: 0,
                scale: 0
              }}
              transition={{
                duration: 2.5,
                delay: keyword.delay,
                ease: "easeOut"
              }}
            >
              <span className={`
                text-sm font-medium px-3 py-1 rounded-full 
                bg-white/10 backdrop-blur-sm border border-white/20
                ${keyword.color}
                shadow-lg
              `}>
                {keyword.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Orbital rings */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-64 h-64 -mt-32 -ml-32 border border-white/10 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-80 h-80 -mt-40 -ml-40 border border-white/5 rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />

        {/* Loading text */}
        <motion.div
          className="absolute -bottom-16 left-1/2 -ml-32 w-64 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.h3
            className="text-white text-lg font-medium mb-2"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            AI is thinking...
          </motion.h3>
          {studentName && (
            <p className="text-white/70 text-sm">
              Analyzing {studentName}'s learning patterns
            </p>
          )}
          {context === 'class' && (
            <p className="text-white/70 text-sm">
              Generating personalized teaching strategies
            </p>
          )}
        </motion.div>

        {/* Particle effects */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-1 h-1 bg-white/40 rounded-full"
            animate={{
              x: [0, Math.cos(i * Math.PI / 3) * 150],
              y: [0, Math.sin(i * Math.PI / 3) * 150],
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeOut"
            }}
          />
        ))}
      </div>
    </div>
  )
}