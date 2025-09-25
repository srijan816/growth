import { drizzleDb as db } from '../database/drizzle';
import { 
  students, 
  attendances, 
  parsedStudentFeedback, 
  enrollments,
  classSessions,
  courses,
  aiRecommendations
} from '../database/schema';
import { eq, desc, gte, and, avg, sql, lt } from 'drizzle-orm';
import { subDays, subWeeks, subMonths, format, differenceInDays } from 'date-fns';

export type TimeFrame = 'week' | 'month' | 'term' | 'year';
export type SkillType = 'speaking' | 'argumentation' | 'critical_thinking' | 'research' | 'writing' | 'confidence';

interface SkillGrowth {
  currentLevel: number;
  previousLevel: number;
  growthRate: number;
  consistency: number;
  momentum: number;
  trend: 'improving' | 'stable' | 'declining';
  nextMilestone: {
    level: number;
    estimatedWeeks: number;
    requiredGrowthRate: number;
  };
  strengths: string[];
  focusAreas: string[];
}

interface GrowthComparison {
  toPeers: {
    percentile: number;
    ranking: number;
    totalPeers: number;
    aboveAverage: boolean;
  };
  toPrevious: {
    improvement: number;
    consistencyChange: number;
    momentumChange: number;
  };
  toGoals: {
    onTrack: boolean;
    progressPercentage: number;
    estimatedCompletion: Date | null;
  };
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  achievedDate?: Date;
  achieved: boolean;
  progress: number;
  skills: SkillType[];
  icon?: string;
}

interface GrowthPattern {
  type: 'consistent' | 'accelerating' | 'plateau' | 'variable';
  description: string;
  recommendation: string;
}

export interface StudentGrowthData {
  overall: {
    score: number;
    trend: number;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    percentile: number;
    description: string;
    history: Array<{ date: string; score: number }>;
  };
  skills: Record<SkillType, SkillGrowth>;
  trajectory: {
    projected3Months: number;
    projected6Months: number;
    confidenceInterval: [number, number];
  };
  milestones: {
    achieved: Milestone[];
    upcoming: Milestone[];
  };
  patterns: GrowthPattern[];
  comparisons: GrowthComparison;
  velocity: Array<{
    week: string;
    velocity: number;
    benchmark: number;
  }>;
}

export class GrowthAnalyticsEngine {
  async calculateStudentGrowth(
    studentId: string, 
    timeframe: TimeFrame = 'month'
  ): Promise<StudentGrowthData> {
    const startDate = this.getStartDate(timeframe);
    
    // Fetch all relevant data in parallel
    const [
      attendanceData,
      feedbackData,
      peerData,
      historicalData,
      recommendationsData
    ] = await Promise.all([
      this.fetchAttendanceData(studentId, startDate),
      this.fetchFeedbackData(studentId, startDate),
      this.fetchPeerData(studentId),
      this.fetchHistoricalData(studentId),
      this.fetchRecommendations(studentId)
    ]);

    // Calculate individual skill growth
    const skills: Record<SkillType, SkillGrowth> = {
      speaking: await this.calculateSkillGrowth(attendanceData, feedbackData, 'speaking'),
      argumentation: await this.calculateSkillGrowth(attendanceData, feedbackData, 'argumentation'),
      critical_thinking: await this.calculateSkillGrowth(attendanceData, feedbackData, 'critical_thinking'),
      research: await this.calculateSkillGrowth(attendanceData, feedbackData, 'research'),
      writing: await this.calculateSkillGrowth(attendanceData, feedbackData, 'writing'),
      confidence: await this.calculateSkillGrowth(attendanceData, feedbackData, 'confidence')
    };

    // Calculate overall growth score
    const overall = this.calculateOverallGrowth(skills, historicalData);

    // Generate trajectory predictions
    const trajectory = this.predictGrowthTrajectory(historicalData, skills);

    // Identify milestones
    const milestones = this.identifyMilestones(skills, feedbackData, historicalData);

    // Detect growth patterns
    const patterns = this.detectGrowthPatterns(historicalData, attendanceData);

    // Generate comparisons
    const comparisons = await this.generateComparisons(
      studentId,
      overall.score,
      peerData,
      historicalData
    );

    // Calculate velocity
    const velocity = this.calculateVelocity(historicalData, peerData);

    return {
      overall,
      skills,
      trajectory,
      milestones,
      patterns,
      comparisons,
      velocity
    };
  }

