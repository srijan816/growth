import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DuplicateRecord {
  id: string;
  student_name: string;
  class_code: string;
  unit_number: string;
  feedback_type: string;
  content: string;
  raw_content?: string;
  file_path?: string;
  parsed_at: string;
  content_length: number;
}

interface CleanupResult {
  total_groups_analyzed: number;
  true_duplicates_found: number;
  records_removed: number;
  different_sessions_preserved: number;
  cleanup_details: Array<{
    group_key: string;
    action: 'removed_duplicates' | 'preserved_different_sessions';
    reason: string;
    records_affected: number;
  }>;
}

function areContentsSimilar(content1: string, content2: string, threshold: number = 0.95): boolean {
  if (!content1 || !content2) return false;
  
  const clean1 = content1.trim().toLowerCase();
  const clean2 = content2.trim().toLowerCase();
  
  // If contents are identical
  if (clean1 === clean2) return true;
  
  // If length difference is significant, they're probably different sessions
  const lengthRatio = Math.min(clean1.length, clean2.length) / Math.max(clean1.length, clean2.length);
  if (lengthRatio < threshold) return false;
  
  // Simple similarity check - count common words
  const words1 = new Set(clean1.split(/\s+/));
  const words2 = new Set(clean2.split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  const similarity = intersection.size / union.size;
  return similarity >= threshold;
}

function areTrueDuplicates(records: DuplicateRecord[]): boolean {
  if (records.length <= 1) return false;
  
  // Check if all records have identical content AND raw_content
  const firstRecord = records[0];
  
  return records.every(record => {
    const contentMatch = areContentsSimilar(record.content, firstRecord.content, 0.98);
    const rawContentMatch = areContentsSimilar(record.raw_content || '', firstRecord.raw_content || '', 0.98);
    
    // If content is nearly identical AND raw content is nearly identical, it's likely a true duplicate
    return contentMatch && rawContentMatch;
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting duplicate cleanup process...');
    
    const body = await request.json();
    const dryRun = body.dryRun !== false; // Default to dry run unless explicitly set to false
    
    // Get all records and group by potential duplicate key
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
        message: 'No records found in database'
      });
    }

    console.log(`Analyzing ${allRecords.length} records for cleanup...`);

    // Group records by potential duplicate key
    const groupMap = new Map<string, DuplicateRecord[]>();

    allRecords.forEach(record => {
      const key = `${record.student_name}|${record.class_code}|${record.unit_number}|${record.feedback_type}`;
      
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }

      groupMap.get(key)!.push({
        id: record.id,
        student_name: record.student_name,
        class_code: record.class_code,
        unit_number: record.unit_number,
        feedback_type: record.feedback_type,
        content: record.content || '',
        raw_content: record.raw_content || '',
        file_path: record.file_path || '',
        parsed_at: record.parsed_at,
        content_length: (record.content || '').length
      });
    });

    // Analyze each group for true duplicates
    const duplicateGroups = Array.from(groupMap.entries()).filter(([key, records]) => records.length > 1);
    
    const cleanupResult: CleanupResult = {
      total_groups_analyzed: duplicateGroups.length,
      true_duplicates_found: 0,
      records_removed: 0,
      different_sessions_preserved: 0,
      cleanup_details: []
    };

    for (const [groupKey, records] of duplicateGroups) {
      const isTrueDuplicate = areTrueDuplicates(records);
      
      if (isTrueDuplicate) {
        // Keep the most recent record, remove the rest
        const sortedRecords = records.sort((a, b) => 
          new Date(b.parsed_at).getTime() - new Date(a.parsed_at).getTime()
        );
        
        const recordsToRemove = sortedRecords.slice(1); // Remove all but the first (most recent)
        
        cleanupResult.true_duplicates_found++;
        cleanupResult.records_removed += recordsToRemove.length;
        
        cleanupResult.cleanup_details.push({
          group_key: groupKey,
          action: 'removed_duplicates',
          reason: `Identical content detected - kept most recent record (${sortedRecords[0].parsed_at})`,
          records_affected: recordsToRemove.length
        });

        // Actually remove the duplicates if not in dry run mode
        if (!dryRun && recordsToRemove.length > 0) {
          const idsToRemove = recordsToRemove.map(r => r.id);
          
          const { error: deleteError } = await supabaseAdmin
            .from('parsed_student_feedback')
            .delete()
            .in('id', idsToRemove);
          
          if (deleteError) {
            console.error(`Error removing duplicates for group ${groupKey}:`, deleteError);
            cleanupResult.cleanup_details[cleanupResult.cleanup_details.length - 1].reason += 
              ` (DELETE FAILED: ${deleteError.message})`;
          } else {
            console.log(`Removed ${recordsToRemove.length} duplicate records for group: ${groupKey}`);
          }
        }
        
      } else {
        // Different sessions - preserve all records
        cleanupResult.different_sessions_preserved += records.length;
        
        const filePaths = [...new Set(records.map(r => r.file_path).filter(p => p))];
        const contentLengths = records.map(r => r.content_length);
        const dateRange = {
          earliest: new Date(Math.min(...records.map(r => new Date(r.parsed_at).getTime()))).toISOString().split('T')[0],
          latest: new Date(Math.max(...records.map(r => new Date(r.parsed_at).getTime()))).toISOString().split('T')[0]
        };
        
        cleanupResult.cleanup_details.push({
          group_key: groupKey,
          action: 'preserved_different_sessions',
          reason: `Different sessions detected - content lengths: [${contentLengths.join(', ')}], date range: ${dateRange.earliest} to ${dateRange.latest}, files: ${filePaths.length}`,
          records_affected: 0
        });
      }
    }

    const response = {
      mode: dryRun ? 'DRY_RUN' : 'ACTUAL_CLEANUP',
      cleanup_result: cleanupResult,
      summary: {
        total_records_analyzed: allRecords.length,
        groups_with_multiple_records: duplicateGroups.length,
        true_duplicate_groups: cleanupResult.true_duplicates_found,
        different_session_groups: duplicateGroups.length - cleanupResult.true_duplicates_found,
        records_that_would_be_removed: cleanupResult.records_removed,
        records_preserved: allRecords.length - cleanupResult.records_removed
      }
    };

    console.log('Duplicate cleanup analysis complete:', response.summary);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in duplicate cleanup:', error);
    return NextResponse.json({
      error: 'Failed to cleanup duplicates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}