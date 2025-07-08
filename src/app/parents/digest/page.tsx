'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Play,
  ArrowLeft,
  Clock,
  Lightbulb,
  Mic,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

export default function MonthlyDigestPage() {
  const [selectedChild] = useState('Aisha Khan')
  const [selectedMonth] = useState('November 2024')
  const [playingAudio, setPlayingAudio] = useState(false)

  const parentActions = [
    {
      id: 1,
      title: 'Enroll in Debate Competition',
      description: 'Register Aisha for the upcoming regional debate championship',
      priority: 'High',
      time: '10 mins',
      color: 'bg-red-100 border-red-300'
    },
    {
      id: 2,
      title: 'Weekly News Reading',
      description: 'Ask Aisha to read news headlines every week and discuss current events',
      priority: 'Medium',
      time: '20 mins/week',
      color: 'bg-yellow-100 border-yellow-300'
    },
    {
      id: 3,
      title: 'Home Debate Practice',
      description: 'Debate with Aisha at home on topics from her curriculum',
      priority: 'Medium',
      time: '30 mins',
      color: 'bg-blue-100 border-blue-300'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/parents">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Portal
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-lg font-semibold">Monthly Performance Digest</h1>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            {selectedMonth}
          </Badge>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{selectedMonth} Performance Digest</h1>
          <p className="text-purple-100">{selectedChild} - PSD II Intermediate</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Student Progress Summary */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-3 text-gray-700">
              <p>
                <span className="font-semibold">Strengths:</span> Aisha has shown remarkable improvement this month, particularly in evidence usage where she now confidently cites 3-4 credible sources per debate compared to just 1-2 last month. Her voice projection and argument structure have become notably stronger, earning praise from judges at the regional finals.
              </p>
              <p>
                <span className="font-semibold">Area for Growth:</span> While she occasionally rushes through rebuttals when nervous, practicing breathing techniques would help her harness the power of strategic pauses. Working on maintaining composure during high-pressure moments will take her performance to the next level.
              </p>
              <p>
                <span className="font-semibold">Leadership & Recognition:</span> Her leadership qualities are blossoming beautifully - she's been mentoring quieter teammates and her recent "renewable energy" argument was selected as the best speech of the tournament. With continued practice on pacing, Aisha is well-positioned to excel at the upcoming championships.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Parent Action Cards */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Parent Action Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {parentActions.map((action) => (
              <Card 
                key={action.id}
                className={`hover:shadow-lg transition-all border-2 ${action.color}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-base">{action.title}</h4>
                    <Badge 
                      variant={action.priority === 'High' ? 'destructive' : 'secondary'}
                      className={action.priority === 'High' ? 'bg-red-500' : ''}
                    >
                      {action.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{action.time}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Moment Audio Player */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-blue-600" />
                  Best Debate Moment
                </span>
                <Badge variant="outline">Nov 15 - Finals</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-4 mb-3">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setPlayingAudio(!playingAudio)}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {playingAudio ? 'Pause' : 'Play'} Best Argument
                  </Button>
                  <span className="text-sm text-gray-600">2:34 duration</span>
                </div>
                {/* Audio Waveform Visualization */}
                <div className="h-16 bg-gradient-to-r from-blue-200 to-blue-400 rounded opacity-50"></div>
              </div>
              
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm italic mb-2">
                  "The evidence from MIT's 2023 study clearly demonstrates that renewable energy 
                  not only reduces carbon emissions by 78%, but also creates 3x more jobs than 
                  traditional energy sectors..."
                </p>
                <p className="text-xs text-gray-600">
                  Instructor Note: "Excellent use of specific data points and smooth delivery!"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Monthly Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  {/* Grid lines */}
                  <line x1="40" y1="20" x2="40" y2="160" stroke="#e5e7eb" strokeWidth="1" />
                  <line x1="40" y1="160" x2="360" y2="160" stroke="#e5e7eb" strokeWidth="1" />
                  
                  {/* Y-axis labels */}
                  <text x="30" y="25" className="text-xs fill-gray-500" textAnchor="end">100</text>
                  <text x="30" y="65" className="text-xs fill-gray-500" textAnchor="end">75</text>
                  <text x="30" y="105" className="text-xs fill-gray-500" textAnchor="end">50</text>
                  <text x="30" y="145" className="text-xs fill-gray-500" textAnchor="end">25</text>
                  
                  {/* Content line - steady growth */}
                  <polyline
                    points="60,140 110,125 160,110 210,90 260,70 310,50 360,35"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                  />
                  
                  {/* Style line - staggered growth */}
                  <polyline
                    points="60,145 110,145 160,125 210,125 260,100 310,100 360,75"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                  />
                  
                  {/* Strategy line - slow plateau */}
                  <polyline
                    points="60,150 110,148 160,145 210,143 260,140 310,138 360,135"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                  />
                  
                  {/* Data points for Content */}
                  <circle cx="60" cy="140" r="4" fill="#3b82f6" />
                  <circle cx="110" cy="125" r="4" fill="#3b82f6" />
                  <circle cx="160" cy="110" r="4" fill="#3b82f6" />
                  <circle cx="210" cy="90" r="4" fill="#3b82f6" />
                  <circle cx="260" cy="70" r="4" fill="#3b82f6" />
                  <circle cx="310" cy="50" r="4" fill="#3b82f6" />
                  <circle cx="360" cy="35" r="4" fill="#3b82f6" />
                  
                  {/* Data points for Style */}
                  <circle cx="60" cy="145" r="4" fill="#10b981" />
                  <circle cx="110" cy="145" r="4" fill="#10b981" />
                  <circle cx="160" cy="125" r="4" fill="#10b981" />
                  <circle cx="210" cy="125" r="4" fill="#10b981" />
                  <circle cx="260" cy="100" r="4" fill="#10b981" />
                  <circle cx="310" cy="100" r="4" fill="#10b981" />
                  <circle cx="360" cy="75" r="4" fill="#10b981" />
                  
                  {/* Data points for Strategy */}
                  <circle cx="60" cy="150" r="4" fill="#f59e0b" />
                  <circle cx="110" cy="148" r="4" fill="#f59e0b" />
                  <circle cx="160" cy="145" r="4" fill="#f59e0b" />
                  <circle cx="210" cy="143" r="4" fill="#f59e0b" />
                  <circle cx="260" cy="140" r="4" fill="#f59e0b" />
                  <circle cx="310" cy="138" r="4" fill="#f59e0b" />
                  <circle cx="360" cy="135" r="4" fill="#f59e0b" />
                  
                  {/* X-axis labels */}
                  <text x="60" y="175" className="text-[10px] fill-gray-500" textAnchor="middle">Mar</text>
                  <text x="110" y="175" className="text-[10px] fill-gray-500" textAnchor="middle">Apr</text>
                  <text x="160" y="175" className="text-[10px] fill-gray-500" textAnchor="middle">May</text>
                  <text x="210" y="175" className="text-[10px] fill-gray-500" textAnchor="middle">Jun</text>
                  <text x="260" y="175" className="text-[10px] fill-gray-500" textAnchor="middle">Jul</text>
                  <text x="310" y="175" className="text-[10px] fill-gray-500" textAnchor="middle">Aug</text>
                  <text x="360" y="175" className="text-[10px] fill-gray-500" textAnchor="middle">Sep</text>
                </svg>
              </div>
              
              {/* Legend */}
              <div className="mt-4 flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-blue-500"></div>
                  <span className="text-gray-600">Content</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-green-500"></div>
                  <span className="text-gray-600">Style</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-yellow-500"></div>
                  <span className="text-gray-600">Strategy</span>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <p className="text-gray-600">Content</p>
                  <p className="font-semibold text-blue-700">+40%</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <p className="text-gray-600">Style</p>
                  <p className="font-semibold text-green-700">+25%</p>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <p className="text-gray-600">Strategy</p>
                  <p className="font-semibold text-yellow-700">+8%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}