  private getStartDate(timeframe: TimeFrame): Date {
    const now = new Date();
    switch (timeframe) {
      case 'week':
        return subWeeks(now, 1);
      case 'month':
        return subMonths(now, 1);
      case 'term':
        return subMonths(now, 3);
      case 'year':
        return subMonths(now, 12);
      default:
        return subMonths(now, 1);
    }
  }

  private async fetchAttendanceData(studentId: string, startDate: Date) {
    return await db
      .select({
        id: attendances.id,
        sessionId: attendances.sessionId,
        attitudeEfforts: attendances.attitudeEfforts,
        askingQuestions: attendances.askingQuestions,
        applicationSkills: attendances.applicationSkills,
        applicationFeedback: attendances.applicationFeedback,
        status: attendances.status,
        createdAt: attendances.createdAt,
        sessionDate: classSessions.sessionDate,
        courseName: courses.name
      })
      .from(attendances)
      .innerJoin(classSessions, eq(attendances.sessionId, classSessions.id))
      .innerJoin(courses, eq(classSessions.courseId, courses.id))
      .where(
        and(
          eq(attendances.studentId, studentId),
          gte(attendances.createdAt, startDate)
        )
      )
      .orderBy(desc(attendances.createdAt));
  }

  private async fetchFeedbackData(studentId: string, startDate: Date) {
    return await db
      .select()
      .from(parsedStudentFeedback)
      .where(
        and(
          eq(parsedStudentFeedback.studentId, studentId),
          gte(parsedStudentFeedback.createdAt, startDate)
        )
      )
      .orderBy(desc(parsedStudentFeedback.createdAt));
  }

  private async fetchPeerData(studentId: string) {
    // Get student's grade level first
    const student = await db
      .select({ gradeLevel: students.gradeLevel })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student[0]) return [];

