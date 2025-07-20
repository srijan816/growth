const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://tikaram@localhost:5432/growth_compass'
});

async function checkStudentDuplicates() {
  try {
    // Get all students with names
    const result = await pool.query('SELECT id, name, grade FROM students WHERE name IS NOT NULL ORDER BY name');
    console.log(`Total students in database: ${result.rows.length}`);
    
    if (result.rows.length === 0) {
      console.log('No students found in database');
      return;
    }
    
    // Check for duplicate first names
    const firstNameCount = {};
    const fullNamesByFirst = {};
    
    result.rows.forEach(row => {
      const firstName = row.name.split(' ')[0];
      firstNameCount[firstName] = (firstNameCount[firstName] || 0) + 1;
      
      if (!fullNamesByFirst[firstName]) {
        fullNamesByFirst[firstName] = [];
      }
      fullNamesByFirst[firstName].push({
        name: row.name,
        id: row.id,
        grade: row.grade
      });
    });
    
    // Find duplicates
    const duplicates = Object.entries(firstNameCount)
      .filter(([name, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);
    
    if (duplicates.length === 0) {
      console.log('\n✅ No duplicate first names found!');
    } else {
      console.log('\n⚠️  Students with duplicate first names:');
      console.log('=' .repeat(60));
      
      duplicates.forEach(([firstName, count]) => {
        console.log(`\n${firstName} (${count} students):`);
        fullNamesByFirst[firstName].forEach(student => {
          console.log(`  - ${student.name} (Grade ${student.grade || 'N/A'}, ID: ${student.id.substring(0, 8)}...)`);
        });
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`- Total students: ${result.rows.length}`);
    console.log(`- Unique first names: ${Object.keys(firstNameCount).length}`);
    console.log(`- Duplicate first names: ${duplicates.length}`);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkStudentDuplicates();