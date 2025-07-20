const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://tikaram@localhost:5432/growth_compass'
});

async function analyzePrimaryStudents() {
  try {
    console.log('Analyzing primary students for name conflicts...\n');
    
    // Get all primary students
    const primaryQuery = `
      SELECT id, name, grade 
      FROM students 
      WHERE grade LIKE 'Grade %' 
      AND CAST(SUBSTRING(grade FROM 7) AS INTEGER) < 7
      ORDER BY name
    `;
    
    const primaryStudents = await pool.query(primaryQuery);
    console.log(`Total primary students: ${primaryStudents.rows.length}\n`);
    
    // Group by first name to find conflicts
    const firstNameGroups = {};
    primaryStudents.rows.forEach(student => {
      const firstName = student.name.split(' ')[0];
      if (!firstNameGroups[firstName]) {
        firstNameGroups[firstName] = [];
      }
      firstNameGroups[firstName].push(student);
    });
    
    // Separate conflicting and non-conflicting
    const conflictingFirstNames = [];
    const nonConflictingStudents = [];
    
    Object.entries(firstNameGroups).forEach(([firstName, students]) => {
      if (students.length > 1) {
        conflictingFirstNames.push({
          firstName,
          students: students.map(s => ({ name: s.name, grade: s.grade, id: s.id }))
        });
      } else {
        nonConflictingStudents.push(students[0]);
      }
    });
    
    console.log('Students with first name conflicts:');
    console.log('=====================================');
    conflictingFirstNames.forEach(group => {
      console.log(`\nFirst name: "${group.firstName}" (${group.students.length} students)`);
      group.students.forEach(s => {
        console.log(`  - ${s.name} (${s.grade})`);
      });
    });
    
    console.log('\n\nNon-conflicting students (unique first names):');
    console.log('===============================================');
    console.log(`Total: ${nonConflictingStudents.length} students\n`);
    
    // Save non-conflicting students for import
    const exportData = {
      nonConflictingStudents: nonConflictingStudents.map(s => ({
        id: s.id,
        name: s.name,
        firstName: s.name.split(' ')[0],
        grade: s.grade
      })),
      conflictingGroups: conflictingFirstNames
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'primary-students-analysis.json'),
      JSON.stringify(exportData, null, 2)
    );
    
    console.log('\nAnalysis saved to primary-students-analysis.json');
    
    // Check primary feedback file structure
    console.log('\n\nChecking primary feedback file structure...');
    const primaryDir = '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Primary';
    
    if (fs.existsSync(primaryDir)) {
      // Check instructors
      const instructors = fs.readdirSync(primaryDir).filter(item => {
        const fullPath = path.join(primaryDir, item);
        return fs.statSync(fullPath).isDirectory();
      });
      
      console.log(`\nFound ${instructors.length} instructor folders:`);
      instructors.forEach(instructor => {
        const instructorPath = path.join(primaryDir, instructor);
        const files = fs.readdirSync(instructorPath).filter(f => f.endsWith('.docx') && !f.startsWith('~$'));
        console.log(`  - ${instructor}: ${files.length} .docx files`);
      });
    } else {
      console.log('\nPrimary feedback directory not found!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

analyzePrimaryStudents();