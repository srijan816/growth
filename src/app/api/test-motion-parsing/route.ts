import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    const testFiles = [
      '/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/data/primary/Friday - 6 - 7.5 - 02IPDEC2402 - PSD I/Unit 7/7.4.docx',
      '/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/data/primary/Thursday - 6 - 7.5 - 02IPDEC2401 - PSD I/Unit 8/8.3.docx'
    ];
    
    const results = [];
    
    for (const filePath of testFiles) {
      if (!fs.existsSync(filePath)) {
        results.push({
          file: path.basename(filePath),
          error: 'File not found'
        });
        continue;
      }
      
      // Read the document
      const rawResult = await mammoth.extractRawText({ path: filePath });
      const content = rawResult.value;
      
      // Simulate the parsing logic from feedback-parser.ts
      const sections = content.split('Student:');
      const parsedSections = [];
      
      // Process each student section (skip first which is header)
      for (let i = 1; i < sections.length; i++) {
        const section = sections[i].trim();
        if (!section) continue;
        
        const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length === 0) continue;
        
        // Extract student name (first line)
        const studentName = lines[0];
        
        // Extract motion using the new logic
        let motion = '';
        
        // Look for explicit "Motion:" prefix first
        for (const line of lines) {
          if (line.toLowerCase().startsWith('motion:')) {
            motion = line.substring(7).trim();
            break;
          }
        }
        
        // If no motion found with "Motion:" prefix, try to extract from structure
        if (!motion && lines.length >= 2) {
          for (let j = 1; j < Math.min(lines.length, 5); j++) {
            const line = lines[j].trim();
            
            // Skip empty lines and common headers
            if (!line || 
                line.toLowerCase().includes('my teacher') ||
                line.toLowerCase().includes('observations') ||
                line.toLowerCase().includes('feedback') ||
                line.toLowerCase().includes('best thing') ||
                line.toLowerCase().includes('improvement') ||
                line.match(/^\d+:\d+$/)) {
              continue;
            }
            
            // Check if this looks like a motion (starts with "That" or "This House")
            if (line.toLowerCase().startsWith('that ') || 
                line.toLowerCase().startsWith('this house')) {
              motion = line;
              break;
            }
            
            // If it's a substantial line that doesn't look like feedback content,
            // it might be the motion
            if (line.length > 10 && 
                !line.toLowerCase().includes('what was') &&
                !line.toLowerCase().includes('what part') &&
                !line.toLowerCase().includes('nice work') &&
                !line.toLowerCase().includes('good work')) {
              motion = line;
              break;
            }
          }
        }
        
        parsedSections.push({
          student_name: studentName,
          motion: motion,
          raw_lines_preview: lines.slice(0, 5)
        });
      }
      
      results.push({
        file: path.basename(filePath),
        full_path: filePath,
        sections_found: parsedSections.length,
        sections: parsedSections
      });
    }
    
    return NextResponse.json({
      test_purpose: "Test improved motion parsing logic on 7.4 and 8.3 files",
      results
    });

  } catch (error) {
    console.error('Error testing motion parsing:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test motion parsing', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}