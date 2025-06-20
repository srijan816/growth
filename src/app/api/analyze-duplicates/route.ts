import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client for comprehensive access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DuplicateGroup {
  student_name: string;
  class_code: string;
  unit_number: string;
  feedback_type: string;
  count: number;
  records: Array<{
    id: string;
    content: string;
    raw_content?: string;
    file_path?: string;
    parsed_at: string;
    content_length: number;
  }>;
}

interface ContentSimilarity {
  identical_content: number;
  identical_raw_content: number;
  identical_file_path: number;
  similar_content_length: number;
  truly_identical: number;
  similar_but_different: number;
}

interface DuplicateAnalysis {
  total_records: number;
  total_duplicate_groups: number;
  total_duplicate_records: number;
  sample_duplicates: DuplicateGroup[];
  content_similarity: ContentSimilarity;
  breakdown_by_class: Record<string, number>;
  breakdown_by_feedback_type: Record<string, number>;
  pattern_analysis: {
    multiple_file_processing: number;
    extraction_errors: number;
    truly_identical: number;
    file_path_patterns: Record<string, number>;
  };
}

function calculateContentSimilarity(groups: DuplicateGroup[]): ContentSimilarity {
  let identical_content = 0;
  let identical_raw_content = 0;
  let identical_file_path = 0;
  let similar_content_length = 0;
  let truly_identical = 0;
  let similar_but_different = 0;

  groups.forEach(group => {
    if (group.count > 1) {
      const records = group.records;
      
      // Check if all content is identical
      const contents = records.map(r => r.content?.trim() || '');
      const raw_contents = records.map(r => r.raw_content?.trim() || '');
      const file_paths = records.map(r => r.file_path || '');
      const content_lengths = records.map(r => r.content_length);

      const all_content_identical = contents.every(c => c === contents[0] && c.length > 0);
      const all_raw_content_identical = raw_contents.every(c => c === raw_contents[0] && c.length > 0);
      const all_file_paths_identical = file_paths.every(p => p === file_paths[0] && p.length > 0);
      const all_lengths_similar = content_lengths.every(l => Math.abs(l - content_lengths[0]) <= 10);

      if (all_content_identical) identical_content++;
      if (all_raw_content_identical) identical_raw_content++;
      if (all_file_paths_identical) identical_file_path++;
      if (all_lengths_similar) similar_content_length++;

      // Truly identical = same content, raw_content, and file_path
      if (all_content_identical && all_raw_content_identical && all_file_paths_identical) {
        truly_identical++;
      } else if (all_content_identical || all_raw_content_identical) {
        similar_but_different++;
      }
    }
  });

  return {
    identical_content,
    identical_raw_content,
    identical_file_path,
    similar_content_length,
    truly_identical,
    similar_but_different
  };
}

