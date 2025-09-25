import { drizzleDb } from '../database/drizzle';
import { 
  students,
  users, 
  attendances, 
  parsedStudentFeedback, 
  classSessions,
  courses
} from '../database/schema';
import { eq, desc, gte, and, sql } from 'drizzle-orm';
import { subDays, subWeeks, subMonths, format, differenceInDays } from 'date-fns';

// ==================== TYPE DEFINITIONS ====================

export type TimeFrame = 'week' | 'month' | 'term' | 'year';
export type DebateDimension = 'content' | 'style' | 'strategy';
export type StudentLevel = 'primary' | 'secondary';

interface RubricScores {
  rubric_1?: number; // Time management
  rubric_2?: number; // POI
  rubric_3?: number; // Style & persuasion
  rubric_4?: number; // Argument quality
  rubric_5?: number; // Theory application
  rubric_6?: number; // Team support
  rubric_7?: number; // Rebuttal
  rubric_8?: number; // Feedback application
}

interface DimensionGrowth {
  score: number;
  percentile: number;
  growthRate: number;
  momentum: number;
  trend: 'improving' | 'stable' | 'declining';
  consistency: number;
  breakdown?: {
    components: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
  };
}

export interface DebateGrowthData {
  studentId: string;
  studentName: string;
  level: StudentLevel;
  timeframe: TimeFrame;
  
  // Core dimensions
  content: DimensionGrowth;
  style: DimensionGrowth;
  strategy: DimensionGrowth;
  
  // Overall metrics
  overall: {
    score: number;
    percentile: number;
    growthRate: number;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    description: string;
  };
  
  // Historical data
  history: Array<{
    date: string;
    content: number;
    style: number;
    strategy: number;
    overall: number;
  }>;
  
  // Predictions
  trajectory: {
    nextMonth: number;
    nextQuarter: number;
    confidence: number;
  };
  
  // Recommendations
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    dimension: DebateDimension;
    action: string;
    timeline: string;
    measurableGoal: string;
  }>;
  
  // Milestones
  milestones: Array<{
    dimension: DebateDimension;
    milestone: string;
    achievedDate?: Date;
    targetDate?: Date;
  }>;
}

// ==================== CONFIGURATION ====================

const DEBATE_MODEL = {
  SECONDARY: {
    CONTENT: {
      weight: 0.40, // 40% of overall
      rubrics: {
        base: ['rubric_4', 'rubric_5'], // Argument quality + Theory
        rebuttal: 'rubric_7' // Conditional inclusion
      },
      description: "Argument substance and logical reasoning"
    },
    STYLE: {
      weight: 0.40, // 40% of overall
      rubrics: ['rubric_1', 'rubric_3', 'rubric_8'], // Time + Persuasion + Feedback application
      description: "Delivery, persuasion, and improvement"
    },
    STRATEGY: {
      weight: 0.20, // 20% of overall
      rubrics: {
        base: ['rubric_2', 'rubric_6'], // POI + Team support
        rebuttal: 'rubric_7' // Conditional inclusion
      },
      description: "Tactical awareness and team coordination"
    }
  },
  
  PRIMARY: {
    FOUNDATION: {
      weight: 0.30,
      keywords: {
        positive: ['good hook', 'clear structure', 'signposting', 'well-organized', 'good timing'],
        negative: ['no hook', 'unclear structure', 'disorganized', 'rushed', 'too short']
      },
      attendanceMetric: 'application_skills'
    },
    DELIVERY: {
      weight: 0.35,
      keywords: {
        positive: ['confident', 'good eye contact', 'clear voice', 'good gestures', 'engaging'],
        negative: ['nervous', 'quiet', 'looking down', 'monotone', 'stiff']
      },
      attendanceMetric: 'attitude_efforts'
    },
    ARGUMENTATION: {
      weight: 0.35,
      keywords: {
        positive: ['strong argument', 'good examples', 'evidence', 'logical', 'persuasive'],
        negative: ['weak argument', 'no examples', 'illogical', 'unclear', 'unconvincing']
      },
      attendanceMetric: 'asking_questions'
    }
  }
};

// ==================== MAIN ENGINE CLASS ====================

export class DebateGrowthEngine {
  
  async calculateStudentGrowth(
    studentId: string,
    timeframe: TimeFrame = 'month'
  ): Promise<DebateGrowthData> {
    
    try {
      // Determine student level
      const studentInfo = await this.getStudentInfo(studentId);
      
      // Handle missing student info
      if (!studentInfo || !studentInfo.gradeLevel) {
        console.error('Student not found or missing grade level:', studentId);
        throw new Error('Student information not found');
      }
      
      const isSecondary = this.isSecondaryStudent(studentInfo.gradeLevel);
    
    // Fetch all data
    const [feedbackData, attendanceData, historicalData] = await Promise.all([
      this.fetchFeedbackData(studentId, this.getStartDate(timeframe)),
      this.fetchAttendanceData(studentId, this.getStartDate(timeframe)),
      this.fetchHistoricalData(studentId)
    ]);
    
    // Calculate growth based on student level
    let growthData: DebateGrowthData;
    
    if (isSecondary) {
      growthData = await this.calculateSecondaryGrowth(
        studentId,
        studentInfo.name,
        feedbackData,
        attendanceData,
        historicalData,
        timeframe
      );
    } else {
      growthData = await this.calculatePrimaryGrowth(
        studentId,
        studentInfo.name,
        feedbackData,
        attendanceData,
        historicalData,
        timeframe
      );
    }
    
    // Add peer comparison
    growthData = await this.addPeerComparison(growthData, studentInfo.gradeLevel);
    
    // Generate recommendations
    growthData.recommendations = this.generateRecommendations(growthData);
    
    // Calculate milestones
    growthData.milestones = this.calculateMilestones(growthData);
    
    return growthData;
    } catch (error) {
      console.error('Error in calculateStudentGrowth:', error);
      throw error;
    }
  }
  
  // ==================== SECONDARY STUDENT CALCULATIONS ====================
  
