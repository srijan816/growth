import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import FeedbackParser from '@/lib/feedback-parser';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('Starting motion extraction investigation...');

    // 1. Query database for records with different motion patterns
    const { data: allRecords, error: dbError } = await supabase
      .from('parsed_student_feedback')
      .select('id, student_name, unit_number, lesson_number, motion, raw_content, file_path, feedback_type')
      .order('unit_number');

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`Found ${allRecords?.length || 0} total records`);

    // Get unit distribution
    const unitDistribution = allRecords?.reduce((acc: Record<string, number>, r) => {
      const key = `${r.unit_number}${r.lesson_number ? ` (lesson: ${r.lesson_number})` : ''}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get motion patterns
    const motionPatterns = allRecords?.reduce((acc: Record<string, number>, r) => {
      if (r.motion) {
        const motionKey = r.motion.length > 50 ? r.motion.substring(0, 50) + '...' : r.motion;
        acc[motionKey] = (acc[motionKey] || 0) + 1;
      }
      return acc;
    }, {}) || {};

    // 2. Categorize records by motion type
    const classActivityRecords = allRecords?.filter(r => 
      r.motion === 'Class Activity' || 
      r.motion?.toLowerCase().includes('class activity')
    ) || [];

    const actualMotionRecords = allRecords?.filter(r => 
      r.motion && 
      r.motion !== 'Class Activity' && 
      !r.motion?.toLowerCase().includes('class activity') &&
      r.motion.length > 10 // Likely actual motions are longer
    ) || [];

    const noMotionRecords = allRecords?.filter(r => !r.motion) || [];

    // 3. Find specific examples (Unit 7.4 and 8.3) - also check lesson_number field
    const unit74Records = allRecords?.filter(r => 
      r.unit_number === '7.4' || 
      r.lesson_number === '7.4' ||
      r.unit_number === '7' ||
      (r.raw_content && r.raw_content.includes('7.4'))
    ) || [];
    const unit83Records = allRecords?.filter(r => 
      r.unit_number === '8.3' || 
      r.lesson_number === '8.3' ||
      r.unit_number === '8' ||
      (r.raw_content && r.raw_content.includes('8.3'))
    ) || [];

    // Search for "Class Activity" in raw content
    const classActivityInContent = allRecords?.filter(r => 
      r.raw_content && r.raw_content.toLowerCase().includes('class activity')
    ) || [];

    // 4. Analyze raw content patterns
    const analyzeContentPatterns = (records: any[], label: string) => {
      const samples = records.slice(0, 3).map(r => ({
        id: r.id,
        student_name: r.student_name,
        unit_number: r.unit_number,
        motion: r.motion,
        file_path: r.file_path,
        feedback_type: r.feedback_type,
        raw_content_preview: r.raw_content?.substring(0, 500) + '...',
        // Look for motion-related patterns in raw content
        motion_patterns_found: {
          has_this_house: r.raw_content?.toLowerCase().includes('this house'),
          has_motion_prefix: r.raw_content?.toLowerCase().includes('motion:'),
          has_that_we_should: r.raw_content?.toLowerCase().includes('that we should'),
          class_activity_mention: r.raw_content?.toLowerCase().includes('class activity'),
          raw_content_length: r.raw_content?.length || 0
        }
      }));
      
      return {
        label,
        count: records.length,
        samples
      };
    };

    // 5. Test motion extraction on sample files
    const parser = new FeedbackParser();
    let parsingAnalysis = {};

    try {
      // Try to re-parse some problematic files to see what happens
      const problematicFile = classActivityRecords.find(r => r.file_path);
      const goodFile = actualMotionRecords.find(r => r.file_path);

      if (problematicFile?.file_path) {
        console.log(`Testing motion extraction on problematic file: ${problematicFile.file_path}`);
        // We can't actually re-parse without access to the original files
        // But we can analyze the stored raw content
      }

      parsingAnalysis = {
        note: "Motion extraction analysis based on stored raw content",
        problematic_file_example: problematicFile ? {
          file_path: problematicFile.file_path,
          unit: problematicFile.unit_number,
          stored_motion: problematicFile.motion,
          raw_content_snippet: problematicFile.raw_content?.substring(0, 1000)
        } : null,
        good_file_example: goodFile ? {
          file_path: goodFile.file_path,
          unit: goodFile.unit_number,
          stored_motion: goodFile.motion,
          raw_content_snippet: goodFile.raw_content?.substring(0, 1000)
        } : null
      };

    } catch (parseError) {
      console.error('Error during parsing analysis:', parseError);
      parsingAnalysis = {
        error: `Parsing analysis failed: ${parseError}`
      };
    }

    // 6. Motion extraction logic analysis
    const motionExtractionAnalysis = {
      current_logic: {
        primary_feedback: "Looks for lines starting with 'motion:' in the content",
        secondary_feedback: "Extracts motion from content before 'Student spoke for' section, joins remaining lines after student name"
      },
      potential_issues: [
        "Secondary feedback motion extraction joins ALL lines after student name, which might include rubric headers or other content",
        "Motion cleaning only replaces 'This [Hh]ouse' casing but may not handle other formatting issues",
        "If motion spans multiple lines with formatting, it might include unwanted text",
        "Files with different structures (tables, headers) might confuse the extraction"
      ],
      extraction_points: [
        "Line 500-510: Secondary feedback motion extraction",
        "Line 522-523: Primary feedback motion extraction",
        "Line 509: Motion cleaning with 'This House' normalization"
      ]
    };

    // 7. Statistical summary
    const statistics = {
      total_records: allRecords?.length || 0,
      class_activity_records: classActivityRecords.length,
      actual_motion_records: actualMotionRecords.length,
      no_motion_records: noMotionRecords.length,
      unit_74_records: unit74Records.length,
      unit_83_records: unit83Records.length,
      feedback_type_breakdown: {
        primary_with_class_activity: classActivityRecords.filter(r => r.feedback_type === 'primary').length,
        secondary_with_class_activity: classActivityRecords.filter(r => r.feedback_type === 'secondary').length,
      }
    };

    const response = {
      timestamp: new Date().toISOString(),
      investigation_summary: {
        purpose: "Investigate why some units show 'Class Activity' instead of actual motion text",
        focus_units: ["7.4", "8.3"]
      },
      statistics,
      unit_distribution: unitDistribution,
      motion_patterns: motionPatterns,
      motion_extraction_analysis: motionExtractionAnalysis,
      content_pattern_analysis: {
        class_activity_records: analyzeContentPatterns(classActivityRecords, "Records with 'Class Activity'"),
        actual_motion_records: analyzeContentPatterns(actualMotionRecords, "Records with actual motions"),
        no_motion_records: analyzeContentPatterns(noMotionRecords, "Records with no motion")
      },
      specific_unit_analysis: {
        unit_74: {
          count: unit74Records.length,
          records: unit74Records.map(r => ({
            student_name: r.student_name,
            unit_number: r.unit_number,
            lesson_number: r.lesson_number,
            motion: r.motion,
            feedback_type: r.feedback_type,
            has_this_house_in_raw: r.raw_content?.toLowerCase().includes('this house'),
            raw_preview: r.raw_content?.substring(0, 300) + '...'
          }))
        },
        unit_83: {
          count: unit83Records.length,
          records: unit83Records.map(r => ({
            student_name: r.student_name,
            unit_number: r.unit_number,
            lesson_number: r.lesson_number,
            motion: r.motion,  
            feedback_type: r.feedback_type,
            has_this_house_in_raw: r.raw_content?.toLowerCase().includes('this house'),
            raw_preview: r.raw_content?.substring(0, 300) + '...'
          }))
        }
      },
      class_activity_in_content: {
        count: classActivityInContent.length,
        samples: classActivityInContent.slice(0, 5).map(r => ({
          student_name: r.student_name,
          unit_number: r.unit_number,
          motion: r.motion,
          feedback_type: r.feedback_type,
          class_activity_context: r.raw_content?.toLowerCase().split('class activity').slice(0, 2).join('...CLASS ACTIVITY...'),
          raw_preview: r.raw_content?.substring(0, 400) + '...'
        }))
      },
      parsing_analysis: parsingAnalysis,
      recommendations: [
        "Examine the raw content of 'Class Activity' records to identify the source pattern",
        "Check if motion text is being confused with section headers or rubric items",
        "Consider improving motion extraction for secondary feedback to better identify motion boundaries",
        "Add validation to reject obviously incorrect motions like 'Class Activity'",
        "Test with specific files that are known to have the issue"
      ]
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error in motion extraction investigation:', error);
    return NextResponse.json(
      { 
        error: 'Investigation failed', 
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}