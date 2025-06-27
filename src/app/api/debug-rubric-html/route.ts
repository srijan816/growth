import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/postgres';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get HTML content for a specific student record
    const result = await executeQuery(`
      SELECT 
        student_name,
        html_content,
        rubric_scores
      FROM parsed_student_feedback 
      WHERE html_content IS NOT NULL 
      AND student_name = 'Aaron'
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No HTML content found' });
    }

    const record = result.rows[0];
    const htmlContent = record.html_content;

    // Test rubric extraction manually
    const rubricItems = [
      'Student spoke for the duration of the specified time frame',
      'Student offered and/or accepted a point of information',
      'Student spoke in a stylistic and persuasive manner',
      'Student\'s argument is complete',
      'Student argument reflects application of theory',
      'Student\'s rebuttal is effective',
      'Student ably supported teammate',
      'Student applied feedback from previous debate'
    ];

    const extractedScores: { [key: string]: number } = {};
    const debugInfo: any = {};

    rubricItems.forEach((item, index) => {
      const itemKey = `rubric_${index + 1}`;
      
      // Look for the exact rubric text in HTML
      const itemStart = item.substring(0, 30);
      const itemRegex = new RegExp(`${itemStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?:<p>5</p>|<strong>5</strong>)`, 'i');
      const itemMatch = htmlContent.match(itemRegex);
      
      debugInfo[itemKey] = {
        searchText: itemStart,
        found: !!itemMatch,
        matchedText: itemMatch ? itemMatch[0].substring(0, 200) : null
      };

      if (itemMatch) {
        const itemText = itemMatch[0];
        
        // Look for bold scores in this section
        const boldScoreRegex = /<(?:strong|b)[^>]*>([1-5])<\/(?:strong|b)>/g;
        const boldMatches = [...itemText.matchAll(boldScoreRegex)];
        
        debugInfo[itemKey].boldMatches = boldMatches.map(m => m[1]);
        
        if (boldMatches.length > 0) {
          const boldScores = boldMatches.map(match => parseInt(match[1]));
          extractedScores[itemKey] = Math.max(...boldScores);
        }
      }
    });

    return NextResponse.json({
      student: record.student_name,
      existingRubricScores: record.rubric_scores,
      extractedScores,
      debugInfo,
      htmlSample: htmlContent.substring(0, 1500),
      totalHtmlLength: htmlContent.length
    });

  } catch (error) {
    console.error('Error in debug rubric HTML:', error);
    return NextResponse.json({ 
      error: 'Failed to debug rubric HTML',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}