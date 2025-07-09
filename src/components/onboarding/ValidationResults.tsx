'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Clock,
  RefreshCw
} from 'lucide-react'
import { type UploadResult, type ValidationError } from '@/types/onboarding'
import { formatDistanceToNow } from 'date-fns'

interface ValidationResultsProps {
  uploads: UploadResult[]
}

export function ValidationResults({ uploads }: ValidationResultsProps) {
  const [expandedUpload, setExpandedUpload] = useState<string | null>(null)
  const [showAllErrors, setShowAllErrors] = useState<Record<string, boolean>>({})

  if (!uploads.length) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-600" />
      default:
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Valid</Badge>
      case 'invalid':
        return <Badge variant="destructive">Invalid</Badge>
      case 'pending':
        return <Badge variant="outline" className="text-amber-700 border-amber-300">Pending</Badge>
      default:
        return <Badge variant="outline">Processing</Badge>
    }
  }

  const toggleShowAllErrors = (uploadId: string) => {
    setShowAllErrors(prev => ({
      ...prev,
      [uploadId]: !prev[uploadId]
    }))
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Upload Results</h3>
      
      {uploads.map((upload) => (
        <Card key={upload.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(upload.validationStatus)}
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {upload.fileName}
                    {getStatusBadge(upload.validationStatus)}
                  </CardTitle>
                  <CardDescription>
                    Uploaded {formatDistanceToNow(upload.uploadedAt, { addSuffix: true })}
                    {upload.processedAt && (
                      <> • Processed {formatDistanceToNow(upload.processedAt, { addSuffix: true })}</>
                    )}
                  </CardDescription>
                </div>
              </div>
              
              <Collapsible
                open={expandedUpload === upload.id}
                onOpenChange={(open) => setExpandedUpload(open ? upload.id : null)}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {expandedUpload === upload.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Details
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
          </CardHeader>
          
          <Collapsible
            open={expandedUpload === upload.id}
            onOpenChange={(open) => setExpandedUpload(open ? upload.id : null)}
          >
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {upload.rowsProcessed}
                    </div>
                    <div className="text-sm text-blue-800">Total Rows</div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {upload.rowsSucceeded}
                    </div>
                    <div className="text-sm text-green-800">Successful</div>
                  </div>
                  
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {upload.rowsFailed}
                    </div>
                    <div className="text-sm text-red-800">Failed</div>
                  </div>
                </div>
                
                {/* Validation Errors */}
                {upload.validationErrors && upload.validationErrors.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-red-800">Validation Errors</h4>
                      {upload.validationErrors.length > 5 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleShowAllErrors(upload.id)}
                        >
                          {showAllErrors[upload.id] 
                            ? `Show Less` 
                            : `Show All ${upload.validationErrors.length} Errors`
                          }
                        </Button>
                      )}
                    </div>
                    
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Found {upload.validationErrors.length} validation error{upload.validationErrors.length !== 1 ? 's' : ''}. 
                        Please fix these issues and re-upload the file.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-red-50">
                            <TableHead>Row</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>Error</TableHead>
                            <TableHead>Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(showAllErrors[upload.id] 
                            ? upload.validationErrors 
                            : upload.validationErrors.slice(0, 5)
                          ).map((error: ValidationError, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">
                                {error.row}
                              </TableCell>
                              <TableCell>
                                <code className="bg-muted px-2 py-1 rounded text-sm">
                                  {error.field}
                                </code>
                              </TableCell>
                              <TableCell className="text-red-700">
                                {error.message}
                              </TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground max-w-xs truncate">
                                {error.value !== null && error.value !== undefined 
                                  ? String(error.value) 
                                  : '(empty)'
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                
                {/* Success Message */}
                {upload.validationStatus === 'valid' && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      All data validated successfully! Your file has been processed and the data is now available in the system.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  )
}