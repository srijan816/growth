import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db, findOne, insertOne, findMany } from '@/lib/postgres'
import { aiAnalysisService } from '@/lib/ai-analysis-service'
import { z } from 'zod'

// Request validation schemas
const generateRecommendationsSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string(),
  programType: z.enum(['PSD', 'Academic Writing', 'RAPS', 'Critical Thinking']),
  feedbackSessions: z.array(z.object({
    unitNumber: z.string(),
    date: z.string(),
    feedbackType: z.enum(['primary', 'secondary']),
    motion: z.string().optional(),
    content: z.string(),
    bestAspects: z.string().optional(),
    improvementAreas: z.string().optional(),
    teacherComments: z.string().optional(),
    duration: z.string().optional()
  })),
  level: z.enum(['primary', 'secondary'])
})

const trackProgressSchema = z.object({
  recommendationId: z.string().uuid(),
  recentFeedback: z.array(z.object({
    unitNumber: z.string(),
    date: z.string(),
    feedbackType: z.enum(['primary', 'secondary']),
    content: z.string()
  }))
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'generate': {
        const validatedData = generateRecommendationsSchema.parse(body)

        const analysis = await aiAnalysisService.analyzeStudentPerformance(
          validatedData.studentName,
          validatedData.level,
          validatedData.feedbackSessions
        )

        const recommendations = await aiAnalysisService.generateRecommendations(
          validatedData.studentId,
          validatedData.studentName,
          analysis,
          validatedData.programType
        )

        const savedRecommendations = await db.transaction(async (client) => {
          const result = []
          for (const rec of recommendations) {
            const inserted = await client.query(
              `INSERT INTO recommendations (student_id, student_name, growth_area, priority, category, recommendation, specific_actions, timeframe, measurable_goals, resources, instructor_notes, confidence, status, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
              [
                rec.studentId,
                rec.studentName,
                rec.growthArea,
                rec.priority,
                rec.category,
                rec.recommendation,
                rec.specificActions,
                rec.timeframe,
                rec.measurableGoals,
                rec.resources,
                rec.instructorNotes,
                rec.confidence,
                rec.status,
                session.user.id
              ]
            )
            result.push(inserted.rows[0])
          }
          return result
        })

        await insertOne('student_analysis_history', {
          student_id: validatedData.studentId,
          analysis_type: 'performance',
          analysis_data: analysis,
          program_type: validatedData.programType,
          feedback_session_count: validatedData.feedbackSessions.length,
          created_by: session.user.id
        })

        return NextResponse.json({
          analysis,
          recommendations: savedRecommendations
        })
      }

      case 'track-progress': {
        const validatedData = trackProgressSchema.parse(body)

        const recommendation = await findOne('recommendations', { id: validatedData.recommendationId })

        if (!recommendation) {
          return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
        }

        const progress = await aiAnalysisService.trackRecommendationProgress(
          {
            id: recommendation.id,
            studentId: recommendation.student_id,
            studentName: recommendation.student_name,
            growthArea: recommendation.growth_area,
            priority: recommendation.priority,
            category: recommendation.category,
            recommendation: recommendation.recommendation,
            specificActions: recommendation.specific_actions,
            timeframe: recommendation.timeframe,
            measurableGoals: recommendation.measurable_goals,
            resources: recommendation.resources,
            instructorNotes: recommendation.instructor_notes,
            confidence: recommendation.confidence,
            status: recommendation.status,
            createdAt: new Date(recommendation.created_at),
            updatedAt: new Date(recommendation.updated_at)
          },
          validatedData.recentFeedback
        )

        const progressData = await insertOne('recommendation_progress', {
          recommendation_id: validatedData.recommendationId,
          status: progress.status,
          evidence: progress.evidence,
          confidence: progress.confidence,
          created_by: session.user.id
        })

        if (progress.status === 'improved' && recommendation.status === 'active') {
          await db.query('UPDATE recommendations SET status = $1, updated_at = $2 WHERE id = $3', ['completed', new Date().toISOString(), validatedData.recommendationId])
        }

        return NextResponse.json({
          progress: progressData,
          analysis: progress
        })
      }

      case 'extract-skills': {
        const { feedbackContent, program } = body

        if (!feedbackContent || !program) {
          return NextResponse.json({ error: 'Feedback content and program required' }, { status: 400 })
        }

        const skills = await aiAnalysisService.extractSkillsFromFeedback(feedbackContent, program)

        return NextResponse.json(skills)
      }

      default: {
        const { studentName, programType = 'PSD', level = 'primary' } = body

        if (!studentName) {
          return NextResponse.json({ error: 'Student name or studentId is required' }, { status: 400 })
        }

        const student = await findOne('students', { name: studentName })

        if (!student) {
          return NextResponse.json({ error: 'Student not found' }, { status: 404 })
        }

        const feedbackData = await findMany('parsed_student_feedback', { student_name: studentName }, 'created_at DESC', 10)

        if (!feedbackData || feedbackData.length === 0) {
          return NextResponse.json({ 
            error: 'No feedback data found for student',
            recommendations: []
          }, { status: 404 })
        }

        const feedbackSessions = feedbackData.map(feedback => ({
          unitNumber: feedback.unit_number || '',
          date: feedback.created_at || new Date().toISOString(),
          feedbackType: (feedback.feedback_type || 'primary') as 'primary' | 'secondary',
          motion: feedback.topic || undefined,
          content: feedback.extracted_content || '',
          bestAspects: feedback.best_aspects || undefined,
          improvementAreas: feedback.improvement_areas || undefined,
          teacherComments: feedback.teacher_comments || undefined
        }))

        const analysis = await aiAnalysisService.analyzeStudentPerformance(
          studentName,
          level as 'primary' | 'secondary',
          feedbackSessions
        )

        const recommendations = await aiAnalysisService.generateRecommendations(
          student.id,
          studentName,
          analysis,
          programType as 'PSD' | 'Academic Writing' | 'RAPS' | 'Critical Thinking'
        )

        return NextResponse.json({
          success: true,
          studentName,
          analysis,
          recommendations,
          feedbackSessionsAnalyzed: feedbackSessions.length
        })
      }
    }
  } catch (error) {
    console.error('AI Recommendations API error:', error)
    
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const studentName = searchParams.get('studentName')
    const action = searchParams.get('action') || 'get-active'

    let targetStudentId = studentId
    if (!targetStudentId && studentName) {
      const student = await findOne('students', { name: studentName })
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      targetStudentId = student.id
    }

    if (!targetStudentId) {
      return NextResponse.json({ error: 'Student ID or name is required' }, { status: 400 })
    }

    switch (action) {
      case 'get-active': {
        const recommendations = await findMany('recommendations', { student_id: targetStudentId, status: 'active' }, 'priority DESC, created_at DESC')

        return NextResponse.json({ 
          success: true,
          recommendations: recommendations || []
        })
      }

      case 'get-history': {
        const history = await findMany('student_analysis_history', { student_id: targetStudentId }, 'analysis_date DESC', 10)

        return NextResponse.json({ 
          success: true,
          history: history || []
        })
      }

      case 'get-progress': {
        const recommendationId = searchParams.get('recommendationId')
        if (!recommendationId) {
          return NextResponse.json({ error: 'Recommendation ID required' }, { status: 400 })
        }

        const progress = await findMany('recommendation_progress', { recommendation_id: recommendationId }, 'progress_date DESC')

        return NextResponse.json({ 
          success: true,
          progress: progress || []
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI Recommendations GET error:', error)
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
