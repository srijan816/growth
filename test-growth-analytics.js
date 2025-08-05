// Test script for Growth Analytics API
const baseUrl = 'http://localhost:3001';

async function testGrowthAnalytics() {
  console.log('🧪 Testing Growth Analytics API...\n');
  
  try {
    // First, get a list of students
    console.log('📋 Fetching students list...');
    const studentsResponse = await fetch(`${baseUrl}/api/students`);
    const students = await studentsResponse.json();
    
    if (!students || students.length === 0) {
      console.log('❌ No students found in database');
      return;
    }
    
    console.log(`✅ Found ${students.length} students\n`);
    
    // Test growth analytics for the first student
    const testStudent = students[0];
    console.log(`🎯 Testing growth analytics for: ${testStudent.name}`);
    console.log(`   Student ID: ${testStudent.id}`);
    console.log(`   Grade: ${testStudent.gradeLevel}\n`);
    
    // Test different timeframes
    const timeframes = ['week', 'month', 'term', 'year'];
    
    for (const timeframe of timeframes) {
      console.log(`⏱️  Testing ${timeframe} timeframe...`);
      
      const response = await fetch(
        `${baseUrl}/api/students/${testStudent.id}/growth?timeframe=${timeframe}`
      );
      
      if (!response.ok) {
        console.log(`   ❌ Failed: ${response.status} ${response.statusText}`);
        const error = await response.text();
        console.log(`   Error: ${error}`);
        continue;
      }
      
      const growthData = await response.json();
      
      // Validate the response structure
      const requiredFields = ['overall', 'skills', 'trajectory', 'milestones', 'patterns', 'comparisons', 'velocity'];
      const missingFields = requiredFields.filter(field => !(field in growthData));
      
      if (missingFields.length > 0) {
        console.log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log(`   ✅ All required fields present`);
      }
      
      // Display key metrics
      if (growthData.overall) {
        console.log(`   📊 Overall Score: ${growthData.overall.score}/100`);
        console.log(`   📈 Growth Trend: ${growthData.overall.trend}%`);
        console.log(`   🎯 Level: ${growthData.overall.level}`);
        console.log(`   📍 Percentile: ${growthData.overall.percentile}th`);
      }
      
      // Check skills data
      if (growthData.skills) {
        const skillNames = Object.keys(growthData.skills);
        console.log(`   🎨 Skills tracked: ${skillNames.join(', ')}`);
      }
      
      // Check milestones
      if (growthData.milestones) {
        console.log(`   🏆 Achieved milestones: ${growthData.milestones.achieved?.length || 0}`);
        console.log(`   🎯 Upcoming milestones: ${growthData.milestones.upcoming?.length || 0}`);
      }
      
      console.log('');
    }
    
    console.log('✨ Growth Analytics API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testGrowthAnalytics();