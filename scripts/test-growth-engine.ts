import { GrowthAnalyticsEngine } from '../src/lib/analytics/growth-engine';
import { drizzleDb as db } from '../src/lib/database/drizzle';
import { students } from '../src/lib/database/schema';
import { eq } from 'drizzle-orm';

async function testGrowthEngine() {
  console.log('🧪 Testing Growth Analytics Engine...\n');

  try {
    // Get a sample student (Srijan's test student)
    const testStudents = await db
      .select()
      .from(students)
      .limit(5);

    if (testStudents.length === 0) {
      console.log('❌ No students found in database');
      return;
    }

    console.log(`Found ${testStudents.length} students for testing\n`);

    // Initialize the growth engine
    const growthEngine = new GrowthAnalyticsEngine();

    // Test with the first student
    const testStudent = testStudents[0];
    console.log(`📊 Testing with student: ${testStudent.studentNumber}\n`);

    // Test different timeframes
    const timeframes = ['week', 'month', 'term'] as const;

    for (const timeframe of timeframes) {
      console.log(`\n⏱️  Testing timeframe: ${timeframe}`);
      console.log('─'.repeat(40));

      const startTime = Date.now();
      const growthData = await growthEngine.calculateStudentGrowth(
        testStudent.id,
        timeframe
      );
      const endTime = Date.now();

      console.log(`✅ Calculation completed in ${endTime - startTime}ms`);

      // Display summary results
      console.log('\n📈 Overall Growth:');
      console.log(`  - Score: ${growthData.overall.score}/100`);
      console.log(`  - Trend: ${growthData.overall.trend > 0 ? '+' : ''}${growthData.overall.trend}%`);
      console.log(`  - Level: ${growthData.overall.level}`);
      console.log(`  - Percentile: ${growthData.overall.percentile}th`);
      console.log(`  - Description: ${growthData.overall.description}`);

      console.log('\n🎯 Skill Breakdown:');
      Object.entries(growthData.skills).forEach(([skill, data]) => {
        console.log(`  ${skill}:`);
        console.log(`    - Current: ${data.currentLevel}/100`);
        console.log(`    - Growth: ${data.growthRate > 0 ? '+' : ''}${data.growthRate}%`);
        console.log(`    - Trend: ${data.trend}`);
      });

      console.log('\n🚀 Trajectory:');
      console.log(`  - 3 Month Projection: ${growthData.trajectory.projected3Months}/100`);
      console.log(`  - 6 Month Projection: ${growthData.trajectory.projected6Months}/100`);
      console.log(`  - Confidence Interval: [${growthData.trajectory.confidenceInterval[0]}, ${growthData.trajectory.confidenceInterval[1]}]`);

      console.log('\n🏆 Milestones:');
      console.log(`  - Achieved: ${growthData.milestones.achieved.length}`);
      console.log(`  - Upcoming: ${growthData.milestones.upcoming.length}`);
      
      if (growthData.milestones.upcoming.length > 0) {
        const nextMilestone = growthData.milestones.upcoming[0];
        console.log(`  - Next: ${nextMilestone.title} (${nextMilestone.progress}% complete)`);
      }

      console.log('\n📊 Patterns Detected:');
      growthData.patterns.forEach(pattern => {
        console.log(`  - ${pattern.type}: ${pattern.description}`);
        console.log(`    Recommendation: ${pattern.recommendation}`);
      });

      console.log('\n👥 Peer Comparison:');
      console.log(`  - Percentile: ${growthData.comparisons.toPeers.percentile}th`);
      console.log(`  - Ranking: ${growthData.comparisons.toPeers.ranking}/${growthData.comparisons.toPeers.totalPeers}`);
      console.log(`  - Above Average: ${growthData.comparisons.toPeers.aboveAverage ? 'Yes' : 'No'}`);

      console.log('\n📈 Growth Velocity:');
      if (growthData.velocity.length > 0) {
        const latestVelocity = growthData.velocity[growthData.velocity.length - 1];
        console.log(`  - Latest Week: ${latestVelocity.velocity}% (Benchmark: ${latestVelocity.benchmark}%)`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing growth engine:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  } finally {
    process.exit(0);
  }
}

// Run the test
testGrowthEngine();