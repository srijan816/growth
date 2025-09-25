import { drizzleDb } from './src/lib/database/drizzle';
import { parsedStudentFeedback } from './src/lib/database/schema';
import { sql, desc, isNotNull } from 'drizzle-orm';

async function analyzeScores() {
  console.log('Analyzing Score Distribution\n');
  console.log('=' .repeat(60));
  
  // Get all feedback with rubric scores
  const feedbackWithRubrics = await drizzleDb
    .select()
    .from(parsedStudentFeedback)
    .where(isNotNull(parsedStudentFeedback.rubricScores))
    .orderBy(desc(parsedStudentFeedback.feedbackDate))
    .limit(20);
  
  console.log(`\nFound ${feedbackWithRubrics.length} feedback records with rubrics\n`);
  
  const scoreDistribution: Record<string, number[]> = {
    content: [],
    style: [],
    strategy: [],
    overall: []
  };
  
  feedbackWithRubrics.forEach(feedback => {
    console.log(`\n${feedback.studentName}:`);
    
    if (feedback.rubricScores) {
      try {
        const rubrics = JSON.parse(feedback.rubricScores as string);
        
        // Show raw rubric values
        const validRubrics: Record<string, number> = {};
        Object.entries(rubrics).forEach(([key, value]: [string, any]) => {
          if (value !== 'N/A' && value !== null && value !== undefined && value !== '') {
            validRubrics[key] = parseFloat(value);
          }
        });
        
        if (Object.keys(validRubrics).length > 0) {
          console.log('  Rubrics:', Object.entries(validRubrics).map(([k,v]) => `${k}=${v}`).join(', '));
          
          // Calculate scores
          const content = calculateContent(validRubrics);
          const style = calculateStyle(validRubrics);
          const strategy = calculateStrategy(validRubrics);
          const overall = content * 0.4 + style * 0.3 + strategy * 0.3;
          
          console.log(`  Content: ${content.toFixed(1)}%`);
          console.log(`  Style: ${style.toFixed(1)}%`);
          console.log(`  Strategy: ${strategy.toFixed(1)}%`);
          console.log(`  Overall: ${overall.toFixed(1)}%`);
          
          scoreDistribution.content.push(content);
          scoreDistribution.style.push(style);
          scoreDistribution.strategy.push(strategy);
          scoreDistribution.overall.push(overall);
        } else {
          console.log('  All rubrics are N/A');
        }
      } catch (e) {
        console.log('  Error parsing rubrics');
      }
    }
  });
  
  // Show distribution summary
  console.log('\n' + '=' .repeat(60));
  console.log('SCORE DISTRIBUTION SUMMARY\n');
  
  Object.entries(scoreDistribution).forEach(([dimension, scores]) => {
    if (scores.length > 0) {
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);
      
      console.log(`${dimension.toUpperCase()}:`);
      console.log(`  Range: ${min.toFixed(1)}% - ${max.toFixed(1)}%`);
      console.log(`  Average: ${avg.toFixed(1)}%`);
      console.log(`  Std Dev: ${stdDev.toFixed(1)}%`);
      console.log(`  Spread: ${(max - min).toFixed(1)}%`);
      console.log();
    }
  });
  
  // Check if scores are clustering
  if (scoreDistribution.overall.length > 0) {
    const overallScores = scoreDistribution.overall;
    const buckets: Record<string, number> = {
      '0-20': 0,
      '20-40': 0,
      '40-60': 0,
      '60-80': 0,
      '80-100': 0
    };
    
    overallScores.forEach(score => {
      if (score < 20) buckets['0-20']++;
      else if (score < 40) buckets['20-40']++;
      else if (score < 60) buckets['40-60']++;
      else if (score < 80) buckets['60-80']++;
      else buckets['80-100']++;
    });
    
    console.log('OVERALL SCORE BUCKETS:');
    Object.entries(buckets).forEach(([range, count]) => {
      const pct = (count / overallScores.length * 100).toFixed(0);
      console.log(`  ${range}%: ${count} students (${pct}%)`);
    });
  }
  
  process.exit(0);
}

function calculateContent(rubrics: Record<string, number>): number {
  let score = 0;
  let maxScore = 0;
  
  if ('rubric_4' in rubrics) {
    score += rubrics.rubric_4;
    maxScore += 5;
  }
  if ('rubric_5' in rubrics) {
    score += rubrics.rubric_5;
    maxScore += 5;
  }
  if ('rubric_7' in rubrics) {
    const rebuttal = rubrics.rubric_7;
    if (rebuttal < 4) {
      score += rebuttal;
    } else {
      score += rebuttal * 0.8;
    }
    maxScore += 5;
  }
  
  return maxScore > 0 ? (score / maxScore) * 100 : 50;
}

function calculateStyle(rubrics: Record<string, number>): number {
  let score = 0;
  let maxScore = 0;
  
  if ('rubric_1' in rubrics) {
    score += rubrics.rubric_1;
    maxScore += 5;
  }
  if ('rubric_3' in rubrics) {
    score += rubrics.rubric_3;
    maxScore += 5;
  }
  if ('rubric_8' in rubrics) {
    score += rubrics.rubric_8;
    maxScore += 5;
  }
  
  return maxScore > 0 ? (score / maxScore) * 100 : 50;
}

function calculateStrategy(rubrics: Record<string, number>): number {
  let score = 0;
  let maxScore = 0;
  
  if ('rubric_2' in rubrics) {
    score += rubrics.rubric_2;
    maxScore += 5;
  }
  if ('rubric_6' in rubrics) {
    score += rubrics.rubric_6;
    maxScore += 5;
  }
  if ('rubric_7' in rubrics) {
    const rebuttal = rubrics.rubric_7;
    if (rebuttal >= 4) {
      score += rebuttal;
    } else {
      score += rebuttal * 0.2;
    }
    maxScore += 5;
  }
  
  return maxScore > 0 ? (score / maxScore) * 100 : 50;
}

analyzeScores();