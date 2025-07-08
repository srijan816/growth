'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  ArrowLeft,
  Play,
  Shield,
  Heart,
  Brain,
  Users,
  Zap,
  Target,
  Clock,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

// Define types for our data
type EmotionType = '😰' | '😟' | '😐' | '😊' | '😎' | '🤩'
type PressureMoment = {
  date: string
  event: string
  score: number
  emotion: EmotionType
  quote: string
}

type LanguageEvolution = {
  before: string
  after: string
  context: string
}

export default function AnalyticsPage() {
  const [selectedChild] = useState('Aisha Khan')

  // Mock data for demonstrations
  const pressureMoments: PressureMoment[] = [
    { date: 'Sept 5', event: 'First Speech', score: 35, emotion: '😰', quote: 'Um... I think... uh... renewable energy is... um... good' },
    { date: 'Sept 20', event: 'Team Debate', score: 45, emotion: '😟', quote: 'Let me... let me think about that question' },
    { date: 'Oct 12', event: 'Strong Opponent', score: 55, emotion: '😐', quote: 'Let me rephrase that more clearly...' },
    { date: 'Oct 28', event: 'Class Lead', score: 70, emotion: '😊', quote: 'I disagree, and here\'s why...' },
    { date: 'Nov 15', event: 'Tournament', score: 85, emotion: '😎', quote: 'The evidence clearly demonstrates three key points...' },
    { date: 'Dec 2', event: 'Finals', score: 95, emotion: '🤩', quote: 'Building on my teammate\'s argument, I\'d like to add...' }
  ]

  const skillProgress = [
    { label: 'Team Work', progress: 75 },
    { label: 'Effective Communication', progress: 82 },
    { label: 'Taking Leadership', progress: 68 },
    { label: 'Resilience Against Peer Pressure', progress: 90 }
  ]

  const languageEvolution: LanguageEvolution[] = [
    { before: 'I think', after: 'Evidence suggests', context: 'Opening statements' },
    { before: 'It\'s bad', after: 'The implications are concerning', context: 'Critical analysis' },
    { before: 'Everyone knows', after: 'Studies indicate', context: 'Supporting arguments' },
    { before: 'Because', after: 'Due to three key factors', context: 'Reasoning' }
  ]

  const leadershipTraits = [
    { trait: 'Takes Initiative', level: 85 },
    { trait: 'Supports Peers', level: 92 },
    { trait: 'Strategic Thinking', level: 78 },
    { trait: 'Conflict Resolution', level: 70 },
    { trait: 'Team Building', level: 88 }
  ]

  const resilienceData = [
    { month: 'Sept', setbacks: 3, recoveryDays: 2 },
    { month: 'Oct', setbacks: 2, recoveryDays: 1 },
    { month: 'Nov', setbacks: 4, recoveryDays: 0.5 },
    { month: 'Dec', setbacks: 1, recoveryDays: 0.1 }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar - matching parent portal */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/parents">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Overview
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-lg font-semibold">Growth Analytics</h1>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            {selectedChild}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Comprehensive Growth Analysis</h2>
          <p className="text-gray-600 mt-1">Deep insights into your child\'s development journey</p>
        </div>

        {/* Top Row - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Confidence Under Pressure */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Confidence Under Pressure</span>
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Pressure Handling Score</span>
                  <span className="text-lg font-semibold text-green-600">78/100</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {pressureMoments.map((moment, index) => (
                  <div key={index} className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{moment.emotion}</span>
                      <span className="text-gray-600">{moment.event}</span>
                    </div>
                    <span className="font-medium">{moment.date}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">35 → 95 point improvement</p>
            </CardContent>
          </Card>

          {/* Skills Development */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Skills Development</span>
                <div className="bg-pink-100 p-2 rounded-lg">
                  <Heart className="w-4 h-4 text-pink-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skillProgress.map((skill, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">{skill.label}</span>
                      <span className="text-xs text-gray-500">{skill.progress}%</span>
                    </div>
                    <div className="relative bg-gray-200 rounded-full h-2">
                      <div 
                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${skill.progress}%`,
                          background: skill.progress < 40 ? '#ef4444' : skill.progress < 70 ? '#f59e0b' : '#22c55e'
                        }}
                      />
                      <div className="absolute top-0 left-0 flex items-center h-full px-1">
                        <span className="text-[8px] text-gray-600 whitespace-nowrap">
                          {skill.progress < 40 ? 'Needs to Learn' : skill.progress < 70 ? 'Developing' : 'Improved'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Language Sophistication */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Language Development</span>
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Brain className="w-4 h-4 text-purple-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4 py-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">+47</div>
                <p className="text-sm text-gray-600">New Academic Terms</p>
              </div>
              <div className="space-y-2">
                {languageEvolution.slice(0, 2).map((item, index) => (
                  <div key={index} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 line-through">{item.before}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-600 font-medium">{item.after}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3">
                View All Changes
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row - 2 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Leadership Emergence */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Leadership Development</span>
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Users className="w-4 h-4 text-yellow-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full">
                  <div>
                    <div className="text-2xl font-bold text-orange-600">85%</div>
                    <div className="text-xs text-gray-600">Overall</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {leadershipTraits.map((trait, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{trait.trait}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={trait.level} className="w-20 h-2" />
                      <span className="text-xs text-gray-500 w-8">{trait.level}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resilience Patterns */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Resilience Building</span>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Zap className="w-4 h-4 text-orange-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between items-end h-32">
                  {resilienceData.map((data, index) => (
                    <div key={index} className="flex-1 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div 
                          className="w-12 bg-orange-200 rounded-t"
                          style={{ height: `${data.setbacks * 25}px` }}
                        />
                        <div 
                          className="w-12 bg-green-400 rounded-b"
                          style={{ height: `${(3 - data.recoveryDays) * 30}px` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{data.month}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Recovery Speed</span>
                  <span className="font-semibold text-green-600">48hr → 2hr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Growth Mindset</span>
                  <span className="font-semibold text-green-600">+127%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - 2 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Real-World Readiness */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Real-World Application</span>
                <div className="bg-green-100 p-2 rounded-lg">
                  <Target className="w-4 h-4 text-green-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#fbbf24"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40 * 0.47} ${2 * Math.PI * 40}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">47%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Communication</p>
                </div>
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#3b82f6"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40 * 0.50} ${2 * Math.PI * 40}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">50%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Problem Solving</p>
                </div>
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="w-full justify-start">
                  ✓ Elected to student council
                </Badge>
                <Badge variant="outline" className="w-full justify-start">
                  ✓ Led class presentation
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Breakthrough Moments */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Breakthrough Moments</span>
                <div className="bg-cyan-100 p-2 rounded-lg">
                  <Clock className="w-4 h-4 text-cyan-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    AK
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{selectedChild}</p>
                    <p className="text-sm text-gray-600 italic mt-1">
                      "Once you become famous, you cannot go back to being average. That is a sad & irreversible entry to a life that will never be yours. So, we would rather choose to be ordinary."
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Nov 15 - Tournament</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Instructor Note:</p>
                  <p className="text-sm text-gray-700">"This was the turning point"</p>
                </div>
                <Button size="sm" variant="default">
                  <Play className="w-3 h-3 mr-1" />
                  Play
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}