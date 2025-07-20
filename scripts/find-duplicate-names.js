const { db } = require('../src/lib/postgres');

async function findDuplicateFirstNames() {
  try {
    const result = await db.query('SELECT name FROM students ORDER BY name');
    
    const names = result.rows.map(r => r.name);
    console.log('Total students in database:', names.length);
    
    // Extract first names and find duplicates
    const firstNameCount = {};
    const fullNamesByFirst = {};
    
    names.forEach(fullName => {
      const firstName = fullName.split(' ')[0];
      firstNameCount[firstName] = (firstNameCount[firstName] || 0) + 1;
      
      if (!fullNamesByFirst[firstName]) {
        fullNamesByFirst[firstName] = [];
      }
      fullNamesByFirst[firstName].push(fullName);
    });
    
    console.log('\nStudents with duplicate first names:');
    console.log('=====================================');
    
    const duplicates = Object.entries(firstNameCount)
      .filter(([name, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);
      
    if (duplicates.length === 0) {
      console.log('No duplicate first names found!');
    } else {
      duplicates.forEach(([firstName, count]) => {
        console.log(`\n${firstName} (${count} students):`);
        fullNamesByFirst[firstName].forEach(fullName => {
          console.log(`  - ${fullName}`);
        });
      });
    }
    
    console.log('\n\nSummary:');
    console.log(`- Total unique first names: ${Object.keys(firstNameCount).length}`);
    console.log(`- First names with duplicates: ${duplicates.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

findDuplicateFirstNames();