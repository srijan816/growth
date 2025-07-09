import { GoogleGenAI } from '@google/genai'
import { SchemaType } from '@google/generative-ai'
import { readFileSync } from 'fs'
import { join } from 'path'

// Enhanced Debate Recommendation Engine for Scientific Analysis
// Processes chronological feedback to provide evidence-based recommendations
// 
// RELIABILITY IMPROVEMENTS:
// - Automatic retry logic with exponential backoff (3 attempts)
// - Network error detection and API key rotation
// - Request timeout protection (2 minutes)
// - JSON parsing error recovery
// - Comprehensive error logging

// Rubric mapping system for proper labeling
export const RUBRIC_MAPPING = {
  rubric_1: {
    key: 'duration_management',
    label: 'Duration Management',
    description: 'Student spoke for the duration of the specified time frame',
    category: 'time_management',
    skillArea: 'speechTimeAndHook'
  },
  rubric_2: {
    key: 'point_of_information',
    label: 'Point of Information',
    description: 'Student offered and/or accepted a point of information relevant to the topic',
    category: 'engagement',
    skillArea: 'engagementAndPOIs'
  },
  rubric_3: {
    key: 'style_persuasion',
    label: 'Style/Persuasion',
    description: 'Student spoke in a stylistic and persuasive manner (e.g. volume, speed, tone, diction, and flow)',
    category: 'delivery',
    skillArea: 'deliverySkills'
  },
  rubric_4: {
    key: 'argument_completeness',
    label: 'Argument Completeness',
    description: 'Student\'s argument is complete in that it has relevant Claims, supported by sufficient Evidence/Warrants, Impacts, and Synthesis',
    category: 'argumentation',
    skillArea: 'argumentStructureAndDepth'
  },
  rubric_5: {
    key: 'theory_application',
    label: 'Theory Application',
    description: 'Student argument reflects application of theory taught during class time',
    category: 'knowledge_application',
    skillArea: 'argumentStructureAndDepth'
  },
  rubric_6: {
    key: 'rebuttal_effectiveness',
    label: 'Rebuttal Effectiveness',
    description: 'Student\'s rebuttal is effective, and directly responds to an opponent\'s arguments',
    category: 'responsive_argumentation',
    skillArea: 'rebuttalAndDirectness'
  },
  rubric_7: {
    key: 'teammate_support',
    label: 'Teammate Support',
    description: 'Student ably supported teammate\'s case and arguments',
    category: 'collaboration',
    skillArea: 'speechStructureAndOrganization'
  },
  rubric_8: {
    key: 'feedback_application',
    label: 'Feedback Application',
    description: 'Student applied feedback from previous debate(s)',
    category: 'improvement',
    skillArea: 'speechStructureAndOrganization'
  }
} as const

// Helper function to get rubric label
export function getRubricLabel(rubricKey: string): string {
  return RUBRIC_MAPPING[rubricKey as keyof typeof RUBRIC_MAPPING]?.label || rubricKey
}

// Helper function to get rubric description
export function getRubricDescription(rubricKey: string): string {
  return RUBRIC_MAPPING[rubricKey as keyof typeof RUBRIC_MAPPING]?.description || rubricKey
}

// Helper function to format rubric scores for AI analysis
export function formatRubricScores(rubricScores: Record<string, number>): string {
  if (!rubricScores || Object.keys(rubricScores).length === 0) {
    return 'No rubric scores available'
  }
  
  return Object.entries(rubricScores)
    .map(([key, score]) => {
      const mapping = RUBRIC_MAPPING[key as keyof typeof RUBRIC_MAPPING]
      if (!mapping) return `${key}: ${score}/5`
      
      const scoreText = score === 0 ? 'N/A' : `${score}/5`
      return `**${mapping.label}**: ${scoreText} - ${mapping.description}`
    })
    .join('\n')
}

export interface DebateFeedbackSession {
  id: string
  date: string
  unitNumber: string
  motion?: string
  content: string
  bestAspects?: string
  improvementAreas?: string
  teacherComments?: string
  duration?: string
  rawFeedback: string
  rubricScores?: Record<string, number>
}

export interface SkillCategory {
  name: string
  currentLevel: number
  progress: number
  consistency: 'high' | 'medium' | 'low'
  evidence: string[]
  pattern: 'improving' | 'declining' | 'stable' | 'breakthrough'
  chronologicalTrend: Array<{
    session: number
    level: number
    date: string
    evidence: string
  }>
}

export interface PatternAnalysis {
  repeatedIssues: Array<{
    issue: string
    rootCause: string
    frequency: number
    sessions: string[]
    severity: 'high' | 'medium' | 'low'
    trend: 'worsening' | 'stable' | 'improving'
    symptoms: string[]
  }>
  recentConcerns: Array<{
    concern: string
    lastFiveSessions: boolean
    urgency: 'immediate' | 'moderate' | 'low'
    rootCause?: string
  }>
  progressionPatterns: Array<{
    skill: string
    pattern: 'consistent_growth' | 'plateau' | 'regression' | 'breakthrough'
    duration: string
    evidence: string[]
  }>
}

