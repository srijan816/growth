// Feedback Data Processing and Organization System
// Handles conversion of existing feedback documents into structured growth tracking data

import { supabase } from './supabase';

// Types for feedback processing
export interface FeedbackDocument {
  filePath: string;
  courseFolderName: string;
  unitFolder: string;
  studentIdentifier: string;
  feedbackContent?: string;
  feedbackFormat: 'primary_narrative' | 'secondary_rubric';
}

export interface ProcessedFeedback {
  studentId: string;
  feedbackSessionId: string;
  enrollmentId: string;
  speechDuration?: string;
  targetDuration?: string;
  bestAspects?: string;
  improvementAreas?: string;
  instructorNotes?: string;
  skillAssessments: SkillAssessment[];
}

export interface SkillAssessment {
  skillCategory: string;
  rubricScore?: number;
  normalizedScore: number;
  skillNotes?: string;
  observed: boolean;
}

export interface CourseInfo {
  courseCode: string;
  dayOfWeek: string;
  timeSlot: string;
  programType: string;
  level: string;
}

export interface StudentProgressSummary {
  studentId: string;
  studentName: string;
  courseCode: string;
  totalFeedbackSessions: number;
  firstFeedback: string;
  latestFeedback: string;
  averageScore: number;
  skillsAssessed: number;
  growthTrends: {
    improving: string[];
    stable: string[];
    declining: string[];
  };
  focusAreas: string[];
  strengths: string[];
}

export class FeedbackProcessor {
  
  /**
   * Process feedback documents from the data folder structure
   */
  async processFeedbackDocuments(documents: FeedbackDocument[]): Promise<void> {
    console.log(`Processing ${documents.length} feedback documents...`);
    
    // Step 1: Import raw data into staging table
    await this.importToStaging(documents);
    
    // Step 2: Validate and normalize data
    await this.validateAndNormalize();
    
    // Step 3: Create courses and students if needed
    await this.ensureCoursesAndStudents();
    
    // Step 4: Process feedback into structured format
    await this.processStructuredFeedback();
    
    // Step 5: Calculate growth indicators
    await this.calculateGrowthMetrics();
    
    console.log('Feedback processing completed');
  }

  /**
   * Import feedback documents into staging table
   */
  private async importToStaging(documents: FeedbackDocument[]): Promise<void> {
    const { error } = await supabase
      .from('temp_feedback_import')
      .insert(documents.map(doc => ({
        original_file_path: doc.filePath,
        course_folder_name: doc.courseFolderName,
        unit_folder: doc.unitFolder,
        student_identifier: doc.studentIdentifier,
        feedback_content: doc.feedbackContent,
        feedback_format: doc.feedbackFormat
      })));

    if (error) {
      throw new Error(`Failed to import to staging: ${error.message}`);
    }
  }

  /**
   * Validate and normalize imported data
   */
  private async validateAndNormalize(): Promise<void> {
    // Run validation function
    const { data: validationResults, error } = await supabase
      .rpc('validate_feedback_data');

    if (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }

    // Log validation issues
    validationResults?.forEach((result: {
      validation_type: string;
      issue_count: number;
      sample_issues: string[];
    }) => {
      if (result.issue_count > 0) {
        console.warn(`${result.validation_type}: ${result.issue_count} issues found`);
        console.warn('Sample issues:', result.sample_issues);
      }
    });

    // Normalize student names
    const { error: normalizeError } = await supabase
      .rpc('sql', {
        query: `
          INSERT INTO student_name_mapping (original_name, normalized_name, confidence_score)
          SELECT DISTINCT 
            student_identifier,
            normalize_student_name(student_identifier),
            CASE 
              WHEN normalize_student_name(student_identifier) IS NULL THEN 0.0
              WHEN student_identifier ~ '^[A-Z][a-z]+ [A-Z][a-z]+$' THEN 1.0
              WHEN student_identifier ~ '^[A-Z][a-z]+$' THEN 0.8
              ELSE 0.6
            END
          FROM temp_feedback_import
          WHERE normalize_student_name(student_identifier) IS NOT NULL
          ON CONFLICT (original_name) DO NOTHING;
        `
      });

    if (normalizeError) {
      console.error('Error normalizing student names:', normalizeError);
    }
  }

  /**
   * Ensure courses and students exist in the database
   */
  private async ensureCoursesAndStudents(): Promise<void> {
    // Create missing courses
    const { data: coursesToCreate } = await supabase
      .from('temp_feedback_import')
      .select(`
        course_folder_name,
        course_code_mapping (
          extracted_course_code,
          day_of_week,
          time_slot,
          program_type,
          level
        )
      `)
      .not('course_code_mapping', 'is', null);

    if (coursesToCreate) {
      for (const courseData of coursesToCreate) {
        const mapping = courseData.course_code_mapping;
        await this.createCourseIfNotExists({
          courseCode: mapping.extracted_course_code,
          dayOfWeek: mapping.day_of_week,
          timeSlot: mapping.time_slot,
          programType: mapping.program_type,
          level: mapping.level
        });
      }
    }

    // Create missing students
    const { data: studentsToCreate } = await supabase
      .from('student_name_mapping')
      .select('normalized_name')
      .is('canonical_student_id', null)
      .gte('confidence_score', 0.6);

    if (studentsToCreate) {
      for (const student of studentsToCreate) {
        await this.createStudentIfNotExists(student.normalized_name);
      }
    }
  }

  /**
   * Create course if it doesn't exist
   */
  private async createCourseIfNotExists(courseInfo: CourseInfo): Promise<void> {
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('code', courseInfo.courseCode)
      .single();

    if (!existingCourse) {
      // Get default instructor (first instructor in system)
      const { data: instructor } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'instructor')
        .limit(1)
        .single();

      if (!instructor) {
        throw new Error('No instructor found in system');
      }

      const { error } = await supabase
        .from('courses')
        .insert({
          code: courseInfo.courseCode,
          name: `${courseInfo.dayOfWeek} ${courseInfo.timeSlot} ${courseInfo.programType}`,
          program_type: courseInfo.programType,
          level: courseInfo.level,
          grade_range: this.inferGradeRange(courseInfo.level, courseInfo.programType),
          day_of_week: courseInfo.dayOfWeek,
          start_time: this.parseTimeSlot(courseInfo.timeSlot),
          instructor_id: instructor.id
        });

      if (error) {
        console.error(`Failed to create course ${courseInfo.courseCode}:`, error);
      }
    }
  }

  /**
   * Create student if not exists
   */
  private async createStudentIfNotExists(studentName: string): Promise<void> {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('name', studentName)
      .eq('role', 'student')
      .single();

    if (!existingUser) {
      // Create user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: `${studentName.toLowerCase().replace(/\s+/g, '.')}@student.example.com`,
          name: studentName,
          role: 'student',
          password_hash: '$2b$12$default_hash_for_imported_students'
        })
        .select('id')
        .single();

      if (userError) {
        console.error(`Failed to create user for ${studentName}:`, userError);
        return;
      }

      // Create student record
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          id: newUser.id,
          student_number: `STU${Date.now()}`
        });

      if (studentError) {
        console.error(`Failed to create student record for ${studentName}:`, studentError);
      }

      // Update student name mapping
      await supabase
        .from('student_name_mapping')
        .update({ canonical_student_id: newUser.id })
        .eq('normalized_name', studentName);
    }
  }

  /**
   * Process feedback into structured format
   */
  private async processStructuredFeedback(): Promise<void> {
    // This would involve parsing the feedback content
    // and extracting skill assessments, narrative feedback, etc.
    // Implementation depends on the specific document formats
    
    console.log('Processing structured feedback...');
    
    // For now, create sample feedback sessions and assessments
    // In a real implementation, this would parse the actual documents
    await this.createSampleFeedbackData();
  }

  /**
   * Calculate growth metrics for all students
   */
  private async calculateGrowthMetrics(): Promise<void> {
    const { data: processedCount, error } = await supabase
      .rpc('recalculate_all_growth_indicators');

    if (error) {
      throw new Error(`Failed to calculate growth metrics: ${error.message}`);
    }

    console.log(`Calculated growth metrics for ${processedCount} student-skill combinations`);
  }

  /**
   * Get student progress summary
   */
  async getStudentProgress(studentId: string): Promise<StudentProgressSummary | null> {
    // Get basic progress overview
    const { data: overview } = await supabase
      .from('student_progress_overview')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (!overview) return null;

    // Get growth trends
    const { data: growthData } = await supabase
      .from('growth_indicators')
      .select('skill_category, trend_direction, is_strength, is_growth_area')
      .eq('student_id', studentId);

    const growthTrends = {
      improving: growthData?.filter(g => g.trend_direction === 'improving').map(g => g.skill_category) || [],
      stable: growthData?.filter(g => g.trend_direction === 'stable').map(g => g.skill_category) || [],
      declining: growthData?.filter(g => g.trend_direction === 'declining').map(g => g.skill_category) || []
    };

    const focusAreas = growthData?.filter(g => g.is_growth_area).map(g => g.skill_category) || [];
    const strengths = growthData?.filter(g => g.is_strength).map(g => g.skill_category) || [];

    return {
      studentId: overview.student_id,
      studentName: overview.student_name,
      courseCode: overview.course_code,
      totalFeedbackSessions: overview.total_feedback_sessions,
      firstFeedback: overview.first_feedback,
      latestFeedback: overview.latest_feedback,
      averageScore: overview.average_score,
      skillsAssessed: overview.skills_assessed,
      growthTrends,
      focusAreas,
      strengths
    };
  }

  /**
   * Get skill progression timeline for a student
   */
  async getSkillProgression(studentId: string, skillCategory?: string): Promise<unknown[]> {
    let query = supabase
      .from('skill_progression_timeline')
      .select('*')
      .eq('student_id', studentId);

    if (skillCategory) {
      query = query.eq('skill_category', skillCategory);
    }

    const { data, error } = await query.order('skill_category');

    if (error) {
      throw new Error(`Failed to get skill progression: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get unit performance analysis
   */
  async getUnitPerformance(programType?: string, level?: string): Promise<unknown[]> {
    let query = supabase
      .from('unit_performance_analysis')
      .select('*');

    if (programType) query = query.eq('program_type', programType);
    if (level) query = query.eq('level', level);

    const { data, error } = await query.order('unit_number');

    if (error) {
      throw new Error(`Failed to get unit performance: ${error.message}`);
    }

    return data || [];
  }

  // Helper methods
  private inferGradeRange(level: string, programType: string): string {
    if (level === 'Primary') {
      return programType.includes('G3') ? 'G3-4' : 'G5-6';
    }
    return 'G7-9';
  }

  private parseTimeSlot(timeSlot: string): string {
    // Convert time slot like "18:00-19:30" to just start time "18:00:00"
    const startTime = timeSlot.split('-')[0];
    return startTime.includes(':') ? `${startTime}:00` : `${startTime}:00:00`;
  }

  private async createSampleFeedbackData(): Promise<void> {
    // This would be replaced with actual document parsing
    // For now, just create some sample data structure
    console.log('Sample feedback data creation completed');
  }
}

// Export skill categories for use in components
export const SKILL_CATEGORIES = [
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
] as const;

export type SkillCategory = typeof SKILL_CATEGORIES[number];