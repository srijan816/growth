'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete?: () => void;
  allowedInstructors?: string[];
  defaultInstructor?: string;
}

export default function FileUpload({ 
  onUploadComplete, 
  allowedInstructors = [],
  defaultInstructor 
}: FileUploadProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [instructor, setInstructor] = useState(defaultInstructor || '');
  const [feedbackType, setFeedbackType] = useState<'primary' | 'secondary'>('secondary');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setError('Please select files to upload');
      return;
    }

    if (!instructor && allowedInstructors.length > 1) {
      setError('Please select an instructor');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Add all files
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      // Add metadata
      formData.append('instructor', instructor);
      formData.append('feedbackType', feedbackType);

      const response = await fetch('/api/feedback/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setFiles(null);
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Notify parent component
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to upload files');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const selectedFileNames = files ? Array.from(files).map(f => f.name) : [];
  const validFiles = selectedFileNames.filter(name => 
    name.endsWith('.docx') || name.endsWith('.doc')
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Feedback Documents
        </CardTitle>
        <CardDescription>
          Upload .docx or .doc files containing student feedback to automatically parse and store them
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Selection */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select Files</Label>
          <Input
            id="file-upload"
            type="file"
            multiple
            accept=".docx,.doc"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {selectedFileNames.length > 0 && (
            <div className="text-sm text-gray-600">
              <p>{validFiles.length} valid files selected:</p>
              <ul className="mt-1 space-y-1">
                {validFiles.slice(0, 5).map((name, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    {name}
                  </li>
                ))}
                {validFiles.length > 5 && (
                  <li className="text-gray-500">...and {validFiles.length - 5} more</li>
                )}
              </ul>
              {selectedFileNames.length > validFiles.length && (
                <p className="text-amber-600 mt-2">
                  {selectedFileNames.length - validFiles.length} invalid file(s) will be skipped
                </p>
              )}
            </div>
          )}
        </div>

        {/* Instructor Selection */}
        {allowedInstructors.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="instructor">Target Instructor</Label>
            <Select value={instructor} onValueChange={setInstructor} disabled={uploading}>
              <SelectTrigger>
                <SelectValue placeholder="Select instructor" />
              </SelectTrigger>
              <SelectContent>
                {allowedInstructors.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Feedback Type */}
        <div className="space-y-2">
          <Label htmlFor="feedback-type">Feedback Type</Label>
          <Select value={feedbackType} onValueChange={(value: 'primary' | 'secondary') => setFeedbackType(value)} disabled={uploading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary (Elementary)</SelectItem>
              <SelectItem value="secondary">Secondary (High School)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {result && result.success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Upload Successful!</strong></p>
                <ul className="text-sm space-y-1">
                  <li>• {result.summary.filesUploaded} files uploaded</li>
                  <li>• {result.summary.feedbackRecordsParsed} feedback records parsed</li>
                  <li>• {result.summary.recordsStored} records stored in database</li>
                  <li>• {result.summary.uniqueStudents} unique students affected</li>
                </ul>
                {result.summary.errors?.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-amber-600">
                      {result.summary.errors.length} warning(s)
                    </summary>
                    <ul className="mt-1 text-xs space-y-1">
                      {result.summary.errors.slice(0, 5).map((error: string, index: number) => (
                        <li key={index} className="text-amber-600">• {error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        <Button 
          onClick={handleUpload} 
          disabled={!files || files.length === 0 || uploading || validFiles.length === 0}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing {validFiles.length} file(s)...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Parse Files
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}