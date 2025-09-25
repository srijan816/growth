import { debateGrowthEngine } from './src/lib/analytics/debate-growth-engine';

async function testGrowthEngine() {
  console.log('Testing Debate Growth Engine\n');
  console.log('=' .repeat(60));
  
  // Test with Nathaniel Poon who we know has data
  const nathanielId = '011c71a2-cc3a-487b-9f7b-7098159bc1e7';
  
  console.log('Testing with Nathaniel Poon (ID:', nathanielId, ')\n');
  
  try {
    const growthData = await debateGrowthEngine.calculateStudentGrowth(nathanielId, 'month');
    
    console.log('Growth Data Retrieved:');
    console.log('  Student Name:', growthData.studentName);
    console.log('  Level:', growthData.level);
    console.log('  Timeframe:', growthData.timeframe);
    console.log('\nDimension Scores:');
    console.log('  Content:', growthData.content.score, '%');
    console.log('  Style:', growthData.style.score, '%');
    console.log('  Strategy:', growthData.strategy.score, '%');
    console.log('\nOverall:');
    console.log('  Score:', growthData.overall.score, '%');
    console.log('  Growth Rate:', growthData.overall.growthRate, '%');
    console.log('  Level:', growthData.overall.level);
    console.log('  Percentile:', growthData.overall.percentile);
    console.log('\nHistory points:', growthData.history.length);
    console.log('Recommendations:', growthData.recommendations.length);
    console.log('Milestones:', growthData.milestones.length);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  // Test with Morgan
  const morganId = '36ee071d-8945-40d1-a29a-97bdee3e2b20';
  
  console.log('\n' + '-'.repeat(60));
  console.log('Testing with Morgan (ID:', morganId, ')\n');
  
  try {
    const growthData = await debateGrowthEngine.calculateStudentGrowth(morganId, 'month');
    
    console.log('Growth Data Retrieved:');
    console.log('  Student Name:', growthData.studentName);
    console.log('  Level:', growthData.level);
    console.log('\nDimension Scores:');
    console.log('  Content:', growthData.content.score, '%');
    console.log('  Style:', growthData.style.score, '%');
    console.log('  Strategy:', growthData.strategy.score, '%');
    console.log('\nOverall:');
    console.log('  Score:', growthData.overall.score, '%');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testGrowthEngine();