  private async calculateSecondaryGrowth(
    studentId: string,
    studentName: string,
    feedbackData: any[],
    attendanceData: any[],
    historicalData: any[],
    timeframe: TimeFrame
  ): Promise<DebateGrowthData> {
    
    
    // Extract rubric scores from feedback
    const debatesWithRubrics = feedbackData
      .filter(f => f.rubricScores)
      .map(f => {
        let rubrics: any = {};
        try {
          // Handle both string and object types (PostgreSQL JSONB returns as object)
          const rawRubrics = typeof f.rubricScores === 'string' ? JSON.parse(f.rubricScores) : f.rubricScores;
          
          // Clean and normalize rubric scores
          if (rawRubrics && typeof rawRubrics === 'object') {
            Object.keys(rawRubrics).forEach(key => {
              const value = rawRubrics[key];
              // Handle N/A, null, undefined, or non-numeric values
              // NOTE: 0 is a valid score, so we keep it
              if (value === 'N/A' || value === 'n/a' || value === null || value === undefined || value === '') {
                rubrics[key] = null; // Use null to indicate N/A
              } else {
                const numValue = typeof value === 'number' ? value : parseFloat(value);
                rubrics[key] = isNaN(numValue) ? null : numValue;
              }
            });
          }
        } catch (e) {
          console.warn('Failed to parse rubric scores:', e, 'Type:', typeof f.rubricScores, 'Value:', f.rubricScores);
          rubrics = {};
        }
        return {
          date: f.feedbackDate || f.createdAt,
          unitNumber: f.unitNumber,
          lessonNumber: f.lessonNumber,
          rubrics,
          content: f.content
        };
      })
      .filter(d => d.rubrics && Object.keys(d.rubrics).length > 0)
      .sort((a, b) => {
        // Sort by unit and lesson numbers for proper chronological order
        const aUnit = parseFloat(a.unitNumber?.replace(/[^0-9.]/g, '') || '0');
        const bUnit = parseFloat(b.unitNumber?.replace(/[^0-9.]/g, '') || '0');
        if (aUnit !== bUnit) return aUnit - bUnit;
        
        const aLesson = parseFloat(a.lessonNumber?.replace(/[^0-9.]/g, '') || '0');
        const bLesson = parseFloat(b.lessonNumber?.replace(/[^0-9.]/g, '') || '0');
        return aLesson - bLesson;
      });
    
    
    // Calculate each dimension
    const content = this.calculateContentDimension(debatesWithRubrics, attendanceData);
    const style = this.calculateStyleDimension(debatesWithRubrics, attendanceData);
    const strategy = this.calculateStrategyDimension(debatesWithRubrics, attendanceData);
    
    // Calculate overall score
    const overallScore = (
      content.score * DEBATE_MODEL.SECONDARY.CONTENT.weight +
      style.score * DEBATE_MODEL.SECONDARY.STYLE.weight +
      strategy.score * DEBATE_MODEL.SECONDARY.STRATEGY.weight
    );
    
    // Calculate growth rate
    const overallGrowthRate = (
      content.growthRate * DEBATE_MODEL.SECONDARY.CONTENT.weight +
      style.growthRate * DEBATE_MODEL.SECONDARY.STYLE.weight +
      strategy.growthRate * DEBATE_MODEL.SECONDARY.STRATEGY.weight
    );
    
    // Generate history
    const history = this.generateHistoryFromDebates(debatesWithRubrics);
    
    // Calculate trajectory
    const trajectory = this.calculateTrajectory(history, overallGrowthRate);
    
    return {
      studentId,
      studentName,
      level: 'secondary',
      timeframe,
      content,
      style,
      strategy,
      overall: {
        score: Math.round(overallScore),
        percentile: 0, // Will be calculated with peer comparison
        growthRate: overallGrowthRate,
        level: this.getPerformanceLevel(overallScore),
        description: this.generateDescription(overallScore, overallGrowthRate)
      },
      history,
      trajectory,
      recommendations: [],
      milestones: []
    };
  }
  
  private calculateContentDimension(debates: any[], attendanceData: any[]): DimensionGrowth {
    if (!debates || debates.length === 0) {
      return this.getDefaultDimensionGrowth('content', attendanceData);
    }
    
    // Split into periods for growth calculation
    const periods = this.splitIntoPeriods(debates, 3);
    const currentPeriod = periods[periods.length - 1] || [];
    const previousPeriod = periods[periods.length - 2] || [];
    
    // Calculate scores for current period
    const currentScores = currentPeriod.map(debate => {
      if (!debate || !debate.rubrics) {
        console.warn('Missing rubrics data for debate:', debate);
        return 0;
      }
      const rubrics = debate.rubrics;
      let contentScore = 0;
      let maxScore = 0;
      
      // Base content rubrics (include 0 as valid score)
      let baseScore = 0;
      let baseCount = 0;
      
      if (rubrics.rubric_4 !== null && rubrics.rubric_4 !== undefined) {
        baseScore += rubrics.rubric_4;
        baseCount++;
      }
      if (rubrics.rubric_5 !== null && rubrics.rubric_5 !== undefined) {
        baseScore += rubrics.rubric_5;
        baseCount++;
      }
      
      contentScore += baseScore;
      maxScore += baseCount * 5; // Only count available rubrics
      
      // Rebuttal contribution to content (only if available)
      if (rubrics.rubric_7 !== null && rubrics.rubric_7 !== undefined) {
        const rebuttalScore = rubrics.rubric_7;
        if (rebuttalScore < 4) {
          // If rebuttal < 4, it fully counts toward content
          contentScore += rebuttalScore;
        } else {
          // If rebuttal >= 4, partial credit to content
          contentScore += rebuttalScore * 0.8; // 80% to content
        }
        maxScore += 5;
      }
      
      // Only return a score if we have at least one valid rubric
      return maxScore > 0 ? (contentScore / maxScore) * 100 : 0;
    });
    
    // Calculate scores for previous period
    const previousScores = previousPeriod.map(debate => {
      if (!debate || !debate.rubrics) return 0;
      const rubrics = debate.rubrics;
      let contentScore = 0;
      let maxScore = 0;
      
      // Base content rubrics (include 0 as valid score)
      let baseScore = 0;
      let baseCount = 0;
      
      if (rubrics.rubric_4 !== null && rubrics.rubric_4 !== undefined) {
        baseScore += rubrics.rubric_4;
        baseCount++;
      }
      if (rubrics.rubric_5 !== null && rubrics.rubric_5 !== undefined) {
        baseScore += rubrics.rubric_5;
        baseCount++;
      }
      
      contentScore += baseScore;
      maxScore += baseCount * 5;
      
      // Rebuttal contribution (only if available)
      if (rubrics.rubric_7 !== null && rubrics.rubric_7 !== undefined) {
        const rebuttalScore = rubrics.rubric_7;
        if (rebuttalScore < 4) {
          contentScore += rebuttalScore;
        } else {
          contentScore += rebuttalScore * 0.8;
        }
        maxScore += 5;
      }
      
      return maxScore > 0 ? (contentScore / maxScore) * 100 : 0;
    });
    
    const currentAvg = this.average(currentScores) || 0;
    const previousAvg = this.average(previousScores) || currentAvg * 0.9;
    
    const growthRate = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;
    const momentum = this.calculateMomentum(periods.map(p => 
      this.average(p.map(d => {
        if (!d.rubrics) return 0;
        let score = 0;
        let count = 0;
        if (d.rubrics.rubric_4 !== null && d.rubrics.rubric_4 !== undefined) {
          score += d.rubrics.rubric_4;
          count++;
        }
        if (d.rubrics.rubric_5 !== null && d.rubrics.rubric_5 !== undefined) {
          score += d.rubrics.rubric_5;
          count++;
        }
        return count > 0 ? (score / (count * 5)) * 100 : 0;
      }))
    ));
    
    // Identify strengths and weaknesses
    const breakdown = this.analyzeContentBreakdown(currentPeriod);
    
    return {
      score: Math.round(currentAvg),
      percentile: 0, // Calculated later
      growthRate: Math.round(growthRate * 10) / 10,
      momentum,
      trend: growthRate > 5 ? 'improving' : growthRate < -5 ? 'declining' : 'stable',
      consistency: this.calculateConsistency(currentScores),
      breakdown
    };
  }
  
  private calculateStyleDimension(debates: any[], attendanceData: any[]): DimensionGrowth {
    if (!debates || debates.length === 0) {
      return this.getDefaultDimensionGrowth('style', attendanceData);
    }
    
    const periods = this.splitIntoPeriods(debates, 3);
    const currentPeriod = periods[periods.length - 1] || [];
    const previousPeriod = periods[periods.length - 2] || [];
    
    // Style uses rubrics 1, 3, and 8
    const currentScores = currentPeriod.map(debate => {
      if (!debate || !debate.rubrics) return 0;
      const rubrics = debate.rubrics;
      let score = 0;
      let count = 0;
      
      if (rubrics.rubric_1 !== null && rubrics.rubric_1 !== undefined) {
        score += rubrics.rubric_1;
        count++;
      }
      if (rubrics.rubric_3 !== null && rubrics.rubric_3 !== undefined) {
        score += rubrics.rubric_3;
        count++;
      }
      if (rubrics.rubric_8 !== null && rubrics.rubric_8 !== undefined) {
        score += rubrics.rubric_8;
        count++;
      }
      
      return count > 0 ? (score / (count * 5)) * 100 : 0;
    });
    
    const previousScores = previousPeriod.map(debate => {
      if (!debate || !debate.rubrics) return 0;
      const rubrics = debate.rubrics;
      let score = 0;
      let count = 0;
      
      if (rubrics.rubric_1 !== null && rubrics.rubric_1 !== undefined) {
        score += rubrics.rubric_1;
        count++;
      }
      if (rubrics.rubric_3 !== null && rubrics.rubric_3 !== undefined) {
        score += rubrics.rubric_3;
        count++;
      }
      if (rubrics.rubric_8 !== null && rubrics.rubric_8 !== undefined) {
        score += rubrics.rubric_8;
        count++;
      }
      
      return count > 0 ? (score / (count * 5)) * 100 : 0;
    });
    
    const currentAvg = this.average(currentScores) || 0;
    const previousAvg = this.average(previousScores) || currentAvg * 0.9;
    
    const growthRate = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;
    const momentum = this.calculateMomentum(periods.map(p => 
      this.average(p.map(d => {
        if (!d.rubrics) return 0;
        let score = 0;
        let count = 0;
        if (d.rubrics.rubric_1 !== null && d.rubrics.rubric_1 !== undefined) {
          score += d.rubrics.rubric_1;
          count++;
        }
        if (d.rubrics.rubric_3 !== null && d.rubrics.rubric_3 !== undefined) {
          score += d.rubrics.rubric_3;
          count++;
        }
        if (d.rubrics.rubric_8 !== null && d.rubrics.rubric_8 !== undefined) {
          score += d.rubrics.rubric_8;
          count++;
        }
        return count > 0 ? (score / (count * 5)) * 100 : 0;
      }))
    ));
    
    const breakdown = this.analyzeStyleBreakdown(currentPeriod);
    
    return {
      score: Math.round(currentAvg),
      percentile: 0,
      growthRate: Math.round(growthRate * 10) / 10,
      momentum,
      trend: growthRate > 5 ? 'improving' : growthRate < -5 ? 'declining' : 'stable',
      consistency: this.calculateConsistency(currentScores),
      breakdown
    };
  }
  
