'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Database, 
  Search, 
  Filter, 
  RefreshCw, 
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  AlertCircle,
  X
} from 'lucide-react';

interface DatabaseRecord {
  id: string;
  student_name: string;
  instructor: string;
  class_code: string;
  class_name: string;
  unit_number: string;
  lesson_number?: string;
  topic?: string;
  motion?: string;
  feedback_type: 'primary' | 'secondary';
  content_preview: string;
  content: string;
  duration?: string;
  file_path: string;
  parsed_at: string;
  unique_id?: string;
  rubric_scores?: { [key: string]: number };
}

interface SummaryStats {
  instructor: string;
  feedback_type: string;
  record_count: string;
  unique_students: string;
  earliest_record: string;
  latest_record: string;
}

interface DatabaseViewerProps {
  onMigrationNeeded?: () => void;
}

// Helper function to format unit numbers
const formatUnitNumber = (unitNumber: string, lessonNumber?: string): string => {
  if (!unitNumber) return '';
  
  // Extract main unit number (e.g., "2.4.2.4" → "2.4")
  const parts = unitNumber.split('.');
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}`;
  }
  return unitNumber;
};

// Helper function to format student name with type
const formatStudentDisplay = (studentName: string, feedbackType: string): string => {
  return `${studentName} (${feedbackType.charAt(0).toUpperCase() + feedbackType.slice(1)})`;
};

// Helper function to format rubric scores for display
const formatRubricScores = (rubricScores?: { [key: string]: number }, recordId?: string): JSX.Element | null => {
  if (!rubricScores || Object.keys(rubricScores).length === 0) {
    return <div className="text-gray-500 text-sm">No rubric scores extracted</div>;
  }

  const rubricItems = [
    'Student spoke for the duration of the specified time frame',
    'Student offered and/or accepted a point of information',
    'Student spoke in a stylistic and persuasive manner',
    'Student\'s argument is complete in that it has relevant Claims',
    'Student argument reflects application of theory',
    'Student\'s rebuttal is effective',
    'Student ably supported teammate',
    'Student applied feedback from previous debate'
  ];

  return (
    <div className="space-y-2">
      {rubricItems.map((item, index) => {
        const rubricKey = `rubric_${index + 1}`;
        const score = rubricScores[rubricKey];
        return (
          <div key={`rubric-item-${recordId || 'default'}-${rubricKey}-${index}`} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{index + 1}. {item}</span>
            {score !== undefined ? (
              score === 0 ? (
                <span className="px-2 py-1 rounded bg-gray-400 text-white text-xs font-bold">
                  N/A
                </span>
              ) : (
                <span className={`px-2 py-1 rounded text-white text-xs font-bold ${
                  score >= 4 ? 'bg-green-500' : score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                }`}>
                  {score}/5
                </span>
              )
            ) : (
              <span className="text-gray-400 text-xs">Not scored</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function DatabaseViewer({ onMigrationNeeded }: DatabaseViewerProps) {
  const [data, setData] = useState<DatabaseRecord[]>([]);
  const [summary, setSummary] = useState<SummaryStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [instructorFilter, setInstructorFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 50;

  // Content popup
  const [selectedRecord, setSelectedRecord] = useState<DatabaseRecord | null>(null);

  const fetchData = async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (instructorFilter) params.append('instructor', instructorFilter);
      if (studentFilter) params.append('student', studentFilter);
      if (feedbackTypeFilter && feedbackTypeFilter !== 'all') params.append('feedbackType', feedbackTypeFilter);
      params.append('limit', pageSize.toString());
      params.append('offset', ((page - 1) * pageSize).toString());

      const response = await fetch(`/api/database-viewer?${params}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setData(result.data);
        setSummary(result.summary);
        setTotalRecords(result.pagination.total);
        setHasMore(result.pagination.hasMore);
        setCurrentPage(page);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to fetch database data');
      console.error('Database fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/migrate-all-data', { method: 'POST' });
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('Migration completed:', result.summary);
        // Refresh data after migration
        await fetchData(1);
        if (onMigrationNeeded) onMigrationNeeded();
      } else {
        setError(result.error || 'Migration failed');
      }
    } catch (err) {
      setError('Failed to run migration');
      console.error('Migration error:', err);
    } finally {
      setMigrating(false);
    }
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchData(1);
  };

  const clearFilters = () => {
    setInstructorFilter('');
    setStudentFilter('');
    setFeedbackTypeFilter('all');
    setCurrentPage(1);
    fetchData(1);
  };

  const nextPage = () => {
    if (hasMore) {
      fetchData(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      fetchData(currentPage - 1);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Viewer
          </CardTitle>
          <CardDescription>
            View and filter feedback data stored in the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={runMigration} 
              disabled={migrating}
              className="flex items-center gap-2"
              variant="outline"
            >
              {migrating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Run Full Migration
            </Button>
            <Button 
              onClick={() => fetchData(currentPage)} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Database Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.map((stat, index) => (
                <div key={`summary-${stat.instructor}-${stat.feedback_type}-${index}`} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{stat.instructor}</span>
                    <Badge variant={stat.feedback_type === 'primary' ? 'default' : 'secondary'}>
                      {stat.feedback_type}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>{stat.record_count} records</div>
                    <div>{stat.unique_students} students</div>
                    <div>Last: {new Date(stat.latest_record).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Instructor</label>
              <Input
                placeholder="Search instructor..."
                value={instructorFilter}
                onChange={(e) => setInstructorFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Student</label>
              <Input
                placeholder="Search student..."
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Feedback Type</label>
              <Select value={feedbackTypeFilter} onValueChange={setFeedbackTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Apply
              </Button>
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Records ({totalRecords} total)</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                onClick={prevPage} 
                disabled={currentPage === 1 || loading}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage}
              </span>
              <Button 
                onClick={nextPage} 
                disabled={!hasMore || loading}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Student (Type)</th>
                    <th className="text-left p-2">Instructor</th>
                    <th className="text-left p-2">Class</th>
                    <th className="text-left p-2">Unit</th>
                    <th className="text-left p-2">Topic</th>
                    <th className="text-left p-2">Content Preview</th>
                    <th className="text-left p-2">Actions</th>
                    <th className="text-left p-2">Parsed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((record, index) => (
                    <tr key={record.unique_id || `${record.id}-${record.student_name}-${record.feedback_type}-${record.unit_number}-${record.class_code}-${index}`} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">
                        <div>{formatStudentDisplay(record.student_name, record.feedback_type)}</div>
                      </td>
                      <td className="p-2">{record.instructor}</td>
                      <td className="p-2">
                        <div className="text-xs">
                          <div>{record.class_code}</div>
                          <div className="text-gray-500">{record.class_name}</div>
                        </div>
                      </td>
                      <td className="p-2 font-mono">
                        {formatUnitNumber(record.unit_number, record.lesson_number)}
                      </td>
                      <td className="p-2 max-w-32 truncate">
                        {record.feedback_type === 'primary' ? record.topic : record.motion}
                      </td>
                      <td className="p-2 max-w-64 truncate text-gray-600">
                        {record.content_preview}
                      </td>
                      <td className="p-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedRecord(record)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {formatStudentDisplay(record.student_name, record.feedback_type)} - Unit {formatUnitNumber(record.unit_number)}
                              </DialogTitle>
                              <DialogDescription>
                                {record.topic || record.motion} | {record.class_code} | {new Date(record.parsed_at).toLocaleDateString()}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 space-y-6">
                              {/* Rubric Scores Section */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold">Rubric Scores (Extracted from Bold Text):</h4>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch('/api/reparse-one-record', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ recordId: record.id })
                                      });
                                      if (response.ok) {
                                        // Refresh the data
                                        fetchData(currentPage);
                                      }
                                    } catch (error) {
                                      console.error('Re-parse failed:', error);
                                    }
                                  }}
                                >
                                  Re-parse Scores
                                </Button>
                              </div>
                              {formatRubricScores(record.rubric_scores, record.id)}
                              </div>
                              
                              {/* Full Content Section */}
                              <div>
                                <h4 className="font-semibold mb-2">Full Content:</h4>
                                <div className="bg-gray-50 p-4 rounded-lg text-sm max-h-96 overflow-y-auto whitespace-pre-wrap">
                                  {record.content}
                                </div>
                              </div>
                              
                              {/* Metadata Section */}
                              <div className="text-xs text-gray-500 border-t pt-4">
                                <div><strong>File:</strong> {record.file_path}</div>
                                <div><strong>Parsed:</strong> {new Date(record.parsed_at).toLocaleString()}</div>
                                {record.unique_id && <div><strong>ID:</strong> {record.unique_id}</div>}
                                {record.rubric_scores && (
                                  <div><strong>Rubric Data:</strong> {JSON.stringify(record.rubric_scores)}</div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                      <td className="p-2 text-xs text-gray-500">
                        {new Date(record.parsed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No records found</p>
              <p className="text-sm mt-2">Try adjusting your filters or run a migration</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}