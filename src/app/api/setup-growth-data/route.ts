import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('Setting up growth tracking demo data...');

    // First, ensure we have the enhanced schema tables
    // Note: In production, these would be created via migrations
    const schemaQueries = [
      // Create feedback_format enum if not exists
      `DO $$ BEGIN
        CREATE TYPE feedback_format AS ENUM ('primary_narrative', 'secondary_rubric', 'mixed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      
      // Create skill_category enum if not exists
      `DO $$ BEGIN
        CREATE TYPE skill_category AS ENUM (
          'time_management',
          'interactive_debate',
          'presentation_skills',
          'argument_structure',
          'theory_application',
          'rebuttal_skills',
          'teamwork',
          'feedback_implementation',
          'hook_development',
          'signposting',
          'voice_projection',
          'eye_contact',
          'logical_reasoning',
          'evidence_usage'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,

      // Create feedback_sessions table
      `CREATE TABLE IF NOT EXISTS feedback_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
        unit_number VARCHAR(20) NOT NULL,
        topic VARCHAR(255),
        feedback_format feedback_format NOT NULL,
        session_duration INTERVAL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // Create student_feedback_records table
      `CREATE TABLE IF NOT EXISTS student_feedback_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        feedback_session_id UUID NOT NULL REFERENCES feedback_sessions(id) ON DELETE CASCADE,
        enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
        speech_duration INTERVAL,
        target_duration INTERVAL,
        best_aspects TEXT,
        improvement_areas TEXT,
        instructor_notes TEXT,
        instructor_id UUID NOT NULL REFERENCES users(id),
        feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
        document_source VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(student_id, feedback_session_id)
      );`,

      // Create skill_assessments table
      `CREATE TABLE IF NOT EXISTS skill_assessments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        feedback_record_id UUID NOT NULL REFERENCES student_feedback_records(id) ON DELETE CASCADE,
        skill_category skill_category NOT NULL,
        rubric_score INTEGER CHECK (rubric_score BETWEEN 1 AND 5),
        normalized_score NUMERIC(3,1) CHECK (normalized_score >= 0 AND normalized_score <= 10),
        skill_notes TEXT,
        observed BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // Create growth_indicators table
      `CREATE TABLE IF NOT EXISTS growth_indicators (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        skill_category skill_category NOT NULL,
        enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
        first_assessment_date DATE,
        latest_assessment_date DATE,
        total_assessments INTEGER DEFAULT 0,
        initial_score NUMERIC(3,1),
        current_score NUMERIC(3,1),
        growth_rate NUMERIC(5,2),
        trend_direction VARCHAR(20),
        score_variance NUMERIC(5,2),
        consistency_rating VARCHAR(20),
        is_strength BOOLEAN DEFAULT false,
        is_growth_area BOOLEAN DEFAULT false,
        priority_level INTEGER CHECK (priority_level BETWEEN 1 AND 5),
        last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(student_id, skill_category, enrollment_id)
      );`,

      // Create feedback_themes table
      `CREATE TABLE IF NOT EXISTS feedback_themes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        skill_category skill_category,
        theme_type VARCHAR(50),
        keywords JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_feedback_sessions_session ON feedback_sessions(session_id);`,
      `CREATE INDEX IF NOT EXISTS idx_student_feedback_student ON student_feedback_records(student_id);`,
      `CREATE INDEX IF NOT EXISTS idx_skill_assessments_feedback ON skill_assessments(feedback_record_id);`,
      `CREATE INDEX IF NOT EXISTS idx_growth_indicators_student ON growth_indicators(student_id);`
    ];

    // Execute schema creation queries
    for (const query of schemaQueries) {
      const { error } = await supabase.rpc('sql', { query });
      if (error) {
        console.error('Schema error:', error);
        // Continue with other queries even if one fails
      }
    }

    // Get existing students and courses
    const { data: students } = await supabase
      .from('students')
      .select('id, users!inner(name)')
      .limit(5);

    const { data: courses } = await supabase
      .from('courses')
      .select('id, code')
      .limit(3);

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id')
      .limit(5);

    if (!students || !courses || !enrollments) {
      return NextResponse.json({ 
        error: 'Missing required data. Please ensure students and courses exist.' 
      }, { status: 400 });
    }

    // Create sample class sessions for feedback
    const sessionData = [];
    const feedbackSessionData = [];
    
    for (let i = 1; i <= 10; i++) {
      const courseId = courses[Math.floor(Math.random() * courses.length)].id;
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - (10 - i) * 7); // Weekly sessions

      const sessionId = `session-${i}-${courseId}`;
      
      sessionData.push({
        id: sessionId,
        course_id: courseId,
        session_date: sessionDate.toISOString().split('T')[0],
        lesson_number: `${Math.floor((i-1)/4) + 1}.${((i-1) % 4) + 1}`,
        topic: `Unit ${Math.floor((i-1)/4) + 1} Topic ${((i-1) % 4) + 1}`,
        instructor_id: '550e8400-e29b-41d4-a716-446655440000', // Default instructor
        status: 'completed'
      });

      feedbackSessionData.push({
        id: `feedback-session-${i}`,
        session_id: sessionId,
        unit_number: `${Math.floor((i-1)/4) + 1}.${((i-1) % 4) + 1}`,
        topic: `Unit ${Math.floor((i-1)/4) + 1} Topic ${((i-1) % 4) + 1}`,
        feedback_format: Math.random() > 0.5 ? 'primary_narrative' : 'secondary_rubric',
        session_duration: '01:30:00'
      });
    }

    // Insert class sessions
    const { error: sessionError } = await supabase
      .from('class_sessions')
      .upsert(sessionData, { onConflict: 'id' });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
    }

    // Insert feedback sessions
    const { error: feedbackSessionError } = await supabase
      .from('feedback_sessions')
      .upsert(feedbackSessionData, { onConflict: 'id' });

    if (feedbackSessionError) {
      console.error('Feedback session creation error:', feedbackSessionError);
    }

    // Create sample student feedback records
    const feedbackRecords = [];
    const skillAssessments = [];
    
    const skillCategories = [
      'time_management',
      'presentation_skills',
      'argument_structure',
      'hook_development',
      'signposting',
      'voice_projection',
      'eye_contact',
      'logical_reasoning'
    ];

    for (const enrollment of enrollments) {
      for (let sessionIndex = 0; sessionIndex < 8; sessionIndex++) {
        const feedbackRecordId = `feedback-record-${enrollment.student_id}-${sessionIndex}`;
        const feedbackSessionId = feedbackSessionData[sessionIndex]?.id;
        
        if (!feedbackSessionId) continue;

        // Create feedback record
        feedbackRecords.push({
          id: feedbackRecordId,
          student_id: enrollment.student_id,
          feedback_session_id: feedbackSessionId,
          enrollment_id: enrollment.id,
          speech_duration: `00:0${Math.floor(Math.random() * 3) + 3}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          target_duration: '00:04:00',
          best_aspects: `Strong ${skillCategories[Math.floor(Math.random() * 3)].replace('_', ' ')} and good engagement with audience.`,
          improvement_areas: `Focus on ${skillCategories[Math.floor(Math.random() * 3) + 3].replace('_', ' ')} and ${skillCategories[Math.floor(Math.random() * 3) + 5].replace('_', ' ')}.`,
          instructor_notes: 'Shows consistent progress and applies feedback well.',
          instructor_id: '550e8400-e29b-41d4-a716-446655440000',
          feedback_date: new Date(Date.now() - (8 - sessionIndex) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          document_source: `Unit ${sessionIndex + 1} Feedback`
        });

        // Create skill assessments for this feedback record
        const numSkills = Math.floor(Math.random() * 4) + 4; // 4-7 skills assessed
        const selectedSkills = skillCategories.slice(0, numSkills);
        
        for (const skill of selectedSkills) {
          // Simulate growth over time - later sessions have higher scores
          const baseScore = Math.random() * 3 + 3; // 3-6 base
          const growthFactor = sessionIndex * 0.3; // Growth over time
          const normalizedScore = Math.min(10, baseScore + growthFactor + (Math.random() - 0.5));
          
          skillAssessments.push({
            id: `skill-${feedbackRecordId}-${skill}`,
            feedback_record_id: feedbackRecordId,
            skill_category: skill,
            rubric_score: Math.min(5, Math.max(1, Math.round(normalizedScore / 2))),
            normalized_score: Math.round(normalizedScore * 10) / 10,
            skill_notes: `Shows ${normalizedScore > 6 ? 'strong' : 'developing'} understanding in this area.`,
            observed: true
          });
        }
      }
    }

    // Insert feedback records
    const { error: feedbackError } = await supabase
      .from('student_feedback_records')
      .upsert(feedbackRecords, { onConflict: 'id' });

    if (feedbackError) {
      console.error('Feedback records error:', feedbackError);
    }

    // Insert skill assessments
    const { error: skillError } = await supabase
      .from('skill_assessments')
      .upsert(skillAssessments, { onConflict: 'id' });

    if (skillError) {
      console.error('Skill assessments error:', skillError);
    }

    // Insert feedback themes
    const feedbackThemes = [
      {
        id: 'theme-hook',
        name: 'Hook Development',
        description: 'Creating engaging speech openings',
        skill_category: 'hook_development',
        theme_type: 'challenge',
        keywords: JSON.stringify(['hook', 'opening', 'start', 'beginning', 'engage'])
      },
      {
        id: 'theme-volume',
        name: 'Volume Issues',
        description: 'Speech volume and projection',
        skill_category: 'voice_projection',
        theme_type: 'challenge',
        keywords: JSON.stringify(['volume', 'loud', 'quiet', 'projection', 'hear'])
      },
      {
        id: 'theme-signposting',
        name: 'Strong Signposting',
        description: 'Excellent speech organization',
        skill_category: 'signposting',
        theme_type: 'strength',
        keywords: JSON.stringify(['signpost', 'structure', 'organize', 'clear', 'firstly'])
      },
      {
        id: 'theme-confidence',
        name: 'Confident Delivery',
        description: 'Strong confidence and poise',
        skill_category: 'presentation_skills',
        theme_type: 'strength',
        keywords: JSON.stringify(['confident', 'poise', 'comfortable', 'natural'])
      }
    ];

    const { error: themesError } = await supabase
      .from('feedback_themes')
      .upsert(feedbackThemes, { onConflict: 'id' });

    if (themesError) {
      console.error('Themes error:', themesError);
    }

    // Calculate growth indicators using a simplified version
    const growthIndicators = [];
    
    for (const enrollment of enrollments) {
      for (const skill of skillCategories) {
        // Get assessments for this student/skill combination
        const studentSkillAssessments = skillAssessments.filter(
          assessment => assessment.skill_category === skill &&
          feedbackRecords.some(record => 
            record.id === assessment.feedback_record_id && 
            record.student_id === enrollment.student_id
          )
        );

        if (studentSkillAssessments.length >= 2) {
          const scores = studentSkillAssessments.map(a => a.normalized_score).sort();
          const initialScore = scores[0];
          const currentScore = scores[scores.length - 1];
          const growthRate = (currentScore - initialScore) / scores.length;
          
          let trendDirection = 'stable';
          if (growthRate > 0.3) trendDirection = 'improving';
          else if (growthRate < -0.3) trendDirection = 'declining';

          growthIndicators.push({
            id: `growth-${enrollment.student_id}-${skill}`,
            student_id: enrollment.student_id,
            skill_category: skill,
            enrollment_id: enrollment.id,
            first_assessment_date: new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            latest_assessment_date: new Date().toISOString().split('T')[0],
            total_assessments: studentSkillAssessments.length,
            initial_score: initialScore,
            current_score: currentScore,
            growth_rate: Math.round(growthRate * 100) / 100,
            trend_direction: trendDirection,
            score_variance: Math.round(Math.random() * 100) / 100,
            consistency_rating: Math.random() > 0.7 ? 'consistent' : 'variable',
            is_strength: currentScore >= 7.5,
            is_growth_area: currentScore < 5.5 || trendDirection === 'declining',
            priority_level: currentScore < 4 ? 5 : (currentScore < 6 ? 3 : 1)
          });
        }
      }
    }

    // Insert growth indicators
    const { error: growthError } = await supabase
      .from('growth_indicators')
      .upsert(growthIndicators, { onConflict: 'id' });

    if (growthError) {
      console.error('Growth indicators error:', growthError);
    }

    return NextResponse.json({
      success: true,
      message: 'Growth tracking demo data setup completed successfully',
      stats: {
        feedbackSessions: feedbackSessionData.length,
        feedbackRecords: feedbackRecords.length,
        skillAssessments: skillAssessments.length,
        growthIndicators: growthIndicators.length,
        themes: feedbackThemes.length
      }
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Failed to setup growth tracking data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}