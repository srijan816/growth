import { StoredStudentFeedback } from './feedback-storage';

export interface StudentMetrics {
  studentName: string;
  totalSessions: number;
  averageProgress: number;
  recentTrend: 'improving' | 'stable' | 'declining';
  strengths: string[];
  challengeAreas: string[];
  consistencyScore: number;
  engagementLevel: number;
}

export interface AttentionNeededStudent {
  studentName: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
  suggestedAction: string;
  recentFeedback: string[];
  unitNumber: string;
}

export interface KeyInsight {
  type: 'skill' | 'class' | 'trend' | 'achievement';
  title: string;
  description: string;
  affectedStudents: number;
  metric?: number;
  unit?: string;
}

export interface SuccessStory {
  studentName: string;
  achievement: string;
  metric: string;
  improvement: number;
  readyForNext: string;
  badge?: 'top10' | 'mostImproved' | 'consistent' | 'breakthrough';
}

// Baseline metrics for different levels
const BASELINE_METRICS = {
  primary: {
    minEngagement: 3.0,
    expectedProgress: 0.3, // points per unit
    consistencyThreshold: 0.7,
    speechDurationTarget: 3, // minutes
    participationRate: 0.6
  },
  secondary: {
    minEngagement: 3.5,
    expectedProgress: 0.4,
    consistencyThreshold: 0.8,
    speechDurationTarget: 5,
    participationRate: 0.7
  }
};

// Keywords for identifying different aspects
const SKILL_KEYWORDS = {
  strengths: {
    'Argument Structure': ['clear argument', 'well-structured', 'logical', 'good claims', 'strong evidence'],
    'Voice Projection': ['loud', 'clear voice', 'good volume', 'audible', 'strong voice'],
    'Confidence': ['confident', 'comfortable', 'poised', 'assured', 'natural'],
    'Hook Development': ['engaging opening', 'good hook', 'strong start', 'captured attention'],
    'Time Management': ['good timing', 'well-paced', 'used time well', 'appropriate length'],
    'Eye Contact': ['good eye contact', 'engaged audience', 'looked at audience'],
    'Theory Application': ['applied theory', 'used concepts', 'demonstrated understanding'],
    'Rebuttal': ['strong rebuttal', 'responded well', 'countered effectively']
  },
  challenges: {
    'Argument Structure': ['unclear argument', 'needs structure', 'confusing', 'lacks evidence', 'weak claims'],
    'Voice Projection': ['too quiet', 'speak louder', 'hard to hear', 'volume', 'projection'],
    'Confidence': ['nervous', 'hesitant', 'uncertain', 'shy', 'needs confidence'],
    'Hook Development': ['weak opening', 'needs hook', 'slow start', 'improve beginning'],
    'Time Management': ['too short', 'too long', 'rushed', 'time management', 'pacing'],
    'Eye Contact': ['look at audience', 'more eye contact', 'reading too much', 'engage audience'],
    'Speed': ['too fast', 'slow down', 'speaking quickly', 'pace yourself'],
    'Clarity': ['unclear', 'mumbling', 'articulation', 'pronunciation']
  }
};

export class FeedbackAnalyzer {
  
  /**
   * Analyze all students and categorize them
   */
  async analyzeStudents(feedbackData: Map<string, StoredStudentFeedback[]>): Promise<{
    attentionNeeded: AttentionNeededStudent[];
    keyInsights: KeyInsight[];
    successStories: SuccessStory[];
  }> {
    const studentMetrics = new Map<string, StudentMetrics>();
    
    // Calculate metrics for each student
    for (const [studentName, feedbacks] of feedbackData) {
      const metrics = this.calculateStudentMetrics(studentName, feedbacks);
      studentMetrics.set(studentName, metrics);
    }
    
    // Identify students needing attention
    const attentionNeeded = this.identifyAttentionNeeded(studentMetrics, feedbackData);
    
    // Extract key insights
    const keyInsights = this.extractKeyInsights(studentMetrics, feedbackData);
    
    // Find success stories
    const successStories = this.findSuccessStories(studentMetrics, feedbackData);
    
    return {
      attentionNeeded,
      keyInsights,
      successStories
    };
  }
  
  /**
   * Calculate comprehensive metrics for a student
   */
  private calculateStudentMetrics(studentName: string, feedbacks: StoredStudentFeedback[]): StudentMetrics {
    if (feedbacks.length === 0) {
      return {
        studentName,
        totalSessions: 0,
        averageProgress: 0,
        recentTrend: 'stable',
        strengths: [],
        challengeAreas: [],
        consistencyScore: 0,
        engagementLevel: 0
      };
    }
    
    // Determine level from feedback type
    const level = feedbacks[0].feedback_type === 'primary' ? 'primary' : 'secondary';
    const baseline = BASELINE_METRICS[level];
    
    // Extract strengths and challenges
    const { strengths, challenges } = this.extractSkillsFromFeedback(feedbacks);
    
    // Calculate progress trend
    const recentTrend = this.calculateTrend(feedbacks);
    
    // Calculate consistency
    const consistencyScore = this.calculateConsistency(feedbacks);
    
    // Calculate engagement level
    const engagementLevel = this.calculateEngagement(feedbacks);
    
    // Calculate average progress
    const averageProgress = this.calculateAverageProgress(feedbacks);
    
    return {
      studentName,
      totalSessions: feedbacks.length,
      averageProgress,
      recentTrend,
      strengths: Array.from(strengths),
      challengeAreas: Array.from(challenges),
      consistencyScore,
      engagementLevel
    };
  }
  
  /**
   * Extract skills mentioned in feedback
   */
  private extractSkillsFromFeedback(feedbacks: StoredStudentFeedback[]): {
    strengths: Set<string>;
    challenges: Set<string>;
  } {
    const strengths = new Set<string>();
    const challenges = new Set<string>();
    
    for (const feedback of feedbacks) {
      const content = feedback.content.toLowerCase();
      const bestAspects = (feedback.best_aspects || '').toLowerCase();
      const improvements = (feedback.improvement_areas || '').toLowerCase();
      const teacherComments = (feedback.teacher_comments || '').toLowerCase();
      
      // Check for strengths
      for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS.strengths)) {
        if (keywords.some(kw => 
          bestAspects.includes(kw) || 
          content.includes(kw) ||
          teacherComments.includes(kw)
        )) {
          strengths.add(skill);
        }
      }
      
      // Check for challenges
      for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS.challenges)) {
        if (keywords.some(kw => 
          improvements.includes(kw) || 
          content.includes(kw) ||
          teacherComments.includes(kw)
        )) {
          challenges.add(skill);
        }
      }
    }
    
    return { strengths, challenges };
  }
  
  /**
   * Calculate trend based on recent feedback
   */
  private calculateTrend(feedbacks: StoredStudentFeedback[]): 'improving' | 'stable' | 'declining' {
    if (feedbacks.length < 3) return 'stable';
    
    // Look at last 3-5 feedbacks
    const recentCount = Math.min(5, Math.floor(feedbacks.length / 2));
    const recentFeedbacks = feedbacks.slice(-recentCount);
    
    let positiveIndicators = 0;
    let negativeIndicators = 0;
    
    for (let i = 1; i < recentFeedbacks.length; i++) {
      const current = recentFeedbacks[i];
      const previous = recentFeedbacks[i - 1];
      
      // Check for improvement language
      if (current.content.match(/improv|better|progress|develop|growth/i)) {
        positiveIndicators++;
      }
      
      // Check for concern language
      if (current.content.match(/still needs|continue to work|struggle|difficult/i)) {
        negativeIndicators++;
      }
      
      // Check if challenges are being resolved
      const currentChallenges = (current.improvement_areas || '').split(/[,;.]/).length;
      const previousChallenges = (previous.improvement_areas || '').split(/[,;.]/).length;
      
      if (currentChallenges < previousChallenges) {
        positiveIndicators++;
      } else if (currentChallenges > previousChallenges) {
        negativeIndicators++;
      }
    }
    
    if (positiveIndicators > negativeIndicators * 1.5) return 'improving';
    if (negativeIndicators > positiveIndicators * 1.5) return 'declining';
    return 'stable';
  }
  
  /**
   * Calculate consistency score
   */
  private calculateConsistency(feedbacks: StoredStudentFeedback[]): number {
    if (feedbacks.length < 2) return 0.5;
    
    // Check how consistent the feedback themes are
    const allThemes = new Set<string>();
    const themeFrequency = new Map<string, number>();
    
    for (const feedback of feedbacks) {
      const themes = this.extractThemes(feedback);
      themes.forEach(theme => {
        allThemes.add(theme);
        themeFrequency.set(theme, (themeFrequency.get(theme) || 0) + 1);
      });
    }
    
    // Calculate consistency as the ratio of persistent themes
    let consistentThemes = 0;
    for (const [theme, frequency] of themeFrequency) {
      if (frequency >= feedbacks.length * 0.5) {
        consistentThemes++;
      }
    }
    
    return allThemes.size > 0 ? consistentThemes / allThemes.size : 0.5;
  }
  
  /**
   * Calculate engagement level
   */
  private calculateEngagement(feedbacks: StoredStudentFeedback[]): number {
    let totalScore = 0;
    let count = 0;
    
    for (const feedback of feedbacks) {
      // Look for engagement indicators
      const content = feedback.content.toLowerCase();
      let score = 3; // baseline
      
      // Positive indicators
      if (content.match(/enthusiastic|engaged|active|participated|volunteered/i)) score += 1;
      if (content.match(/asked questions|contributed|shared ideas/i)) score += 0.5;
      if (content.match(/helped others|supported team|collaborative/i)) score += 0.5;
      
      // Negative indicators
      if (content.match(/quiet|reserved|hesitant|reluctant/i)) score -= 0.5;
      if (content.match(/distracted|unfocused|off-topic/i)) score -= 1;
      
      totalScore += Math.max(1, Math.min(5, score));
      count++;
    }
    
    return count > 0 ? totalScore / count : 3;
  }
  
  /**
   * Calculate average progress
   */
  private calculateAverageProgress(feedbacks: StoredStudentFeedback[]): number {
    if (feedbacks.length < 2) return 0;
    
    // Simple progress calculation based on reduction in improvement areas
    const first = feedbacks[0];
    const last = feedbacks[feedbacks.length - 1];
    
    const firstChallenges = (first.improvement_areas || '').split(/[,;.]/).filter(s => s.trim()).length;
    const lastChallenges = (last.improvement_areas || '').split(/[,;.]/).filter(s => s.trim()).length;
    
    const improvementRate = firstChallenges > 0 
      ? (firstChallenges - lastChallenges) / firstChallenges 
      : 0;
    
    return Math.max(0, Math.min(1, improvementRate));
  }
  
  /**
   * Extract themes from feedback
   */
  private extractThemes(feedback: StoredStudentFeedback): string[] {
    const themes: string[] = [];
    const content = (feedback.content + ' ' + (feedback.improvement_areas || '')).toLowerCase();
    
    // Check for common themes
    if (content.includes('hook') || content.includes('opening')) themes.push('hook');
    if (content.includes('volume') || content.includes('projection')) themes.push('volume');
    if (content.includes('structure') || content.includes('organization')) themes.push('structure');
    if (content.includes('time') || content.includes('duration')) themes.push('timing');
    if (content.includes('confidence') || content.includes('nervous')) themes.push('confidence');
    if (content.includes('eye contact') || content.includes('audience')) themes.push('engagement');
    
    return themes;
  }
  
  /**
   * Identify students needing attention
   */
  private identifyAttentionNeeded(
    studentMetrics: Map<string, StudentMetrics>,
    feedbackData: Map<string, StoredStudentFeedback[]>
  ): AttentionNeededStudent[] {
    const attentionNeeded: AttentionNeededStudent[] = [];
    
    for (const [studentName, metrics] of studentMetrics) {
      const feedbacks = feedbackData.get(studentName) || [];
      if (feedbacks.length === 0) continue;
      
      const level = feedbacks[0].feedback_type === 'primary' ? 'primary' : 'secondary';
      const baseline = BASELINE_METRICS[level];
      
      // Check various criteria for attention
      
      // 1. Declining trend
      if (metrics.recentTrend === 'declining' && feedbacks.length >= 3) {
        const recentFeedback = feedbacks.slice(-3).map(f => 
          f.improvement_areas || f.teacher_comments || ''
        );
        
        attentionNeeded.push({
          studentName,
          reason: 'Declining Performance Trend',
          severity: 'high',
          details: `Student showing decline over last ${Math.min(3, feedbacks.length)} sessions`,
          suggestedAction: '1-on-1 session to identify root causes and create improvement plan',
          recentFeedback,
          unitNumber: feedbacks[feedbacks.length - 1].unit_number
        });
      }
      
      // 2. Low engagement
      if (metrics.engagementLevel < baseline.minEngagement) {
        attentionNeeded.push({
          studentName,
          reason: 'Low Engagement',
          severity: 'medium',
          details: `Engagement level (${metrics.engagementLevel.toFixed(1)}) below expected (${baseline.minEngagement})`,
          suggestedAction: 'Interactive activities and peer collaboration to boost participation',
          recentFeedback: [feedbacks[feedbacks.length - 1].content],
          unitNumber: feedbacks[feedbacks.length - 1].unit_number
        });
      }
      
      // 3. Persistent challenges
      if (metrics.challengeAreas.length >= 3 && metrics.consistencyScore > 0.7) {
        const topChallenges = metrics.challengeAreas.slice(0, 3).join(', ');
        attentionNeeded.push({
          studentName,
          reason: 'Persistent Challenge Areas',
          severity: 'high',
          details: `Consistent issues with: ${topChallenges}`,
          suggestedAction: `Focus sessions on ${metrics.challengeAreas[0]} with structured practice`,
          recentFeedback: [feedbacks[feedbacks.length - 1].improvement_areas || ''],
          unitNumber: feedbacks[feedbacks.length - 1].unit_number
        });
      }
      
      // 4. Low progress rate
      if (metrics.averageProgress < baseline.expectedProgress && feedbacks.length >= 4) {
        attentionNeeded.push({
          studentName,
          reason: 'Below Expected Progress',
          severity: 'medium',
          details: `Progress rate (${(metrics.averageProgress * 100).toFixed(0)}%) below expected`,
          suggestedAction: 'Review learning objectives and adjust difficulty level',
          recentFeedback: [feedbacks[feedbacks.length - 1].teacher_comments || ''],
          unitNumber: feedbacks[feedbacks.length - 1].unit_number
        });
      }
    }
    
    // Sort by severity and limit to top items
    return attentionNeeded
      .sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 10);
  }
  
  /**
   * Extract key insights from the data
   */
  private extractKeyInsights(
    studentMetrics: Map<string, StudentMetrics>,
    feedbackData: Map<string, StoredStudentFeedback[]>
  ): KeyInsight[] {
    const insights: KeyInsight[] = [];
    
    // 1. Most improved skill across all students
    const skillImprovements = new Map<string, number>();
    for (const metrics of studentMetrics.values()) {
      metrics.strengths.forEach(skill => {
        skillImprovements.set(skill, (skillImprovements.get(skill) || 0) + 1);
      });
    }
    
    const topImprovedSkill = Array.from(skillImprovements.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topImprovedSkill) {
      insights.push({
        type: 'skill',
        title: `"${topImprovedSkill[0]}" is the most improved skill`,
        description: `${((topImprovedSkill[1] / studentMetrics.size) * 100).toFixed(0)}% of students showing growth in this area`,
        affectedStudents: topImprovedSkill[1],
        metric: (topImprovedSkill[1] / studentMetrics.size) * 100
      });
    }
    
    // 2. Class performance insights
    const classPerformance = new Map<string, { total: number; highPerformers: number }>();
    for (const [studentName, feedbacks] of feedbackData) {
      const metrics = studentMetrics.get(studentName);
      if (!metrics || feedbacks.length === 0) continue;
      
      const classCode = feedbacks[0].class_code;
      if (!classPerformance.has(classCode)) {
        classPerformance.set(classCode, { total: 0, highPerformers: 0 });
      }
      
      const perf = classPerformance.get(classCode)!;
      perf.total++;
      if (metrics.averageProgress > 0.5) perf.highPerformers++;
    }
    
    // Find best performing class
    let bestClass = { code: '', ratio: 0 };
    for (const [code, perf] of classPerformance) {
      const ratio = perf.highPerformers / perf.total;
      if (ratio > bestClass.ratio) {
        bestClass = { code, ratio };
      }
    }
    
    if (bestClass.code) {
      insights.push({
        type: 'class',
        title: `${bestClass.code} class leads in participation`,
        description: `Average rating: ${(bestClass.ratio * 5).toFixed(1)}/5 across all metrics`,
        affectedStudents: classPerformance.get(bestClass.code)!.total,
        metric: bestClass.ratio * 5
      });
    }
    
    // 3. Achievement milestones
    let completedFocusAreas = 0;
    for (const metrics of studentMetrics.values()) {
      // Check if student has mastered skills (few challenges, many strengths)
      if (metrics.strengths.length >= 3 && metrics.challengeAreas.length <= 1) {
        completedFocusAreas++;
      }
    }
    
    if (completedFocusAreas >= 3) {
      insights.push({
        type: 'achievement',
        title: `"Hook Development" focus area completed by ${completedFocusAreas} students`,
        description: 'Ready to advance to next skill level',
        affectedStudents: completedFocusAreas
      });
    }
    
    return insights.slice(0, 5);
  }
  
  /**
   * Find success stories
   */
  private findSuccessStories(
    studentMetrics: Map<string, StudentMetrics>,
    feedbackData: Map<string, StoredStudentFeedback[]>
  ): SuccessStory[] {
    const stories: SuccessStory[] = [];
    
    // Convert to array for sorting
    const metricsArray = Array.from(studentMetrics.entries());
    
    // 1. Most improved students
    const improvedStudents = metricsArray
      .filter(([_, m]) => m.recentTrend === 'improving' && m.averageProgress > 0.5)
      .sort((a, b) => b[1].averageProgress - a[1].averageProgress)
      .slice(0, 3);
    
    for (const [studentName, metrics] of improvedStudents) {
      const improvement = metrics.averageProgress * 2.5; // Convert to points scale
      stories.push({
        studentName,
        achievement: metrics.strengths[0] || 'Overall improvement',
        metric: `+${improvement.toFixed(1)}`,
        improvement: improvement,
        readyForNext: 'Ready for advanced techniques',
        badge: 'mostImproved'
      });
    }
    
    // 2. Top performers
    const topPerformers = metricsArray
      .filter(([_, m]) => m.strengths.length >= 4 && m.challengeAreas.length <= 1)
      .sort((a, b) => b[1].strengths.length - a[1].strengths.length)
      .slice(0, 2);
    
    for (const [studentName, metrics] of topPerformers) {
      const score = 8 + (metrics.strengths.length - 4) * 0.5;
      stories.push({
        studentName,
        achievement: 'Mastered multiple skill areas',
        metric: `${score.toFixed(1)}/10`,
        improvement: score,
        readyForNext: 'Ready for leadership roles',
        badge: 'top10'
      });
    }
    
    // 3. Breakthrough achievements
    for (const [studentName, metrics] of studentMetrics) {
      const feedbacks = feedbackData.get(studentName) || [];
      if (feedbacks.length < 2) continue;
      
      const latestFeedback = feedbacks[feedbacks.length - 1];
      
      // Check for breakthrough language
      if (latestFeedback.content.match(/breakthrough|excellent|mastered|outstanding/i)) {
        const achievement = latestFeedback.best_aspects?.split('.')[0] || 'Major breakthrough';
        stories.push({
          studentName,
          achievement,
          metric: '🎯',
          improvement: 3.0,
          readyForNext: 'Building on this success',
          badge: 'breakthrough'
        });
        break; // Only one breakthrough story
      }
    }
    
    return stories.slice(0, 5);
  }
}

export default FeedbackAnalyzer;