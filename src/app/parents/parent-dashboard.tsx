'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Award, 
  Calendar, 
  MessageSquare, 
  Download,
  Mail,
  Bell,
  User,
  GraduationCap,
  Target,
  Activity,
  Star
} from 'lucide-react';
import { GrowthDashboard } from '@/components/growth/GrowthDashboard';
import { format } from 'date-fns';

interface Student {
  id: string;
  name: string;
  studentNumber: string;
  gradeLevel: string;
  section: string;
  email?: string;
}

interface ParentDashboardProps {
  students: Student[];
  userEmail: string;
}

export default function ParentDashboard({ students, userEmail }: ParentDashboardProps) {
  const [selectedStudent, setSelectedStudent] = useState(students[0]);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'term' | 'year'>('month');
  const [digestFrequency, setDigestFrequency] = useState<'weekly' | 'monthly'>('weekly');

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Parent Portal</h1>
        <p className="text-muted-foreground">Track your child's growth and progress</p>
      </div>

      {/* Student Selector */}
      {students.length > 1 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Select Child:</span>
              <div className="flex gap-2">
                {students.map((student) => (
                  <Button
                    key={student.id}
                    variant={selectedStudent.id === student.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    {student.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Quick Stats */}
        <div className="lg:col-span-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Overall Growth</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+12.5%</div>
                <p className="text-xs text-muted-foreground">This month</p>
                <Progress value={75} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Current Level</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Intermediate</div>
                <p className="text-xs text-muted-foreground">Grade {selectedStudent.gradeLevel}</p>
                <Badge className="mt-2" variant="outline">75th percentile</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">92%</div>
                <p className="text-xs text-muted-foreground">23 of 25 classes</p>
                <Progress value={92} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Milestones</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">7/10</div>
                <p className="text-xs text-muted-foreground">Achieved this term</p>
                <div className="flex gap-1 mt-2">
                  {[...Array(7)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                  {[...Array(3)].map((_, i) => (
                    <Star key={i + 7} className="h-3 w-3 text-gray-300" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Dashboard Tabs */}
        <div className="lg:col-span-4">
          <Tabs defaultValue="growth" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="growth">Growth Analytics</TabsTrigger>
              <TabsTrigger value="feedback">Recent Feedback</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="digest">Email Digest</TabsTrigger>
            </TabsList>

            {/* Growth Analytics Tab */}
            <TabsContent value="growth" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Growth Overview</CardTitle>
                      <CardDescription>
                        Comprehensive analysis of {selectedStudent.name}'s progress
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {(['week', 'month', 'term', 'year'] as const).map((tf) => (
                        <Button
                          key={tf}
                          variant={timeframe === tf ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTimeframe(tf)}
                        >
                          {tf.charAt(0).toUpperCase() + tf.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <GrowthDashboard studentId={selectedStudent.id} timeframe={timeframe} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recent Feedback Tab */}
            <TabsContent value="feedback" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Instructor Feedback</CardTitle>
                  <CardDescription>Latest comments and evaluations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Public Speaking</Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Excellent</Badge>
                      </div>
                      <p className="text-sm mb-2">
                        <strong>Strengths:</strong> Demonstrated excellent voice projection and clarity. 
                        Strong argument structure with clear examples.
                      </p>
                      <p className="text-sm">
                        <strong>Areas for Improvement:</strong> Work on maintaining eye contact throughout 
                        the presentation. Practice smoother transitions between points.
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Classes</CardTitle>
                  <CardDescription>Next sessions and important dates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {format(new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000), 'dd')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000), 'MMM')}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Public Speaking & Debate</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000), 'EEEE')} at 3:00 PM
                          </p>
                          <Badge variant="outline" className="mt-1">
                            Topic: Environmental Conservation
                          </Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Add to Calendar
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Digest Tab */}
            <TabsContent value="digest" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Digest Settings</CardTitle>
                  <CardDescription>Configure how you receive updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Digest Frequency</p>
                        <p className="text-sm text-muted-foreground">
                          How often would you like to receive progress updates?
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={digestFrequency === 'weekly' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDigestFrequency('weekly')}
                        >
                          Weekly
                        </Button>
                        <Button
                          variant={digestFrequency === 'monthly' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDigestFrequency('monthly')}
                        >
                          Monthly
                        </Button>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="font-medium mb-2">Email Notifications</p>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <div>
                            <p className="text-sm font-medium">Growth Milestones</p>
                            <p className="text-xs text-muted-foreground">
                              When your child achieves a new milestone
                            </p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <div>
                            <p className="text-sm font-medium">Instructor Feedback</p>
                            <p className="text-xs text-muted-foreground">
                              When new feedback is posted
                            </p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <div>
                            <p className="text-sm font-medium">Attendance Alerts</p>
                            <p className="text-xs text-muted-foreground">
                              If attendance drops below 80%
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Current Email</p>
                          <p className="text-sm text-muted-foreground">{userEmail}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4 mr-2" />
                          Update Email
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download Sample Digest
                      </Button>
                      <Button>
                        <Bell className="h-4 w-4 mr-2" />
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}