  private calculateStrategyDimension(debates: any[], attendanceData: any[]): DimensionGrowth {
    if (!debates || debates.length === 0) {
      return this.getDefaultDimensionGrowth('strategy', attendanceData);
    }
    
    const periods = this.splitIntoPeriods(debates, 3);
    const currentPeriod = periods[periods.length - 1] || [];
    const previousPeriod = periods[periods.length - 2] || [];
    
    // Strategy calculation with conditional rebuttal
    const currentScores = currentPeriod.map(debate => {
      if (!debate || !debate.rubrics) return 0;
      const rubrics = debate.rubrics;
      let strategyScore = 0;
      let maxScore = 0;
      
      // Base strategy rubrics (POI + Team support - only if not N/A)
      let baseScore = 0;
      let baseCount = 0;
      
      if (rubrics.rubric_2 !== null && rubrics.rubric_2 !== undefined) {
        baseScore += rubrics.rubric_2;
        baseCount++;
      }
      if (rubrics.rubric_6 !== null && rubrics.rubric_6 !== undefined) {
        baseScore += rubrics.rubric_6;
        baseCount++;
      }
      
      strategyScore += baseScore;
      maxScore += baseCount * 5;
      
      // Rebuttal contribution to strategy (conditional, only if not N/A)
      if (rubrics.rubric_7 !== null && rubrics.rubric_7 !== undefined) {
        const rebuttalScore = rubrics.rubric_7;
        if (rebuttalScore === 5) {
          // Full rebuttal mastery = 20% of rebuttal score goes to strategy
          const bonus = rebuttalScore * 0.2; // 20% of 5 = 1 point
          strategyScore += bonus;
          maxScore += bonus; // Increase max to account for bonus
        } else if (rebuttalScore === 4) {
          // Good rebuttal = 10% of rebuttal score goes to strategy
          const bonus = rebuttalScore * 0.1; // 10% of 4 = 0.4 points
          strategyScore += bonus;
          maxScore += bonus; // Increase max to account for bonus
        }
        // If rebuttal < 4, no contribution to strategy
      }
      
      return maxScore > 0 ? (strategyScore / maxScore) * 100 : 0;
    });
    
    const previousScores = previousPeriod.map(debate => {
      if (!debate || !debate.rubrics) return 0;
      const rubrics = debate.rubrics;
      let strategyScore = 0;
      let maxScore = 0;
      
      // Base strategy rubrics (only if not N/A)
      let baseScore = 0;
      let baseCount = 0;
      
      if (rubrics.rubric_2 !== null && rubrics.rubric_2 !== undefined) {
        baseScore += rubrics.rubric_2;
        baseCount++;
      }
      if (rubrics.rubric_6 !== null && rubrics.rubric_6 !== undefined) {
        baseScore += rubrics.rubric_6;
        baseCount++;
      }
      
      strategyScore += baseScore;
      maxScore += baseCount * 5;
      
      // Rebuttal contribution (only if not N/A)
      if (rubrics.rubric_7 !== null && rubrics.rubric_7 !== undefined) {
        const rebuttalScore = rubrics.rubric_7;
        if (rebuttalScore === 5) {
        const bonus = rebuttalScore * 0.2; // 20% of 5 = 1 point
        strategyScore += bonus;
        maxScore += bonus;
        } else if (rebuttalScore === 4) {
          const bonus = rebuttalScore * 0.1; // 10% of 4 = 0.4 points
          strategyScore += bonus;
          maxScore += bonus;
        }
      }
      
      return maxScore > 0 ? (strategyScore / maxScore) * 100 : 0;
    });
    
    const currentAvg = this.average(currentScores) || 0;
    const previousAvg = this.average(previousScores) || currentAvg * 0.9;
    
    const growthRate = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;
    const momentum = this.calculateMomentum(periods.map(p => 
      this.average(p.map(d => {
        if (!d.rubrics) return 0;
        let score = 0;
        let count = 0;
        if (d.rubrics.rubric_2 !== null && d.rubrics.rubric_2 !== undefined) {
          score += d.rubrics.rubric_2;
          count++;
        }
        if (d.rubrics.rubric_6 !== null && d.rubrics.rubric_6 !== undefined) {
          score += d.rubrics.rubric_6;
          count++;
        }
        return count > 0 ? (score / (count * 5)) * 100 : 0;
      }))
    ));
    
    const breakdown = this.analyzeStrategyBreakdown(currentPeriod);
    
    return {
      score: Math.round(currentAvg),
      percentile: 0,
      growthRate: Math.round(growthRate * 10) / 10,
      momentum,
      trend: growthRate > 5 ? 'improving' : growthRate < -5 ? 'declining' : 'stable',
      consistency: this.calculateConsistency(currentScores),
      breakdown
    };
  }
  
  // ==================== PRIMARY STUDENT CALCULATIONS ====================
  
  private async calculatePrimaryGrowth(
    studentId: string,
    studentName: string,
    feedbackData: any[],
    attendanceData: any[],
    historicalData: any[],
    timeframe: TimeFrame
  ): Promise<DebateGrowthData> {
    
    // Check if we have rubric scores (even for primary students)
    const hasRubricScores = feedbackData.some(f => f.rubricScores && typeof f.rubricScores === 'object');
    
    if (hasRubricScores) {
      // Use the same rubric-based calculation as secondary students
      console.log(`Primary student ${studentName} has rubric scores, using rubric-based calculation`);
      return this.calculateSecondaryGrowth(
        studentId,
        studentName,
        feedbackData,
        attendanceData,
        historicalData,
        timeframe
      );
    }
    
    // Fall back to qualitative analysis only if no rubrics available
    console.log(`Primary student ${studentName} has no rubric scores, using qualitative analysis`);
    
    // Analyze qualitative feedback
    const analyzedFeedback = feedbackData.map(f => this.analyzePrimaryFeedback(f));
    
    // Calculate dimensions based on keyword analysis
    const foundation = this.calculatePrimaryDimension('FOUNDATION', analyzedFeedback, attendanceData);
    const delivery = this.calculatePrimaryDimension('DELIVERY', analyzedFeedback, attendanceData);
    const argumentation = this.calculatePrimaryDimension('ARGUMENTATION', analyzedFeedback, attendanceData);
    
    // Map to standard dimensions
    const content = {
      ...argumentation,
      score: argumentation.score
    };
    
    const style = {
      ...delivery,
      score: delivery.score
    };
    
    const strategy = {
      ...foundation,
      score: foundation.score
    };
    
    // Calculate overall
    const overallScore = (
      content.score * 0.40 +
      style.score * 0.40 +
      strategy.score * 0.20
    );
    
    const overallGrowthRate = (
      content.growthRate * 0.40 +
      style.growthRate * 0.40 +
      strategy.growthRate * 0.20
    );
    
    // Generate history from analyzed feedback
    const history = this.generatePrimaryHistory(analyzedFeedback);
    
    // Calculate trajectory
    const trajectory = this.calculateTrajectory(history, overallGrowthRate);
    
    return {
      studentId,
      studentName,
      level: 'primary',
      timeframe,
      content,
      style,
      strategy,
      overall: {
        score: Math.round(overallScore),
        percentile: 0,
        growthRate: overallGrowthRate,
        level: this.getPerformanceLevel(overallScore),
        description: this.generateDescription(overallScore, overallGrowthRate)
      },
      history,
      trajectory,
      recommendations: [],
      milestones: []
    };
  }
  