    // Fetch peer attendance data
    return await db
      .select({
        studentId: attendances.studentId,
        avgAttitude: avg(attendances.attitudeEfforts),
        avgQuestions: avg(attendances.askingQuestions),
        avgSkills: avg(attendances.applicationSkills),
        avgFeedback: avg(attendances.applicationFeedback)
      })
      .from(attendances)
      .innerJoin(students, eq(attendances.studentId, students.id))
      .where(eq(students.gradeLevel, student[0].gradeLevel))
      .groupBy(attendances.studentId);
  }

  private async fetchHistoricalData(studentId: string) {
    // Fetch all historical attendance data
    return await db
      .select({
        date: classSessions.sessionDate,
        attitudeEfforts: attendances.attitudeEfforts,
        askingQuestions: attendances.askingQuestions,
        applicationSkills: attendances.applicationSkills,
        applicationFeedback: attendances.applicationFeedback
      })
      .from(attendances)
      .innerJoin(classSessions, eq(attendances.sessionId, classSessions.id))
      .where(eq(attendances.studentId, studentId))
      .orderBy(classSessions.sessionDate);
  }

  private async fetchRecommendations(studentId: string) {
    try {
      // First get the student's name
      const student = await db
        .select({ studentNumber: students.studentNumber })
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);
      
      if (!student[0]) return [];
      
      // Then fetch recommendations by student name/number
      return await db
        .select()
        .from(aiRecommendations)
        .where(eq(aiRecommendations.studentName, student[0].studentNumber))
        .orderBy(desc(aiRecommendations.createdAt))
        .limit(10);
    } catch (error) {
      console.warn('Failed to fetch recommendations:', error);
      return []; // Return empty array if recommendations fail
    }
  }

  private async calculateSkillGrowth(
    attendanceData: any[],
    feedbackData: any[],
    skill: SkillType
  ): Promise<SkillGrowth> {
    // Map skills to attendance metrics
    const skillToMetricMap: Record<SkillType, string> = {
      speaking: 'applicationSkills',
      argumentation: 'askingQuestions',
      critical_thinking: 'applicationFeedback',
      research: 'applicationSkills',
      writing: 'applicationFeedback',
      confidence: 'attitudeEfforts'
    };

    const metric = skillToMetricMap[skill];
    const recentScores = attendanceData.slice(0, 5).map(a => a[metric] || 0);
    const olderScores = attendanceData.slice(5, 10).map(a => a[metric] || 0);

    const currentLevel = recentScores.length > 0 
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length 
      : 0;
    
    const previousLevel = olderScores.length > 0
      ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length
      : currentLevel * 0.9;

    const growthRate = previousLevel > 0 
      ? ((currentLevel - previousLevel) / previousLevel) * 100 
      : 0;

    // Calculate consistency (lower standard deviation = higher consistency)
    const consistency = this.calculateConsistency(recentScores);

    // Calculate momentum (acceleration of growth)
    const momentum = this.calculateMomentum(attendanceData.map(a => a[metric] || 0));

    // Determine trend
    const trend = growthRate > 5 ? 'improving' : growthRate < -5 ? 'declining' : 'stable';

    // Calculate next milestone
    const nextMilestone = this.calculateNextMilestone(currentLevel, growthRate);

    // Extract strengths and focus areas from feedback
    const { strengths, focusAreas } = this.extractSkillInsights(feedbackData, skill);

    return {
      currentLevel: Math.round(currentLevel * 20), // Convert 1-5 to 0-100
      previousLevel: Math.round(previousLevel * 20),
      growthRate: Math.round(growthRate * 10) / 10,
      consistency: Math.round(consistency),
      momentum: Math.round(momentum * 10) / 10,
      trend,
      nextMilestone,
      strengths,
      focusAreas
    };
  }

  private calculateConsistency(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert to consistency score (0-100, where 100 is most consistent)
    return Math.max(0, Math.min(100, 100 - (stdDev * 20)));
  }

  private calculateMomentum(scores: number[]): number {
    if (scores.length < 3) return 0;
    
    // Calculate rate of change over time
    const recentChange = scores.slice(-3).reduce((a, b, i, arr) => {
      if (i === 0) return 0;
      return a + (b - arr[i - 1]);
    }, 0) / 2;
    
    const olderChange = scores.slice(-6, -3).reduce((a, b, i, arr) => {
      if (i === 0) return 0;
      return a + (b - arr[i - 1]);
    }, 0) / 2;
    
    return recentChange - olderChange; // Positive means accelerating
  }

  private calculateNextMilestone(currentLevel: number, growthRate: number) {
    const milestones = [25, 50, 75, 90, 100];
    const nextLevel = milestones.find(m => m > currentLevel) || 100;
    
    const requiredGrowth = nextLevel - currentLevel;
    const weeksToMilestone = growthRate > 0 
      ? Math.ceil(requiredGrowth / (growthRate / 4)) // Assuming weekly growth rate
      : 999;

    return {
      level: nextLevel,
      estimatedWeeks: Math.min(weeksToMilestone, 52),
      requiredGrowthRate: requiredGrowth / 12 // Required growth per week for 3 months
    };
  }

  private extractSkillInsights(feedbackData: any[], skill: SkillType) {
    const strengths: string[] = [];
    const focusAreas: string[] = [];

    // Extract from parsed feedback
    feedbackData.forEach(feedback => {
      if (feedback.strengths) {
        // Parse strengths for skill-related keywords
        const skillKeywords = this.getSkillKeywords(skill);
        const mentionedStrengths = this.extractMentions(feedback.strengths, skillKeywords);
        strengths.push(...mentionedStrengths);
      }

      if (feedback.improvements) {
        const skillKeywords = this.getSkillKeywords(skill);
        const mentionedAreas = this.extractMentions(feedback.improvements, skillKeywords);
        focusAreas.push(...mentionedAreas);
      }
    });

    return {
      strengths: [...new Set(strengths)].slice(0, 3),
      focusAreas: [...new Set(focusAreas)].slice(0, 3)
    };
  }

  private getSkillKeywords(skill: SkillType): string[] {
    const keywordMap: Record<SkillType, string[]> = {
      speaking: ['voice', 'clarity', 'volume', 'pace', 'articulation', 'presentation'],
      argumentation: ['argument', 'evidence', 'reasoning', 'logic', 'rebuttal', 'counter'],
      critical_thinking: ['analysis', 'evaluation', 'synthesis', 'problem-solving', 'critical'],
      research: ['research', 'sources', 'data', 'investigation', 'evidence', 'facts'],
      writing: ['writing', 'grammar', 'structure', 'vocabulary', 'composition', 'essay'],
      confidence: ['confidence', 'engagement', 'participation', 'initiative', 'leadership']
    };

    return keywordMap[skill] || [];
  }

  private extractMentions(text: string, keywords: string[]): string[] {
    const mentions: string[] = [];
    const lowerText = text.toLowerCase();

    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        // Extract sentence containing the keyword
        const sentences = text.split(/[.!?]/);
        const relevantSentence = sentences.find(s => 
          s.toLowerCase().includes(keyword)
        );
        
        if (relevantSentence) {
          mentions.push(relevantSentence.trim().slice(0, 100));
        }
      }
    });

    return mentions;
  }

  private calculateOverallGrowth(
    skills: Record<SkillType, SkillGrowth>,
    historicalData: any[]
  ) {
    // Weighted average of all skills
    const weights: Record<SkillType, number> = {
      speaking: 0.25,
      argumentation: 0.20,
      critical_thinking: 0.20,
      research: 0.15,
      writing: 0.10,
      confidence: 0.10
    };

    let overallScore = 0;
    let overallTrend = 0;

    Object.entries(skills).forEach(([skillName, skillData]) => {
      const weight = weights[skillName as SkillType];
      overallScore += skillData.currentLevel * weight;
      overallTrend += skillData.growthRate * weight;
    });

    // Determine level based on score
    const level = 
      overallScore < 25 ? 'beginner' :
      overallScore < 50 ? 'intermediate' :
      overallScore < 75 ? 'advanced' : 'expert';

    // Calculate percentile (simplified - would need peer comparison)
    const percentile = Math.min(99, Math.max(1, Math.round(overallScore * 0.9 + 10)));

    // Generate description
    const description = this.generateGrowthDescription(overallScore, overallTrend, level);

    // Create history array
    const history = this.generateHistoryData(historicalData);

    return {
      score: Math.round(overallScore),
      trend: Math.round(overallTrend * 10) / 10,
      level,
      percentile,
      description,
      history
    };
  }

  private generateGrowthDescription(score: number, trend: number, level: string): string {
    if (trend > 10) {
      return `Exceptional growth! Currently at ${level} level with rapid improvement across all skills.`;
    } else if (trend > 5) {
      return `Strong progress at ${level} level. Consistent improvement showing great potential.`;
    } else if (trend > 0) {
      return `Steady development at ${level} level. Building solid foundations for future growth.`;
    } else {
      return `Maintaining ${level} level. Focus on consistent practice to accelerate growth.`;
    }
  }

  private generateHistoryData(historicalData: any[]) {
    // Group by week and calculate weekly averages
    const weeklyData = new Map<string, number[]>();

    historicalData.forEach(data => {
      // Skip entries with invalid dates
      if (!data.date) return;
      
      const dateValue = new Date(data.date);
      // Check if date is valid
      if (isNaN(dateValue.getTime())) return;
      
      const weekKey = format(dateValue, 'yyyy-ww');
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      
      const avgScore = (
        (data.attitudeEfforts || 0) +
        (data.askingQuestions || 0) +
        (data.applicationSkills || 0) +
        (data.applicationFeedback || 0)
      ) / 4;
      
      weeklyData.get(weekKey)!.push(avgScore);
    });

    return Array.from(weeklyData.entries())
      .map(([week, scores]) => ({
        date: week,
        score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 20)
      }))
      .slice(-12); // Last 12 weeks
  }

  private predictGrowthTrajectory(
    historicalData: any[],
    skills: Record<SkillType, SkillGrowth>
  ) {
    // Calculate average growth rate
    const avgGrowthRate = Object.values(skills)
      .reduce((sum, skill) => sum + skill.growthRate, 0) / Object.keys(skills).length;

    const currentScore = Object.values(skills)
      .reduce((sum, skill) => sum + skill.currentLevel, 0) / Object.keys(skills).length;

    // Simple linear projection
    const monthlyGrowth = avgGrowthRate / 4; // Convert weekly to monthly
    
    const projected3Months = Math.min(100, currentScore + (monthlyGrowth * 3));
    const projected6Months = Math.min(100, currentScore + (monthlyGrowth * 6));

    // Calculate confidence interval based on consistency
    const avgConsistency = Object.values(skills)
      .reduce((sum, skill) => sum + skill.consistency, 0) / Object.keys(skills).length;
    
    const confidenceRange = (100 - avgConsistency) / 2;

    return {
      projected3Months: Math.round(projected3Months),
      projected6Months: Math.round(projected6Months),
      confidenceInterval: [
        Math.round(projected3Months - confidenceRange),
        Math.round(projected3Months + confidenceRange)
      ] as [number, number]
    };
  }

  private identifyMilestones(
    skills: Record<SkillType, SkillGrowth>,
    feedbackData: any[],
    historicalData: any[]
  ) {
    const achieved: Milestone[] = [];
    const upcoming: Milestone[] = [];

    // Define milestone thresholds
    const milestoneDefinitions = [
      { level: 25, title: 'Foundation Builder', description: 'Established basic skills across all areas' },
      { level: 50, title: 'Skill Developer', description: 'Reached intermediate proficiency' },
      { level: 75, title: 'Advanced Practitioner', description: 'Demonstrated advanced capabilities' },
      { level: 90, title: 'Excellence Achiever', description: 'Approaching mastery level' },
      { level: 100, title: 'Master Debater', description: 'Achieved exceptional proficiency' }
    ];

    // Check each skill for milestone achievements
    Object.entries(skills).forEach(([skillName, skillData]) => {
      milestoneDefinitions.forEach(milestone => {
        if (skillData.currentLevel >= milestone.level) {
          // Check if this is newly achieved
          const achievementDate = this.findAchievementDate(
            historicalData,
            skillName as SkillType,
            milestone.level
          );

          if (achievementDate) {
            achieved.push({
              id: `${skillName}-${milestone.level}`,
              title: `${milestone.title} in ${skillName}`,
              description: milestone.description,
              achievedDate: achievementDate,
              achieved: true,
              progress: 100,
              skills: [skillName as SkillType],
              icon: this.getMilestoneIcon(milestone.level)
            });
          }
        } else {
          // This is an upcoming milestone
          const progress = (skillData.currentLevel / milestone.level) * 100;
          
          upcoming.push({
            id: `${skillName}-${milestone.level}`,
            title: `${milestone.title} in ${skillName}`,
            description: `${Math.round(milestone.level - skillData.currentLevel)}% more to achieve`,
            achieved: false,
            progress: Math.round(progress),
            skills: [skillName as SkillType],
            icon: this.getMilestoneIcon(milestone.level)
          });
        }
      });
    });

    // Sort achieved by date, upcoming by progress
    achieved.sort((a, b) => (b.achievedDate?.getTime() || 0) - (a.achievedDate?.getTime() || 0));
    upcoming.sort((a, b) => b.progress - a.progress);

    return {
      achieved: achieved.slice(0, 5),
      upcoming: upcoming.slice(0, 5)
    };
  }

  private findAchievementDate(
    historicalData: any[],
    skill: SkillType,
    level: number
  ): Date | undefined {
    // Simplified - would need more sophisticated tracking
    const threshold = level / 20; // Convert back to 1-5 scale
    
    for (const data of historicalData.reverse()) {
      if (!data.date) continue;
      const skillScore = this.getSkillScore(data, skill);
      if (skillScore >= threshold) {
        const dateValue = new Date(data.date);
        if (!isNaN(dateValue.getTime())) {
          return dateValue;
        }
      }
    }
    
    return undefined;
  }

  private getSkillScore(data: any, skill: SkillType): number {
    const skillToMetricMap: Record<SkillType, string> = {
      speaking: 'applicationSkills',
      argumentation: 'askingQuestions',
      critical_thinking: 'applicationFeedback',
      research: 'applicationSkills',
      writing: 'applicationFeedback',
      confidence: 'attitudeEfforts'
    };

    return data[skillToMetricMap[skill]] || 0;
  }

  private getMilestoneIcon(level: number): string {
    const icons: Record<number, string> = {
      25: '🌱',
      50: '📈',
      75: '🎯',
      90: '🏆',
      100: '👑'
    };
    
    return icons[level] || '⭐';
  }

  private detectGrowthPatterns(
    historicalData: any[],
    attendanceData: any[]
  ): GrowthPattern[] {
    const patterns: GrowthPattern[] = [];

    // Check for consistency pattern
    const recentScores = attendanceData.slice(0, 5).map(a => 
      (a.attitudeEfforts + a.askingQuestions + a.applicationSkills + a.applicationFeedback) / 4
    );
    
    const consistency = this.calculateConsistency(recentScores);
    
    if (consistency > 80) {
      patterns.push({
        type: 'consistent',
        description: 'Showing remarkable consistency in performance',
        recommendation: 'Challenge yourself with advanced exercises to break through to the next level'
      });
    } else if (consistency < 40) {
      patterns.push({
        type: 'variable',
        description: 'Performance varies significantly between sessions',
        recommendation: 'Focus on establishing consistent practice routines'
      });
    }

    // Check for acceleration pattern
    const momentum = this.calculateMomentum(
      historicalData.map(d => (d.attitudeEfforts + d.askingQuestions + d.applicationSkills + d.applicationFeedback) / 4)
    );
    
    if (momentum > 0.5) {
      patterns.push({
        type: 'accelerating',
        description: 'Growth rate is increasing - excellent momentum!',
        recommendation: 'Maintain current practices and consider additional challenges'
      });
    } else if (momentum < -0.5) {
      patterns.push({
        type: 'plateau',
        description: 'Growth has slowed recently',
        recommendation: 'Try new learning approaches or seek additional feedback'
      });
    }

    return patterns;
  }

  private async generateComparisons(
    studentId: string,
    overallScore: number,
    peerData: any[],
    historicalData: any[]
  ): Promise<GrowthComparison> {
    // Calculate peer comparison
    const peerScores = peerData.map(p => {
      const avgScore = (
        Number(p.avgAttitude || 0) +
        Number(p.avgQuestions || 0) +
        Number(p.avgSkills || 0) +
        Number(p.avgFeedback || 0)
      ) / 4;
      return avgScore * 20; // Convert to 0-100 scale
    });

    peerScores.sort((a, b) => b - a);
    
    const studentRank = peerScores.filter(score => score > overallScore).length + 1;
    const percentile = Math.round(((peerScores.length - studentRank + 1) / peerScores.length) * 100);
    const avgPeerScore = peerScores.reduce((a, b) => a + b, 0) / peerScores.length;

    // Calculate improvement from previous period
    const oldScores = historicalData.slice(0, Math.floor(historicalData.length / 2));
    const recentScores = historicalData.slice(Math.floor(historicalData.length / 2));

    const oldAvg = oldScores.length > 0 
      ? oldScores.reduce((sum, d) => sum + (d.attitudeEfforts + d.askingQuestions + d.applicationSkills + d.applicationFeedback) / 4, 0) / oldScores.length
      : 0;
    
    const recentAvg = recentScores.length > 0
      ? recentScores.reduce((sum, d) => sum + (d.attitudeEfforts + d.askingQuestions + d.applicationSkills + d.applicationFeedback) / 4, 0) / recentScores.length
      : 0;

    const improvement = ((recentAvg - oldAvg) / (oldAvg || 1)) * 100;

    // Calculate goal progress (simplified - would need actual goals from database)
    const targetScore = 85; // Example target
    const progressPercentage = (overallScore / targetScore) * 100;
    const currentGrowthRate = improvement / 4; // Weekly growth rate
    const weeksToGoal = currentGrowthRate > 0 
      ? Math.ceil((targetScore - overallScore) / currentGrowthRate)
      : null;

    return {
      toPeers: {
        percentile,
        ranking: studentRank,
        totalPeers: peerScores.length,
        aboveAverage: overallScore > avgPeerScore
      },
      toPrevious: {
        improvement: Math.round(improvement * 10) / 10,
        consistencyChange: 0, // Would calculate from historical consistency
        momentumChange: 0 // Would calculate from historical momentum
      },
      toGoals: {
        onTrack: progressPercentage >= 70,
        progressPercentage: Math.round(progressPercentage),
        estimatedCompletion: weeksToGoal 
          ? new Date(Date.now() + weeksToGoal * 7 * 24 * 60 * 60 * 1000)
          : null
      }
    };
  }

  private calculateVelocity(historicalData: any[], peerData: any[]) {
    // Group historical data by week
    const weeklyData = new Map<string, number[]>();
    
    historicalData.forEach(data => {
      // Skip entries with invalid dates
      if (!data.date) return;
      
      const dateValue = new Date(data.date);
      // Check if date is valid
      if (isNaN(dateValue.getTime())) return;
      
      const weekKey = format(dateValue, 'MMM dd');
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      
      const score = (data.attitudeEfforts + data.askingQuestions + data.applicationSkills + data.applicationFeedback) / 4;
      weeklyData.get(weekKey)!.push(score);
    });

    // Calculate week-over-week velocity
    const weeks = Array.from(weeklyData.entries());
    const velocityData = [];
    
    for (let i = 1; i < weeks.length; i++) {
      const [prevWeek, prevScores] = weeks[i - 1];
      const [currWeek, currScores] = weeks[i];
      
      const prevAvg = prevScores.reduce((a, b) => a + b, 0) / prevScores.length;
      const currAvg = currScores.reduce((a, b) => a + b, 0) / currScores.length;
      
      const velocity = ((currAvg - prevAvg) / (prevAvg || 1)) * 100;
      
      // Calculate peer benchmark (simplified)
      const benchmark = 5; // 5% weekly growth as benchmark
      
      velocityData.push({
        week: currWeek,
        velocity: Math.round(velocity * 10) / 10,
        benchmark
      });
    }

    return velocityData.slice(-8); // Last 8 weeks
  }
}