export interface ScientificRecommendation {
  id: string
  category: 'immediate_action' | 'skill_development' | 'long_term_mastery'
  skill: string
  priority: 'high' | 'medium' | 'low'
  
  // Diagnostic information
  targetIssue: string
  diagnosis: string // WHY this problem exists
  recommendation: string // WHAT to do about it
  rationale: string // HOW this addresses the root cause
  
  // Evidence-based rationale
  evidenceBase: {
    sessionCount: number
    patternIdentified: string
    supportingQuotes: string[]
    timeframeCovered: string
  }
  
  // Specific action items
  actionItems: {
    preparationFocus: string[]
    practiceExercises: string[]
    nextDebateObjectives: string[]
  }
  
  // Progress tracking
  measurableGoals: {
    shortTerm: string[] // Next 2-3 sessions
    mediumTerm: string[] // Next 4-8 sessions
    longTerm: string[] // Advanced skill development
  }
  
  // Success indicators
  successIndicators: string[]
  timeframe: string
  
  // Pattern context
  patternContext: {
    issueFrequency: number
    rootCauseAnalysis: string
    potentialUnderlyingFactors: string[]
  }
}

export interface KeyStrength {
  strengthName: string
  type: 'established' | 'emerging' | 'unique'
  evidence: string[]
  howToLeverage: string
}

export interface ChronologicalAnalysis {
  studentName: string
  totalSessions: number
  timeSpan: string
  
  keyStrengths: KeyStrength[]
  
  skillCategories: {
    speechTimeAndHook: SkillCategory
    deliverySkills: SkillCategory
    argumentStructureAndDepth: SkillCategory
    rebuttalAndDirectness: SkillCategory
    examplesAndIllustrations: SkillCategory
    engagementAndPOIs: SkillCategory
    speechStructureAndOrganization: SkillCategory
  }
  
  patternAnalysis: PatternAnalysis
  overallProgression: {
    trend: 'improving' | 'declining' | 'stable'
    rate: number
    consistency: number
    breakthroughMoments: string[]
  }
  
  recommendations: ScientificRecommendation[]
}

export class DebateRecommendationEngine {
  private apiKeys: string[]
  private currentKeyIndex: number = 0
  private model: string = 'gemini-2.5-flash'
  private thinkingBudget: number = 20000

  constructor() {
    try {
      this.apiKeys = this.loadApiKeys()
      if (this.apiKeys.length === 0) {
        throw new Error('No Gemini API keys found. Please set GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.')
      }
      console.log(`✅ DebateRecommendationEngine initialized with ${this.apiKeys.length} API keys`)
    } catch (error) {
      console.error('❌ Error initializing DebateRecommendationEngine:', error)
      throw error
    }
  }

