import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file') || '7.4.docx';
    
    // Look for the file in the data directory - expand search
    const possiblePaths = [
      `/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/data/primary/Friday - 6 - 7.5 - 02IPDEC2402 - PSD I/Unit 7/${fileName}`,
      `/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/data/secondary/Saturday - 3_00 - 4_30 -  01IPDED2404 - PSD I/Unit 7/${fileName}`,
      `/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/data/primary/Thursday - 6 - 7.5 - 02IPDEC2401 - PSD I/Unit 8/8.3.docx`,
      `/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/data/primary/Friday - 6 - 7.5 - 02IPDEC2402 - PSD I/Unit 8/${fileName}`,
      `/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/data/secondary/Saturday - 3_00 - 4_30 -  01IPDED2404 - PSD I/Unit 8/${fileName}`,
      `/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/data/primary/Friday - 6 - 7.5 - 02IPDEC2402 - PSD I/Unit 9/${fileName}`,
      `/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/data/secondary/Saturday - 3_00 - 4_30 -  01IPDED2404 - PSD I/Unit 9/${fileName}`
    ];
    
    let filePath = '';
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }
    
    if (!filePath) {
      return NextResponse.json({ 
        error: 'File not found', 
        searched_paths: possiblePaths 
      }, { status: 404 });
    }

    // Extract raw text
    const rawResult = await mammoth.extractRawText({ path: filePath });
    const rawText = rawResult.value;
    
    // Extract HTML to see formatting
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    const htmlText = htmlResult.value;
    
    // Analyze the content for motion extraction patterns
    const analysis = {
      file_path: filePath,
      raw_text_length: rawText.length,
      html_text_length: htmlText.length,
      
      // Look for key patterns
      patterns_found: {
        has_motion_prefix: rawText.toLowerCase().includes('motion:'),
        has_this_house: rawText.toLowerCase().includes('this house'),
        has_class_activity: rawText.toLowerCase().includes('class activity'),
        motion_prefix_positions: [] as number[],
        this_house_positions: [] as number[],
        class_activity_positions: [] as number[]
      },
      
      // Extract sections around motion
      motion_sections: [] as string[],
      
      // Show first 2000 characters
      raw_text_preview: rawText.substring(0, 2000),
      
      // Show HTML structure  
      html_preview: htmlText.substring(0, 1500)
    };
    
    // Find all occurrences of patterns
    let motionIndex = rawText.toLowerCase().indexOf('motion:');
    while (motionIndex !== -1) {
      analysis.patterns_found.motion_prefix_positions.push(motionIndex);
      // Extract the section around this motion
      const start = Math.max(0, motionIndex - 50);
      const end = Math.min(rawText.length, motionIndex + 200);
      analysis.motion_sections.push(rawText.substring(start, end));
      
      motionIndex = rawText.toLowerCase().indexOf('motion:', motionIndex + 1);
    }
    
    let houseIndex = rawText.toLowerCase().indexOf('this house');
    while (houseIndex !== -1 && analysis.patterns_found.this_house_positions.length < 5) {
      analysis.patterns_found.this_house_positions.push(houseIndex);
      houseIndex = rawText.toLowerCase().indexOf('this house', houseIndex + 1);
    }
    
    let activityIndex = rawText.toLowerCase().indexOf('class activity');
    while (activityIndex !== -1) {
      analysis.patterns_found.class_activity_positions.push(activityIndex);
      activityIndex = rawText.toLowerCase().indexOf('class activity', activityIndex + 1);
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error debugging docx file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug file', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}