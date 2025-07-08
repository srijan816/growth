'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  TrendingUp, 
  MessageSquare,
  Target,
  ChevronRight,
  Star,
  Clock,
  Users,
  ArrowLeft,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

export default function ParentsPortalPage() {
  const [selectedChild] = useState('Aisha Khan')
  
  // Mock data - will be replaced with real data
  const currentLevel = "PSD II Intermediate"
  const phaseProgress = 65
  const daysInProgram = 156
  const milestonesReached = [
    "Completed 10+ debates",
    "Mastered POI technique",
    "Led team discussions"
  ]
  const nextMilestone = "Advanced argumentation skills"

  const monthlyWins = [
    "Averaged 5 minute speeches per class",
    "Asked/accepted at least one POI in every debate",
    "Took leadership during debate prep"
  ]

  // Chart data for the mini radar chart
  const skills = [
    { name: 'Voice', value: 4 },
    { name: 'Evidence', value: 3 },
    { name: 'Structure', value: 5 },
    { name: 'Confidence', value: 4 },
    { name: 'Thinking', value: 3 }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-lg font-semibold">Parent Portal</h1>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            {selectedChild}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Hero Card with Gradient */}
        <Card className="mb-6 overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 text-white px-8 pt-8 pb-2 relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            
            <div className="relative z-10">
              <div className="mb-6">
                <h1 className="text-3xl font-bold">{selectedChild.split(' ')[0]}'s Growth Story</h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {/* Left side - Growth Phase */}
                <div className="lg:col-span-2">
                  <p className="text-purple-100 text-sm mb-2">Current Level: {currentLevel}</p>
                  <p className="text-sm mb-4">{daysInProgram} Days of Growth</p>
                  
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="bg-white/20 rounded-full h-3 mb-2 max-w-lg">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${phaseProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm max-w-lg">
                      <span>{phaseProgress}%</span>
                      <span className="text-white/80">Level Progress</span>
                    </div>
                  </div>
                  
                  {/* Milestones */}
                  <div className="mt-4">
                    <p className="text-sm text-purple-100 mb-2">Milestones Achieved:</p>
                    <ul className="space-y-1 mb-3">
                      {milestonesReached.map((milestone, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-green-300">✓</span>
                          <span>{milestone}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-purple-100">
                      <span className="font-semibold">Next Goal:</span> {nextMilestone}
                    </p>
                  </div>
                </div>

                {/* Right side - This Month's Wins */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-8 py-4 border border-white/20 lg:ml-[-15%] lg:mr-[-5%]">
                  <h3 className="font-semibold mb-3 text-lg">This Month's Wins:</h3>
                  <ul className="space-y-2">
                    {monthlyWins.map((win, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-300 text-sm mt-0.5">•</span>
                        <span className="text-sm">{win}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Student Quote - Full Width */}
              <div className="mt-4 mb-2 p-4 bg-white/5 rounded-lg border-l-4 border-purple-300 text-center">
                <h4 className="text-purple-100 text-sm mb-3 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6V18L10 14V10H14V14L18 18V6L14 10V14H10V10L6 6Z" opacity="0.3"/>
                    <path d="M14 17L17 20L20 17V8L17 5L14 8V17ZM18 15.59L17.59 16L17 15.41V9.41L17.41 9L18 9.59V15.59ZM10 17L7 20L4 17V8L7 5L10 8V17ZM6 15.59L5.59 16L5 15.41V9.41L5.41 9L6 9.59V15.59Z"/>
                  </svg>
                  Aisha's Quote of the Month
                </h4>
                <blockquote className="text-white/90 italic leading-relaxed text-lg max-w-3xl mx-auto">
                  "Once you become famous, you cannot go back to being average. That is a sad & irreversible entry to a life that will never be yours. So, we would rather choose to be ordinary."
                </blockquote>
              </div>
            </div>
          </div>
        </Card>

        {/* Three Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* This Week's Summary */}
          <Card className="hover:shadow-lg transition-all cursor-pointer group">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>This Month's Summary</span>
                <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                This week, {selectedChild.split(' ')[0]} has shown remarkable progress in public speaking and debate skills.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Classes Attended</span>
                  <span className="font-semibold">3/3</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Speeches Given</span>
                  <span className="font-semibold">2</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Team Participation</span>
                  <span className="font-semibold text-green-600">Excellent</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Latest Achievement */}
          <Card className="hover:shadow-lg transition-all cursor-pointer group">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Latest Achievement</span>
                <div className="bg-yellow-100 p-2 rounded-lg group-hover:bg-yellow-200 transition-colors">
                  <Trophy className="w-4 h-4 text-yellow-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full mb-3">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <p className="font-semibold">Regional Debate Finalist</p>
                <p className="text-sm text-gray-500 mt-1">November 2024</p>
              </div>
            </CardContent>
          </Card>

          {/* View Growth Charts */}
          <Link href="/parents/analytics">
            <Card className="hover:shadow-lg transition-all cursor-pointer group">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>View Growth Charts</span>
                  <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200 transition-colors">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                </CardTitle>
              </CardHeader>
            <CardContent>
              {/* Mini Radar Chart */}
              <div className="relative h-48 flex items-center justify-center mb-2">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {/* Pentagon shape for radar chart */}
                  <polygon
                    points="100,40 160,70 140,130 60,130 40,70"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  {/* Filled area showing skills */}
                  <polygon
                    points="100,50 150,75 130,120 70,120 50,75"
                    fill="#86efac"
                    fillOpacity="0.3"
                    stroke="#22c55e"
                    strokeWidth="2"
                  />
                  {/* Skill labels */}
                  <text x="100" y="30" textAnchor="middle" className="text-xs fill-gray-600">Voice</text>
                  <text x="170" y="75" textAnchor="middle" className="text-xs fill-gray-600">Evidence</text>
                  <text x="150" y="140" textAnchor="middle" className="text-xs fill-gray-600">Structure</text>
                  <text x="50" y="140" textAnchor="middle" className="text-xs fill-gray-600">Confidence</text>
                  <text x="30" y="75" textAnchor="middle" className="text-xs fill-gray-600">Thinking</text>
                </svg>
              </div>
              <p className="text-sm text-center text-gray-600">5 Skills Tracked</p>
            </CardContent>
          </Card>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/parents/digest">
            <Button variant="outline" size="lg" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Monthly Digest
            </Button>
          </Link>
          <Link href="/parents/analytics">
            <Button variant="outline" size="lg" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Full Analytics
            </Button>
          </Link>
          <Link href="/parents/achievements">
            <Button variant="outline" size="lg" className="gap-2">
              <Trophy className="w-4 h-4" />
              All Achievements
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}