  /**
   * Get the JSON schema for the analysis response (simplified to avoid complexity limits)
   */
  private getAnalysisSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        studentName: { type: SchemaType.STRING },
        totalSessions: { type: SchemaType.INTEGER },
        timeSpan: { type: SchemaType.STRING },
        keyStrengths: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              strengthName: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING },
              evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              howToLeverage: { type: SchemaType.STRING }
            },
            required: ['strengthName', 'type', 'evidence', 'howToLeverage']
          }
        },
        skillCategories: {
          type: SchemaType.OBJECT,
          properties: {
            speechTimeAndHook: this.getSimplifiedSkillSchema(),
            deliverySkills: this.getSimplifiedSkillSchema(),
            argumentStructureAndDepth: this.getSimplifiedSkillSchema(),
            rebuttalAndDirectness: this.getSimplifiedSkillSchema(),
            examplesAndIllustrations: this.getSimplifiedSkillSchema(),
            engagementAndPOIs: this.getSimplifiedSkillSchema(),
            speechStructureAndOrganization: this.getSimplifiedSkillSchema()
          },
          required: ['speechTimeAndHook', 'deliverySkills', 'argumentStructureAndDepth', 'rebuttalAndDirectness', 'examplesAndIllustrations', 'engagementAndPOIs', 'speechStructureAndOrganization']
        },
        patternAnalysis: {
          type: SchemaType.OBJECT,
          properties: {
            repeatedIssues: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  issue: { type: SchemaType.STRING },
                  rootCause: { type: SchemaType.STRING },
                  frequency: { type: SchemaType.INTEGER },
                  severity: { type: SchemaType.STRING },
                  symptoms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                },
                required: ['issue', 'rootCause', 'frequency', 'severity', 'symptoms']
              }
            },
            recentConcerns: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  concern: { type: SchemaType.STRING },
                  urgency: { type: SchemaType.STRING },
                  rootCause: { type: SchemaType.STRING }
                },
                required: ['concern', 'urgency']
              }
            }
          },
          required: ['repeatedIssues', 'recentConcerns']
        },
        overallProgression: {
          type: SchemaType.OBJECT,
          properties: {
            trend: { type: SchemaType.STRING },
            consistency: { type: SchemaType.STRING },
            breakthroughMoments: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          },
          required: ['trend', 'consistency', 'breakthroughMoments']
        },
        recommendations: {
          type: SchemaType.ARRAY,
          items: this.getSimplifiedRecommendationSchema()
        }
      },
      required: ['studentName', 'totalSessions', 'timeSpan', 'keyStrengths', 'skillCategories', 'patternAnalysis', 'overallProgression', 'recommendations']
    }
  }

  /**
   * Get the simplified skill category schema
   */
  private getSimplifiedSkillSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING },
        currentLevel: { type: SchemaType.STRING },
        progress: { type: SchemaType.STRING },
        consistency: { type: SchemaType.STRING },
        evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        pattern: { type: SchemaType.STRING },
        chronologicalTrend: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              session: { type: SchemaType.INTEGER },
              level: { type: SchemaType.STRING },
              date: { type: SchemaType.STRING },
              evidence: { type: SchemaType.STRING }
            },
            required: ['session', 'level', 'date', 'evidence']
          }
        }
      },
      required: ['name', 'currentLevel', 'progress', 'consistency', 'evidence', 'pattern', 'chronologicalTrend']
    }
  }

  /**
   * Get the simplified recommendation schema
   */
  private getSimplifiedRecommendationSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING },
        category: { type: SchemaType.STRING },
        skill: { type: SchemaType.STRING },
        priority: { type: SchemaType.STRING },
        targetIssue: { type: SchemaType.STRING },
        diagnosis: { type: SchemaType.STRING },
        recommendation: { type: SchemaType.STRING },
        rationale: { type: SchemaType.STRING },
        evidenceBase: {
          type: SchemaType.OBJECT,
          properties: {
            sessionCount: { type: SchemaType.INTEGER },
            patternIdentified: { type: SchemaType.STRING },
            supportingQuotes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            timeframeCovered: { type: SchemaType.STRING }
          },
          required: ['sessionCount', 'patternIdentified', 'supportingQuotes', 'timeframeCovered']
        },
        actionItems: {
          type: SchemaType.OBJECT,
          properties: {
            preparationFocus: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            practiceExercises: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            nextDebateObjectives: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          },
          required: ['preparationFocus', 'practiceExercises', 'nextDebateObjectives']
        },
        measurableGoals: {
          type: SchemaType.OBJECT,
          properties: {
            shortTerm: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            mediumTerm: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            longTerm: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          },
          required: ['shortTerm', 'mediumTerm', 'longTerm']
        },
        successIndicators: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        timeframe: { type: SchemaType.STRING },
        patternContext: {
          type: SchemaType.OBJECT,
          properties: {
            issueFrequency: { type: SchemaType.NUMBER },
            rootCauseAnalysis: { type: SchemaType.STRING },
            potentialUnderlyingFactors: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          },
          required: ['issueFrequency', 'rootCauseAnalysis', 'potentialUnderlyingFactors']
        }
      },
      required: ['id', 'category', 'skill', 'priority', 'targetIssue', 'diagnosis', 'recommendation', 'rationale', 'evidenceBase', 'actionItems', 'measurableGoals', 'successIndicators', 'timeframe', 'patternContext']
    }
  }

  /**
   * Load API keys from environment with cycling support
   */
  private loadApiKeys(): string[] {
    const keys: string[] = []

    // Try numbered keys first (GEMINI_API_KEY_1, etc.)
    for (let i = 1; i <= 4; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`]
      if (key) keys.push(key)
    }

    // Fallback to single key if no numbered keys found
    if (keys.length === 0) {
      const singleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
      if (singleKey) keys.push(singleKey)
    }

    return keys
  }

  /**
   * Get the next API key in rotation
   */
  private getNextApiKey(): string {
    const key = this.apiKeys[this.currentKeyIndex]
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length
    console.log(`🔑 Using API key ${this.currentKeyIndex}/${this.apiKeys.length} (rotated from index ${this.currentKeyIndex - 1 < 0 ? this.apiKeys.length - 1 : this.currentKeyIndex - 1})`)
    return key
  }

  /**
   * Check if an error is related to network connectivity
   */
  private isNetworkError(error: Error): boolean {
    const networkErrorPatterns = [
      'fetch failed',
      'network error',
      'connection failed',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'socket hang up'
    ]
    
    const errorMessage = error.message.toLowerCase()
    return networkErrorPatterns.some(pattern => errorMessage.includes(pattern))
  }

  /**
   * Main analysis method - two-step process for reliable results
   */
  async analyzeChronologicalFeedback(
    studentName: string,
    feedbackSessions: DebateFeedbackSession[]
  ): Promise<ChronologicalAnalysis> {
    console.log(`🔍 Starting two-step analysis for ${studentName} with ${feedbackSessions.length} sessions`)
    
    // Sort sessions chronologically (oldest first)
    const sortedSessions = feedbackSessions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    try {
      // STEP 1: Generate descriptive analysis
      console.log('📝 Step 1: Generating descriptive analysis...')
      const descriptiveAnalysis = await this.generateDescriptiveAnalysis(studentName, sortedSessions)
      
      // STEP 2: Convert to structured format
      console.log('🔄 Step 2: Converting to structured format...')
      const structuredAnalysis = await this.convertToStructuredFormat(studentName, descriptiveAnalysis, sortedSessions)
      
      return {
        analysis: structuredAnalysis,
        prompt: descriptiveAnalysis.substring(0, 1000) + '...', // Preview of descriptive analysis
        feedbackSessionCount: sortedSessions.length,
        totalSessionCount: sortedSessions.length,
        promptLength: descriptiveAnalysis.length,
        wasPromptTruncated: false,
        descriptiveAnalysis: descriptiveAnalysis // Include raw analysis for debugging
      }
    } catch (error) {
      console.error('❌ Error in chronological analysis:', error)
      console.error('❌ Error type:', typeof error)
      console.error('❌ Error constructor:', error.constructor.name)
      if (error.cause) {
        console.error('❌ Error cause:', error.cause)
      }
      if (error.stack) {
        console.error('❌ Error stack:', error.stack)
      }
      
      // Enhanced error details for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Enhanced error details:', {
        message: errorMessage,
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })
      
      throw new Error(`Failed to analyze feedback: ${errorMessage}`)
    }
  }

  /**
   * Load prompt template from markdown file
   */
  private loadPromptTemplate(): string {
    try {
      const promptPath = join(process.cwd(), 'src/prompts/scientific-debate-analysis.md')
      return readFileSync(promptPath, 'utf-8')
    } catch (error) {
      console.error('Error loading prompt template:', error)
      throw new Error('Unable to load prompt template. Please ensure src/prompts/scientific-debate-analysis.md exists.')
    }
  }

  /**
   * Build comprehensive scientific analysis prompt
   */
  public buildScientificAnalysisPrompt(
    studentName: string,
    sessions: DebateFeedbackSession[]
  ): string {
    // More efficient session data formatting with length limits
    const sessionData = sessions.map((session, index) => {
      const content = session.content?.substring(0, 1000) || 'No content available'
      const bestAspects = session.bestAspects?.substring(0, 300) || ''
      const improvementAreas = session.improvementAreas?.substring(0, 300) || ''
      const teacherComments = session.teacherComments?.substring(0, 300) || ''
      
      return `
## SESSION ${index + 1} - ${session.date}
**Unit:** ${session.unitNumber}
${session.motion ? `**Motion:** ${session.motion.substring(0, 100)}` : ''}
${session.duration ? `**Duration:** ${session.duration}` : ''}

**Feedback Content:**
${content}

${bestAspects ? `**Best Aspects:** ${bestAspects}` : ''}
${improvementAreas ? `**Areas for Improvement:** ${improvementAreas}` : ''}
${teacherComments ? `**Teacher Comments:** ${teacherComments}` : ''}
`
    }).join('\n---\n')

    const timeSpan = sessions.length > 0 ? `${sessions[0].date} to ${sessions[sessions.length - 1].date}` : ''
    
    // Build simplified prompt without JSON schema (since it's in responseSchema)
    const basePrompt = `# Scientific Debate Analysis for ${studentName}

You are an expert debate coach analyzing chronological feedback data to provide evidence-based recommendations. Analyze the following ${sessions.length} feedback sessions spanning ${timeSpan}.

## Understanding the Rubric System

When analyzing feedback, you'll encounter 8 standardized rubric categories (scored 1-5):

1. **Duration Management** (rubric_1): Student spoke for the duration of the specified time frame
2. **Point of Information** (rubric_2): Student offered and/or accepted a point of information  
3. **Style/Persuasion** (rubric_3): Student spoke in a stylistic and persuasive manner
4. **Argument Completeness** (rubric_4): Student's argument is complete with relevant claims
5. **Theory Application** (rubric_5): Student argument reflects application of debate theory
6. **Rebuttal Effectiveness** (rubric_6): Student's rebuttal is effective
7. **Teammate Support** (rubric_7): Student ably supported teammate
8. **Feedback Application** (rubric_8): Student applied feedback from previous debate

## Analysis Instructions

1. **Pattern Recognition**: Examine feedback chronologically to identify recurring themes, improvements, and persistent challenges
2. **Evidence-Based Assessment**: Base all assessments on specific quotes from the feedback
3. **Skill Categorization**: Analyze these seven core debate skills:
   - Speech Time & Hook Quality (relates to Duration Management)
   - Delivery Skills (relates to Style/Persuasion)
   - Argument Structure & Depth (relates to Argument Completeness & Theory Application)
   - Rebuttal & Directness (relates to Rebuttal Effectiveness)
   - Examples & Illustrations (relates to Argument Completeness)
   - Engagement & POIs (relates to Point of Information)
   - Speech Structure & Organization (relates to overall performance)

4. **Provide Actionable Recommendations**: Give specific, measurable actions based on identified patterns

## Analysis Guidelines

1. **Evidence-Based Only**: Every assessment must be backed by specific quotes from feedback
2. **Chronological Tracking**: Show progression/regression patterns over time  
3. **Pattern Recognition**: Identify repeated issues across multiple sessions
4. **Actionable Specificity**: Provide concrete, measurable action items
5. **Hypothesis Formation**: Frame potential causes as educated hypotheses based on text evidence

Focus on providing evidence-based recommendations that will genuinely help improve debate performance through systematic skill development.`
    
    const fullPrompt = basePrompt + `\n\n**CHRONOLOGICAL FEEDBACK DATA (${sessions.length} sessions):**\n${sessionData}`
    
    console.log(`📏 Prompt built: ${fullPrompt.length} characters for ${sessions.length} sessions`)
    
    return fullPrompt
  }


  /**
   * Step 1: Generate descriptive analysis using text/plain with thinking budget
   */
  private async generateDescriptiveAnalysis(
    studentName: string, 
    sessions: DebateFeedbackSession[]
  ): Promise<string> {
    console.log('🧠 Step 1: Starting descriptive analysis...')
    
    const maxRetries = 3
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}`)
        
        const ai = new GoogleGenAI({
          apiKey: this.getNextApiKey(),
        })
        
        const config = {
          thinkingConfig: {
            thinkingBudget: -1, // -1 for unlimited thinking
          },
          responseMimeType: 'text/plain',
          temperature: 0.7,
          maxOutputTokens: 32768,
        }
        
        const model = 'gemini-2.5-flash'
        const prompt = this.buildDescriptiveAnalysisPrompt(studentName, sessions)
        
        console.log('🚀 Sending descriptive analysis request...')
        console.log('📝 Prompt length:', prompt.length, 'characters')
        
        const contents = [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 2 minutes')), 2 * 60 * 1000)
        })
        
        const response = await Promise.race([
          ai.models.generateContentStream({
            model,
            config,
            contents,
          }),
          timeoutPromise
        ])
        
        let responseText = ''
        for await (const chunk of response) {
          responseText += chunk.text
        }
        
        if (!responseText) {
          throw new Error('No response text received from AI model')
        }
        
        console.log('✅ Descriptive analysis completed, length:', responseText.length)
        
        return responseText
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed:`, error instanceof Error ? error.message : 'Unknown error')
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < maxRetries) {
          // Use different API key on network errors
          if (error instanceof Error && this.isNetworkError(error)) {
            console.log('🔄 Network error detected, trying with different API key...')
            // The next iteration will automatically use the next API key
          }
          
          const delay = Math.pow(2, attempt) * 1000 // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw new Error(`Failed to generate descriptive analysis after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Step 2: Convert descriptive analysis to structured JSON format
   */
  private async convertToStructuredFormat(
    studentName: string,
    descriptiveAnalysis: string,
    sessions: DebateFeedbackSession[]
  ): Promise<ChronologicalAnalysis> {
    console.log('🔄 Step 2: Converting to structured format...')
    
    const maxRetries = 3
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}`)
        
        const ai = new GoogleGenAI({
          apiKey: this.getNextApiKey(),
        })
        
        const config = {
          thinkingConfig: {
            thinkingBudget: -1, // -1 for unlimited thinking
          },
          responseMimeType: 'application/json',
          responseSchema: this.getAnalysisSchema(),
          temperature: 0.3,
          maxOutputTokens: 32768,
        }
        
        const model = 'gemini-2.5-flash'
        const conversionPrompt = this.buildConversionPrompt(studentName, descriptiveAnalysis, sessions)
        
        console.log('🚀 Sending conversion request...')
        console.log('📝 Conversion prompt length:', conversionPrompt.length, 'characters')
        
        const contents = [
          {
            role: 'user',
            parts: [{ text: conversionPrompt }]
          }
        ]
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 2 minutes')), 2 * 60 * 1000)
        })
        
        const response = await Promise.race([
          ai.models.generateContentStream({
            model,
            config,
            contents,
          }),
          timeoutPromise
        ])
        
        let responseText = ''
        for await (const chunk of response) {
          responseText += chunk.text
        }
        
        if (!responseText) {
          throw new Error('No response text received from AI model')
        }
        
        console.log('✅ Structured conversion completed, length:', responseText.length)
        
        try {
          const analysis = JSON.parse(responseText) as ChronologicalAnalysis
          
          // Validate the structured analysis
          const validationResult = this.validateAnalysisStructure(analysis)
          if (!validationResult.isValid) {
            console.error('❌ Structured analysis validation failed:', validationResult.errors)
            throw new Error(`Invalid analysis structure: ${validationResult.errors.join(', ')}`)
          }
          
          return this.validateAndEnhanceAnalysis(analysis, sessions)
        } catch (parseError) {
          console.error('❌ Failed to parse structured response:', parseError)
          console.error('❌ Response text preview:', responseText.substring(0, 500) + '...')
          console.error('❌ Response text ending:', responseText.substring(responseText.length - 500))
          
          // Try to repair JSON if it's truncated
          console.log('🔧 Attempting JSON repair...')
          const repairedJson = this.attemptJsonFix(responseText)
          if (repairedJson) {
            try {
              const analysis = JSON.parse(repairedJson) as ChronologicalAnalysis
              console.log('✅ JSON repair successful!')
              return this.validateAndEnhanceAnalysis(analysis, sessions)
            } catch (repairError) {
              console.error('❌ JSON repair failed:', repairError)
              throw new Error(`JSON parsing and repair both failed: ${parseError.message}`)
            }
          }
          
          throw new Error(`Structured conversion failed: ${parseError.message}`)
        }
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed:`, error instanceof Error ? error.message : 'Unknown error')
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < maxRetries) {
          // Use different API key on network errors
          if (error instanceof Error && this.isNetworkError(error)) {
            console.log('🔄 Network error detected, trying with different API key...')
            // The next iteration will automatically use the next API key
          }
          
          const delay = Math.pow(2, attempt) * 1000 // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw new Error(`Failed to convert to structured format after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Build descriptive analysis prompt (Step 1)
   */
  private buildDescriptiveAnalysisPrompt(studentName: string, sessions: DebateFeedbackSession[]): string {
    const sessionData = sessions.map((session, index) => {
      const content = session.content?.substring(0, 1000) || 'No content available'
      const bestAspects = session.bestAspects?.substring(0, 300) || ''
      const improvementAreas = session.improvementAreas?.substring(0, 300) || ''
      const teacherComments = session.teacherComments?.substring(0, 300) || ''
      
      // Format rubric scores with proper labels
      const rubricScoresFormatted = formatRubricScores(session.rubricScores || {})
      
      return `
## SESSION ${index + 1} - ${session.date}
**Unit:** ${session.unitNumber}
${session.motion ? `**Motion:** ${session.motion.substring(0, 100)}` : ''}
${session.duration ? `**Duration:** ${session.duration}` : ''}

**Rubric Scores:**
${rubricScoresFormatted}

**Qualitative Feedback:**
${content}

${bestAspects ? `**Best Aspects:** ${bestAspects}` : ''}
${improvementAreas ? `**Areas for Improvement:** ${improvementAreas}` : ''}
${teacherComments ? `**Teacher Comments:** ${teacherComments}` : ''}
`
    }).join('\n---\n')

    const timeSpan = sessions.length > 0 ? `${sessions[0].date} to ${sessions[sessions.length - 1].date}` : ''
    
    return `# Comprehensive Debate Analysis for ${studentName}

You are an expert debate coach conducting a thorough chronological analysis of ${studentName}'s performance. Analyze ${sessions.length} feedback sessions spanning ${timeSpan}.

## Understanding the Rubric System

Each session includes both quantitative rubric scores and qualitative feedback. The rubric scores provide objective performance measures across 8 standardized categories (scored 1-5, or 0 for N/A):

1. **Duration Management**: Student spoke for the duration of the specified time frame
2. **Point of Information**: Student offered and/or accepted a point of information relevant to the topic
3. **Style/Persuasion**: Student spoke in a stylistic and persuasive manner (e.g. volume, speed, tone, diction, and flow)
4. **Argument Completeness**: Student's argument is complete in that it has relevant Claims, supported by sufficient Evidence/Warrants, Impacts, and Synthesis
5. **Theory Application**: Student argument reflects application of theory taught during class time
6. **Rebuttal Effectiveness**: Student's rebuttal is effective, and directly responds to an opponent's arguments
7. **Teammate Support**: Student ably supported teammate's case and arguments
8. **Feedback Application**: Student applied feedback from previous debate(s)

**IMPORTANT**: Use both the numerical rubric scores AND the qualitative feedback to understand performance patterns. The rubric scores provide objective trends, while the qualitative feedback explains the context and specific observations.

## Required Analysis

Please provide a comprehensive analysis covering:

### 1. KEY STRENGTHS IDENTIFICATION
Identify 3-5 core strengths that ${studentName} consistently demonstrates across sessions:
- **Established Strengths**: Skills where the student shows consistent proficiency
- **Emerging Strengths**: Areas showing significant improvement over time
- **Unique Talents**: Special abilities or approaches that distinguish this student
- **Evidence**: Specific quotes from feedback supporting each strength
- **How to Leverage**: Ways to build upon these strengths for further growth

### 2. SKILL ASSESSMENT
For each of these 7 core debate skills, analyze chronologically:
- **Speech Time & Hook Quality** (relates to Duration Management)
- **Delivery Skills** (relates to Style/Persuasion)  
- **Argument Structure & Depth** (relates to Argument Completeness & Theory Application)
- **Rebuttal & Directness** (relates to Rebuttal Effectiveness)
- **Examples & Illustrations** (relates to Argument Completeness)
- **Engagement & POIs** (relates to Point of Information)
- **Speech Structure & Organization** (relates to overall performance)

For each skill, describe:
- Current performance level (Novice/Developing/Proficient/Advanced)
- Progress pattern (improving/stable/declining/breakthrough)
- Consistency level (high/medium/low)
- Specific evidence from feedback sessions
- Chronological progression with session-by-session observations

### 3. DIAGNOSTIC PATTERN ANALYSIS
For each identified issue, provide:
- **The Issue**: What specific problem is occurring
- **Root Cause Diagnosis**: WHY this issue is happening (e.g., nervousness, lack of preparation, conceptual misunderstanding)
- **Observable Symptoms**: How this manifests in debates
- **Impact on Performance**: How this affects overall debate quality
- **Frequency & Severity**: How often and how seriously this occurs

### 4. OVERALL PROGRESSION
Analyze:
- Overall trend (improving/declining/stable)
- Consistency of performance
- Key breakthrough moments
- Evidence of applying previous feedback
- Areas of sustained excellence

### 5. DIAGNOSTIC-BASED RECOMMENDATIONS
For each recommendation (3-5 total), provide:
- **Target Issue**: The specific problem being addressed
- **Diagnosis**: WHY this problem exists (root cause analysis)
- **Recommendation**: WHAT to do about it
- **Rationale**: HOW this solution addresses the root cause
- **Implementation Steps**: Specific actions to take
- **Expected Outcomes**: What improvement should look like
- **Timeline**: Realistic timeframe for improvement
- **Success Metrics**: How to measure progress

Example format:
"ISSUE: Short speech duration (consistently 2-3 minutes instead of 4-5)
DIAGNOSIS: Analysis shows this stems from rapid delivery due to nervousness and insufficient content preparation, not lack of ideas
RECOMMENDATION: Implement structured speech planning with timed practice
RATIONALE: By addressing both the anxiety and preparation gaps, we tackle the root causes rather than just the symptom..."

## Guidelines
- Celebrate strengths as much as identifying weaknesses
- Base every assessment on specific quotes from the feedback
- Provide root cause analysis for each issue
- Connect recommendations directly to diagnosed problems
- Focus on WHY problems occur, not just WHAT to do
- Make recommendations actionable and measurable

**CHRONOLOGICAL FEEDBACK DATA (${sessions.length} sessions):**
${sessionData}

Think carefully through each session chronologically. Identify strengths to build upon, diagnose root causes of challenges, and provide evidence-based recommendations that address WHY issues occur, not just what to do about them.`
  }

  /**
   * Build conversion prompt (Step 2)
   */
  private buildConversionPrompt(studentName: string, descriptiveAnalysis: string, sessions: DebateFeedbackSession[]): string {
    return `# Convert Analysis to Structured Format

Please convert the following comprehensive debate analysis into the required JSON structure.

## Original Descriptive Analysis:
${descriptiveAnalysis}

## Conversion Instructions:
Extract all information from the analysis above and organize it into a JSON object with these exact sections:

- **studentName**: "${studentName}"
- **totalSessions**: ${sessions.length}
- **timeSpan**: "${sessions.length > 0 ? `${sessions[0].date} to ${sessions[sessions.length - 1].date}` : ''}"
- **keyStrengths**: Array of strength objects extracted from the KEY STRENGTHS IDENTIFICATION section
- **skillCategories**: Object with 7 skills (speechTimeAndHook, deliverySkills, argumentStructureAndDepth, rebuttalAndDirectness, examplesAndIllustrations, engagementAndPOIs, speechStructureAndOrganization)
- **patternAnalysis**: Object with repeatedIssues and recentConcerns arrays
- **overallProgression**: Object with trend, consistency, and breakthroughMoments
- **recommendations**: Array of recommendation objects

For each key strength, include:
- strengthName (name of the strength)
- type (established/emerging/unique)
- evidence (array of supporting quotes)
- howToLeverage (ways to build upon this strength)

For each skill category, include:
- name (descriptive name)
- currentLevel (Novice/Developing/Proficient/Advanced)
- progress (improving/stable/declining/breakthrough)
- consistency (high/medium/low)
- evidence (array of specific quotes)
- pattern (overall pattern)
- chronologicalTrend (array of session observations)

For pattern analysis, ensure each issue includes:
- issue (what's happening)
- rootCause (WHY it's happening - from the diagnostic analysis)
- frequency (how often)
- severity (impact level)
- symptoms (observable manifestations)

For each recommendation, include:
- id (unique identifier)
- category (immediate_action/skill_development/long_term_mastery)
- skill (target skill area)
- priority (high/medium/low)
- targetIssue (specific problem being addressed)
- diagnosis (WHY this problem exists - root cause)
- recommendation (WHAT to do about it)
- rationale (HOW this addresses the root cause)
- evidenceBase (sessionCount, patternIdentified, supportingQuotes, timeframeCovered)
- actionItems (preparationFocus, practiceExercises, nextDebateObjectives)
- measurableGoals (shortTerm, mediumTerm, longTerm)
- successIndicators (array of success measures)
- timeframe (estimated improvement timeframe)
- patternContext (issueFrequency, rootCauseAnalysis, potentialUnderlyingFactors)

Ensure all strengths, diagnostic information, and root cause analyses from the original analysis are preserved in the structured format.`
  }

  /**
   * Attempt to fix truncated JSON responses
   */
  private attemptJsonFix(responseText: string): string | null {
    try {
      console.log('🔧 Attempting to fix JSON response...')
      
      // Try to find the last complete object
      let fixedText = responseText.trim()
      
      // Count braces to see if we need to close them
      let openBraces = 0
      let openBrackets = 0
      let inString = false
      let escapeNext = false
      
      for (let i = 0; i < fixedText.length; i++) {
        const char = fixedText[i]
        
        if (escapeNext) {
          escapeNext = false
          continue
        }
        
        if (char === '\\' && inString) {
          escapeNext = true
          continue
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString
          continue
        }
        
        if (!inString) {
          if (char === '{') openBraces++
          else if (char === '}') openBraces--
          else if (char === '[') openBrackets++
          else if (char === ']') openBrackets--
        }
      }
      
      // If we're in a string, try to close it
      if (inString) {
        fixedText += '"'
      }
      
      // Close any unclosed brackets
      while (openBrackets > 0) {
        fixedText += ']'
        openBrackets--
      }
      
      // Close any unclosed braces
      while (openBraces > 0) {
        fixedText += '}'
        openBraces--
      }
      
      console.log('🔧 Fixed JSON length:', fixedText.length)
      console.log('🔧 Fixed JSON ending:', fixedText.substring(fixedText.length - 100))
      
      // Test if the fixed JSON is valid
      JSON.parse(fixedText)
      return fixedText
      
    } catch (error) {
      console.log('❌ Could not fix JSON:', error.message)
      return null
    }
  }

  /**
   * Validate the structure of the analysis response
   */
  private validateAnalysisStructure(analysis: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Check required top-level properties
    if (!analysis.studentName) errors.push('Missing studentName')
    if (!analysis.totalSessions) errors.push('Missing totalSessions')
    if (!analysis.timeSpan) errors.push('Missing timeSpan')
    if (!analysis.skillCategories) errors.push('Missing skillCategories')
    if (!analysis.patternAnalysis) errors.push('Missing patternAnalysis')
    if (!analysis.overallProgression) errors.push('Missing overallProgression')
    if (!analysis.recommendations) errors.push('Missing recommendations')
    
    // Check skillCategories structure
    if (analysis.skillCategories) {
      const requiredSkills = [
        'speechTimeAndHook',
        'deliverySkills',
        'argumentStructureAndDepth',
        'rebuttalAndDirectness',
        'examplesAndIllustrations',
        'engagementAndPOIs',
        'speechStructureAndOrganization'
      ]
      
      for (const skill of requiredSkills) {
        if (!analysis.skillCategories[skill]) {
          errors.push(`Missing skill category: ${skill}`)
        } else {
          const skillData = analysis.skillCategories[skill]
          if (!skillData.name) errors.push(`Missing name for ${skill}`)
          if (!skillData.currentLevel) errors.push(`Missing currentLevel for ${skill}`)
          if (!skillData.progress) errors.push(`Missing progress for ${skill}`)
          if (!skillData.consistency) errors.push(`Missing consistency for ${skill}`)
          if (!Array.isArray(skillData.evidence)) errors.push(`Invalid evidence array for ${skill}`)
        }
      }
    }
    
    // Check recommendations structure
    if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
      analysis.recommendations.forEach((rec: any, index: number) => {
        if (!rec.id) errors.push(`Missing id for recommendation ${index}`)
        if (!rec.category) errors.push(`Missing category for recommendation ${index}`)
        if (!rec.skill) errors.push(`Missing skill for recommendation ${index}`)
        if (!rec.priority) errors.push(`Missing priority for recommendation ${index}`)
        if (!rec.recommendation) errors.push(`Missing recommendation text for recommendation ${index}`)
        if (!rec.evidenceBase) errors.push(`Missing evidenceBase for recommendation ${index}`)
        if (!rec.actionItems) errors.push(`Missing actionItems for recommendation ${index}`)
        if (!rec.measurableGoals) errors.push(`Missing measurableGoals for recommendation ${index}`)
      })
    } else if (analysis.recommendations) {
      errors.push('Recommendations must be an array')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate and enhance the analysis with additional processing
   */
  private validateAndEnhanceAnalysis(
    analysis: ChronologicalAnalysis,
    sessions: DebateFeedbackSession[]
  ): ChronologicalAnalysis {
    // Ensure all required fields are present
    if (!analysis.recommendations) {
      analysis.recommendations = []
    }

    // Add session context to recommendations
    analysis.recommendations.forEach(rec => {
      if (!rec.id) {
        rec.id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    })

    // Calculate time span if not provided
    if (!analysis.timeSpan && sessions.length > 0) {
      const firstDate = sessions[0].date
      const lastDate = sessions[sessions.length - 1].date
      analysis.timeSpan = `${firstDate} to ${lastDate}`
    }

    // Ensure chronological trends are properly ordered
    Object.values(analysis.skillCategories).forEach(category => {
      if (category.chronologicalTrend) {
        category.chronologicalTrend.sort((a, b) => a.session - b.session)
      }
    })

    return analysis
  }

  /**
   * Generate focused recommendations for specific skill areas
   */
  async generateTargetedRecommendations(
    analysis: ChronologicalAnalysis,
    focusSkills: string[]
  ): Promise<ScientificRecommendation[]> {
    const targetedRecs = analysis.recommendations.filter(rec => 
      focusSkills.some(skill => rec.skill.toLowerCase().includes(skill.toLowerCase()))
    )

    // If we don't have enough targeted recommendations, generate more
    if (targetedRecs.length < focusSkills.length) {
      // This would trigger additional AI analysis for specific skills
      // For now, return existing recommendations
    }

    return targetedRecs
  }

  /**
   * Track recommendation progress over time
   */
  async trackRecommendationProgress(
    originalAnalysis: ChronologicalAnalysis,
    newFeedbackSessions: DebateFeedbackSession[]
  ): Promise<{
    improvedRecommendations: string[]
    stalledRecommendations: string[]
    newConcerns: string[]
  }> {
    // This would compare new feedback against previous recommendations
    // and track which areas have improved
    return {
      improvedRecommendations: [],
      stalledRecommendations: [],
      newConcerns: []
    }
  }
}

// Export singleton instance
export const debateRecommendationEngine = new DebateRecommendationEngine()