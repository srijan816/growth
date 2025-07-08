'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  Medal, 
  Award,
  Star,
  ArrowLeft,
  Calendar,
  Target,
  TrendingUp,
  Users,
  Mic
} from 'lucide-react'
import Link from 'next/link'

type Achievement = {
  id: string
  tournament: string
  date: string
  teamResult?: string
  speakerResult?: string
  isInternational?: boolean
  isMajor?: boolean
}

export default function AchievementsPage() {
  const [selectedChild] = useState('Aisha Khan')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'team' | 'speaker'>('all')

  // Organized achievements data
  const achievements: Achievement[] = [
    // 2025 Achievements
    {
      id: '1',
      tournament: 'Asian Schools Debating Championship',
      date: 'June 16-18, 2025',
      teamResult: 'Quarterfinalist',
      speakerResult: 'Novice 8th Best',
      isInternational: true,
      isMajor: true
    },
    {
      id: '2',
      tournament: 'South Asian Schools Debating Championship',
      date: 'June 6-8, 2025',
      teamResult: 'Octofinalist',
      isInternational: true
    },
    // 2024 Achievements
    {
      id: '3',
      tournament: 'Indo-Pacific Autumn WSDC',
      date: 'Oct 25-27, 2024',
      speakerResult: 'Open 7th Best',
      isInternational: true
    },
    {
      id: '4',
      tournament: 'Everest International World Schools Championship',
      date: 'June 21-23, 2024',
      teamResult: 'Middle School Champion',
      speakerResult: 'MS 8th Best Speaker & FBS',
      isInternational: true
    },
    {
      id: '5',
      tournament: 'Greater Bay Area WSDC',
      date: 'June 8-10, 2024',
      teamResult: 'Junior Semifinalist',
      speakerResult: 'Junior 5th Best',
      isInternational: true
    },
    {
      id: '6',
      tournament: 'Papillon IV WSDC',
      date: 'May 24-26, 2024',
      speakerResult: 'Under-16 3rd Best',
    },
    {
      id: '7',
      tournament: 'Malaysia International World Schools Championship',
      date: 'April 27-28, 2024',
      teamResult: 'Open Octofinalist',
      isInternational: true
    },
    {
      id: '8',
      tournament: 'Shanghai International Debate Open',
      date: 'March 29-31, 2024',
      teamResult: 'High School Quarterfinals',
      isInternational: true
    },
    {
      id: '9',
      tournament: 'Indo-Pacific British Parliamentary Open',
      date: 'March 23-24, 2024',
      teamResult: 'High School Semifinalist',
      isInternational: true
    },
    {
      id: '10',
      tournament: 'Asian Online Debating Championship WSDC',
      date: 'March 1-3, 2024',
      teamResult: 'Middle School Semifinalist',
      speakerResult: 'Middle School 3rd Best',
    }
  ]

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : selectedCategory === 'team'
    ? achievements.filter(a => a.teamResult)
    : achievements.filter(a => a.speakerResult)

  // Stats calculations
  const teamAchievements = 8
  const speakerAchievements = 7

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
            <h1 className="text-lg font-semibold">Achievement Gallery</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              {selectedChild}
            </Badge>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Debate Tournament Achievements</h1>
          <p className="text-purple-100 text-lg">{teamAchievements} Team Awards • {speakerAchievements} Speaker Awards</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Tournament Participation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">International Tournaments</span>
                  <span className="font-bold">8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Major Championships</span>
                  <span className="font-bold">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Countries Competed</span>
                  <span className="font-bold">6+</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-green-600" />
                Achievement Highlights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Middle School Champion at Everest</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">3rd Best Speaker at 2 tournaments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Consistent Quarter/Semifinalist</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            className="gap-2"
          >
            <Trophy className="w-4 h-4" />
            All Achievements
          </Button>
          <Button
            variant={selectedCategory === 'team' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('team')}
            className="gap-2"
          >
            <Users className="w-4 h-4" />
            Team Results
          </Button>
          <Button
            variant={selectedCategory === 'speaker' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('speaker')}
            className="gap-2"
          >
            <Mic className="w-4 h-4" />
            Speaker Awards
          </Button>
        </div>

        {/* Achievements Timeline */}
        <div className="space-y-4">
          {filteredAchievements.map((achievement, index) => (
            <Card 
              key={achievement.id} 
              className={`hover:shadow-lg transition-all ${
                achievement.isMajor ? 'border-2 border-purple-300' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{achievement.tournament}</h3>
                      {achievement.isInternational && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          International
                        </Badge>
                      )}
                      {achievement.isMajor && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                          Major Tournament
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>{achievement.date}</span>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      {achievement.teamResult && (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Team Result</p>
                            <p className="font-semibold">{achievement.teamResult}</p>
                          </div>
                        </div>
                      )}
                      
                      {achievement.speakerResult && (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center">
                            <Mic className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Speaker Award</p>
                            <p className="font-semibold">{achievement.speakerResult}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </div>
  )
}