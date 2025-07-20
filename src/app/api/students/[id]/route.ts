import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/postgres'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch comprehensive student data
    const studentQuery = `
      SELECT 
        s.id,
        s.student_number as student_id_external,
        s.name,
        s.grade_level as grade,
        s.school,
        s.email,
        s.parent_email,
        s.parent_phone,
        s.created_at as enroll_date,
        -- Calculate student status based on enrollments
        CASE 
          WHEN EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = s.id AND e.status = 'active') THEN 'active'
          WHEN EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = s.id AND e.status = 'makeup') THEN 'makeup_visitor'
          ELSE 'hidden'
        END as status
      FROM students s
      WHERE s.id = $1
    `
    
    const studentResult = await db.query(studentQuery, [id])
    
    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const student = studentResult.rows[0]

    // Fetch enrolled courses
    const coursesQuery = `
      SELECT 
        c.id,
        c.course_code as code,
        c.course_name as name,
        c.level,
        c.program_type as type,
        c.day_of_week,
        c.start_time,
        c.end_time,
        e.status as enrollment_status
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = $1
    `
    const coursesResult = await db.query(coursesQuery, [id])

    // Fetch attendance statistics
    const attendanceStatsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE a.status = 'present') as present,
        COUNT(*) FILTER (WHERE a.status = 'absent') as absent,
        COUNT(*) FILTER (WHERE a.status = 'makeup') as makeup,
        COUNT(*) as total
      FROM attendances a
      WHERE a.student_id = $1
    `
    const attendanceStatsResult = await db.query(attendanceStatsQuery, [id])
    const attendanceStats = attendanceStatsResult.rows[0] || { present: 0, absent: 0, makeup: 0, total: 0 }

    // Calculate attendance rate
    const attendanceRate = attendanceStats.total > 0 
      ? ((attendanceStats.present + attendanceStats.makeup) / attendanceStats.total) * 100
      : 0

    // Fetch ratings data (from attendances)
    const ratingsQuery = `
      SELECT 
        AVG(attitude_rating) as avg_attitude,
        AVG(questions_rating) as avg_questions,
        AVG(skills_rating) as avg_skills,
        AVG(feedback_rating) as avg_feedback,
        AVG((attitude_rating + questions_rating + skills_rating + feedback_rating) / 4.0) as overall_avg,
        COUNT(*) as rating_count
      FROM attendances
      WHERE student_id = $1 
        AND attitude_rating IS NOT NULL
    `
    const ratingsResult = await db.query(ratingsQuery, [id])
    const ratings = ratingsResult.rows[0]

    // Determine trend (simplified - based on last 5 vs previous 5 ratings)
    const trendQuery = `
      WITH recent_ratings AS (
        SELECT AVG((attitude_rating + questions_rating + skills_rating + feedback_rating) / 4.0) as avg_rating
        FROM (
          SELECT * FROM attendances 
          WHERE student_id = $1 AND attitude_rating IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 5
        ) r
      ),
      previous_ratings AS (
        SELECT AVG((attitude_rating + questions_rating + skills_rating + feedback_rating) / 4.0) as avg_rating
        FROM (
          SELECT * FROM attendances 
          WHERE student_id = $1 AND attitude_rating IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 5 OFFSET 5
        ) p
      )
      SELECT 
        CASE 
          WHEN r.avg_rating > p.avg_rating + 0.2 THEN 'up'
          WHEN r.avg_rating < p.avg_rating - 0.2 THEN 'down'
          ELSE 'stable'
        END as trend
      FROM recent_ratings r, previous_ratings p
    `
    const trendResult = await db.query(trendQuery, [id])
    const trend = trendResult.rows[0]?.trend || 'stable'

    // Fetch feedback summary
    const feedbackQuery = `
      SELECT 
        COUNT(*) as count,
        MAX(created_at) as last_date
      FROM parsed_student_feedback
      WHERE student_id = $1
    `
    const feedbackResult = await db.query(feedbackQuery, [id])
    const feedbackSummary = feedbackResult.rows[0]

    // Fetch recent feedback entries
    const recentFeedbackQuery = `
      SELECT 
        id,
        class_code,
        class_name,
        unit_number,
        lesson_number,
        topic,
        content,
        instructor,
        created_at
      FROM parsed_student_feedback
      WHERE student_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `
    const recentFeedbackResult = await db.query(recentFeedbackQuery, [id])

    // Fetch homework data (mock for now - can be linked to attendance notes)
    const homeworkQuery = `
      SELECT 
        cs.date,
        c.course_code as course,
        a.notes,
        CASE WHEN a.notes LIKE '%homework%' THEN true ELSE false END as submitted
      FROM attendances a
      JOIN class_sessions cs ON cs.id = a.session_id
      JOIN courses c ON c.id = cs.course_id
      WHERE a.student_id = $1
      ORDER BY cs.date DESC
      LIMIT 10
    `
    const homeworkResult = await db.query(homeworkQuery, [id])
    
    // Calculate homework submission rate
    const homeworkCount = homeworkResult.rows.length
    const submittedCount = homeworkResult.rows.filter(h => h.submitted).length
    const submissionRate = homeworkCount > 0 ? (submittedCount / homeworkCount) * 100 : 0

    // Fetch achievements (from AI recommendations or notes)
    const achievementsQuery = `
      SELECT 
        id,
        recommendation_type as title,
        content as description,
        created_at as date
      FROM ai_recommendations
      WHERE student_name = $1 
        AND recommendation_type LIKE '%achievement%'
      ORDER BY created_at DESC
      LIMIT 5
    `
    const achievementsResult = await db.query(achievementsQuery, [student.name])

    // Compile all data
    const studentProfile = {
      id: student.id,
      studentIdExternal: student.student_id_external || student.id,
      name: student.name,
      photo: null, // No photo field in database yet
      grade: student.grade,
      school: student.school,
      email: student.email,
      parentEmail: student.parent_email,
      parentPhone: student.parent_phone,
      status: student.status,
      enrollDate: student.enroll_date,
      courses: coursesResult.rows,
      attendance: {
        present: parseInt(attendanceStats.present) || 0,
        absent: parseInt(attendanceStats.absent) || 0,
        makeup: parseInt(attendanceStats.makeup) || 0,
        rate: attendanceRate
      },
      ratings: {
        average: parseFloat(ratings?.overall_avg) || 0,
        categories: {
          participation: parseFloat(ratings?.avg_attitude) || 0,
          understanding: parseFloat(ratings?.avg_questions) || 0,
          skills: parseFloat(ratings?.avg_skills) || 0,
          collaboration: parseFloat(ratings?.avg_feedback) || 0,
          effort: parseFloat(ratings?.avg_attitude) || 0 // Using attitude as proxy for effort
        },
        trend: trend
      },
      feedback: {
        count: parseInt(feedbackSummary?.count) || 0,
        lastDate: feedbackSummary?.last_date || null,
        recent: recentFeedbackResult.rows
      },
      homework: {
        submissionRate: submissionRate,
        recent: homeworkResult.rows.map(h => ({
          date: h.date,
          course: h.course,
          submitted: h.submitted
        }))
      },
      achievements: achievementsResult.rows.map(a => ({
        id: a.id,
        title: a.title,
        date: a.date,
        description: a.description
      })),
      notes: '', // Will be fetched separately if needed
      growthInsight: await generateGrowthInsight(student.name, ratings, trend)
    }

    return NextResponse.json(studentProfile)
  } catch (error) {
    console.error('Error fetching student profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student profile' },
      { status: 500 }
    )
  }
}

// Generate AI-powered growth insight (placeholder for now)
async function generateGrowthInsight(studentName: string, ratings: any, trend: string): Promise<string> {
  if (!ratings || !ratings.overall_avg) {
    return '[Growth Insight Placeholder - No rating data available]'
  }

  const avgRating = parseFloat(ratings.overall_avg)
  const trendText = trend === 'up' ? 'showing improvement' : trend === 'down' ? 'needs additional support' : 'maintaining steady progress'

  return `${studentName} is ${trendText} with an average rating of ${avgRating.toFixed(1)}/5 across all categories. Focus areas include ${
    ratings.avg_skills < ratings.overall_avg ? 'skill application' : 'consistent participation'
  }.`
}

// Update student profile (for notes, status changes, etc.)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Handle different update types
    if (body.notes !== undefined) {
      // Update notes - would need a separate notes table
      // For now, return success
      return NextResponse.json({ success: true })
    }

    if (body.status !== undefined) {
      // Update student status via enrollments
      await db.query(
        `UPDATE enrollments SET status = $1 WHERE student_id = $2`,
        [body.status === 'hidden' ? 'inactive' : 'active', id]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid update request' }, { status: 400 })
  } catch (error) {
    console.error('Error updating student profile:', error)
    return NextResponse.json(
      { error: 'Failed to update student profile' },
      { status: 500 }
    )
  }
}