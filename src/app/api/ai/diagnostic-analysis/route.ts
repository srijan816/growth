import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { findMany, findOne, insertOne, updateOne } from '@/lib/postgres'
import { diagnosticEngine, enrichFeedbackSessions } from '@/lib/ai-diagnostic-engine'
import { optimizedDiagnosticEngine } from '@/lib/ai-diagnostic-engine-optimized'
import { AI_CONFIG, getOptimalSessionLimit } from '@/lib/ai-config'
import { z } from 'zod'

// Request validation schema
const diagnosticAnalysisSchema = z.object({
  studentName: z.string(),
  level: z.enum(['primary', 'secondary']).optional().default('primary'),
  includeRecommendations: z.boolean().optional().default(true),
  sessionLimit: z.number().optional().default(10),
  forceRegenerate: z.boolean().optional().default(false)
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = diagnosticAnalysisSchema.parse(body)

    console.log('🔍 Diagnostic analysis requested for:', validatedData.studentName)

    // Check for cached recommendations unless force regenerate is requested
    if (!validatedData.forceRegenerate) {
      const cachedRecommendation = await findOne(
        'diagnostic_recommendations',
        { 
          student_name: validatedData.studentName,
          is_active: true
        },
        'created_at DESC'
      )

      if (cachedRecommendation) {
        console.log('📦 Returning cached recommendations for:', validatedData.studentName)
        
        // Check if feedback count has changed significantly
        const currentFeedbackCount = await findMany(
          'parsed_student_feedback',
          { student_name: validatedData.studentName },
          'date DESC',
          1
        )
        
        return NextResponse.json({
          success: true,
          studentName: validatedData.studentName,
          sessionCount: cachedRecommendation.session_count,
          analysisDate: cachedRecommendation.analysis_date,
          patterns: cachedRecommendation.patterns,
          diagnosis: cachedRecommendation.diagnosis,
          recommendations: cachedRecommendation.recommendations,
          cached: true,
          cacheDate: cachedRecommendation.created_at,
          version: cachedRecommendation.version
        })
      }
    }

    // Fetch feedback data for the student
    const feedbackData = await findMany(
      'parsed_student_feedback', 
      { student_name: validatedData.studentName }, 
      'date DESC',
      validatedData.sessionLimit
    )

    if (!feedbackData || feedbackData.length === 0) {
      return NextResponse.json({ 
        error: 'No feedback data found for student',
        studentName: validatedData.studentName
      }, { status: 404 })
    }

    console.log(`📊 Found ${feedbackData.length} feedback sessions for analysis`)

    // Sort chronologically (oldest first) for proper progression analysis
    const chronologicalData = [...feedbackData].reverse()

    // Enrich the feedback sessions
    const enrichedSessions = enrichFeedbackSessions(chronologicalData)

    // Check total data size to decide which engine to use
    const totalDataSize = JSON.stringify(enrichedSessions).length
    const useOptimizedEngine = totalDataSize > 30000 // Use optimized for large datasets
    
    console.log(`📊 Total data size: ${totalDataSize} chars, using ${useOptimizedEngine ? 'optimized' : 'standard'} engine`)

    let analysis
    if (useOptimizedEngine) {
      // Use optimized single-pass engine for large datasets
      const optimizedResult = await optimizedDiagnosticEngine.analyzeStudentComprehensive(
        enrichedSessions,
        validatedData.studentName,
        validatedData.level
      )
      
      // Transform to match standard format
      analysis = {
        patterns: {
          ...optimizedResult.patterns,
          skillTrends: optimizedResult.patterns.skillTrends.map(trend => ({
            ...trend,
            dataPoints: trend.evidence.map((e, i) => ({
              session: i + 1,
              score: trend.currentLevel,
              evidence: e
            })),
            breakpoints: []
          })),
          recurringThemes: optimizedResult.patterns.criticalIssues.map(issue => ({
            theme: issue.issue,
            frequency: issue.frequency,
            sessions: [],
            examples: [],
            severity: issue.severity as 'critical' | 'moderate' | 'minor',
            trend: 'stable'
          })),
          strengthSignatures: optimizedResult.patterns.strengthSignatures.map(s => ({
            ...s,
            leverageOpportunities: [`Use ${s.strength} to build confidence`]
          }))
        },
        diagnosis: {
          primaryIssues: optimizedResult.diagnosis.rootCauses.map(rc => ({
            symptom: rc.symptom,
            rootCause: rc.cause,
            evidence: [],
            category: rc.category as any,
            confidence: 0.8,
            connectedSymptoms: []
          })),
          secondaryIssues: [],
          studentProfile: {
            learningStyle: optimizedResult.diagnosis.learningProfile.style as any,
            motivationalDrivers: optimizedResult.diagnosis.learningProfile.motivators,
            anxietyTriggers: optimizedResult.diagnosis.learningProfile.anxietyTriggers,
            strengthsToLeverage: optimizedResult.patterns.strengthSignatures.map(s => s.strength),
            preferredFeedbackStyle: 'encouraging'
          },
          interconnections: []
        },
        recommendations: optimizedResult.recommendations.map((rec, idx) => ({
          id: `rec_${idx}`,
          priority: idx === 0 ? 'high' : 'medium',
          targetIssue: rec.focus,
          rootCauseDiagnosis: rec.solution,
          recommendation: {
            what: rec.solution,
            why: `Addresses ${rec.focus} directly`,
            how: rec.exercises[0]?.description || 'Practice regularly'
          },
          exercises: rec.exercises.map(ex => ({
            ...ex,
            frequency: 'Daily',
            materials: [],
            steps: [ex.description],
            successCriteria: 'Consistent improvement',
            difficultyLevel: 'intermediate' as any
          })),
          milestones: [
            {
              week: 1,
              target: `Begin ${rec.exercises[0]?.name || 'practice'}`,
              measurement: 'Daily completion',
              checkIn: 'End of week review'
            }
          ],
          coachingNotes: {
            inClassFocus: [`Focus on ${rec.focus}`],
            encouragementStrategy: 'Positive reinforcement',
            avoidanceList: ['Criticism'],
            parentCommunication: `Support ${studentName} with ${rec.focus}`
          },
          expectedOutcome: {
            timeframe: '2-4 weeks',
            successIndicators: ['Improved confidence', 'Better performance'],
            potentialChallenges: ['Initial resistance']
          }
        })),
        debateMetrics: {
          metrics: optimizedResult.debateMetrics.metrics,
          overallScore: optimizedResult.debateMetrics.overallScore,
          metricAnalysis: optimizedResult.debateMetrics.metrics.map(m => ({
            metricId: m.metricId,
            score: m.score,
            trend: m.trend,
            evidence: m.evidence,
            improvements: [],
            concerns: []
          }))
        }
      }
    } else {
      // Use standard multi-stage engine for smaller datasets
      analysis = await diagnosticEngine.analyzeStudent(
        enrichedSessions,
        validatedData.studentName,
        validatedData.level
      )
    }

    // Format the response
    const response = {
      success: true,
      studentName: validatedData.studentName,
      sessionCount: enrichedSessions.length,
      analysisDate: new Date().toISOString(),
      
      // Pattern analysis results
      patterns: {
        skillTrends: analysis.patterns.skillTrends.map(trend => ({
          skill: trend.skill,
          trajectory: trend.trajectory,
          currentLevel: trend.currentLevel,
          improvement: trend.trajectory === 'improving' ? 
            `+${trend.dataPoints[trend.dataPoints.length - 1].score - trend.dataPoints[0].score}` : 
            'No improvement',
          keyMoments: trend.breakpoints
        })),
        
        topStrengths: analysis.patterns.strengthSignatures
          .sort((a, b) => b.consistency - a.consistency)
          .slice(0, 3),
        
        criticalIssues: analysis.patterns.recurringThemes
          .filter(theme => theme.severity === 'critical')
          .slice(0, 3)
      },
      
      // Diagnostic insights
      diagnosis: {
        primaryConcerns: analysis.diagnosis.primaryIssues.map(issue => ({
          symptom: issue.symptom,
          rootCause: issue.rootCause,
          category: issue.category,
          confidence: Math.round(issue.confidence * 100) + '%'
        })),
        
        studentProfile: analysis.diagnosis.studentProfile,
        
        keyInsight: analysis.diagnosis.primaryIssues[0] ? 
          `The main challenge stems from ${analysis.diagnosis.primaryIssues[0].category} issues, specifically: ${analysis.diagnosis.primaryIssues[0].rootCause}` :
          'No significant issues identified'
      },
      
      // Recommendations (if requested)
      recommendations: validatedData.includeRecommendations ? 
        analysis.recommendations.map(rec => ({
          id: rec.id,
          priority: rec.priority,
          focus: rec.targetIssue,
          solution: rec.recommendation.what,
          rationale: rec.recommendation.why,
          
          // Simplified exercise list
          exercises: rec.exercises.map(ex => ({
            name: ex.name,
            duration: ex.duration,
            frequency: ex.frequency,
            description: ex.description
          })),
          
          // Next steps
          firstWeekTarget: rec.milestones[0]?.target || 'Begin practice exercises',
          
          // Coaching guidance
          instructorTip: rec.coachingNotes.inClassFocus[0] || 'Support student practice',
          parentMessage: rec.coachingNotes.parentCommunication
        })) : [],
      
      // Debate metrics (if available)
      debateMetrics: analysis.debateMetrics ? {
        overallScore: analysis.debateMetrics.overallScore,
        metrics: analysis.debateMetrics.metrics,
        metricAnalysis: analysis.debateMetrics.metricAnalysis
      } : null,
      
      // Metadata for debugging
      debug: {
        enrichedSessionCount: enrichedSessions.length,
        patternsFound: {
          skills: analysis.patterns.skillTrends.length,
          themes: analysis.patterns.recurringThemes.length,
          strengths: analysis.patterns.strengthSignatures.length
        },
        issuesIdentified: {
          primary: analysis.diagnosis.primaryIssues.length,
          secondary: analysis.diagnosis.secondaryIssues.length
        },
        recommendationsGenerated: analysis.recommendations.length,
        debateMetricsAnalyzed: analysis.debateMetrics ? true : false
      }
    }

    // Store the analysis in database
    if (validatedData.forceRegenerate) {
      // Deactivate previous recommendations
      await updateOne(
        'diagnostic_recommendations',
        { student_name: validatedData.studentName, is_active: true },
        { is_active: false }
      )
    }

    // Save new recommendation
    const savedRecommendation = await insertOne('diagnostic_recommendations', {
      student_name: validatedData.studentName,
      student_id: null, // Can be linked later if needed
      session_count: enrichedSessions.length,
      patterns: response.patterns,
      diagnosis: response.diagnosis,
      recommendations: response.recommendations,
      created_by: session.user.id,
      version: validatedData.forceRegenerate ? 2 : 1,
      is_active: true
    })

    console.log('💾 Saved diagnostic recommendations to database')

    return NextResponse.json({
      ...response,
      cached: false,
      version: savedRecommendation.version
    })

  } catch (error) {
    console.error('Diagnostic analysis error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

// GET endpoint for retrieving analysis history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentName = searchParams.get('studentName')

    if (!studentName) {
      return NextResponse.json({ 
        error: 'Student name is required' 
      }, { status: 400 })
    }

    // For now, return a placeholder
    // In production, you'd store and retrieve analysis history
    return NextResponse.json({
      success: true,
      studentName,
      analysisHistory: [],
      message: 'Analysis history feature coming soon'
    })

  } catch (error) {
    console.error('GET diagnostic analysis error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}