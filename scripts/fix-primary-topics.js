const { Pool } = require('pg');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://tikaram@localhost:5432/growth_compass'
});

// Improved topic extraction
async function extractTopicFromFile(filePath, studentFirstName) {
  try {
    const textResult = await mammoth.extractRawText({ path: filePath });
    const text = textResult.value;
    
    const topics = [];
    
    // Find all occurrences of "Student: FirstName"
    const regex = new RegExp(`Student:\\s*${studentFirstName}\\b`, 'gi');
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const startIdx = match.index;
      const nextStudent = text.substring(startIdx + 20).search(/Student:/i);
      const endIdx = nextStudent > 0 ? startIdx + 20 + nextStudent : Math.min(startIdx + 1500, text.length);
      
      const studentSection = text.substring(startIdx, endIdx);
      
      // Extract topic using multiple strategies
      let topic = null;
      
      // Strategy 1: Look for explicit "Topic:" label
      const topicMatch = studentSection.match(/Topic:\s*([^\n]+)/i);
      if (topicMatch && topicMatch[1].trim()) {
        topic = topicMatch[1].trim();
      }
      
      // Strategy 2: If no "Topic:" label, check the line after student name
      if (!topic) {
        const lines = studentSection.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length > 1) {
          // The second line (after "Student: Name") is often the topic
          const potentialTopic = lines[1];
          
          // Check if it's likely a topic (not a heading or feedback)
          if (potentialTopic.length > 10 && 
              !potentialTopic.includes('Teacher') &&
              !potentialTopic.includes('Feedback') &&
              !potentialTopic.includes('Observations') &&
              !potentialTopic.includes('What') &&
              !potentialTopic.includes('Speaking time') &&
              potentialTopic.split(' ').length > 3) {  // Topics usually have multiple words
            topic = potentialTopic;
          }
        }
      }
      
      // Strategy 3: Look for motion/debate topic patterns
      if (!topic) {
        const motionPatterns = [
          /Motion:\s*([^\n]+)/i,
          /That\s+[^\n]+/i,  // Many debate topics start with "That"
          /This house\s+[^\n]+/i  // Common debate format
        ];
        
        for (const pattern of motionPatterns) {
          const motionMatch = studentSection.match(pattern);
          if (motionMatch) {
            topic = motionMatch[0].replace(/Motion:\s*/i, '').trim();
            break;
          }
        }
      }
      
      topics.push(topic);
    }
    
    return topics;
    
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return [];
  }
}

// Main function to fix missing topics
async function fixPrimaryTopics() {
  try {
    console.log('Fixing missing topics for primary students...\n');
    
    // Get entries missing topics
    const missingQuery = `
      SELECT 
        id,
        student_name,
        file_path,
        unit_number,
        lesson_number
      FROM parsed_student_feedback
      WHERE feedback_type = 'primary'
      AND instructor = 'Srijan'
      AND (topic IS NULL OR topic = '')
      ORDER BY student_name, CAST(unit_number AS INT), CAST(lesson_number AS INT)
    `;
    
    const missingResult = await pool.query(missingQuery);
    console.log(`Found ${missingResult.rows.length} entries missing topics\n`);
    
    // Group by file path to process each file once
    const fileGroups = {};
    missingResult.rows.forEach(row => {
      if (!fileGroups[row.file_path]) {
        fileGroups[row.file_path] = [];
      }
      fileGroups[row.file_path].push(row);
    });
    
    console.log(`Processing ${Object.keys(fileGroups).length} unique files...\n`);
    
    let totalFixed = 0;
    let filesProcessed = 0;
    
    // Process each file
    for (const [filePath, entries] of Object.entries(fileGroups)) {
      filesProcessed++;
      
      if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${path.basename(filePath)}`);
        continue;
      }
      
      console.log(`\nProcessing ${path.basename(filePath)} (${entries.length} entries):`);
      
      // Group entries by student name
      const studentGroups = {};
      entries.forEach(entry => {
        const firstName = entry.student_name.split(' ')[0];
        if (!studentGroups[firstName]) {
          studentGroups[firstName] = [];
        }
        studentGroups[firstName].push(entry);
      });
      
      // Extract topics for each student
      for (const [firstName, studentEntries] of Object.entries(studentGroups)) {
        const topics = await extractTopicFromFile(filePath, firstName);
        
        if (topics.length > 0) {
          // Update database entries
          for (let i = 0; i < studentEntries.length && i < topics.length; i++) {
            if (topics[i]) {
              const updateQuery = `
                UPDATE parsed_student_feedback
                SET topic = $1, motion = $1
                WHERE id = $2
              `;
              
              try {
                await pool.query(updateQuery, [topics[i], studentEntries[i].id]);
                console.log(`  ✅ ${firstName}: "${topics[i].substring(0, 50)}..."`);
                totalFixed++;
              } catch (err) {
                console.error(`  ❌ Error updating ${firstName}: ${err.message}`);
              }
            }
          }
        } else {
          console.log(`  ⚠️  No topic found for ${firstName}`);
        }
      }
      
      // Progress indicator
      if (filesProcessed % 10 === 0) {
        console.log(`\nProgress: ${filesProcessed}/${Object.keys(fileGroups).length} files processed`);
      }
    }
    
    // Summary
    console.log('\n\n' + '='.repeat(70));
    console.log('=== TOPIC FIX SUMMARY ===');
    console.log('='.repeat(70));
    console.log(`Files processed: ${filesProcessed}`);
    console.log(`Topics fixed: ${totalFixed}`);
    console.log(`Topics still missing: ${missingResult.rows.length - totalFixed}`);
    
    // Verify the fix
    const verifyQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN topic IS NULL OR topic = '' THEN 1 END) as no_topic,
        COUNT(CASE WHEN topic IS NOT NULL AND topic != '' THEN 1 END) as has_topic
      FROM parsed_student_feedback
      WHERE feedback_type = 'primary'
      AND instructor = 'Srijan'
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    const stats = verifyResult.rows[0];
    const percent = ((stats.has_topic / stats.total) * 100).toFixed(1);
    
    console.log('\nFinal Srijan primary topic coverage:');
    console.log(`Total entries: ${stats.total}`);
    console.log(`With topics: ${stats.has_topic} (${percent}%)`);
    console.log(`Without topics: ${stats.no_topic}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixPrimaryTopics();