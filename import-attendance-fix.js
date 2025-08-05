import { Client } from 'pg';
import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

// Normalize student names for matching
function normalizeStudentName(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Extract course code from sheet name
function extractCourseCode(sheetName) {
  // Sheet names like "02IPDEB2401 - G3-4 Public Speak"
  const match = sheetName.match(/^([A-Z0-9]+)/);
  return match ? match[1] : sheetName;
}

// Parse unit and lesson from header
function parseUnitLesson(header) {
  // Headers like "Unit 2 Lesson 1", "Unit 10 Lesson 5"
  const match = header.match(/Unit\s+(\d+)\s+Lesson\s+(\d+)/i);
  if (match) {
    return { unit: match[1], lesson: match[2] };
  }
  return { unit: '', lesson: '' };
}

// Map rating category names to database column names
function mapRatingCategory(category) {
  const categoryMap = {
    'Application of Feedback': 'application_feedback',
    'Application of Skills/Content': 'application_skills',
    'Asking Questions': 'asking_questions',
    'Attitude & Efforts': 'attitude_efforts'
  };
  return categoryMap[category] || category.toLowerCase().replace(/[^a-z]/g, '_');
}

async function importAttendance() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    console.log('🚀 Starting attendance data import...');
    
    // Load Excel file
    const workbook = XLSX.readFile('./attendance_report.xlsx');
    console.log(`Found ${workbook.SheetNames.length} sheets`);
    
    // Load student mappings
    const studentsResult = await client.query(`
      SELECT u.id, u.name
      FROM users u
      JOIN students s ON u.id = s.id
      WHERE u.role = 'student'
    `);
    
    const studentMap = new Map();
    for (const row of studentsResult.rows) {
      const normalized = normalizeStudentName(row.name);
      studentMap.set(normalized, row.id);
    }
    console.log(`Loaded ${studentMap.size} student mappings`);
    
    // Load course mappings - Fix the status check
    const coursesResult = await client.query(`
      SELECT id, code, instructor_id
      FROM courses
      WHERE status = 'Active'  -- Capital A
    `);
    
    const courseMap = new Map();
    for (const row of coursesResult.rows) {
      courseMap.set(row.code, row);
    }
    console.log(`Loaded ${courseMap.size} course mappings`);
    
    let totalImported = 0;
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const courseCode = extractCourseCode(sheetName);
      console.log(`\nProcessing sheet: ${sheetName} (Course: ${courseCode})`);
      
      const course = courseMap.get(courseCode);
      if (!course) {
        console.log(`⚠️  Course ${courseCode} not found, skipping...`);
        continue;
      }
      
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (data.length < 3) continue; // Skip if no data
      
      // Process headers (row 2)
      const headers = data[1];
      const unitLessons = [];
      
      // Parse unit/lesson from headers
      for (let i = 2; i < headers.length; i++) {
        const header = headers[i];
        if (header && header.toString().includes('Unit')) {
          unitLessons.push({ 
            index: i, 
            ...parseUnitLesson(header.toString()) 
          });
        }
      }
      
      // Process student rows
      for (let rowIndex = 2; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        if (!row[0]) continue; // Skip empty rows
        
        const studentName = row[0].toString().trim();
        const ratingCategory = row[1]?.toString().trim();
        
        if (!ratingCategory || !ratingCategory.includes('Application')) continue;
        
        const normalizedName = normalizeStudentName(studentName);
        const studentId = studentMap.get(normalizedName);
        
        if (!studentId) {
          console.log(`⚠️  Student not found: ${studentName}`);
          continue;
        }
        
        const dbColumn = mapRatingCategory(ratingCategory);
        
        // Process each unit/lesson
        for (const ul of unitLessons) {
          const rating = row[ul.index];
          if (!rating || rating === '-') continue;
          
          // Get or create session
          const sessionResult = await client.query(`
            SELECT id FROM class_sessions
            WHERE course_id = $1 AND unit_number = $2 AND lesson_number = $3
          `, [course.id, parseInt(ul.unit), parseInt(ul.lesson)]);
          
          let sessionId;
          if (sessionResult.rows.length > 0) {
            sessionId = sessionResult.rows[0].id;
          } else {
            // Create session
            const newSession = await client.query(`
              INSERT INTO class_sessions (
                id, course_id, unit_number, lesson_number, 
                session_date, status, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, 
                CURRENT_DATE - INTERVAL '1 week' * $5, 
                'completed', NOW(), NOW()
              ) RETURNING id
            `, [
              uuidv4(), course.id, parseInt(ul.unit), parseInt(ul.lesson),
              (parseInt(ul.unit) - 1) * 4 + parseInt(ul.lesson)
            ]);
            sessionId = newSession.rows[0].id;
          }
          
          // Check if attendance exists
          const existingAttendance = await client.query(`
            SELECT id, ${dbColumn} FROM attendances
            WHERE session_id = $1 AND student_id = $2
          `, [sessionId, studentId]);
          
          if (existingAttendance.rows.length > 0) {
            // Update existing
            await client.query(`
              UPDATE attendances 
              SET ${dbColumn} = $1, updated_at = NOW()
              WHERE id = $2
            `, [parseInt(rating), existingAttendance.rows[0].id]);
          } else {
            // Create new attendance record
            await client.query(`
              INSERT INTO attendances (
                id, session_id, student_id, status,
                ${dbColumn}, recorded_by, created_at, updated_at
              ) VALUES (
                $1, $2, $3, 'present',
                $4, $5, NOW(), NOW()
              )
            `, [
              uuidv4(), sessionId, studentId,
              parseInt(rating), course.instructor_id
            ]);
          }
          
          totalImported++;
        }
      }
    }
    
    console.log(`\n✅ Import completed! Total records: ${totalImported}`);
    
    // Final verification
    const count = await client.query('SELECT COUNT(*) FROM attendances');
    console.log(`Total attendance records in database: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

importAttendance().catch(console.error);