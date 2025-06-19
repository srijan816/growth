import { supabase } from '@/lib/supabase';
import FeedbackParser, { StudentFeedback } from './feedback-parser';
import path from 'path';

export interface StoredStudentFeedback {
  id: string;
  student_name: string;
  class_code: string;
  class_name: string;
  unit_number: string;
  lesson_number?: string;
  topic?: string;
  motion?: string;
  feedback_type: 'primary' | 'secondary';
  content: string;
  best_aspects?: string;
  improvement_areas?: string;
  teacher_comments?: string;
  duration?: string;
  parsed_at: string;
}

export interface StudentSummary {
  student_name: string;
  total_feedback_sessions: number;
  earliest_unit: number;
  latest_unit: number;
  class_codes: string;
  class_names: string;
  feedback_types: string;
  last_updated: string;
}

export class FeedbackStorage {
  private parser: FeedbackParser;

  constructor() {
    const dataPath = path.join(process.cwd(), 'data');
    this.parser = new FeedbackParser(dataPath);
  }

  /**
   * Parse all feedback and store in database (one-time operation)
   */
  async parseAndStoreFeedback(): Promise<{
    success: boolean;
    totalProcessed: number;
    totalStudents: number;
    errors: string[];
  }> {
    console.log('Starting one-time feedback parsing and storage...');
    
    try {
      // Check if already parsed
      const { data: status } = await supabase
        .from('feedback_parsing_status')
        .select('*')
        .eq('is_complete', true)
        .single();

      if (status) {
        console.log('Feedback already parsed. Skipping...');
        return {
          success: true,
          totalProcessed: status.total_feedback_records,
          totalStudents: status.total_students,
          errors: status.parsing_errors || []
        };
      }

      // Create parsing status record
      const { data: statusRecord } = await supabase
        .from('feedback_parsing_status')
        .insert({
          parsing_started_at: new Date().toISOString(),
          is_complete: false
        })
        .select()
        .single();

      // Parse all feedback
      const result = await this.parser.parseAllFeedback();
      
      if (!result.success) {
        throw new Error('Parsing failed: ' + result.errors.join(', '));
      }

      console.log(`Parsed ${result.feedbacks.length} feedback records. Storing in database...`);

      // Process and store feedback in batches
      const batchSize = 50;
      let totalStored = 0;
      
      for (let i = 0; i < result.feedbacks.length; i += batchSize) {
        const batch = result.feedbacks.slice(i, i + batchSize);
        const processedBatch = this.processFeedbackBatch(batch);
        
        const { error } = await supabase
          .from('parsed_student_feedback')
          .insert(processedBatch);

        if (error) {
          console.error('Error storing batch:', error);
          result.errors.push(`Batch ${i}-${i + batchSize}: ${error.message}`);
        } else {
          totalStored += processedBatch.length;
          console.log(`Stored batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(result.feedbacks.length / batchSize)}`);
        }
      }

      // Get unique student count
      const uniqueStudents = new Set(result.feedbacks.map(f => f.studentName)).size;

      // Update parsing status
      await supabase
        .from('feedback_parsing_status')
        .update({
          total_files_processed: result.feedbacks.length,
          total_feedback_records: totalStored,
          total_students: uniqueStudents,
          parsing_completed_at: new Date().toISOString(),
          parsing_errors: result.errors,
          is_complete: true
        })
        .eq('id', statusRecord?.id);

      console.log(`Parsing complete! Stored ${totalStored} feedback records for ${uniqueStudents} students.`);

      return {
        success: true,
        totalProcessed: totalStored,
        totalStudents: uniqueStudents,
        errors: result.errors
      };

    } catch (error) {
      console.error('Error in parseAndStoreFeedback:', error);
      return {
        success: false,
        totalProcessed: 0,
        totalStudents: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Process feedback batch for database insertion
   */
  private processFeedbackBatch(feedbacks: StudentFeedback[]): any[] {
    return feedbacks.map(feedback => ({
      student_name: feedback.studentName,
      class_code: feedback.classCode,
      class_name: feedback.className,
      unit_number: feedback.unitNumber,
      lesson_number: feedback.lessonNumber,
      topic: feedback.topic,
      motion: feedback.motion,
      feedback_type: feedback.feedbackType,
      content: feedback.content,
      raw_content: feedback.rawContent,
      best_aspects: this.extractBestAspects(feedback.content),
      improvement_areas: this.extractImprovementAreas(feedback.content),
      teacher_comments: this.extractTeacherComments(feedback.content),
      duration: feedback.duration,
      file_path: feedback.filePath,
      parsed_at: feedback.extractedAt.toISOString()
    }));
  }

  /**
   * Extract best aspects from content
   */
  private extractBestAspects(content: string): string {
    if (content.includes('STRENGTHS:')) {
      const section = content.split('STRENGTHS:')[1]?.split('AREAS FOR IMPROVEMENT:')[0];
      return section?.trim() || '';
    }
    return '';
  }

  /**
   * Extract improvement areas from content
   */
  private extractImprovementAreas(content: string): string {
    if (content.includes('AREAS FOR IMPROVEMENT:')) {
      const section = content.split('AREAS FOR IMPROVEMENT:')[1]?.split('TEACHER COMMENTS:')[0];
      return section?.trim() || '';
    }
    return '';
  }

  /**
   * Extract teacher comments from content
   */
  private extractTeacherComments(content: string): string {
    if (content.includes('TEACHER COMMENTS:')) {
      const section = content.split('TEACHER COMMENTS:')[1];
      return section?.trim() || '';
    }
    return '';
  }

  /**
   * Get all students with feedback (from database)
   */
  async getStudentsWithFeedback(): Promise<StudentSummary[]> {
    const { data, error } = await supabase
      .from('student_feedback_summary')
      .select('*')
      .order('total_feedback_sessions', { ascending: false });

    if (error) {
      console.error('Error fetching student summary:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get chronological feedback for a specific student (from database)
   */
  async getStudentFeedback(studentName: string): Promise<StoredStudentFeedback[]> {
    const { data, error } = await supabase
      .rpc('get_student_chronological_feedback', { p_student_name: studentName });

    if (error) {
      console.error('Error fetching student feedback:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if feedback has been parsed and stored
   */
  async isDataReady(): Promise<boolean> {
    const { data } = await supabase
      .from('feedback_parsing_status')
      .select('is_complete')
      .eq('is_complete', true)
      .single();

    return !!data?.is_complete;
  }

  /**
   * Get parsing status
   */
  async getParsingStatus() {
    const { data } = await supabase
      .from('feedback_parsing_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  /**
   * Force re-parsing (clear existing data and re-parse)
   */
  async forceReparse(): Promise<any> {
    console.log('Forcing re-parse: clearing existing data...');
    
    // Clear existing data
    await supabase.from('parsed_student_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('feedback_parsing_status').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Re-parse
    return this.parseAndStoreFeedback();
  }
}

export default FeedbackStorage;