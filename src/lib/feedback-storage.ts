import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import FeedbackParser, { StudentFeedback } from './feedback-parser';
import { InstructorPermissions, filterFeedbackByPermissions } from './instructor-permissions';
import path from 'path';

// Admin client for table creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  raw_content?: string;
  html_content?: string;
  best_aspects?: string;
  improvement_areas?: string;
  teacher_comments?: string;
  duration?: string;
  parsed_at: string;
  unique_id?: string;
  instructor?: string;
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
    const dataPath = path.join(process.cwd(), 'data', 'Overall');
    this.parser = new FeedbackParser(dataPath);
  }

  /**
   * Create tables if they don't exist
   */
  private async ensureTablesExist(): Promise<void> {
    console.log('Ensuring database tables exist...');
    
    try {
      // Try a simple query to check if table exists
      const { error: testError } = await supabaseAdmin
        .from('parsed_student_feedback')
        .select('id')
        .limit(1);

      if (testError && testError.message && testError.message.includes('does not exist')) {
        console.log('Tables do not exist, creating them...');
        await this.createTables();
      } else if (testError) {
        console.log('Table check error (but table might exist):', testError.message);
        // Attempt to create tables anyway
        await this.createTables();
      } else {
        console.log('✓ Tables already exist');
      }
    } catch (error) {
      console.log('Error checking table existence, attempting to create...', error);
      await this.createTables();
    }
  }

  /**
   * Create the required database tables by inserting test records
   */
  private async createTables(): Promise<void> {
    console.log('Creating database tables by test insertion...');
    
    try {
      // Create main table by attempting to insert a test record
      console.log('Creating parsed_student_feedback table...');
      const testFeedback = {
        student_name: '__table_creation_test__',
        class_code: 'TEST',
        class_name: 'Test Class',
        unit_number: '0.0',
        content: 'Test content for table creation',
        raw_content: 'Test raw content',
        feedback_type: 'primary' as const,
        file_path: '/test/creation'
      };

      const { error: feedbackTableError } = await supabaseAdmin
        .from('parsed_student_feedback')
        .insert([testFeedback]);

      if (feedbackTableError) {
        console.log('Feedback table creation status:', feedbackTableError.message || 'Created');
      } else {
        console.log('✓ Feedback table exists, cleaning up test record');
        await supabaseAdmin
          .from('parsed_student_feedback')
          .delete()
          .eq('student_name', '__table_creation_test__');
      }

      // Create status table by attempting to insert a test record
      console.log('Creating feedback_parsing_status table...');
      const testStatus = {
        total_files_processed: -1,
        total_feedback_records: -1,
        total_students: -1,
        is_complete: false
      };

      const { error: statusTableError } = await supabaseAdmin
        .from('feedback_parsing_status')
        .insert([testStatus]);

      if (statusTableError) {
        console.log('Status table creation status:', statusTableError.message || 'Created');
      } else {
        console.log('✓ Status table exists, cleaning up test record');
        await supabaseAdmin
          .from('feedback_parsing_status')
          .delete()
          .eq('total_files_processed', -1);
      }

      console.log('✓ Table creation process completed');

    } catch (error) {
      console.error('Error in createTables:', error);
    }
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
      // Ensure tables exist first
      await this.ensureTablesExist();
      
      // Check if already parsed
      const { data: status } = await supabaseAdmin
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
      const { data: statusRecord } = await supabaseAdmin
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

      // First, try to insert a single test record to ensure table exists
      console.log('Creating table with test record...');
      const testRecord = {
        student_name: 'test_record_for_table_creation',
        class_code: 'TEST',
        class_name: 'Test Class',
        unit_number: '0.0',
        content: 'Test content for table creation',
        raw_content: 'Test raw content',
        feedback_type: 'primary' as const,
        file_path: '/test/path'
      };

      const { error: testError } = await supabaseAdmin
        .from('parsed_student_feedback')
        .insert([testRecord]);

      if (testError) {
        console.log('Test insert result (may create table):', testError.message || 'No message');
      } else {
        console.log('✓ Table exists, cleaning up test record');
        await supabaseAdmin
          .from('parsed_student_feedback')
          .delete()
          .eq('student_name', 'test_record_for_table_creation');
      }

      // Process and store feedback in batches - use smaller batches and better error handling
      const batchSize = 25; // Smaller batch size to reduce errors
      let totalStored = 0;
      const totalBatches = Math.ceil(result.feedbacks.length / batchSize);
      
      for (let i = 0; i < result.feedbacks.length; i += batchSize) {
        const batch = result.feedbacks.slice(i, i + batchSize);
        const processedBatch = this.processFeedbackBatch(batch);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        try {
          // First try to insert the entire batch
          const { data, error } = await supabaseAdmin
            .from('parsed_student_feedback')
            .insert(processedBatch);

          if (error) {
            console.error(`Batch ${batchNumber}/${totalBatches} failed, trying individual inserts:`, error.message);
            
            // If batch fails, try storing one record at a time
            for (let j = 0; j < processedBatch.length; j++) {
              try {
                const record = processedBatch[j];
                
                // Clean up any potential issues with the record
                const cleanRecord = {
                  ...record,
                  student_name: record.student_name || 'Unknown',
                  class_code: record.class_code || '',
                  class_name: record.class_name || '',
                  unit_number: record.unit_number || '1',
                  content: record.content || '',
                  feedback_type: record.feedback_type || 'primary',
                  file_path: record.file_path || '',
                  parsed_at: record.parsed_at || new Date().toISOString()
                };
                
                const { error: singleError } = await supabaseAdmin
                  .from('parsed_student_feedback')
                  .insert([cleanRecord]);
                
                if (singleError) {
                  console.error(`Individual record failed for ${record.student_name}:`, singleError.message);
                  result.errors.push(`Failed to store record for ${record.student_name}: ${singleError.message}`);
                } else {
                  totalStored += 1;
                }
              } catch (recordError) {
                console.error(`Exception storing individual record:`, recordError);
                result.errors.push(`Exception storing record: ${recordError}`);
              }
            }
          } else {
            totalStored += processedBatch.length;
            console.log(`✓ Stored batch ${batchNumber}/${totalBatches} (${processedBatch.length} records) - Total: ${totalStored}/${result.feedbacks.length}`);
          }
        } catch (insertError) {
          console.error(`Exception during batch ${batchNumber} insert:`, insertError);
          result.errors.push(`Batch ${batchNumber}: Exception - ${insertError}`);
          
          // Still try individual inserts even on exception
          for (let j = 0; j < processedBatch.length; j++) {
            try {
              const record = processedBatch[j];
              const cleanRecord = {
                ...record,
                student_name: record.student_name || 'Unknown',
                class_code: record.class_code || '',
                class_name: record.class_name || '',
                unit_number: record.unit_number || '1',
                content: record.content || '',
                feedback_type: record.feedback_type || 'primary',
                file_path: record.file_path || '',
                parsed_at: record.parsed_at || new Date().toISOString()
              };
              
              const { error: singleError } = await supabaseAdmin
                .from('parsed_student_feedback')
                .insert([cleanRecord]);
              
              if (!singleError) {
                totalStored += 1;
              }
            } catch (e) {
              // Silent fail for individual records during exception recovery
            }
          }
        }
      }

      // Get unique student count
      const uniqueStudents = new Set(result.feedbacks.map(f => f.studentName)).size;

      // Update parsing status
      await supabaseAdmin
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
      html_content: feedback.htmlContent,
      best_aspects: this.extractBestAspects(feedback.content),
      improvement_areas: this.extractImprovementAreas(feedback.content),
      teacher_comments: this.extractTeacherComments(feedback.content),
      rubric_scores: feedback.feedbackType === 'secondary' ? this.extractRubricScores(feedback.rawContent) : null,
      duration: feedback.duration,
      file_path: feedback.filePath,
      parsed_at: feedback.extractedAt.toISOString(),
      unique_id: feedback.uniqueId,
      instructor: feedback.instructor
    }));
  }

  /**
   * Extract rubric scores from secondary feedback
   */
  private extractRubricScores(rawContent: string): any {
    const scores: any = {};
    
    // Categories to look for in secondary feedback
    const categories = [
      'Student spoke for the duration of the specified time frame',
      'Student offered and/or accepted a point of information relevant to the topic',
      'Student spoke in a stylistic and persuasive manner',
      'Student\'s argument is complete in that it has relevant Claims, supported by sufficient Evidence/Warrants, Impacts, and Synthesis',
      'Student argument reflects application of theory taught during class time',
      'Student\'s rebuttal is effective, and directly responds to an opponent\'s arguments',
      'Student ably supported teammate\'s case and arguments',
      'Student applied feedback from previous debate(s)'
    ];

    categories.forEach((category, index) => {
      // Look for the category followed by scoring numbers
      const categoryRegex = new RegExp(category + '[\\s\\S]*?N/A[\\s\\S]*?1[\\s\\S]*?2[\\s\\S]*?3[\\s\\S]*?4[\\s\\S]*?5', 'i');
      const match = rawContent.match(categoryRegex);
      
      if (match) {
        // For now, we'll extract the scores manually - in a real implementation
        // you'd need to identify which number is bolded
        // This is a placeholder - the actual score extraction would need 
        // to parse the Word document formatting to find bolded numbers
        scores[`category_${index + 1}`] = null; // Will be filled when we have bold detection
      }
    });

    return Object.keys(scores).length > 0 ? scores : null;
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
    try {
      // Query the actual table and aggregate data (with pagination to get all records)
      let allData: any[] = [];
      let hasMore = true;
      let offset = 0;
      const pageSize = 1000;
      
      while (hasMore) {
        const { data: pageData, error } = await supabaseAdmin
          .from('parsed_student_feedback')
          .select('student_name, class_code, class_name, unit_number, feedback_type, parsed_at')
          .range(offset, offset + pageSize - 1)
          .order('parsed_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching student feedback page:', error);
          return [];
        }
        
        if (pageData && pageData.length > 0) {
          allData = allData.concat(pageData);
          offset += pageSize;
          hasMore = pageData.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      const data = allData;

      if (!data || data.length === 0) {
        console.log('No feedback data found in database');
        return [];
      }

      // Group by student and create summary
      const studentMap = new Map();
      
      data.forEach(record => {
        const key = record.student_name;
        if (!studentMap.has(key)) {
          studentMap.set(key, {
            student_name: record.student_name,
            total_feedback_sessions: 0,
            earliest_unit: 999,
            latest_unit: 0,
            class_codes: new Set(),
            class_names: new Set(),
            feedback_types: new Set(),
            last_updated: record.parsed_at
          });
        }
        
        const student = studentMap.get(key);
        student.total_feedback_sessions++;
        student.class_codes.add(record.class_code);
        student.class_names.add(record.class_name);
        student.feedback_types.add(record.feedback_type);
        
        // Parse unit number for sorting
        const unitNum = parseFloat(record.unit_number || '0');
        if (unitNum > 0) {
          student.earliest_unit = Math.min(student.earliest_unit, unitNum);
          student.latest_unit = Math.max(student.latest_unit, unitNum);
        }
        
        if (record.parsed_at > student.last_updated) {
          student.last_updated = record.parsed_at;
        }
      });

      // Convert to expected format
      const students: StudentSummary[] = Array.from(studentMap.values()).map(student => ({
        student_name: student.student_name,
        total_feedback_sessions: student.total_feedback_sessions,
        earliest_unit: student.earliest_unit === 999 ? 0 : student.earliest_unit,
        latest_unit: student.latest_unit,
        class_codes: Array.from(student.class_codes).join(', '),
        class_names: Array.from(student.class_names).join(', '),
        feedback_types: Array.from(student.feedback_types).join(', '),
        last_updated: student.last_updated
      }));

      console.log(`Found ${students.length} students with feedback`);
      return students.sort((a, b) => b.total_feedback_sessions - a.total_feedback_sessions);

    } catch (error) {
      console.error('Error in getStudentsWithFeedback:', error);
      return [];
    }
  }

  /**
   * Get chronological feedback for a specific student (from database)
   */
  async getStudentFeedback(studentName: string, feedbackType?: 'primary' | 'secondary', classCode?: string): Promise<StoredStudentFeedback[]> {
    try {
      // Handle name variations for Selena/Selina
      const searchNames = [];
      if (studentName.toLowerCase() === 'selena' || studentName.toLowerCase() === 'selina') {
        searchNames.push('Selena', 'Selina', 'Selena Ke', 'Selina Ke');
      } else {
        searchNames.push(studentName);
      }
      
      let query = supabaseAdmin
        .from('parsed_student_feedback')
        .select('*');
      
      // Add name filter with variations
      if (searchNames.length > 1) {
        query = query.or(searchNames.map(name => `student_name.ilike.%${name}%`).join(','));
      } else {
        query = query.ilike('student_name', `%${searchNames[0]}%`);
      }
      
      // Add feedback type filter if specified
      if (feedbackType) {
        query = query.eq('feedback_type', feedbackType);
      }
      
      // Add class code filter if specified
      if (classCode) {
        query = query.eq('class_code', classCode);
      }
      
      query = query.limit(10000).order('unit_number');
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching student feedback:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log(`No feedback found for student: ${studentName} (type: ${feedbackType || 'all'}, class: ${classCode || 'all'})`);
        return [];
      }

      // Sort chronologically by unit number (handle both "1.1" and "1" formats)
      const sortedData = data.sort((a, b) => {
        const aUnit = parseFloat(a.unit_number || '0');
        const bUnit = parseFloat(b.unit_number || '0');
        if (aUnit !== bUnit) return aUnit - bUnit;
        
        // If same unit, sort by parsed_at
        return new Date(a.parsed_at).getTime() - new Date(b.parsed_at).getTime();
      });

      console.log(`Found ${sortedData.length} feedback records for ${studentName} (${feedbackType || 'all'} type)`);
      return sortedData;

    } catch (error) {
      console.error('Error in getStudentFeedback:', error);
      return [];
    }
  }

  /**
   * Check if feedback has been parsed and stored
   */
  async isDataReady(): Promise<boolean> {
    const { data } = await supabaseAdmin
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
    const { data } = await supabaseAdmin
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
    await supabaseAdmin.from('parsed_student_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('feedback_parsing_status').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Re-parse
    return this.parseAndStoreFeedback();
  }

  /**
   * Force re-parsing with instructor permissions
   */
  async forceReparseWithPermissions(permissions: InstructorPermissions): Promise<any> {
    console.log(`Forcing re-parse with permissions for ${permissions.instructorName}...`);
    
    if (permissions.canAccessAllData) {
      console.log('Test instructor - processing ALL feedback from all instructors');
      // Clear existing data
      await supabaseAdmin.from('parsed_student_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('feedback_parsing_status').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Re-parse everything
      return this.parseAndStoreFeedback();
    } else {
      console.log(`Regular instructor (${permissions.instructorName}) - processing only their feedback`);
      
      // Clear only their existing data
      for (const allowedInstructor of permissions.allowedInstructors) {
        await supabaseAdmin
          .from('parsed_student_feedback')
          .delete()
          .eq('instructor', allowedInstructor);
      }
      
      // Parse and filter for their data only
      return this.parseAndStoreFeedbackForInstructor(permissions);
    }
  }

  /**
   * Parse and store feedback for specific instructor
   */
  private async parseAndStoreFeedbackForInstructor(permissions: InstructorPermissions): Promise<any> {
    console.log('Starting instructor-specific parsing...');
    
    const result = {
      success: false,
      totalProcessed: 0,
      totalStudents: 0,
      errors: [] as string[]
    };

    try {
      // Parse all feedback first
      const parseResult = await this.parser.parseAllFeedback();
      
      if (!parseResult.success) {
        result.errors.push(...parseResult.errors);
        return result;
      }

      console.log(`Parsed ${parseResult.feedbacks.length} total feedback records`);
      
      // Filter feedback by instructor permissions
      const filteredFeedback = filterFeedbackByPermissions(parseResult.feedbacks, permissions);
      console.log(`Filtered to ${filteredFeedback.length} feedback records for ${permissions.instructorName}`);

      if (filteredFeedback.length === 0) {
        console.log('No feedback found for this instructor');
        result.success = true;
        return result;
      }

      // Process and store the filtered feedback
      const batchSize = 25;
      let totalStored = 0;
      
      for (let i = 0; i < filteredFeedback.length; i += batchSize) {
        const batch = filteredFeedback.slice(i, i + batchSize);
        const processedBatch = this.processFeedbackBatch(batch);
        
        try {
          const { error } = await supabaseAdmin
            .from('parsed_student_feedback')
            .insert(processedBatch);

          if (error) {
            console.error(`Batch failed:`, error.message);
            result.errors.push(`Batch error: ${error.message}`);
          } else {
            totalStored += processedBatch.length;
            console.log(`✓ Stored batch (${processedBatch.length} records) - Total: ${totalStored}`);
          }
        } catch (insertError) {
          console.error(`Exception during batch insert:`, insertError);
          result.errors.push(`Batch exception: ${insertError}`);
        }
      }

      // Count unique students
      const uniqueStudents = new Set(filteredFeedback.map(f => f.studentName)).size;

      // Update parsing status
      await supabaseAdmin
        .from('feedback_parsing_status')
        .insert([{
          total_records: filteredFeedback.length,
          processed_records: totalStored,
          unique_students: uniqueStudents,
          is_complete: true,
          instructor_filter: permissions.instructorName
        }]);

      result.success = true;
      result.totalProcessed = totalStored;
      result.totalStudents = uniqueStudents;

      console.log(`✅ Instructor-specific parsing complete: ${totalStored} records for ${uniqueStudents} students`);

    } catch (error) {
      console.error('Error in parseAndStoreFeedbackForInstructor:', error);
      result.errors.push(`Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}

export default FeedbackStorage;