import { NextResponse } from 'next/server';
import FeedbackParser from '@/lib/feedback-parser';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data');
    const primaryPath = path.join(dataPath, 'primary');
    const secondaryPath = path.join(dataPath, 'secondary');
    
    const debugInfo = {
      totalFiles: 0,
      processedFiles: 0,
      errors: [] as string[],
      rawStudentNames: [] as string[],
      cleanedStudentNames: [] as string[],
      filteredOutNames: [] as string[],
      sampleSections: [] as any[]
    };
    
    // Helper function to process files recursively
    const processDirectory = async (dirPath: string, feedbackType: 'primary' | 'secondary') => {
      if (!fs.existsSync(dirPath)) return;
      
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          await processDirectory(itemPath, feedbackType);
        } else if (item.endsWith('.docx')) {
          debugInfo.totalFiles++;
          
          try {
            // Read file content
            const result = await mammoth.extractRawText({path: itemPath});
            const content = result.value;
            
            // Check if it's an individual student file first
            const fileName = path.basename(itemPath, '.docx');
            const isIndividualFile = fileName.match(/^[A-Za-z\s]+ - (Unit )?[\d\.]+/i);
            
            if (isIndividualFile) {
              const match = fileName.match(/^([A-Za-z\s]+) - (Unit )?[\d\.]+/i);
              if (match) {
                const rawName = match[1].trim();
                debugInfo.rawStudentNames.push(rawName);
                debugInfo.cleanedStudentNames.push(rawName);
              }
            } else {
              // Parse consolidated file
              const delimiter = feedbackType === 'primary' ? 'Student:' : 'Student Name:';
              const sections = content.split(delimiter);
              
              // Skip first section (header)
              for (let i = 1; i < sections.length; i++) {
                const section = sections[i].trim();
                if (section.length === 0) continue;
                
                const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                if (lines.length === 0) continue;
                
                let rawStudentName = lines[0];
                debugInfo.rawStudentNames.push(rawStudentName);
                
                // Apply cleaning logic
                let cleanedName = rawStudentName;
                
                if (cleanedName) {
                  // Remove common prefixes and suffixes
                  cleanedName = cleanedName
                    .replace(/^(Student|Name|Student Name):\s*/i, '')
                    .replace(/[^\w\s\-]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                  
                  // Handle names with potential suffixes or extra text
                  const nameParts = cleanedName.split(/\s*[-–—]\s*/);
                  if (nameParts.length > 1) {
                    const firstPart = nameParts[0].trim();
                    if (firstPart.length > 1 && /^[A-Za-z\s]+$/.test(firstPart)) {
                      cleanedName = firstPart;
                    }
                  }
                  
                  // Remove any trailing text that doesn't look like a name
                  cleanedName = cleanedName.replace(/\s+(Unit|Feedback|Class|Topic|Motion).*$/i, '').trim();
                  
                  // Handle common name variations
                  if (cleanedName.toLowerCase() === 'selena' || cleanedName.toLowerCase() === 'selina') {
                    cleanedName = 'Selina';
                  }
                  if (cleanedName.toLowerCase() === 'selena ke' || cleanedName.toLowerCase() === 'selina ke') {
                    cleanedName = 'Selina Ke';
                  }
                }
                
                if (cleanedName && cleanedName.length >= 2) {
                  debugInfo.cleanedStudentNames.push(cleanedName);
                } else {
                  debugInfo.filteredOutNames.push(rawStudentName);
                }
                
                // Store some sample sections for debugging
                if (debugInfo.sampleSections.length < 10) {
                  debugInfo.sampleSections.push({
                    file: itemPath,
                    feedbackType,
                    rawName: rawStudentName,
                    cleanedName: cleanedName,
                    sectionPreview: section.substring(0, 200) + '...'
                  });
                }
              }
            }
            
            debugInfo.processedFiles++;
            
          } catch (error) {
            debugInfo.errors.push(`Error processing ${itemPath}: ${error}`);
          }
        }
      }
    };
    
    // Process both directories
    await processDirectory(primaryPath, 'primary');
    await processDirectory(secondaryPath, 'secondary');
    
    // Get unique names
    const uniqueRawNames = [...new Set(debugInfo.rawStudentNames)];
    const uniqueCleanedNames = [...new Set(debugInfo.cleanedStudentNames)];
    const uniqueFilteredNames = [...new Set(debugInfo.filteredOutNames)];
    
    return NextResponse.json({
      summary: {
        totalFiles: debugInfo.totalFiles,
        processedFiles: debugInfo.processedFiles,
        uniqueRawNames: uniqueRawNames.length,
        uniqueCleanedNames: uniqueCleanedNames.length,
        uniqueFilteredNames: uniqueFilteredNames.length,
        errors: debugInfo.errors.length
      },
      uniqueRawNames: uniqueRawNames.sort(),
      uniqueCleanedNames: uniqueCleanedNames.sort(),
      uniqueFilteredNames: uniqueFilteredNames.sort(),
      sampleSections: debugInfo.sampleSections,
      errors: debugInfo.errors
    });
    
  } catch (error) {
    console.error('Error in debug parsing:', error);
    return NextResponse.json(
      { error: 'Failed to debug parsing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}