function analyzePatterns(groups: DuplicateGroup[]): DuplicateAnalysis['pattern_analysis'] {
  let multiple_file_processing = 0;
  let extraction_errors = 0;
  let truly_identical = 0;
  const file_path_patterns: Record<string, number> = {};

  groups.forEach(group => {
    if (group.count > 1) {
      const records = group.records;
      const file_paths = records.map(r => r.file_path || '');
      const unique_file_paths = [...new Set(file_paths.filter(p => p.length > 0))];
      
      // Count file path patterns
      file_paths.forEach(path => {
        if (path) {
          const dir = path.split('/').slice(0, -1).join('/');
          file_path_patterns[dir] = (file_path_patterns[dir] || 0) + 1;
        }
      });

      // Pattern analysis
      if (unique_file_paths.length > 1) {
        // Same student/unit/class but different files = multiple file processing
        multiple_file_processing++;
      } else if (unique_file_paths.length === 1) {
        // Same file but multiple records = extraction errors
        extraction_errors++;
      }

      // Check if truly identical (same content and metadata)
      const contents = records.map(r => r.content?.trim() || '');
      const raw_contents = records.map(r => r.raw_content?.trim() || '');
      if (contents.every(c => c === contents[0] && c.length > 0) &&
          raw_contents.every(c => c === raw_contents[0] && c.length > 0)) {
        truly_identical++;
      }
    }
  });

  return {
    multiple_file_processing,
    extraction_errors,
    truly_identical,
    file_path_patterns
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('Starting duplicate analysis...');

    // First, get total record count
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('parsed_student_feedback')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting total count:', countError);
      return NextResponse.json({ error: 'Failed to get total record count' }, { status: 500 });
    }

    console.log(`Total records in database: ${totalCount}`);

    // Find duplicate groups by identifying records with same student_name, class_code, unit_number, feedback_type
    const { data: allRecords, error: fetchError } = await supabaseAdmin
      .from('parsed_student_feedback')
      .select('id, student_name, class_code, unit_number, feedback_type, content, raw_content, file_path, parsed_at')
      .order('student_name, class_code, unit_number, feedback_type, parsed_at');

    if (fetchError) {
      console.error('Error fetching records:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
    }

    if (!allRecords || allRecords.length === 0) {
      return NextResponse.json({
        total_records: 0,
        total_duplicate_groups: 0,
        total_duplicate_records: 0,
        message: 'No records found in database'
      });
    }

    console.log(`Analyzing ${allRecords.length} records for duplicates...`);

    // Group records by duplicate key
    const groupMap = new Map<string, DuplicateGroup>();

    allRecords.forEach(record => {
      const key = `${record.student_name}|${record.class_code}|${record.unit_number}|${record.feedback_type}`;
      
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          student_name: record.student_name,
          class_code: record.class_code,
          unit_number: record.unit_number,
          feedback_type: record.feedback_type,
          count: 0,
          records: []
        });
      }

      const group = groupMap.get(key)!;
      group.count++;
      group.records.push({
        id: record.id,
        content: record.content || '',
        raw_content: record.raw_content || '',
        file_path: record.file_path || '',
        parsed_at: record.parsed_at,
        content_length: (record.content || '').length
      });
    });

    // Filter to only groups with duplicates (count > 1)
    const duplicateGroups = Array.from(groupMap.values()).filter(group => group.count > 1);
    
    console.log(`Found ${duplicateGroups.length} duplicate groups`);

    // Calculate total duplicate records
    const totalDuplicateRecords = duplicateGroups.reduce((sum, group) => sum + group.count, 0);

    // Get sample duplicates (top 10 by count, then by recency)
    const sampleDuplicates = duplicateGroups
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        // If same count, sort by most recent
        const aLatest = Math.max(...a.records.map(r => new Date(r.parsed_at).getTime()));
        const bLatest = Math.max(...b.records.map(r => new Date(r.parsed_at).getTime()));
        return bLatest - aLatest;
      })
      .slice(0, 10);

    // Calculate content similarity
    const contentSimilarity = calculateContentSimilarity(duplicateGroups);

    // Breakdown by class and feedback type
    const breakdownByClass: Record<string, number> = {};
    const breakdownByFeedbackType: Record<string, number> = {};

    duplicateGroups.forEach(group => {
      breakdownByClass[group.class_code] = (breakdownByClass[group.class_code] || 0) + 1;
      breakdownByFeedbackType[group.feedback_type] = (breakdownByFeedbackType[group.feedback_type] || 0) + 1;
    });

    // Pattern analysis
    const patternAnalysis = analyzePatterns(duplicateGroups);

    const analysis: DuplicateAnalysis = {
      total_records: totalCount || 0,
      total_duplicate_groups: duplicateGroups.length,
      total_duplicate_records: totalDuplicateRecords,
      sample_duplicates: sampleDuplicates,
      content_similarity: contentSimilarity,
      breakdown_by_class: breakdownByClass,
      breakdown_by_feedback_type: breakdownByFeedbackType,
      pattern_analysis: patternAnalysis
    };

    console.log('Duplicate analysis complete:', {
      totalRecords: analysis.total_records,
      duplicateGroups: analysis.total_duplicate_groups,
      duplicateRecords: analysis.total_duplicate_records,
      trulyIdentical: analysis.content_similarity.truly_identical
    });

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error in duplicate analysis:', error);
    return NextResponse.json({
      error: 'Failed to analyze duplicates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}