  private analyzePrimaryFeedback(feedback: any) {
    const content = feedback.content?.toLowerCase() || '';
    const strengthsSection = this.extractSection(content, 'strengths');
    const improvementsSection = this.extractSection(content, 'areas for improvement');
    
    const scores = {
      foundation: 0,
      delivery: 0,
      argumentation: 0
    };
    
    // Analyze each dimension
    if (DEBATE_MODEL.PRIMARY) {
      try {
        Object.entries(DEBATE_MODEL.PRIMARY).forEach(([key, config]) => {
          if (!config || !config.keywords) return;
        
        let positiveScore = 0;
        let negativeScore = 0;
        
        if (config.keywords.positive && Array.isArray(config.keywords.positive)) {
          config.keywords.positive.forEach(keyword => {
            if (strengthsSection.includes(keyword)) {
              positiveScore += 2;
            }
          });
        }
        
        if (config.keywords.negative && Array.isArray(config.keywords.negative)) {
          config.keywords.negative.forEach(keyword => {
            if (improvementsSection.includes(keyword)) {
              negativeScore += 1;
            }
          });
        }
        
          const total = positiveScore + negativeScore;
          scores[key.toLowerCase()] = total > 0 ? (positiveScore / total) * 100 : 50;
        });
      } catch (e) {
        // Silently handle any Object.entries errors
      }
    }
    
    return {
      date: feedback.feedbackDate || feedback.createdAt,
      scores,
      speakingTime: this.extractSpeakingTime(content),
      rawFeedback: feedback.content
    };
  }
  
  private calculatePrimaryDimension(
    dimension: string,
    analyzedFeedback: any[],
    attendanceData: any[]
  ): DimensionGrowth {
    const config = DEBATE_MODEL.PRIMARY[dimension];
    
    // Fallback if config not found
    if (!config) {
      return this.getDefaultDimensionGrowth(dimension.toLowerCase(), attendanceData);
    }
    
    const periods = this.splitIntoPeriods(analyzedFeedback, 3);
    
    const currentPeriod = periods[periods.length - 1] || [];
    const previousPeriod = periods[periods.length - 2] || [];
    
    const currentScores = currentPeriod.map(f => f.scores[dimension.toLowerCase()]);
    const previousScores = previousPeriod.map(f => f.scores[dimension.toLowerCase()]);
    
    // Blend with attendance data
    const attendanceScore = this.calculateAttendanceScore(
      attendanceData,
      config.attendanceMetric || 'applicationSkills'
    );
    
    const currentAvg = this.average(currentScores) || 50;
    const previousAvg = this.average(previousScores) || currentAvg * 0.9;
    
    // Weight: 60% feedback analysis, 40% attendance
    const blendedCurrent = (currentAvg * 0.6) + (attendanceScore * 0.4);
    const blendedPrevious = (previousAvg * 0.6) + (attendanceScore * 0.9 * 0.4);
    
    const growthRate = blendedPrevious > 0 
      ? ((blendedCurrent - blendedPrevious) / blendedPrevious) * 100 
      : 0;
    
    return {
      score: Math.round(blendedCurrent),
      percentile: 0,
      growthRate: Math.round(growthRate * 10) / 10,
      momentum: this.calculateMomentum(periods.map(p => 
        this.average(p.map(f => f.scores[dimension.toLowerCase()]))
      )),
      trend: growthRate > 5 ? 'improving' : growthRate < -5 ? 'declining' : 'stable',
      consistency: this.calculateConsistency(currentScores)
    };
  }
  
  // ==================== HELPER FUNCTIONS ====================
  
  private getStartDate(timeframe: TimeFrame): Date {
    const now = new Date();
    switch (timeframe) {
      case 'week': return subWeeks(now, 1);
      case 'month': return subMonths(now, 1);
      case 'term': return subMonths(now, 3);
      case 'year': return subMonths(now, 12);
      default: return subMonths(now, 1);
    }
  }
  
  private async getStudentInfo(studentId: string) {
    const result = await drizzleDb
      .select({
        name: users.name,
        gradeLevel: students.gradeLevel,
        studentNumber: students.studentNumber
      })
      .from(students)
      .innerJoin(users, eq(students.id, users.id))
      .where(eq(students.id, studentId))
      .limit(1);
    
    return result[0] || { name: 'Unknown', gradeLevel: 'Unknown', studentNumber: 'Unknown' };
  }
  
  private isSecondaryStudent(gradeLevel: string): boolean {
    const grade = parseInt(gradeLevel.replace(/\D/g, ''));
    return grade >= 7;
  }
  
  private async fetchFeedbackData(studentId: string, startDate: Date) {
    // Fetch ALL feedback for the student, not just recent
    // (Most feedback was imported from historical data)
    return await drizzleDb
      .select()
      .from(parsedStudentFeedback)
      .where(eq(parsedStudentFeedback.studentId, studentId))
      .orderBy(desc(parsedStudentFeedback.createdAt));
  }
  
  private async fetchAttendanceData(studentId: string, startDate: Date) {
    // Fetch all attendance, not filtered by date
    return await drizzleDb
      .select({
        id: attendances.id,
        sessionId: attendances.sessionId,
        attitudeEfforts: attendances.attitudeEfforts,
        askingQuestions: attendances.askingQuestions,
        applicationSkills: attendances.applicationSkills,
        applicationFeedback: attendances.applicationFeedback,
        createdAt: attendances.createdAt
      })
      .from(attendances)
      .where(eq(attendances.studentId, studentId))
      .orderBy(desc(attendances.createdAt));
  }
  
  private async fetchHistoricalData(studentId: string) {
    return await drizzleDb
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
  
  private splitIntoPeriods<T>(data: T[], numPeriods: number): T[][] {
    if (data.length === 0) return [];
    
    const periodSize = Math.ceil(data.length / numPeriods);
    const periods: T[][] = [];
    
    for (let i = 0; i < numPeriods; i++) {
      const start = i * periodSize;
      const end = Math.min(start + periodSize, data.length);
      if (start < data.length) {
        periods.push(data.slice(start, end));
      }
    }
    
    return periods;
  }
  
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
  
  private calculateConsistency(scores: number[]): number {
    if (scores.length < 2) return 100;
    
    const avg = this.average(scores);
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert to 0-100 scale where 100 is most consistent
    return Math.max(0, Math.min(100, 100 - (stdDev * 2)));
  }
  
  private calculateMomentum(periodAverages: number[]): number {
    if (periodAverages.length < 3) return 0;
    
    const recent = periodAverages[periodAverages.length - 1] || 0;
    const previous = periodAverages[periodAverages.length - 2] || 0;
    const older = periodAverages[periodAverages.length - 3] || 0;
    
    const recentGrowth = recent - previous;
    const previousGrowth = previous - older;
    
    return recentGrowth - previousGrowth; // Positive = accelerating
  }
  
  private calculateAttendanceScore(attendanceData: any[], metric: string): number {
    const scores = attendanceData.map(a => a[metric]).filter(s => s != null);
    if (scores.length === 0) return 50;
    
    const avg = this.average(scores);
    return (avg / 5) * 100; // Convert 1-5 scale to 0-100
  }
  
  private extractSection(content: string, sectionName: string): string {
    const regex = new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?:\\n\\n|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].toLowerCase() : '';
  }
  
  private extractSpeakingTime(content: string): number | null {
    const regex = /speaking time[:\s]*(\d+):(\d+)/i;
    const match = content.match(regex);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return null;
  }
  
  private getPerformanceLevel(score: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (score < 25) return 'beginner';
    if (score < 50) return 'intermediate';
    if (score < 75) return 'advanced';
    return 'expert';
  }
  
  private generateDescription(score: number, growthRate: number): string {
    const level = this.getPerformanceLevel(score);
    
    if (growthRate > 10) {
      return `Exceptional growth at ${level} level! Rapid improvement across all dimensions.`;
    } else if (growthRate > 5) {
      return `Strong progress at ${level} level. Consistent improvement showing great potential.`;
    } else if (growthRate > 0) {
      return `Steady development at ${level} level. Building solid foundations for future growth.`;
    } else if (growthRate > -5) {
      return `Maintaining ${level} level. Focus on consistent practice to accelerate growth.`;
    } else {
      return `Currently at ${level} level. Time to refocus and address fundamental challenges.`;
    }
  }
  
  private getDefaultDimensionGrowth(dimension: string, attendanceData: any[]): DimensionGrowth {
    // Fallback when no rubric data available
    const attendanceScore = this.calculateAttendanceScore(
      attendanceData,
      dimension === 'content' ? 'applicationFeedback' :
      dimension === 'style' ? 'applicationSkills' : 'askingQuestions'
    );
    
    return {
      score: Math.round(attendanceScore),
      percentile: 50,
      growthRate: 0,
      momentum: 0,
      trend: 'stable',
      consistency: 75
    };
  }
  
  // ==================== ANALYSIS FUNCTIONS ====================
  
  private analyzeContentBreakdown(debates: any[]) {
    const components: Record<string, number> = {};
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    if (!debates || debates.length === 0) return { components, strengths, weaknesses };
    
    // Filter out debates without rubrics
    const validDebates = debates.filter(d => d && d.rubrics);
    if (validDebates.length === 0) return { components, strengths, weaknesses };
    
    // Average scores for each component (excluding N/A values)
    const argQualityScores = validDebates
      .map(d => d.rubrics?.rubric_4)
      .filter(s => s !== null && s !== undefined);
    const theoryScores = validDebates
      .map(d => d.rubrics?.rubric_5)
      .filter(s => s !== null && s !== undefined);
    const rebuttalScores = validDebates
      .map(d => d.rubrics?.rubric_7)
      .filter(s => s !== null && s !== undefined);
    
    const avgArgumentQuality = argQualityScores.length > 0 ? this.average(argQualityScores) : 0;
    const avgTheoryApplication = theoryScores.length > 0 ? this.average(theoryScores) : 0;
    const avgRebuttal = rebuttalScores.length > 0 ? this.average(rebuttalScores) : 0;
    
    components['Argument Quality'] = Math.round((avgArgumentQuality / 5) * 100);
    components['Theory Application'] = Math.round((avgTheoryApplication / 5) * 100);
    components['Rebuttal'] = Math.round((avgRebuttal / 5) * 100);
    
    // Identify strengths and weaknesses
    if (avgArgumentQuality >= 4) strengths.push('Strong argument construction');
    if (avgArgumentQuality <= 2) weaknesses.push('Argument quality needs improvement');
    
    if (avgTheoryApplication >= 4) strengths.push('Excellent theory application');
    if (avgTheoryApplication <= 2) weaknesses.push('Work on applying debate theory');
    
    if (avgRebuttal >= 4) strengths.push('Powerful rebuttals');
    if (avgRebuttal <= 2) weaknesses.push('Rebuttal skills need development');
    
    return { components, strengths, weaknesses };
  }
  
  private analyzeStyleBreakdown(debates: any[]) {
    const components: Record<string, number> = {};
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    if (!debates || debates.length === 0) return { components, strengths, weaknesses };
    
    // Filter out debates without rubrics
    const validDebates = debates.filter(d => d && d.rubrics);
    if (validDebates.length === 0) return { components, strengths, weaknesses };
    
    // Average scores excluding N/A values
    const timeScores = validDebates
      .map(d => d.rubrics?.rubric_1)
      .filter(s => s !== null && s !== undefined);
    const persuasionScores = validDebates
      .map(d => d.rubrics?.rubric_3)
      .filter(s => s !== null && s !== undefined);
    const feedbackScores = validDebates
      .map(d => d.rubrics?.rubric_8)
      .filter(s => s !== null && s !== undefined);
    
    const avgTimeManagement = timeScores.length > 0 ? this.average(timeScores) : 0;
    const avgPersuasion = persuasionScores.length > 0 ? this.average(persuasionScores) : 0;
    const avgFeedbackApplication = feedbackScores.length > 0 ? this.average(feedbackScores) : 0;
    
    components['Time Management'] = Math.round((avgTimeManagement / 5) * 100);
    components['Persuasion'] = Math.round((avgPersuasion / 5) * 100);
    components['Improvement'] = Math.round((avgFeedbackApplication / 5) * 100);
    
    if (avgTimeManagement >= 4) strengths.push('Excellent time management');
    if (avgTimeManagement <= 2) weaknesses.push('Work on speech timing');
    
    if (avgPersuasion >= 4) strengths.push('Highly persuasive delivery');
    if (avgPersuasion <= 2) weaknesses.push('Enhance persuasive impact');
    
    if (avgFeedbackApplication >= 4) strengths.push('Great at applying feedback');
    if (avgFeedbackApplication <= 2) weaknesses.push('Focus on implementing feedback');
    
    return { components, strengths, weaknesses };
  }
  
  private analyzeStrategyBreakdown(debates: any[]) {
    const components: Record<string, number> = {};
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    if (!debates || debates.length === 0) return { components, strengths, weaknesses };
    
    // Filter out debates without rubrics
    const validDebates = debates.filter(d => d && d.rubrics);
    if (validDebates.length === 0) return { components, strengths, weaknesses };
    
    // Average scores excluding N/A values
    const poiScores = validDebates
      .map(d => d.rubrics?.rubric_2)
      .filter(s => s !== null && s !== undefined);
    const teamScores = validDebates
      .map(d => d.rubrics?.rubric_6)
      .filter(s => s !== null && s !== undefined);
    const rebuttalScores = validDebates
      .map(d => d.rubrics?.rubric_7)
      .filter(s => s !== null && s !== undefined);
    
    const avgPOI = poiScores.length > 0 ? this.average(poiScores) : 0;
    const avgTeamSupport = teamScores.length > 0 ? this.average(teamScores) : 0;
    const avgRebuttal = rebuttalScores.length > 0 ? this.average(rebuttalScores) : 0;
    
    components['POI Engagement'] = Math.round((avgPOI / 5) * 100);
    components['Team Support'] = Math.round((avgTeamSupport / 5) * 100);
    
    // Conditional rebuttal contribution
    if (avgRebuttal >= 4) {
      components['Strategic Rebuttal'] = avgRebuttal === 5 ? 100 : 50;
    }
    
    if (avgPOI >= 4) strengths.push('Active POI engagement');
    if (avgPOI <= 2) weaknesses.push('Increase POI participation');
    
    if (avgTeamSupport >= 4) strengths.push('Excellent team player');
    if (avgTeamSupport <= 2) weaknesses.push('Strengthen team coordination');
    
    return { components, strengths, weaknesses };
  }
  
  // ==================== HISTORY & TRAJECTORY ====================
  
