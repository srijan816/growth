'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  UserPlus, 
  ArrowRight,
  Mic,
  RotateCcw,
  Search,
  GripVertical,
  Trophy,
  Target,
  BookOpen
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Student {
  id: string;
  name: string;
  email?: string;
  studentNumber?: string;
  enrollmentId: string;
  hasAttended: boolean;
  lastAttendance?: string;
}

interface ClassSession {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  topic: string;
  unitNumber: string;
  lessonNumber: string;
}

interface DebateTeam {
  id: string;
  name: string;
  students: Student[];
  side: 'proposition' | 'opposition';
  color: string;
}

interface DebateTeamSetupProps {
  selectedClass: ClassSession;
  onProceedToRecord: (teams: DebateTeam[], motion: string, additionalInfo: any) => void;
  onBackToCalendar: () => void;
}

export function DebateTeamSetup({ selectedClass, onProceedToRecord, onBackToCalendar }: DebateTeamSetupProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [propositionTeam, setPropositionTeam] = useState<Student[]>([]);
  const [oppositionTeam, setOppositionTeam] = useState<Student[]>([]);
  const [motion, setMotion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Additional debate info
  const [debateInfo, setDebateInfo] = useState({
    timeLimit: '5', // minutes per speaker (default)
    format: 'WSDC', // World Schools Debating Championship
    judgeNames: '',
    venue: '',
    notes: ''
  });

  // Unit/lesson progression
  const [unitLessonInfo, setUnitLessonInfo] = useState({
    currentUnit: '',
    currentLesson: '',
    suggestedNext: '1.1',
    loading: false
  });

  useEffect(() => {
    loadClassStudents();
    loadNextUnitLesson();
    
    // Set time limit based on course code
    // G7-9 PSD II gets 7 minutes, all others get 5 minutes
    const courseCode = selectedClass.courseCode || '';
    const isG7to9PSDII = courseCode.includes('PSD') && 
                         courseCode.includes('II') && 
                         (courseCode.includes('G7') || courseCode.includes('G8') || courseCode.includes('G9'));
    
    setDebateInfo(prev => ({
      ...prev,
      timeLimit: isG7to9PSDII ? '7' : '5'
    }));
  }, [selectedClass]);

  const loadNextUnitLesson = async () => {
    try {
      setUnitLessonInfo(prev => ({ ...prev, loading: true }));

      const response = await fetch(
        `/api/feedback/next-unit?courseCode=${selectedClass.courseCode}&instructor=Srijan`
      );

      if (response.ok) {
        const data = await response.json();
        setUnitLessonInfo({
          currentUnit: data.currentUnit || '',
          currentLesson: data.currentLesson || '',
          suggestedNext: data.suggestedNext?.unitLesson || '1.1',
          loading: false
        });
      } else {
        // If API fails, use default
        setUnitLessonInfo({
          currentUnit: '',
          currentLesson: '',
          suggestedNext: '1.1',
          loading: false
        });
      }
    } catch (error) {
      console.error('Error loading next unit/lesson:', error);
      setUnitLessonInfo({
        currentUnit: '',
        currentLesson: '',
        suggestedNext: '1.1',
        loading: false
      });
    }
  };

  const loadClassStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading students for class:', selectedClass);
      console.log('Course ID:', selectedClass.courseId);

      const response = await fetch(`/api/classes/${selectedClass.courseId}/students`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch class students: ${response.status}`);
      }

      const data = await response.json();
      console.log('Students API response:', data);
      const studentList = data.students || [];
      
      setStudents(studentList);
      setAvailableStudents(studentList);
    } catch (error) {
      console.error('Error loading students:', error);
      setError(error instanceof Error ? error.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    // Get the student being moved
    let movedStudent: Student;
    let newSourceList: Student[];

    if (sourceId === 'available') {
      movedStudent = availableStudents[source.index];
      newSourceList = [...availableStudents];
    } else if (sourceId === 'proposition') {
      movedStudent = propositionTeam[source.index];
      newSourceList = [...propositionTeam];
    } else if (sourceId === 'opposition') {
      movedStudent = oppositionTeam[source.index];
      newSourceList = [...oppositionTeam];
    } else {
      return;
    }

    // Remove from source
    newSourceList.splice(source.index, 1);

    // Add to destination
    let newDestList: Student[];
    if (destId === 'available') {
      newDestList = [...availableStudents];
      newDestList.splice(destination.index, 0, movedStudent);
      setAvailableStudents(newDestList);
    } else if (destId === 'proposition') {
      newDestList = [...propositionTeam];
      newDestList.splice(destination.index, 0, movedStudent);
      setPropositionTeam(newDestList);
    } else if (destId === 'opposition') {
      newDestList = [...oppositionTeam];
      newDestList.splice(destination.index, 0, movedStudent);
      setOppositionTeam(newDestList);
    } else {
      return;
    }

    // Update source list
    if (sourceId === 'available') {
      setAvailableStudents(newSourceList);
    } else if (sourceId === 'proposition') {
      setPropositionTeam(newSourceList);
    } else if (sourceId === 'opposition') {
      setOppositionTeam(newSourceList);
    }
  };

  const resetTeams = () => {
    setAvailableStudents(students);
    setPropositionTeam([]);
    setOppositionTeam([]);
  };

  const handleProceedToRecord = () => {
    const teams: DebateTeam[] = [
      {
        id: 'proposition',
        name: 'Proposition',
        students: propositionTeam,
        side: 'proposition',
        color: 'bg-green-100 text-green-800 border-green-300'
      },
      {
        id: 'opposition',
        name: 'Opposition',
        students: oppositionTeam,
        side: 'opposition',
        color: 'bg-red-100 text-red-800 border-red-300'
      }
    ];

    onProceedToRecord(teams, motion, {
      ...debateInfo,
      classSession: selectedClass,
      totalStudents: propositionTeam.length + oppositionTeam.length,
      unitLesson: unitLessonInfo.suggestedNext,
      unitNumber: unitLessonInfo.suggestedNext.split('.')[0],
      lessonNumber: unitLessonInfo.suggestedNext.split('.')[1]
    });
  };

  const filteredAvailableStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentNumber?.includes(searchTerm)
  );

  const getPositionLabel = (index: number, side: 'proposition' | 'opposition'): string => {
    const positions = {
      proposition: ['1st Proposition', '2nd Proposition', '3rd Proposition', '4th Proposition'],
      opposition: ['1st Opposition', '2nd Opposition', '3rd Opposition', '4th Opposition']
    };
    return positions[side][index] || `${index + 1}${side === 'proposition' ? 'st Prop' : 'st Opp'}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading class students...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={onBackToCalendar} variant="outline">
            Back to Calendar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Debate Team Setup
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {selectedClass.courseCode} - {selectedClass.courseName}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedClass.topic && `Topic: ${selectedClass.topic}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBackToCalendar}>
                Back to Calendar
              </Button>
              <Button 
                variant="outline" 
                onClick={resetTeams}
                disabled={propositionTeam.length === 0 && oppositionTeam.length === 0}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Teams
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Motion Input */}
      <Card>
        <CardHeader>
          <CardTitle>Debate Motion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="motion">Motion *</Label>
              <Textarea
                id="motion"
                value={motion}
                onChange={(e) => setMotion(e.target.value)}
                placeholder="This House believes that..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Unit/Lesson Progression */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium text-blue-800">Unit & Lesson Progression</h3>
              </div>
              
              {unitLessonInfo.currentUnit && (
                <div className="text-sm text-blue-700 mb-2">
                  Latest feedback: Unit {unitLessonInfo.currentUnit}.{unitLessonInfo.currentLesson}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="unitNumber" className="text-sm text-blue-800">
                    Next Unit.Lesson *
                  </Label>
                  <Input
                    id="unitNumber"
                    value={unitLessonInfo.suggestedNext}
                    onChange={(e) => setUnitLessonInfo(prev => ({ ...prev, suggestedNext: e.target.value }))}
                    placeholder="e.g., 10.5 or 11.1"
                    className="mt-1 bg-white"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Auto-increment suggestion
                      const current = unitLessonInfo.suggestedNext;
                      const [unit, lesson] = current.split('.').map(Number);
                      const nextLesson = lesson + 1;
                      const nextUnit = nextLesson > 4 ? unit + 1 : unit;
                      const finalLesson = nextLesson > 4 ? 1 : nextLesson;
                      setUnitLessonInfo(prev => ({ 
                        ...prev, 
                        suggestedNext: `${nextUnit}.${finalLesson}` 
                      }));
                    }}
                    className="text-blue-600 border-blue-300"
                  >
                    +1 Lesson
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-blue-600 mt-2">
                💡 Based on existing feedback progression. You can manually adjust if needed.
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={debateInfo.timeLimit}
                  onChange={(e) => setDebateInfo(prev => ({ ...prev, timeLimit: e.target.value }))}
                  min="1"
                  max="10"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="format">Debate Format</Label>
                <select
                  id="format"
                  value={debateInfo.format}
                  onChange={(e) => setDebateInfo(prev => ({ ...prev, format: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="BP">British Parliamentary</option>
                  <option value="AP">Asian Parliamentary</option>
                  <option value="Worlds">Worlds Style</option>
                  <option value="APDA">APDA</option>
                </select>
              </div>
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={debateInfo.venue}
                  onChange={(e) => setDebateInfo(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Room/Location"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drag and Drop Teams - Three Column Layout */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 h-[600px]">
          {/* Proposition Team - Left Side */}
          <div className="flex-1 bg-gradient-to-b from-green-50 to-green-100 rounded-lg border-2 border-green-200 p-4 flex flex-col">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-green-800 flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5" />
                PROPOSITION
              </h3>
              <p className="text-sm text-green-600">({propositionTeam.length} students)</p>
            </div>
            
            <Droppable droppableId="proposition">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[400px] max-h-[500px] overflow-y-auto space-y-3 p-4 rounded-lg border-2 border-dashed transition-all duration-200 ${
                    snapshot.isDraggingOver 
                      ? 'border-green-400 bg-green-200/50 scale-105' 
                      : 'border-green-300 bg-white/50'
                  }`}
                >
                  {propositionTeam.map((student, index) => (
                    <Draggable key={`prop-${student.id}-${index}`} draggableId={student.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white rounded-lg border-2 border-green-300 p-3 cursor-move transition-all duration-200 ${
                            snapshot.isDragging 
                              ? 'shadow-xl scale-105 rotate-3 border-green-500' 
                              : 'hover:shadow-lg hover:scale-102 hover:border-green-400'
                          }`}
                          style={{
                            ...provided.draggableProps.style,
                            transform: snapshot.isDragging 
                              ? `${provided.draggableProps.style?.transform} rotate(3deg)` 
                              : provided.draggableProps.style?.transform
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white text-sm font-bold rounded-full">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="font-semibold text-green-800 truncate">{student.name}</div>
                              <div className="text-xs text-green-600 truncate">
                                {getPositionLabel(index, 'proposition')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  
                  {propositionTeam.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-green-600">
                      <Trophy className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-center font-medium">Drag students here</p>
                      <p className="text-sm text-center">for Proposition team</p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>

          {/* Students Pool - Center */}
          <div className="flex-1 bg-gradient-to-b from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 p-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-blue-800 flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                STUDENTS
              </h3>
              <p className="text-sm text-blue-600">({filteredAvailableStudents.length} available)</p>
              
              {/* Search Box */}
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-blue-300 focus:border-blue-500"
                />
              </div>
            </div>
            
            <Droppable droppableId="available">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[400px] max-h-[500px] p-4 rounded-lg border-2 border-dashed transition-all duration-200 overflow-y-auto ${
                    snapshot.isDraggingOver 
                      ? 'border-blue-400 bg-blue-200/50' 
                      : 'border-blue-300 bg-white/50'
                  }`}
                >
                  <div className="grid grid-cols-2 gap-4 place-items-center">
                  {filteredAvailableStudents.map((student, index) => (
                    <Draggable key={`avail-${student.id}-${index}`} draggableId={student.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white rounded-lg border-2 border-blue-300 p-3 cursor-move transition-all duration-200 ${
                            snapshot.isDragging 
                              ? 'shadow-xl scale-105 -rotate-2 border-blue-500' 
                              : 'hover:shadow-lg hover:scale-102 hover:border-blue-400'
                          }`}
                          style={{
                            ...provided.draggableProps.style,
                            transform: snapshot.isDragging 
                              ? `${provided.draggableProps.style?.transform} rotate(-2deg)` 
                              : provided.draggableProps.style?.transform
                          }}
                        >
                          <div className="flex items-center justify-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                              <div className="text-center">
                                <div className="text-xs leading-tight">{student.name.split(' ')[0]}</div>
                                {student.name.split(' ')[1] && (
                                  <div className="text-xs leading-tight">{student.name.split(' ')[1].charAt(0)}.</div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-center">
                            <div className="text-xs font-medium text-blue-800 truncate">{student.name}</div>
                            {student.hasAttended && (
                              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 mt-1">
                                ✓
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  </div>
                  {provided.placeholder}
                  
                  {filteredAvailableStudents.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-blue-600">
                      <Users className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-center font-medium">
                        {searchTerm ? 'No students match search' : 'All students assigned to teams'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>

          {/* Opposition Team - Right Side */}
          <div className="flex-1 bg-gradient-to-b from-red-50 to-red-100 rounded-lg border-2 border-red-200 p-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-red-800 flex items-center justify-center gap-2">
                <Target className="w-5 h-5" />
                OPPOSITION
              </h3>
              <p className="text-sm text-red-600">({oppositionTeam.length} students)</p>
            </div>
            
            <Droppable droppableId="opposition">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[400px] max-h-[500px] overflow-y-auto space-y-3 p-4 rounded-lg border-2 border-dashed transition-all duration-200 ${
                    snapshot.isDraggingOver 
                      ? 'border-red-400 bg-red-200/50 scale-105' 
                      : 'border-red-300 bg-white/50'
                  }`}
                >
                  {oppositionTeam.map((student, index) => (
                    <Draggable key={`opp-${student.id}-${index}`} draggableId={student.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white rounded-lg border-2 border-red-300 p-3 cursor-move transition-all duration-200 ${
                            snapshot.isDragging 
                              ? 'shadow-xl scale-105 -rotate-3 border-red-500' 
                              : 'hover:shadow-lg hover:scale-102 hover:border-red-400'
                          }`}
                          style={{
                            ...provided.draggableProps.style,
                            transform: snapshot.isDragging 
                              ? `${provided.draggableProps.style?.transform} rotate(-3deg)` 
                              : provided.draggableProps.style?.transform
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-red-600 text-white text-sm font-bold rounded-full">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="font-semibold text-red-800 truncate">{student.name}</div>
                              <div className="text-xs text-red-600 truncate">
                                {getPositionLabel(index, 'opposition')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  
                  {oppositionTeam.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-red-600">
                      <Target className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-center font-medium">Drag students here</p>
                      <p className="text-sm text-center">for Opposition team</p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="judgeNames">Judge Names</Label>
              <Input
                id="judgeNames"
                value={debateInfo.judgeNames}
                onChange={(e) => setDebateInfo(prev => ({ ...prev, judgeNames: e.target.value }))}
                placeholder="Enter judge names (optional)"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={debateInfo.notes}
                onChange={(e) => setDebateInfo(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proceed Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleProceedToRecord}
          disabled={!motion.trim() || (propositionTeam.length === 0 && oppositionTeam.length === 0)}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Mic className="w-4 h-4 mr-2" />
          Proceed to Record ({propositionTeam.length + oppositionTeam.length} students)
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}