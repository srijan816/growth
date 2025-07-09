'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, AlertCircle } from 'lucide-react'
import { type ColumnDefinition } from '@/types/onboarding'

interface ColumnGuidanceProps {
  columns: ColumnDefinition[]
}

export function ColumnGuidance({ columns }: ColumnGuidanceProps) {
  if (!columns || !Array.isArray(columns)) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Column Configuration</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          No column configuration available for this step.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-lg">Required Columns</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Make sure your Excel file contains these exact column headers</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Column Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Example</TableHead>
              <TableHead>Required</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.map((col, index) => (
              <TableRow key={index} className={col.required ? 'bg-blue-50/50' : ''}>
                <TableCell>
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                    {col.key}
                  </code>
                  {col.validation && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertCircle className="h-3 w-3 text-amber-500 ml-2 inline" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            {col.validation.minLength && (
                              <p>Min length: {col.validation.minLength}</p>
                            )}
                            {col.validation.maxLength && (
                              <p>Max length: {col.validation.maxLength}</p>
                            )}
                            {col.validation.min && (
                              <p>Min value: {col.validation.min}</p>
                            )}
                            {col.validation.max && (
                              <p>Max value: {col.validation.max}</p>
                            )}
                            {col.validation.pattern && (
                              <p>Pattern: {col.validation.pattern}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
                
                <TableCell>
                  <Badge 
                    variant={
                      col.type === 'text' ? 'default' :
                      col.type === 'number' ? 'secondary' :
                      col.type === 'date' ? 'outline' :
                      col.type === 'select' ? 'destructive' :
                      col.type === 'email' ? 'default' :
                      'default'
                    }
                    className="text-xs"
                  >
                    {col.type}
                  </Badge>
                  {col.options && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground ml-1 inline" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>
                            <p className="font-medium">Allowed values:</p>
                            <ul className="list-disc list-inside text-sm">
                              {col.options.map((value, i) => (
                                <li key={i}>{value}</li>
                              ))}
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
                
                <TableCell className="text-sm text-muted-foreground max-w-xs">
                  {col.description}
                </TableCell>
                
                <TableCell>
                  <code className="bg-muted px-2 py-1 rounded text-xs text-muted-foreground">
                    {col.example}
                  </code>
                </TableCell>
                
                <TableCell>
                  {col.required ? (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Optional
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="font-medium text-blue-900">Important Notes:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Column headers must match exactly (case-sensitive)</li>
              <li>Required columns marked in blue must have values for every row</li>
              <li>Date columns should use YYYY-MM-DD format</li>
              <li>Enum columns must use one of the specified values</li>
              <li>Empty rows will be skipped automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}