'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Download, Upload, FolderOpen } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface ResourcesTabProps {
  courseId: string
}

export default function ResourcesTab({ courseId }: ResourcesTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Course Resources
              </CardTitle>
              <CardDescription>
                Lesson plans, materials, and student work
              </CardDescription>
            </div>
            <Button size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Upload Resource
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Resource Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <FolderOpen className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-medium">Lesson Plans</h3>
                  <p className="text-sm text-muted-foreground mt-1">0 files</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <FolderOpen className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="font-medium">Student Work</h3>
                  <p className="text-sm text-muted-foreground mt-1">0 files</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <FolderOpen className="h-8 w-8 text-purple-600 mb-3" />
                  <h3 className="font-medium">Feedback Templates</h3>
                  <p className="text-sm text-muted-foreground mt-1">0 files</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Files Placeholder */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3">Recent Files</h3>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No resources uploaded yet</p>
                <p className="text-sm mt-1">Upload course materials to get started</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}