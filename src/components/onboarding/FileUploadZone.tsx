'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, File, CheckCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadZoneProps {
  onUpload: (file: File) => Promise<void>
  acceptedFormats: string[]
  disabled?: boolean
  maxSize?: number // in MB
}

export function FileUploadZone({ 
  onUpload, 
  acceptedFormats, 
  disabled = false,
  maxSize = 10 
}: FileUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleUpload = useCallback(async (file: File) => {
    setError(null)
    setSuccess(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      await onUpload(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setSuccess(`Successfully uploaded ${file.name}`)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }, [onUpload])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors.some((e: any) => e.code === 'file-too-large')) {
        setError(`File is too large. Maximum size is ${maxSize}MB.`)
      } else if (rejection.errors.some((e: any) => e.code === 'file-invalid-type')) {
        setError(`Invalid file type. Please upload ${acceptedFormats.join(', ')} files only.`)
      } else {
        setError('File upload failed. Please try again.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      handleUpload(acceptedFiles[0])
    }
  }, [handleUpload, acceptedFormats, maxSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => {
      // Map file extensions to MIME types
      const mimeTypes: Record<string, string> = {
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.csv': 'text/csv'
      }
      if (mimeTypes[format]) {
        acc[mimeTypes[format]] = [format]
      }
      return acc
    }, {} as Record<string, string[]>),
    maxFiles: 1,
    maxSize: maxSize * 1024 * 1024, // Convert MB to bytes
    disabled: disabled || isUploading
  })

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragActive && "border-primary bg-primary/5",
          (disabled || isUploading) && "opacity-50 cursor-not-allowed",
          error && "border-destructive",
          success && "border-green-500"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
            {isUploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            ) : success ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : error ? (
              <AlertCircle className="h-6 w-6 text-destructive" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">
              {isUploading 
                ? 'Uploading file...'
                : isDragActive 
                  ? 'Drop file here'
                  : 'Upload your Excel file'
              }
            </h3>
            
            <p className="text-sm text-muted-foreground">
              {isUploading 
                ? 'Please wait while we process your file'
                : `Drag and drop or click to browse. Supports ${acceptedFormats.join(', ')} files up to ${maxSize}MB.`
              }
            </p>
          </div>
          
          {!isUploading && !disabled && (
            <Button variant="outline" size="sm">
              <File className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          )}
        </div>
      </Card>
      
      {/* Upload Progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex justify-between items-center">
            {error}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 flex justify-between items-center">
            {success}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSuccess(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}