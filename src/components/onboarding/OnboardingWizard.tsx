'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, AlertCircle, Upload, Download } from 'lucide-react'
import { ONBOARDING_STEPS, type OnboardingStep, type UploadResult, getNextAvailableStep } from '@/types/onboarding'
import { ColumnGuidance } from './ColumnGuidance'
import { FileUploadZone } from './FileUploadZone'
import { ValidationResults } from './ValidationResults'
import { useOnboarding } from '@/hooks/useOnboarding'

interface OnboardingWizardProps {
  onComplete?: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const {
    session,
    uploadFile,
    downloadTemplate,
    isLoading,
    isUploading
  } = useOnboarding()

  const [selectedStep, setSelectedStep] = useState<string>(() => {
    if (!session) return ONBOARDING_STEPS[0].id
    const nextStep = getNextAvailableStep(session.completedSteps)
    return nextStep?.id || ONBOARDING_STEPS[0].id
  })

  const currentStep = ONBOARDING_STEPS.find(step => step.id === selectedStep)!
  const completedSteps = session?.completedSteps || []
  const progress = (completedSteps.length / ONBOARDING_STEPS.length) * 100

  const handleFileUpload = useCallback(async (file: File) => {
    if (!currentStep) return
    
    try {
      await uploadFile(selectedStep, file)
      // If successful, move to next step
      const nextStep = getNextAvailableStep([...completedSteps, selectedStep])
      if (nextStep) {
        setSelectedStep(nextStep.id)
      } else if (onComplete) {
        onComplete()
      }
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }, [selectedStep, currentStep, uploadFile, completedSteps, onComplete])

  const handleTemplateDownload = useCallback(() => {
    if (!currentStep) return
    
    downloadTemplate.mutate(currentStep.templateType)
  }, [currentStep, downloadTemplate])

  const getStepStatus = (stepId: string): 'completed' | 'current' | 'pending' | 'disabled' => {
    if (completedSteps.includes(stepId)) return 'completed'
    if (stepId === selectedStep) return 'current'
    
    const step = ONBOARDING_STEPS.find(s => s.id === stepId)
    if (step?.dependencies?.some(dep => !completedSteps.includes(dep))) {
      return 'disabled'
    }
    
    return 'pending'
  }

  const canNavigateToStep = (stepId: string): boolean => {
    const step = ONBOARDING_STEPS.find(s => s.id === stepId)
    if (!step) return false
    
    // Can always go to completed steps
    if (completedSteps.includes(stepId)) return true
    
    // Can go to step if dependencies are met
    return !step.dependencies?.some(dep => !completedSteps.includes(dep))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading onboarding session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">System Onboarding</h1>
        <p className="text-muted-foreground">
          Upload your course data to get started with the student growth tracking platform
        </p>
        <div className="w-full max-w-md mx-auto">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-1">
            {completedSteps.length} of {ONBOARDING_STEPS.length} steps completed
          </p>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {ONBOARDING_STEPS.map((step, index) => {
          const status = getStepStatus(step.id)
          const canNavigate = canNavigateToStep(step.id)
          
          return (
            <Button
              key={step.id}
              variant={status === 'current' ? 'default' : status === 'completed' ? 'secondary' : 'outline'}
              size="sm"
              disabled={!canNavigate}
              onClick={() => canNavigate && setSelectedStep(step.id)}
              className="flex items-center gap-2"
            >
              {status === 'completed' ? (
                <CheckCircle className="h-4 w-4" />
              ) : status === 'current' ? (
                <Circle className="h-4 w-4 fill-current" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {index + 1}. {step.title}
              </span>
              <span className="sm:hidden">
                {index + 1}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Current Step Content */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">
                  Step {ONBOARDING_STEPS.findIndex(s => s.id === selectedStep) + 1}
                </Badge>
                {currentStep.title}
              </CardTitle>
              <CardDescription className="mt-2">
                {currentStep.description}
              </CardDescription>
            </div>
            
            {currentStep.dependencies && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Dependencies:</p>
                <div className="flex gap-1 mt-1">
                  {currentStep.dependencies.map(depId => {
                    const dep = ONBOARDING_STEPS.find(s => s.id === depId)
                    const isCompleted = completedSteps.includes(depId)
                    return (
                      <Badge 
                        key={depId} 
                        variant={isCompleted ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {dep?.title}
                        {isCompleted ? <CheckCircle className="h-3 w-3 ml-1" /> : <AlertCircle className="h-3 w-3 ml-1" />}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Column Guidance */}
          <ColumnGuidance columns={currentStep.columns} />
          
          {/* Template Download */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleTemplateDownload}
              className="flex items-center gap-2"
              disabled={downloadTemplate.isPending}
            >
              <Download className="h-4 w-4" />
              {downloadTemplate.isPending ? 'Downloading...' : 'Download Template'}
            </Button>
          </div>
          
          {/* File Upload */}
          <FileUploadZone
            onUpload={handleFileUpload}
            acceptedFormats={['.xlsx', '.xls', '.csv']}
            disabled={isUploading}
          />
          
          {/* Validation Results */}
          {session?.uploads && (
            <ValidationResults 
              uploads={session.uploads.filter(upload => upload.step === selectedStep)}
            />
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === selectedStep)
              if (currentIndex > 0) {
                const prevStep = ONBOARDING_STEPS[currentIndex - 1]
                if (canNavigateToStep(prevStep.id)) {
                  setSelectedStep(prevStep.id)
                }
              }
            }}
            disabled={ONBOARDING_STEPS.findIndex(s => s.id === selectedStep) === 0}
          >
            Previous
          </Button>
          
          <Button
            onClick={() => {
              const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === selectedStep)
              if (currentIndex < ONBOARDING_STEPS.length - 1) {
                const nextStep = ONBOARDING_STEPS[currentIndex + 1]
                if (canNavigateToStep(nextStep.id)) {
                  setSelectedStep(nextStep.id)
                }
              } else if (completedSteps.length === ONBOARDING_STEPS.length && onComplete) {
                onComplete()
              }
            }}
            disabled={
              !completedSteps.includes(selectedStep) ||
              (ONBOARDING_STEPS.findIndex(s => s.id === selectedStep) === ONBOARDING_STEPS.length - 1 &&
               completedSteps.length < ONBOARDING_STEPS.length)
            }
          >
            {ONBOARDING_STEPS.findIndex(s => s.id === selectedStep) === ONBOARDING_STEPS.length - 1
              ? 'Complete Onboarding'
              : 'Next'
            }
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}