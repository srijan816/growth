const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://tikaram@localhost:5432/growth_compass'
});

async function checkDuplicatesByLevel() {
  try {
    // Get all students with names and grades
    const result = await pool.query('SELECT id, name, grade FROM students WHERE name IS NOT NULL ORDER BY grade, name');
    
    if (result.rows.length === 0) {
      console.log('No students found in database');
      return;
    }
    
    // Categorize students by level based on grade
    const primaryStudents = [];
    const secondaryStudents = [];
    const unknownGradeStudents = [];
    
    result.rows.forEach(student => {
      const gradeMatch = student.grade ? student.grade.match(/\d+/) : null;
      const gradeNum = gradeMatch ? parseInt(gradeMatch[0]) : null;
      
      if (gradeNum === null) {
        unknownGradeStudents.push(student);
      } else if (gradeNum <= 6) {
        primaryStudents.push(student);
      } else {
        secondaryStudents.push(student);
      }
    });
    
    console.log('Student Distribution:');
    console.log(`- Primary (Grade 1-6): ${primaryStudents.length} students`);
    console.log(`- Secondary (Grade 7+): ${secondaryStudents.length} students`);
    console.log(`- Unknown Grade: ${unknownGradeStudents.length} students`);
    console.log('');
    
    // Function to find duplicates within a group
    function findDuplicatesInGroup(students, groupName) {
      const firstNameCount = {};
      const fullNamesByFirst = {};
      
      students.forEach(student => {
        const firstName = student.name.split(' ')[0];
        firstNameCount[firstName] = (firstNameCount[firstName] || 0) + 1;
        
        if (!fullNamesByFirst[firstName]) {
          fullNamesByFirst[firstName] = [];
        }
        fullNamesByFirst[firstName].push({
          name: student.name,
          id: student.id,
          grade: student.grade
        });
      });
      
      const duplicates = Object.entries(firstNameCount)
        .filter(([name, count]) => count > 1)
        .sort((a, b) => b[1] - a[1]);
      
      console.log(`\\n${groupName} - Duplicate First Names:`);
      console.log('=' .repeat(60));
      
      if (duplicates.length === 0) {
        console.log('No duplicate first names in this group!');
      } else {
        duplicates.forEach(([firstName, count]) => {
          console.log(`\\n${firstName} (${count} students):`);
          fullNamesByFirst[firstName].forEach(student => {
            console.log(`  - ${student.name} (${student.grade})`);
          });
        });
        
        console.log(`\\nSummary for ${groupName}:`);
        console.log(`- Total students: ${students.length}`);
        console.log(`- Students with duplicate first names: ${duplicates.reduce((sum, [name, count]) => sum + count, 0)}`);
        console.log(`- Number of duplicate first names: ${duplicates.length}`);
      }
    }
    
    // Analyze each group
    findDuplicatesInGroup(primaryStudents, 'PRIMARY STUDENTS (Grades 1-6)');
    findDuplicatesInGroup(secondaryStudents, 'SECONDARY STUDENTS (Grades 7+)');
    
    if (unknownGradeStudents.length > 0) {
      console.log('\\n\\nStudents with Unknown Grade:');
      unknownGradeStudents.forEach(s => console.log(`- ${s.name}`));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkDuplicatesByLevel();