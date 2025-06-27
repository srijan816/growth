import { GoogleGenerativeAI } from '@google/generative-ai'
import { PromptManager } from './prompt-manager'

// Unified AI Analysis Service for Student Growth
// Combines recommendation generation, feedback analysis, and skill extraction

export interface StudentMetrics {
  overallScore: number
  growthRate: number
  consistencyScore: number
  engagementLevel: number
  trend: 'improving' | 'stable' | 'declining'
}

export interface SkillAssessment {
  skillName: string
  currentLevel: number
  progress: number
  consistency: 'high' | 'medium' | 'low'
  evidence: string[]
}

export interface AttentionIndicator {
  requiresAttention: boolean
  severity: 'high' | 'medium' | 'low' | 'none'
  primaryConcern: string
  specificIssues: string[]
  suggestedInterventions: string[]
  reasoning: string
}

export interface StudentAchievements {
  recentBreakthroughs: string[]
  masteredSkills: string[]
  notableImprovements: string[]
  readyForAdvancement: boolean
  recognitionSuggestions: string[]
  reasoning: string
}

export interface StudentAnalysis {
  studentMetrics: StudentMetrics
  skillAssessment: SkillAssessment[]
  attentionNeeded: AttentionIndicator
  achievements: StudentAchievements
  recommendations: {
    immediateActions: string[]
    skillFocusAreas: string[]
    practiceActivities: string[]
    parentCommunication: string
  }
}

export interface ClassInsights {
  classMetrics: {
    averageGrowthRate: number
    topPerformingSkill: string
    mostImprovedSkill: string
    commonChallenges: string[]
    classEngagementLevel: number
  }
  keyInsights: Array<{
    insight: string
    affectedStudents: number
    percentage: number
    recommendation: string
    reasoning: string
  }>
  celebrationPoints: Array<{
    achievement: string
    studentCount: number
    significance: string
  }>
}

export interface AIRecommendation {
  id: string
  studentId: string
  studentName: string
  growthArea: string
  priority: 'high' | 'medium' | 'low'
  category: 'skill-building' | 'practice' | 'mindset' | 'technique'
  recommendation: string
  specificActions: string[]
  timeframe: string
  measurableGoals: string[]
  resources: string[]
  instructorNotes: string
  confidence: number
  status: 'active' | 'completed' | 'archived'
  createdAt: Date
  updatedAt: Date
  progressUpdates?: Array<{
    date: Date
    status: 'improved' | 'stable' | 'needs_attention'
    evidence: string
    notes?: string
  }>
}

export interface FeedbackSession {
  unitNumber: string
  date: string
  feedbackType: 'primary' | 'secondary'
  motion?: string
  content: string
  bestAspects?: string
  improvementAreas?: string
  teacherComments?: string
  duration?: string
}

export interface CourseObjectiveAnalysis {
  skills: Array<{
    skill_name: string
    objective_source: string
    behavioral_indicators: string[]
    assessment_criteria: string
    growth_levels: {
      beginner: string
      intermediate: string
      advanced: string
    }
    data_mapping: {
      attendance_categories: string[]
      feedback_keywords: string[]
      work_sample_indicators: string[]
    }
  }>
}

export class AIAnalysisService {
  private apiKeys: string[]
  private currentKeyIndex: number = 0
  private model: string = 'gemini-2.0-flash-exp'
  private promptManager: PromptManager

  constructor() {
    // Load API keys with fallback support
    this.apiKeys = this.loadApiKeys()
    
    if (this.apiKeys.length === 0) {
      throw new Error('No Gemini API keys found. Please set GEMINI_API_KEY_* or GOOGLE_AI_API_KEY environment variables.')
    }

    // Initialize prompt manager
    this.promptManager = new PromptManager()

    console.log(`AIAnalysisService initialized with ${this.apiKeys.length} API keys`)
  }

  /**
   * Load API keys from environment with multiple fallback options
   */
  private loadApiKeys(): string[] {
    const keys: string[] = []

    // Try numbered keys first (GEMINI_API_KEY_1, etc.)
    for (let i = 1; i <= 4; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`]
      if (key) keys.push(key)
    }

    // Fallback to single keys
    const singleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    if (singleKey && !keys.includes(singleKey)) {
      keys.push(singleKey)
    }

    return keys
  }

  /**
   * Get the next API key in rotation
   */
  private getNextApiKey(): string {
    const key = this.apiKeys[this.currentKeyIndex]
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length
    return key
  }

  /**
   * Create GoogleGenerativeAI instance with current API key
   */
  private createClient(): GoogleGenerativeAI {
    return new GoogleGenerativeAI(this.getNextApiKey())
  }

  /**
   * Generate content with structured output
   */
  private async generateStructuredContent<T>(
    prompt: string,
    retries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const client = this.createClient()
        const model = client.getGenerativeModel({ 
          model: this.model,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        })

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Parse and validate JSON response
        const parsed = JSON.parse(text)
        return parsed as T
      } catch (error) {
        lastError = error as Error
        console.error(`Attempt ${attempt + 1} failed:`, error)
        
        // If it's a parsing error, try to extract JSON from the response
        if (error instanceof SyntaxError && typeof (error as any).text === 'string') {
          const jsonMatch = (error as any).text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            try {
              return JSON.parse(jsonMatch[0]) as T
            } catch {
              // Continue to next attempt
            }
          }
        }
      }
    }

    throw new Error(`Failed after ${retries} attempts: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Analyze student performance from feedback history
   */
  async analyzeStudentPerformance(
    studentName: string,
    level: 'primary' | 'secondary',
    feedbackSessions: FeedbackSession[]
  ): Promise<StudentAnalysis> {
    // Get the student performance analysis prompt from PromptManager
    const prompt = this.promptManager.getStudentAnalysisPrompt({
      studentName,
      level,
      feedbackSessions
    })

    try {
      const analysis = await this.generateStructuredContent<StudentAnalysis>(prompt)
      
      // Validate and ensure all required fields are present
      return this.validateStudentAnalysis(analysis)
    } catch (error) {
      console.error('Error analyzing student performance:', error)
      return this.getFallbackStudentAnalysis(studentName, feedbackSessions)
    }
  }

  /**
   * Generate class-wide insights from multiple student analyses
   */
  async generateClassInsights(
    className: string,
    level: 'primary' | 'secondary',
    studentAnalyses: Array<{ studentName: string; metrics: StudentMetrics; skillAssessment: SkillAssessment[] }>
  ): Promise<ClassInsights> {
    const prompt = this.promptManager.getClassInsightsPrompt({
      className,
      level,
      studentAnalyses
    })

    try {
      return await this.generateStructuredContent<ClassInsights>(prompt)
    } catch (error) {
      console.error('Error generating class insights:', error)
      return this.getFallbackClassInsights(className, studentAnalyses)
    }
  }

  /**
   * Analyze course objectives and extract measurable skills
   */
  async analyzeCourseObjectives(
    program: string,
    objectives: string[]
  ): Promise<CourseObjectiveAnalysis> {
    const prompt = this.promptManager.getCourseObjectiveAnalysisPrompt({
      program,
      objectives
    })

    return await this.generateStructuredContent<CourseObjectiveAnalysis>(prompt)
  }

  /**
   * Generate personalized recommendations based on student analysis
   */
  async generateRecommendations(
    studentId: string,
    studentName: string,
    analysis: StudentAnalysis,
    programType: 'PSD' | 'Academic Writing' | 'RAPS' | 'Critical Thinking'
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // Focus on skills that need attention (low scores or declining trends)
    const prioritySkills = analysis.skillAssessment
      .filter(skill => skill.currentLevel < 6 || skill.progress < 0)
      .sort((a, b) => {
        // Prioritize by: declining trends first, then lowest current level
        if (a.progress < 0 && b.progress >= 0) return -1
        if (b.progress < 0 && a.progress >= 0) return 1
        return a.currentLevel - b.currentLevel
      })
      .slice(0, 3) // Top 3 priority skills

    // Generate recommendations for each priority skill
    for (const [index, skill] of prioritySkills.entries()) {
      const priority = index === 0 ? 'high' : index === 1 ? 'medium' : 'low'
      
      const recommendation: AIRecommendation = {
        id: `${studentId}-${Date.now()}-${index}`,
        studentId,
        studentName,
        growthArea: skill.skillName,
        priority,
        category: this.categorizeSkill(skill.skillName),
        recommendation: this.generateRecommendationText(skill, analysis),
        specificActions: this.generateActionSteps(skill, programType),
        timeframe: this.determineTimeframe(skill, priority),
        measurableGoals: this.generateMeasurableGoals(skill, programType),
        resources: this.suggestResources(skill, programType),
        instructorNotes: this.generateInstructorNotes(skill, analysis),
        confidence: this.calculateConfidence(skill, analysis),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      recommendations.push(recommendation)
    }

    // Add any critical attention items as high-priority recommendations
    if (analysis.attentionNeeded.requiresAttention && analysis.attentionNeeded.severity === 'high') {
      const attentionRec: AIRecommendation = {
        id: `${studentId}-${Date.now()}-attention`,
        studentId,
        studentName,
        growthArea: analysis.attentionNeeded.primaryConcern,
        priority: 'high',
        category: 'mindset',
        recommendation: `Address ${analysis.attentionNeeded.primaryConcern} through targeted intervention`,
        specificActions: analysis.attentionNeeded.suggestedInterventions,
        timeframe: 'Immediate - next 2 sessions',
        measurableGoals: [`Resolve ${analysis.attentionNeeded.primaryConcern}`, 'Improve engagement to acceptable levels'],
        resources: ['One-on-one instructor support', 'Parent communication'],
        instructorNotes: analysis.attentionNeeded.reasoning,
        confidence: 90,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      recommendations.unshift(attentionRec) // Add to beginning
    }

    return recommendations
  }

  /**
   * Track progress on existing recommendations
   */
  async trackRecommendationProgress(
    recommendation: AIRecommendation,
    recentFeedback: FeedbackSession[]
  ): Promise<{
    status: 'improved' | 'stable' | 'needs_attention'
    evidence: string
    confidence: number
  }> {
    const prompt = `Analyze if there's improvement in "${recommendation.growthArea}" based on this recent feedback compared to the previous state.

Recent feedback sessions:
${recentFeedback.map(f => `
Unit ${f.unitNumber} (${f.date}):
${f.content}
`).join('\n---\n')}

Original recommendation: ${recommendation.recommendation}
Specific goals: ${recommendation.measurableGoals.join(', ')}

Analyze the feedback for evidence of:
1. Direct mentions of the skill area
2. Implicit improvements in related behaviors
3. Achievement of measurable goals
4. Any regression or new challenges

Return JSON: {
  "status": "improved|stable|needs_attention",
  "evidence": "specific quotes and observations from feedback",
  "confidence": 0-100
}`

    try {
      const result = await this.generateStructuredContent<{
        status: 'improved' | 'stable' | 'needs_attention'
        evidence: string
        confidence: number
      }>(prompt)

      return result
    } catch (error) {
      return {
        status: 'stable',
        evidence: 'Unable to determine progress from available feedback',
        confidence: 30
      }
    }
  }

  /**
   * Extract skills dynamically from feedback content using AI
   */
  async extractSkillsFromFeedback(
    feedbackContent: string,
    program: string
  ): Promise<{
    identifiedSkills: string[]
    strengths: string[]
    improvementAreas: string[]
    skillMapping: { [skill: string]: string[] }
  }> {
    const prompt = `Extract and categorize skills mentioned in this ${program} feedback. Focus on specific, measurable skills rather than general observations.

Feedback Content:
${feedbackContent}

Identify:
1. All skills explicitly or implicitly mentioned (use standard skill names from the program)
2. Areas identified as strengths with specific evidence
3. Areas needing improvement with specific evidence
4. Map each skill to specific quotes from the feedback

For ${program} programs, consider these skill categories:
- PSD: Hook Development, Speech Time Management, Vocal Projection, Clarity & Fluency, Argument Structure, Rebuttal Skills, Examples & Illustrations, Engagement (POIs), Speech Organization
- Academic Writing: Essay Structure, Thesis Development, Evidence Integration, Transitions, Grammar & Mechanics, Vocabulary, Creativity, Analysis Depth
- RAPS: Problem Definition, Research Methods, Data Analysis, Solution Development, Presentation Skills, Critical Evaluation
- Critical Thinking: Logical Reasoning, Argument Analysis, Evidence Evaluation, Counterargument Development, Bias Recognition

Return in JSON format:
{
  "identifiedSkills": ["Skill 1", "Skill 2"],
  "strengths": ["Strength 1 with evidence", "Strength 2 with evidence"],
  "improvementAreas": ["Area 1 with specific issue", "Area 2 with specific issue"],
  "skillMapping": {
    "Skill 1": ["Exact quote 1", "Exact quote 2"],
    "Skill 2": ["Exact quote 3"]
  }
}`

    return await this.generateStructuredContent(prompt)
  }

  // Helper methods for recommendation generation

  private categorizeSkill(skillName: string): 'skill-building' | 'practice' | 'mindset' | 'technique' {
    const skillLower = skillName.toLowerCase()
    
    if (skillLower.includes('confidence') || skillLower.includes('engagement') || skillLower.includes('attitude')) {
      return 'mindset'
    } else if (skillLower.includes('structure') || skillLower.includes('organization') || skillLower.includes('argument')) {
      return 'skill-building'
    } else if (skillLower.includes('projection') || skillLower.includes('clarity') || skillLower.includes('delivery')) {
      return 'technique'
    }
    
    return 'practice'
  }

  private generateRecommendationText(skill: SkillAssessment, analysis: StudentAnalysis): string {
    const trend = skill.progress < 0 ? 'declining' : skill.progress > 0 ? 'improving' : 'stable'
    const level = skill.currentLevel < 4 ? 'low' : skill.currentLevel < 7 ? 'moderate' : 'good'
    
    if (trend === 'declining') {
      return `Focus on reversing the decline in ${skill.skillName} through structured practice and immediate feedback`
    } else if (level === 'low') {
      return `Build foundational skills in ${skill.skillName} through step-by-step progression and regular practice`
    } else {
      return `Enhance ${skill.skillName} from ${level} to advanced level through targeted exercises and challenges`
    }
  }

  private generateActionSteps(skill: SkillAssessment, programType: string): string[] {
    const actions: { [key: string]: { [key: string]: string[] } } = {
      'PSD': {
        'Hook Development': [
          'Practice writing 5 different hooks for the same topic',
          'Study exemplar speeches for opening techniques',
          'Record and review your hook delivery for impact'
        ],
        'Speech Time Management': [
          'Use a timer for each speech section during practice',
          'Create time allocation templates for different speech types',
          'Practice with progressive time constraints'
        ],
        'Vocal Projection': [
          'Practice diaphragmatic breathing exercises daily',
          'Record speeches at different volume levels',
          'Use the "back of the room" technique in practice'
        ],
        'Argument Structure & Depth': [
          'Use the PEEL framework for each argument',
          'Create argument maps before speaking',
          'Practice explaining complex ideas simply'
        ]
      },
      'Academic Writing': {
        'Essay Structure': [
          'Create detailed outlines before writing',
          'Study model essays in your genre',
          'Practice paragraph transitions'
        ],
        'Evidence Integration': [
          'Build a quote bank for common topics',
          'Practice the ICE method (Introduce, Cite, Explain)',
          'Vary evidence types in each paragraph'
        ]
      }
    }

    // Return specific actions for the skill and program, or generic ones
    return actions[programType]?.[skill.skillName] || [
      `Practice ${skill.skillName} for 15 minutes daily`,
      `Seek specific feedback on ${skill.skillName} from instructor`,
      `Study examples of excellent ${skill.skillName}`
    ]
  }

  private determineTimeframe(skill: SkillAssessment, priority: string): string {
    if (priority === 'high') {
      return 'Next 2-3 sessions'
    } else if (priority === 'medium') {
      return '2-3 weeks'
    } else {
      return '4-6 weeks'
    }
  }

  private generateMeasurableGoals(skill: SkillAssessment, programType: string): string[] {
    const currentLevel = skill.currentLevel
    const targetLevel = Math.min(currentLevel + 2, 10)
    
    const goals: string[] = [
      `Improve ${skill.skillName} score from ${currentLevel} to ${targetLevel}`,
      `Demonstrate consistent application in 3 consecutive sessions`
    ]

    // Add skill-specific goals
    if (skill.skillName.includes('Time Management')) {
      goals.push('Meet time requirements in 90% of speeches')
    } else if (skill.skillName.includes('Argument')) {
      goals.push('Include 3 well-structured arguments per speech')
    } else if (skill.skillName.includes('Hook')) {
      goals.push('Create engaging openings that capture attention within 15 seconds')
    }

    return goals
  }

  private suggestResources(skill: SkillAssessment, programType: string): string[] {
    const resources: string[] = []

    // Program-specific resources
    if (programType === 'PSD') {
      resources.push('TED Talks for speech examples', 'Debate video library')
    } else if (programType === 'Academic Writing') {
      resources.push('Model essay collection', 'Writing center tutorials')
    }

    // Skill-specific resources
    if (skill.skillName.toLowerCase().includes('vocal')) {
      resources.push('Voice coaching app', 'Breathing exercise videos')
    } else if (skill.skillName.toLowerCase().includes('structure')) {
      resources.push('Template worksheets', 'Outline builders')
    }

    // Always include instructor support
    resources.push('One-on-one instructor guidance')

    return resources
  }

  private generateInstructorNotes(skill: SkillAssessment, analysis: StudentAnalysis): string {
    const notes: string[] = []

    if (skill.consistency === 'low') {
      notes.push('Focus on building consistent habits')
    }

    if (skill.progress < 0) {
      notes.push('Address root causes of regression')
    }

    if (analysis.attentionNeeded.requiresAttention) {
      notes.push(`Consider: ${analysis.attentionNeeded.primaryConcern}`)
    }

    notes.push(`Current evidence: ${skill.evidence[0] || 'See feedback history'}`)

    return notes.join('. ')
  }

  private calculateConfidence(skill: SkillAssessment, analysis: StudentAnalysis): number {
    let confidence = 70 // Base confidence

    // Adjust based on evidence quality
    if (skill.evidence.length > 2) confidence += 10
    if (skill.evidence.length < 1) confidence -= 20

    // Adjust based on consistency
    if (skill.consistency === 'high') confidence += 10
    if (skill.consistency === 'low') confidence -= 10

    // Adjust based on data recency
    if (analysis.studentMetrics.engagementLevel > 3.5) confidence += 5

    return Math.max(30, Math.min(95, confidence))
  }

  // Fallback methods for error scenarios

  private validateStudentAnalysis(analysis: any): StudentAnalysis {
    // Ensure all required fields are present with proper types
    return {
      studentMetrics: analysis.studentMetrics || {
        overallScore: 5,
        growthRate: 0,
        consistencyScore: 0.5,
        engagementLevel: 3,
        trend: 'stable'
      },
      skillAssessment: analysis.skillAssessment || [],
      attentionNeeded: analysis.attentionNeeded || {
        requiresAttention: false,
        severity: 'none',
        primaryConcern: '',
        specificIssues: [],
        suggestedInterventions: [],
        reasoning: ''
      },
      achievements: analysis.achievements || {
        recentBreakthroughs: [],
        masteredSkills: [],
        notableImprovements: [],
        readyForAdvancement: false,
        recognitionSuggestions: [],
        reasoning: ''
      },
      recommendations: analysis.recommendations || {
        immediateActions: [],
        skillFocusAreas: [],
        practiceActivities: [],
        parentCommunication: ''
      }
    }
  }

  private getFallbackStudentAnalysis(studentName: string, feedbackSessions: FeedbackSession[]): StudentAnalysis {
    return {
      studentMetrics: {
        overallScore: 0,
        growthRate: 0,
        consistencyScore: 0,
        engagementLevel: 0,
        trend: 'stable'
      },
      skillAssessment: [],
      attentionNeeded: {
        requiresAttention: true,
        severity: 'high',
        primaryConcern: 'Unable to analyze feedback - insufficient structured assessment data',
        specificIssues: [
          'Feedback sessions lack specific performance ratings for the 9 core skills',
          'No measurable criteria found in feedback documents',
          'Assessment requires detailed rubric-based evaluation for each skill area'
        ],
        suggestedInterventions: [
          'Implement structured assessment rubrics',
          'Include specific skill-based ratings in feedback',
          'Provide detailed comments for each of the 9 core debate skills'
        ],
        reasoning: 'Analysis failed due to insufficient structured feedback data. Current feedback format does not contain the specific skill assessments and measurable criteria needed for meaningful analysis.'
      },
      achievements: {
        recentBreakthroughs: [],
        masteredSkills: [],
        notableImprovements: [],
        readyForAdvancement: false,
        recognitionSuggestions: [],
        reasoning: 'Cannot identify achievements without structured feedback containing specific skill assessments and progress indicators.'
      },
      recommendations: {
        immediateActions: [
          'Review feedback documentation process',
          'Implement detailed skill-based assessment rubrics',
          'Ensure all feedback includes measurable performance indicators'
        ],
        skillFocusAreas: [
          'Establish baseline measurements for core debate skills',
          'Implement consistent assessment criteria'
        ],
        practiceActivities: [
          'Cannot provide specific recommendations without detailed skill assessment data'
        ],
        parentCommunication: `Unable to provide meaningful progress analysis for ${studentName}. Recommend implementing structured feedback system with detailed skill assessments to enable effective progress tracking.`
      }
    }
  }

  private getFallbackClassInsights(
    className: string,
    studentAnalyses: Array<{ studentName: string; metrics: StudentMetrics; skillAssessment: SkillAssessment[] }>
  ): ClassInsights {
    const avgGrowth = studentAnalyses.reduce((sum, s) => sum + s.metrics.growthRate, 0) / studentAnalyses.length

    return {
      classMetrics: {
        averageGrowthRate: avgGrowth,
        topPerformingSkill: 'Unable to determine',
        mostImprovedSkill: 'Unable to determine',
        commonChallenges: ['Analysis unavailable'],
        classEngagementLevel: 3
      },
      keyInsights: [
        {
          insight: 'Class performance analysis unavailable',
          affectedStudents: studentAnalyses.length,
          percentage: 100,
          recommendation: 'Manual review recommended',
          reasoning: 'Automated analysis failed'
        }
      ],
      celebrationPoints: []
    }
  }
}

// Export singleton instance
export const aiAnalysisService = new AIAnalysisService()