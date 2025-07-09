import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, findOne, insertOne, findMany } from '@/lib/postgres'
import { aiAnalysisService } from '@/lib/ai-analysis-service'
import { debateRecommendationEngine } from '@/lib/debate-recommendation-engine'
import { deepSeekRecommendationEngine } from '@/lib/deepseek-recommendation-engine'
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

      case 'scientific-analysis': {
        const { studentName, programType = 'PSD', level = 'primary' } = body

        console.log('🔍 Scientific analysis requested for:', studentName)

        if (!studentName) {
          return NextResponse.json({ error: 'Student name is required' }, { status: 400 })
        }

        // First check if feedback data exists for this student
        const feedbackData = await findMany('parsed_student_feedback', { student_name: studentName }, 'created_at ASC')

        if (!feedbackData || feedbackData.length === 0) {
          console.log('❌ No feedback data found for student:', studentName)
          return NextResponse.json({ 
            error: 'No feedback data found for student',
            recommendations: []
          }, { status: 404 })
        }

        console.log(`📊 Found ${feedbackData.length} feedback sessions for analysis`)

        // Try to find student in students table, if not found, create a temporary student record
        let student = await findOne('students', { name: studentName })

        if (!student) {
          console.log('⚠️ Student not found in students table, checking for similar names...')
          
          try {
            // Try to find by partial name match
            const allStudents = await findMany('students', {}, 'name ASC')
            console.log(`📋 Found ${allStudents.length} students in database`)
            
            // Filter out students with null names and log any problematic records
            const validStudents = allStudents.filter(s => {
              if (!s.name) {
                console.log('⚠️ Found student with null name:', s.id)
                return false
              }
              return true
            })
            
            console.log(`✅ ${validStudents.length} students have valid names`)
            
            const similarStudent = validStudents.find(s => 
              s.name.toLowerCase().includes(studentName.toLowerCase()) ||
              studentName.toLowerCase().includes(s.name.toLowerCase())
            )

            if (similarStudent) {
              console.log('✅ Found similar student:', similarStudent.name)
              student = similarStudent
            } else {
              // Create temporary student for analysis purposes
              console.log('📝 Creating temporary student record for analysis')
              student = {
                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: studentName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            }
          } catch (studentLookupError) {
            console.error('❌ Error during student lookup:', studentLookupError)
            // Create temporary student as fallback
            console.log('📝 Creating temporary student record due to lookup error')
            student = {
              id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: studentName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          }
        }

        console.log('✅ Student resolved:', student.id)

        // Transform feedback data for scientific analysis
        const feedbackSessions = feedbackData.map((feedback, index) => ({
          id: feedback.id || `session_${index}`,
          unitNumber: feedback.unit_number || '',
          date: feedback.created_at || new Date().toISOString(),
          motion: feedback.topic || undefined,
          content: feedback.content || '',
          bestAspects: feedback.strengths || undefined,
          improvementAreas: feedback.improvement_areas || undefined,
          teacherComments: feedback.teacher_comments || undefined,
          duration: feedback.duration || undefined,
          rawFeedback: feedback.raw_content || feedback.content || '',
          rubricScores: feedback.rubric_scores || undefined
        }))

        console.log('📊 Raw database record (first):', JSON.stringify(feedbackData[0], null, 2))
        console.log('📊 Transformed session (first):', JSON.stringify(feedbackSessions[0], null, 2))
        
        // Detailed field analysis
        console.log('📊 Database field analysis for first record:')
        const firstRecord = feedbackData[0]
        Object.keys(firstRecord).forEach(key => {
          const value = firstRecord[key]
          const type = typeof value
          const length = typeof value === 'string' ? value.length : 'N/A'
          console.log(`  ${key}: ${type}, length: ${length}, value: ${typeof value === 'string' ? value.substring(0, 50) + '...' : value}`)
        })
        
        // Analyze feedback quality
        const totalContentLength = feedbackSessions.reduce((sum, s) => sum + (s.content?.length || 0), 0)
        const meaningfulSessions = feedbackSessions.filter(s => 
          (s.content?.length || 0) > 20 || 
          (s.bestAspects?.length || 0) > 10 || 
          (s.improvementAreas?.length || 0) > 10 ||
          (s.teacherComments?.length || 0) > 10
        )
        
        console.log('📊 Feedback quality analysis:')
        console.log('📊 Total content length:', totalContentLength)
        console.log('📊 Sessions with meaningful content:', meaningfulSessions.length, '/', feedbackSessions.length)
        
        if (meaningfulSessions.length < 3) {
          console.log('⚠️ Insufficient meaningful feedback data for analysis')
          
          // Still build the prompt for debugging purposes
          let debugPrompt = 'Prompt builder failed'
          try {
            // Use the DeepSeek engine instance
            debugPrompt = deepSeekRecommendationEngine.buildScientificAnalysisPrompt(studentName, feedbackSessions)
          } catch (error) {
            console.log('Debug prompt building failed:', error)
            debugPrompt = `Failed to build debug prompt: ${error.message}`
          }
          
          return NextResponse.json({ 
            error: 'Insufficient feedback data for analysis',
            details: `Only ${meaningfulSessions.length} out of ${feedbackSessions.length} sessions contain meaningful feedback content. At least 3 sessions with detailed feedback are required for scientific analysis.`,
            suggestions: [
              'Ensure feedback documents contain detailed observations and comments',
              'Check that feedback parsing is working correctly',
              'Verify that original feedback documents have sufficient content'
            ],
            debug: {
              prompt: debugPrompt,
              promptLength: debugPrompt.length,
              feedbackSessionCount: feedbackSessions.length,
              meaningfulSessionCount: meaningfulSessions.length,
              allFeedbackSessions: feedbackSessions,
              contentLengths: feedbackSessions.map(s => ({
                id: s.id,
                unitNumber: s.unitNumber,
                date: s.date,
                contentLength: s.content?.length || 0,
                hasContent: (s.content?.length || 0) > 0,
                hasBestAspects: (s.bestAspects?.length || 0) > 0,
                hasImprovementAreas: (s.improvementAreas?.length || 0) > 0,
                hasTeacherComments: (s.teacherComments?.length || 0) > 0,
                contentPreview: s.content?.substring(0, 100) || 'No content'
              }))
            }
          }, { status: 400 })
        }

        console.log('🤖 Starting scientific analysis with Gemini Flash 2.5...')

        try {
          // Use the Gemini debate recommendation engine with JSON-Prompt approach
          const result = await debateRecommendationEngine.analyzeChronologicalFeedback(
            studentName,
            feedbackSessions
          )

          const scientificAnalysis = result.analysis
          const actualPrompt = result.prompt

          console.log('✅ Scientific analysis completed successfully')
          console.log('✅ Analysis structure:', Object.keys(scientificAnalysis || {}))

          // Save the scientific analysis and recommendations only if we have a real student (not temporary)
          let savedRecommendations = []
          
          if (!student.id.startsWith('temp_')) {
            // Save the scientific analysis
            await insertOne('student_analysis_history', {
              student_id: student.id,
              analysis_type: 'scientific_debate_analysis',
              analysis_data: scientificAnalysis,
              program_type: programType,
              feedback_session_count: feedbackSessions.length,
              created_by: session.user.id
            })

            // Save recommendations to database
            savedRecommendations = await db.transaction(async (client) => {
              const result = []
              for (const rec of scientificAnalysis.recommendations) {
                const inserted = await client.query(
                  `INSERT INTO recommendations (student_id, student_name, growth_area, priority, category, recommendation, specific_actions, timeframe, measurable_goals, resources, instructor_notes, confidence, status, created_by)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
                  [
                    student.id,
                    studentName,
                    rec.skill,
                    rec.priority,
                    rec.category,
                    rec.recommendation,
                    rec.actionItems.practiceExercises,
                    rec.timeframe,
                    rec.measurableGoals.shortTerm,
                    [], // resources - can be added later
                    rec.patternContext.potentialUnderlyingFactors?.[0] || 'Pattern-based analysis',
                    rec.patternContext.issueFrequency * 10, // convert to percentage
                    'active',
                    session.user.id
                  ]
                )
                result.push(inserted.rows[0])
              }
              return result
            })

            console.log(`💾 Saved ${savedRecommendations.length} recommendations to database`)
          } else {
            console.log('⚠️ Using temporary student - skipping database save')
          }

          return NextResponse.json({
            success: true,
            studentName,
            scientificAnalysis,
            recommendations: savedRecommendations,
            feedbackSessionsAnalyzed: feedbackSessions.length,
            analysisType: 'scientific_debate_analysis',
            debug: {
              prompt: actualPrompt,
              promptLength: actualPrompt.length,
              feedbackSessionCount: feedbackSessions.length,
              meaningfulSessionCount: meaningfulSessions.length,
              sampleFeedback: feedbackSessions.slice(0, 2)
            }
          })
        } catch (analysisError) {
          console.error('❌ Scientific analysis failed:', analysisError)
          
          // Enhanced error response with debug information
          const errorMessage = analysisError instanceof Error ? analysisError.message : 'Unknown error'
          const errorDetails = {
            message: errorMessage,
            type: typeof analysisError,
            name: analysisError instanceof Error ? analysisError.name : 'Unknown',
            stack: analysisError instanceof Error ? analysisError.stack : 'No stack trace'
          }
          
          console.error('❌ Enhanced error details:', errorDetails)
          
          // Build debug prompt for error diagnosis
          let debugPrompt = 'Prompt builder failed'
          try {
            debugPrompt = debateRecommendationEngine.buildScientificAnalysisPrompt(studentName, feedbackSessions)
          } catch (promptError) {
            console.log('Debug prompt building failed:', promptError)
            debugPrompt = `Failed to build debug prompt: ${promptError.message}`
          }
          
          return NextResponse.json({ 
            error: 'Failed to generate scientific analysis', 
            details: errorMessage,
            errorType: analysisError instanceof Error ? analysisError.name : 'Unknown',
            debug: {
              prompt: debugPrompt,
              promptLength: debugPrompt.length,
              feedbackSessionCount: feedbackSessions.length,
              meaningfulSessionCount: meaningfulSessions.length,
              errorDetails: errorDetails,
              sampleFeedback: feedbackSessions.slice(0, 2),
              allContentLengths: feedbackSessions.map(s => ({
                id: s.id,
                unitNumber: s.unitNumber,
                date: s.date,
                contentLength: s.content?.length || 0,
                hasContent: (s.content?.length || 0) > 0,
                contentPreview: s.content?.substring(0, 100) || 'No content'
              }))
            }
          }, { status: 500 })
        }
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
          content: feedback.content || '',
          bestAspects: feedback.strengths || undefined,
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
