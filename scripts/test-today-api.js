const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testTodayAPI() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
  
  try {
    console.log('Testing /api/classes/today endpoint...');
    console.log(`Base URL: ${baseUrl}`);
    
    // Test 1: Get today's classes
    console.log('\n=== TEST 1: Fetching today\'s classes ===');
    const response1 = await fetch(`${baseUrl}/api/classes/today`);
    const data1 = await response1.json();
    
    console.log('Response status:', response1.status);
    console.log('Date:', data1.date);
    console.log('Day of Week:', data1.dayOfWeek);
    console.log('Is Today:', data1.isToday);
    console.log('Number of classes:', data1.classes?.length || 0);
    
    if (data1.classes && data1.classes.length > 0) {
      console.log('\nClasses found:');
      data1.classes.forEach(cls => {
        console.log(`- ${cls.code}: ${cls.name}`);
        console.log(`  Time: ${cls.time}`);
        console.log(`  Status: ${cls.status}`);
        console.log(`  Level: ${cls.level}`);
        console.log(`  Type: ${cls.type}`);
      });
    }
    
    // Test 2: Get Tuesday's classes specifically
    console.log('\n=== TEST 2: Fetching Tuesday\'s classes (2025-07-23) ===');
    const tuesdayDate = '2025-07-23'; // Next Tuesday
    const response2 = await fetch(`${baseUrl}/api/classes/today?date=${tuesdayDate}`);
    const data2 = await response2.json();
    
    console.log('Response status:', response2.status);
    console.log('Date:', data2.date);
    console.log('Day of Week:', data2.dayOfWeek);
    console.log('Number of classes:', data2.classes?.length || 0);
    
    if (data2.classes && data2.classes.length > 0) {
      console.log('\nTuesday classes found:');
      data2.classes.forEach(cls => {
        console.log(`- ${cls.code}: ${cls.name}`);
        console.log(`  Time: ${cls.time}`);
        console.log(`  Status: ${cls.status}`);
      });
    }
    
    // Test 3: Check for 02IPDEB2401 specifically
    console.log('\n=== TEST 3: Looking for 02IPDEB2401 ===');
    const foundClass = data2.classes?.find(cls => cls.code === '02IPDEB2401');
    if (foundClass) {
      console.log('✅ Found 02IPDEB2401!');
      console.log(JSON.stringify(foundClass, null, 2));
    } else {
      console.log('❌ 02IPDEB2401 not found in Tuesday\'s classes');
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testTodayAPI();