  private generateHistoryFromDebates(debates: any[]) {
    const weeklyData = new Map<string, any[]>();
    
    debates.forEach(debate => {
      if (!debate.date) return;
      
      const dateValue = new Date(debate.date);
      if (isNaN(dateValue.getTime())) return;
      
      const weekKey = format(dateValue, 'yyyy-ww');
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      weeklyData.get(weekKey)!.push(debate);
    });
    
    return Array.from(weeklyData.entries()).map(([week, weekDebates]) => {
      const avgContent = this.average(weekDebates.map(d => {
        const r = d.rubrics;
        if (!r) return 0;
        let score = 0, count = 0;
        if (r.rubric_4 !== null && r.rubric_4 !== undefined) { score += r.rubric_4; count++; }
        if (r.rubric_5 !== null && r.rubric_5 !== undefined) { score += r.rubric_5; count++; }
        if (r.rubric_7 !== null && r.rubric_7 !== undefined) { score += r.rubric_7; count++; }
        return count > 0 ? (score / (count * 5)) * 100 : 0;
      }));
      
      const avgStyle = this.average(weekDebates.map(d => {
        const r = d.rubrics;
        if (!r) return 0;
        let score = 0, count = 0;
        if (r.rubric_1 !== null && r.rubric_1 !== undefined) { score += r.rubric_1; count++; }
        if (r.rubric_3 !== null && r.rubric_3 !== undefined) { score += r.rubric_3; count++; }
        if (r.rubric_8 !== null && r.rubric_8 !== undefined) { score += r.rubric_8; count++; }
        return count > 0 ? (score / (count * 5)) * 100 : 0;
      }));
      
      const avgStrategy = this.average(weekDebates.map(d => {
        const r = d.rubrics;
        if (!r) return 0;
        let score = 0, count = 0;
        if (r.rubric_2 !== null && r.rubric_2 !== undefined) { score += r.rubric_2; count++; }
        if (r.rubric_6 !== null && r.rubric_6 !== undefined) { score += r.rubric_6; count++; }
        const base = count > 0 ? (score / (count * 5)) * 100 : 0;
        const rebuttalBonus = r.rubric_7 === 5 ? 20 : r.rubric_7 === 4 ? 10 : 0;
        return Math.min(100, base + rebuttalBonus);
      }));
      
      const overall = avgContent * 0.4 + avgStyle * 0.4 + avgStrategy * 0.2;
      
      return {
        date: week,
        content: Math.round(avgContent),
        style: Math.round(avgStyle),
        strategy: Math.round(avgStrategy),
        overall: Math.round(overall)
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }
  
  private generatePrimaryHistory(analyzedFeedback: any[]) {
    const weeklyData = new Map<string, any[]>();
    
    analyzedFeedback.forEach(feedback => {
      if (!feedback.date) return;
      
      const dateValue = new Date(feedback.date);
      if (isNaN(dateValue.getTime())) return;
      
      const weekKey = format(dateValue, 'yyyy-ww');
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      weeklyData.get(weekKey)!.push(feedback);
    });
    
    return Array.from(weeklyData.entries()).map(([week, weekFeedback]) => {
      const avgFoundation = this.average(weekFeedback.map(f => f.scores.foundation));
      const avgDelivery = this.average(weekFeedback.map(f => f.scores.delivery));
      const avgArgumentation = this.average(weekFeedback.map(f => f.scores.argumentation));
      
      // Map to standard dimensions
      const content = avgArgumentation;
      const style = avgDelivery;
      const strategy = avgFoundation;
      
      const overall = content * 0.4 + style * 0.4 + strategy * 0.2;
      
      return {
        date: week,
        content: Math.round(content),
        style: Math.round(style),
        strategy: Math.round(strategy),
        overall: Math.round(overall)
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }
  
  private calculateTrajectory(history: any[], currentGrowthRate: number) {
    const currentScore = history.length > 0 
      ? history[history.length - 1].overall 
      : 50;
    
    // Simple linear projection with decay
    const monthlyGrowth = currentGrowthRate * 0.8; // Assume 80% of current rate
    const quarterlyGrowth = currentGrowthRate * 0.6; // Decay over time
    
    return {
      nextMonth: Math.min(100, Math.round(currentScore + monthlyGrowth)),
      nextQuarter: Math.min(100, Math.round(currentScore + (quarterlyGrowth * 3))),
      confidence: Math.min(90, Math.round(70 + (history.length * 2))) // More data = higher confidence
    };
  }
  
  // ==================== PEER COMPARISON ====================
  
  private async addPeerComparison(growthData: DebateGrowthData, gradeLevel: string) {
    // Fetch peer averages
    const peerData = await drizzleDb
      .select({
        studentId: attendances.studentId,
        avgAttitudeEfforts: sql<number>`avg(${attendances.attitudeEfforts})`,
        avgAskingQuestions: sql<number>`avg(${attendances.askingQuestions})`,
        avgApplicationSkills: sql<number>`avg(${attendances.applicationSkills})`,
        avgApplicationFeedback: sql<number>`avg(${attendances.applicationFeedback})`
      })
      .from(attendances)
      .innerJoin(students, eq(attendances.studentId, students.id))
      .where(eq(students.gradeLevel, gradeLevel))
      .groupBy(attendances.studentId);
    
    // Calculate percentiles
    const overallScores = peerData.map(p => {
      const avg = (
        (p.avgAttitudeEfforts || 0) +
        (p.avgAskingQuestions || 0) +
        (p.avgApplicationSkills || 0) +
        (p.avgApplicationFeedback || 0)
      ) / 4;
      return (avg / 5) * 100;
    });
    
    growthData.overall.percentile = this.calculatePercentile(
      growthData.overall.score,
      overallScores
    );
    
    // Add percentiles for each dimension
    growthData.content.percentile = this.calculatePercentile(
      growthData.content.score,
      overallScores // Simplified - could be more specific
    );
    
    growthData.style.percentile = this.calculatePercentile(
      growthData.style.score,
      overallScores
    );
    
    growthData.strategy.percentile = this.calculatePercentile(
      growthData.strategy.score,
      overallScores
    );
    
    return growthData;
  }
  
  private calculatePercentile(value: number, dataset: number[]): number {
    if (dataset.length === 0) return 50;
    
    const sorted = [...dataset].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    
    if (index === -1) return 100;
    if (index === 0) return 0;
    
    return Math.round((index / dataset.length) * 100);
  }
  
  // ==================== RECOMMENDATIONS ====================
  
  private generateRecommendations(growthData: DebateGrowthData): any[] {
    const recommendations = [];
    
    // Find weakest dimension
    const dimensions = [
      { name: 'content', data: growthData.content },
      { name: 'style', data: growthData.style },
      { name: 'strategy', data: growthData.strategy }
    ];
    
    dimensions.sort((a, b) => a.data.score - b.data.score);
    const weakest = dimensions[0];
    
    // Generate specific recommendations based on weakness
    if (weakest.name === 'content' && weakest.data.score < 60) {
      recommendations.push({
        priority: 'high' as const,
        dimension: 'content' as const,
        action: 'Focus on argument depth and evidence quality',
        timeline: '2 weeks intensive practice',
        measurableGoal: `Increase content score from ${weakest.data.score} to ${weakest.data.score + 15}`
      });
    }
    
    if (weakest.name === 'style' && weakest.data.score < 60) {
      recommendations.push({
        priority: 'high' as const,
        dimension: 'style' as const,
        action: 'Work on delivery, timing, and persuasive impact',
        timeline: '2 weeks focused practice',
        measurableGoal: `Improve style score from ${weakest.data.score} to ${weakest.data.score + 15}`
      });
    }
    
    if (weakest.name === 'strategy' && weakest.data.score < 50) {
      recommendations.push({
        priority: 'high' as const,
        dimension: 'strategy' as const,
        action: 'Enhance POI engagement and team coordination',
        timeline: '3 weeks of team practice',
        measurableGoal: `Boost strategy score from ${weakest.data.score} to ${weakest.data.score + 20}`
      });
    }
    
    // Add momentum-based recommendations
    if (growthData.overall.growthRate < 0) {
      recommendations.push({
        priority: 'high' as const,
        dimension: dimensions[0].name as DebateDimension,
        action: 'Address performance plateau with intensive practice',
        timeline: 'Immediate action required',
        measurableGoal: 'Restore positive growth trajectory within 2 weeks'
      });
    }
    
    return recommendations;
  }
  
  // ==================== MILESTONES ====================
  
  private calculateMilestones(growthData: DebateGrowthData): any[] {
    const milestones = [];
    const thresholds = [25, 50, 75, 90];
    
    ['content', 'style', 'strategy'].forEach(dimension => {
      const current = growthData[dimension].score;
      const growth = growthData[dimension].growthRate;
      
      for (const threshold of thresholds) {
        if (current < threshold) {
          const weeksNeeded = growth > 0 
            ? Math.ceil((threshold - current) / (growth / 4)) 
            : 999;
          
          milestones.push({
            dimension,
            milestone: `Reach ${threshold}% in ${dimension}`,
            achievedDate: undefined,
            targetDate: weeksNeeded < 52 
              ? new Date(Date.now() + weeksNeeded * 7 * 24 * 60 * 60 * 1000)
              : undefined
          });
          break; // Only show next milestone
        }
      }
    });
    
    return milestones;
  }
}

// Export singleton instance
export const debateGrowthEngine = new DebateGrowthEngine();