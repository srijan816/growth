import { GoogleGenAI } from '@google/genai'
import { SchemaType } from '@google/generative-ai'
import { DEBATE_METRICS, type DebateMetric, type MetricScore } from '@/types/debate-metrics'

/**
 * Enhanced AI Diagnostic Engine for Student Feedback Analysis
 * 
 * This implements a multi-stage approach:
 * 1. Pattern Recognition - Extract concrete patterns from feedback
 * 2. Root Cause Analysis - Diagnose WHY issues occur
 * 3. Personalized Recommendations - Generate specific, actionable steps
 */

// ============= TYPE DEFINITIONS =============

export interface EnrichedFeedbackSession {
  id: string
  date: string
  unitNumber: string
  motion?: string
  content: string
  rubricScores?: Record<string, number>
  
  // Enriched fields
  rubricTrends?: {
    improving: string[]
    declining: string[]
    volatile: string[]
  }
  keyPhrases?: {
    positive: string[]
    concern: string[]
  }
  instructorTone?: 'encouraging' | 'critical' | 'balanced'
}

export interface ExtractedPatterns {
  skillTrends: Array<{
    skill: string
    trajectory: 'improving' | 'declining' | 'plateau' | 'volatile'
    currentLevel: number // 1-5
    dataPoints: Array<{
      session: number
      score: number
      evidence: string
    }>
    breakpoints: Array<{
      session: number
      change: 'breakthrough' | 'regression'
      trigger?: string
    }>
  }>
  
  recurringThemes: Array<{
    theme: string
    frequency: number
    sessions: number[]
    examples: string[]
    severity: 'critical' | 'moderate' | 'minor'
    trend: 'increasing' | 'decreasing' | 'stable'
  }>
  
  strengthSignatures: Array<{
    strength: string
    consistency: number // 0-1
    evidence: string[]
    leverageOpportunities: string[]
  }>
  
  timeManagementPattern?: {
    averageDuration: number
    consistency: 'consistent' | 'inconsistent'
    trend: 'improving' | 'declining' | 'stable'
  }
}

export interface RootCause {
  symptom: string
  rootCause: string
  evidence: string[]
  category: 'knowledge' | 'skill' | 'confidence' | 'preparation' | 'conceptual' | 'anxiety'
  confidence: number // 0-1
  connectedSymptoms: string[]
}

export interface DiagnosticAnalysis {
  primaryIssues: RootCause[]
  secondaryIssues: RootCause[]
  
  studentProfile: {
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
    motivationalDrivers: string[]
    anxietyTriggers: string[]
    strengthsToLeverage: string[]
    preferredFeedbackStyle: 'direct' | 'encouraging' | 'detailed'
  }
  
  interconnections: Array<{
    issue1: string
    issue2: string
    relationship: string
  }>
}

export interface Exercise {
  name: string
  description: string
  duration: string
  frequency: string
  materials: string[]
  steps: string[]
  successCriteria: string
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
}

export interface PersonalizedRecommendation {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  
  targetIssue: string
  rootCauseDiagnosis: string
  
  recommendation: {
    what: string
    why: string
    how: string
  }
  
  exercises: Exercise[]
  
  milestones: Array<{
    week: number
    target: string
    measurement: string
    checkIn: string
  }>
  
  coachingNotes: {
    inClassFocus: string[]
    encouragementStrategy: string
    avoidanceList: string[]
    parentCommunication: string
  }
  
  expectedOutcome: {
    timeframe: string
    successIndicators: string[]
    potentialChallenges: string[]
  }
}

// ============= MAIN ENGINE CLASS =============

export class DiagnosticEngine {
  private apiKey: string
  private model: string = 'gemini-2.5-flash'
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('Gemini API key required for DiagnosticEngine')
    }
  }
  
  // ============= STAGE 1: PATTERN RECOGNITION =============
  
  async extractPatterns(sessions: EnrichedFeedbackSession[]): Promise<ExtractedPatterns> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey })
    
    const prompt = this.buildPatternExtractionPrompt(sessions)
    
    const config = {
      responseMimeType: 'application/json',
      responseSchema: this.getPatternExtractionSchema(),
      temperature: 0.3, // Lower for more consistent pattern recognition
      maxOutputTokens: 8192,
    }
    
    try {
      const response = await ai.models.generateContentStream({
        model: this.model,
        config,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
      
      let responseText = ''
      for await (const chunk of response) {
        responseText += chunk.text
      }
      
      return JSON.parse(responseText) as ExtractedPatterns
    } catch (error) {
      console.error('Pattern extraction failed:', error)
      throw new Error('Failed to extract patterns from feedback')
    }
  }
  
  private buildPatternExtractionPrompt(sessions: EnrichedFeedbackSession[]): string {
    // Create a rubric progression table
    const rubricProgression = this.formatRubricProgression(sessions)
    
    // Format sessions for analysis
    const formattedSessions = sessions.map((session, idx) => ({
      number: idx + 1,
      date: session.date,
      unit: session.unitNumber,
      content: session.content.substring(0, 500), // Limit content length
      rubricScores: session.rubricScores,
    }))
    
    return `You are an expert educational data analyst specializing in debate performance patterns.

Analyze these ${sessions.length} chronological feedback sessions to extract concrete patterns.

RUBRIC SCORE PROGRESSION:
${rubricProgression}

FEEDBACK SESSIONS:
${JSON.stringify(formattedSessions, null, 2)}

ANALYSIS REQUIREMENTS:

1. SKILL TRENDS: For each major skill area, identify:
   - Current trajectory (improving/declining/plateau/volatile)
   - Specific data points with evidence
   - Breakpoint moments where performance changed significantly

2. RECURRING THEMES: Identify phrases or issues that appear multiple times:
   - Must appear in at least 2 sessions
   - Include exact quotes as evidence
   - Assess severity and trend

3. STRENGTH SIGNATURES: Identify consistent strengths:
   - Skills or behaviors praised repeatedly
   - Consistency score (0-1) based on how often it appears
   - Specific ways to leverage these strengths

4. TIME MANAGEMENT: If duration data exists, analyze patterns

Focus on CONCRETE EVIDENCE, not interpretations. Every pattern must have specific quotes or data points.`
  }
  
  private formatRubricProgression(sessions: EnrichedFeedbackSession[]): string {
    const rubricNames = [
      'Duration Management',
      'Point of Information',
      'Style/Persuasion',
      'Argument Completeness',
      'Theory Application',
      'Rebuttal Effectiveness',
      'Teammate Support',
      'Feedback Application'
    ]
    
    let table = 'Session |'
    rubricNames.forEach((_, idx) => {
      table += ` R${idx + 1} |`
    })
    table += '\n' + '-'.repeat(60) + '\n'
    
    sessions.forEach((session, idx) => {
      if (session.rubricScores) {
        table += `   ${idx + 1}    |`
        for (let i = 1; i <= 8; i++) {
          const score = session.rubricScores[`rubric_${i}`] || 0
          table += `  ${score}  |`
        }
        table += '\n'
      }
    })
    
    return table
  }
  
  private getPatternExtractionSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        skillTrends: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              skill: { type: SchemaType.STRING },
              trajectory: { type: SchemaType.STRING },
              currentLevel: { type: SchemaType.NUMBER },
              dataPoints: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    session: { type: SchemaType.INTEGER },
                    score: { type: SchemaType.NUMBER },
                    evidence: { type: SchemaType.STRING }
                  },
                  required: ['session', 'score', 'evidence']
                }
              },
              breakpoints: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    session: { type: SchemaType.INTEGER },
                    change: { type: SchemaType.STRING },
                    trigger: { type: SchemaType.STRING }
                  },
                  required: ['session', 'change']
                }
              }
            },
            required: ['skill', 'trajectory', 'currentLevel', 'dataPoints']
          }
        },
        recurringThemes: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              theme: { type: SchemaType.STRING },
              frequency: { type: SchemaType.INTEGER },
              sessions: { type: SchemaType.ARRAY, items: { type: SchemaType.INTEGER } },
              examples: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              severity: { type: SchemaType.STRING },
              trend: { type: SchemaType.STRING }
            },
            required: ['theme', 'frequency', 'sessions', 'examples', 'severity', 'trend']
          }
        },
        strengthSignatures: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              strength: { type: SchemaType.STRING },
              consistency: { type: SchemaType.NUMBER },
              evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              leverageOpportunities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ['strength', 'consistency', 'evidence', 'leverageOpportunities']
          }
        }
      },
      required: ['skillTrends', 'recurringThemes', 'strengthSignatures']
    }
  }
  
  // ============= STAGE 2: ROOT CAUSE ANALYSIS =============
  
  async diagnoseRootCauses(
    patterns: ExtractedPatterns,
    studentName: string
  ): Promise<DiagnosticAnalysis> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey })
    
    const prompt = this.buildDiagnosticPrompt(patterns, studentName)
    
    const config = {
      responseMimeType: 'application/json',
      responseSchema: this.getDiagnosticSchema(),
      temperature: 0.5, // Moderate for creative diagnosis
      maxOutputTokens: 8192,
    }
    
    try {
      const response = await ai.models.generateContentStream({
        model: this.model,
        config,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
      
      let responseText = ''
      for await (const chunk of response) {
        responseText += chunk.text
      }
      
      return JSON.parse(responseText) as DiagnosticAnalysis
    } catch (error) {
      console.error('Root cause diagnosis failed:', error)
      throw new Error('Failed to diagnose root causes')
    }
  }
  
  private buildDiagnosticPrompt(patterns: ExtractedPatterns, studentName: string): string {
    return `You are an expert educational psychologist and debate coach analyzing student performance patterns.

Analyze these extracted patterns for ${studentName} to diagnose root causes.

EXTRACTED PATTERNS:
${JSON.stringify(patterns, null, 2)}

DIAGNOSTIC FRAMEWORK:

For each recurring issue or declining skill:

1. IDENTIFY THE SYMPTOM: What is the observable behavior?

2. DIAGNOSE ROOT CAUSES: Consider these categories:
   - KNOWLEDGE: Missing information or concepts
   - SKILL: Technique that needs practice
   - CONFIDENCE: Anxiety or self-doubt issues
   - PREPARATION: Planning or time management
   - CONCEPTUAL: Fundamental misunderstanding
   - ANXIETY: Performance or social anxiety

3. EVIDENCE-BASED DIAGNOSIS: Link each diagnosis to specific evidence

4. INTERCONNECTIONS: How do issues relate to each other?

5. STUDENT PROFILE: Based on all patterns, what type of learner is this?

IMPORTANT: 
- Go beyond surface symptoms to underlying causes
- Consider psychological and emotional factors
- Look for root causes that explain multiple symptoms
- Be specific about anxiety triggers if present`
  }
  
  private getDiagnosticSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        primaryIssues: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              symptom: { type: SchemaType.STRING },
              rootCause: { type: SchemaType.STRING },
              evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              category: { type: SchemaType.STRING },
              confidence: { type: SchemaType.NUMBER },
              connectedSymptoms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ['symptom', 'rootCause', 'evidence', 'category', 'confidence']
          }
        },
        secondaryIssues: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              symptom: { type: SchemaType.STRING },
              rootCause: { type: SchemaType.STRING },
              evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              category: { type: SchemaType.STRING },
              confidence: { type: SchemaType.NUMBER },
              connectedSymptoms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ['symptom', 'rootCause', 'evidence', 'category', 'confidence']
          }
        },
        studentProfile: {
          type: SchemaType.OBJECT,
          properties: {
            learningStyle: { type: SchemaType.STRING },
            motivationalDrivers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            anxietyTriggers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            strengthsToLeverage: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            preferredFeedbackStyle: { type: SchemaType.STRING }
          },
          required: ['learningStyle', 'motivationalDrivers', 'anxietyTriggers', 'strengthsToLeverage', 'preferredFeedbackStyle']
        },
        interconnections: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              issue1: { type: SchemaType.STRING },
              issue2: { type: SchemaType.STRING },
              relationship: { type: SchemaType.STRING }
            },
            required: ['issue1', 'issue2', 'relationship']
          }
        }
      },
      required: ['primaryIssues', 'secondaryIssues', 'studentProfile', 'interconnections']
    }
  }
  
  // ============= STAGE 3: PERSONALIZED RECOMMENDATIONS =============
  
  async generateRecommendations(
    diagnosis: DiagnosticAnalysis,
    studentName: string,
    level: 'primary' | 'secondary' = 'primary'
  ): Promise<PersonalizedRecommendation[]> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey })
    
    const prompt = this.buildRecommendationPrompt(diagnosis, studentName, level)
    
    const config = {
      responseMimeType: 'application/json',
      responseSchema: this.getRecommendationSchema(),
      temperature: 0.7, // Higher for creative solutions
      maxOutputTokens: 16384,
    }
    
    try {
      const response = await ai.models.generateContentStream({
        model: this.model,
        config,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
      
      let responseText = ''
      for await (const chunk of response) {
        responseText += chunk.text
      }
      
      const result = JSON.parse(responseText)
      return result.recommendations as PersonalizedRecommendation[]
    } catch (error) {
      console.error('Recommendation generation failed:', error)
      throw new Error('Failed to generate recommendations')
    }
  }
  
  private buildRecommendationPrompt(
    diagnosis: DiagnosticAnalysis,
    studentName: string,
    level: string
  ): string {
    return `You are an expert debate coach creating personalized improvement plans.

Create targeted recommendations for ${studentName} (${level} level) based on this diagnosis:

DIAGNOSTIC RESULTS:
${JSON.stringify(diagnosis, null, 2)}

RECOMMENDATION GUIDELINES:

1. ADDRESS ROOT CAUSES, NOT SYMPTOMS
   - Each recommendation must target a specific root cause
   - Explain HOW it addresses the underlying issue

2. SPECIFIC EXERCISES (Not Generic Advice)
   - Name each exercise creatively
   - Provide exact steps (numbered)
   - Include materials needed
   - Set clear success criteria
   - Duration: 5-15 minutes each

3. PROGRESSIVE MILESTONES
   - Week 1: Foundation building
   - Week 2: Skill development
   - Week 3: Integration
   - Week 4: Mastery check

4. INSTRUCTOR GUIDANCE
   - What to focus on during class
   - How to encourage without pressure
   - What mistakes to avoid
   - One key message for parents

5. LEVERAGE STRENGTHS
   - Use identified strengths to address weaknesses
   - Build confidence while developing skills

EXERCISE EXAMPLES:
- "Mirror Debate": Practice arguments in mirror for confidence
- "Timer Challenge": Speak on random topics for exact durations
- "Evidence Hunt": Find 3 examples for any claim in 2 minutes

Create 3-5 recommendations prioritized by impact. Each must be actionable TODAY.`
  }
  
  private getRecommendationSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        recommendations: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              priority: { type: SchemaType.STRING },
              targetIssue: { type: SchemaType.STRING },
              rootCauseDiagnosis: { type: SchemaType.STRING },
              recommendation: {
                type: SchemaType.OBJECT,
                properties: {
                  what: { type: SchemaType.STRING },
                  why: { type: SchemaType.STRING },
                  how: { type: SchemaType.STRING }
                },
                required: ['what', 'why', 'how']
              },
              exercises: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    duration: { type: SchemaType.STRING },
                    frequency: { type: SchemaType.STRING },
                    materials: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    successCriteria: { type: SchemaType.STRING },
                    difficultyLevel: { type: SchemaType.STRING }
                  },
                  required: ['name', 'description', 'duration', 'frequency', 'materials', 'steps', 'successCriteria', 'difficultyLevel']
                }
              },
              milestones: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    week: { type: SchemaType.INTEGER },
                    target: { type: SchemaType.STRING },
                    measurement: { type: SchemaType.STRING },
                    checkIn: { type: SchemaType.STRING }
                  },
                  required: ['week', 'target', 'measurement', 'checkIn']
                }
              },
              coachingNotes: {
                type: SchemaType.OBJECT,
                properties: {
                  inClassFocus: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  encouragementStrategy: { type: SchemaType.STRING },
                  avoidanceList: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  parentCommunication: { type: SchemaType.STRING }
                },
                required: ['inClassFocus', 'encouragementStrategy', 'avoidanceList', 'parentCommunication']
              },
              expectedOutcome: {
                type: SchemaType.OBJECT,
                properties: {
                  timeframe: { type: SchemaType.STRING },
                  successIndicators: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  potentialChallenges: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                },
                required: ['timeframe', 'successIndicators', 'potentialChallenges']
              }
            },
            required: ['id', 'priority', 'targetIssue', 'rootCauseDiagnosis', 'recommendation', 'exercises', 'milestones', 'coachingNotes', 'expectedOutcome']
          }
        }
      },
      required: ['recommendations']
    }
  }
  
  // ============= DEBATE METRICS ANALYSIS =============
  
  async analyzeDebateMetrics(
    sessions: EnrichedFeedbackSession[],
    studentName: string,
    level: 'primary' | 'secondary' = 'primary'
  ): Promise<{
    metrics: MetricScore[]
    overallScore: number
    metricAnalysis: Array<{
      metric: DebateMetric
      score: number
      trend: MetricScore['trend']
      evidence: string[]
      improvements: string[]
      concerns: string[]
    }>
  }> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey })
    
    const prompt = this.buildDebateMetricsPrompt(sessions, studentName)
    
    const config = {
      responseMimeType: 'application/json',
      responseSchema: this.getDebateMetricsSchema(),
      temperature: 0.3,
      maxOutputTokens: 16384,
    }
    
    try {
      const response = await ai.models.generateContentStream({
        model: this.model,
        config,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
      
      let responseText = ''
      for await (const chunk of response) {
        responseText += chunk.text
      }
      
      const result = JSON.parse(responseText)
      
      // Calculate overall score
      const overallScore = result.metrics.reduce((sum: number, m: any) => {
        const metric = DEBATE_METRICS.find(dm => dm.id === m.metricId)
        return sum + (m.score * (metric?.weight || 0))
      }, 0) / DEBATE_METRICS.reduce((sum, m) => sum + m.weight, 0)
      
      return {
        metrics: result.metrics,
        overallScore,
        metricAnalysis: result.metricAnalysis
      }
    } catch (error) {
      console.error('Debate metrics analysis failed:', error)
      throw new Error('Failed to analyze debate metrics')
    }
  }
  
  private buildDebateMetricsPrompt(sessions: EnrichedFeedbackSession[], studentName: string): string {
    const sessionData = sessions.map((session, idx) => ({
      number: idx + 1,
      date: session.date,
      content: session.content,
      rubricScores: session.rubricScores || {}
    }))
    
    return `You are an expert debate coach analyzing ${studentName}'s performance across 11 specific debate metrics.

DEBATE METRICS TO ANALYZE:
${DEBATE_METRICS.map(m => `- ${m.name}: ${m.description}`).join('\n')}

FEEDBACK SESSIONS (${sessions.length} total):
${JSON.stringify(sessionData, null, 2)}

For each metric, analyze:
1. Current performance level (1-5 scale)
2. Trend across sessions (improving/declining/stable/volatile)
3. Specific evidence from feedback
4. Key improvements observed
5. Remaining concerns

SCORING GUIDE:
5 = Exceptional: Consistently exceeds expectations
4 = Proficient: Meets expectations well
3 = Developing: Shows competence with room for growth
2 = Emerging: Basic understanding, needs significant work
1 = Beginning: Minimal demonstration of skill

Base your analysis on concrete evidence from the feedback. If a metric isn't mentioned, infer from related content or mark as "insufficient data."`
  }
  
  private getDebateMetricsSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        metrics: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              metricId: { type: SchemaType.STRING },
              score: { type: SchemaType.NUMBER },
              trend: { type: SchemaType.STRING },
              evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ['metricId', 'score', 'trend', 'evidence']
          }
        },
        metricAnalysis: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              metricId: { type: SchemaType.STRING },
              score: { type: SchemaType.NUMBER },
              trend: { type: SchemaType.STRING },
              evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              improvements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              concerns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ['metricId', 'score', 'trend', 'evidence', 'improvements', 'concerns']
          }
        }
      },
      required: ['metrics', 'metricAnalysis']
    }
  }
  
  // ============= COMPLETE ANALYSIS PIPELINE =============
  
  async analyzeStudent(
    sessions: EnrichedFeedbackSession[],
    studentName: string,
    level: 'primary' | 'secondary' = 'primary'
  ): Promise<{
    patterns: ExtractedPatterns
    diagnosis: DiagnosticAnalysis
    recommendations: PersonalizedRecommendation[]
    debateMetrics?: {
      metrics: MetricScore[]
      overallScore: number
      metricAnalysis: any[]
    }
  }> {
    console.log(`🔍 Starting diagnostic analysis for ${studentName}...`)
    
    // Stage 1: Extract Patterns
    console.log('📊 Stage 1: Extracting patterns...')
    const patterns = await this.extractPatterns(sessions)
    
    // Stage 2: Diagnose Root Causes
    console.log('🔬 Stage 2: Diagnosing root causes...')
    const diagnosis = await this.diagnoseRootCauses(patterns, studentName)
    
    // Stage 3: Generate Recommendations
    console.log('💡 Stage 3: Generating personalized recommendations...')
    const recommendations = await this.generateRecommendations(diagnosis, studentName, level)
    
    // Stage 4: Analyze Debate Metrics
    console.log('📈 Stage 4: Analyzing debate metrics...')
    let debateMetrics
    try {
      debateMetrics = await this.analyzeDebateMetrics(sessions, studentName, level)
    } catch (error) {
      console.error('Failed to analyze debate metrics:', error)
      // Continue without metrics rather than failing entire analysis
    }
    
    console.log('✅ Diagnostic analysis complete!')
    
    return {
      patterns,
      diagnosis,
      recommendations,
      debateMetrics
    }
  }
}

// ============= HELPER FUNCTIONS =============

export function enrichFeedbackSessions(
  sessions: any[]
): EnrichedFeedbackSession[] {
  return sessions.map((session, index) => {
    const enriched: EnrichedFeedbackSession = {
      id: session.id || `session_${index}`,
      date: session.date || session.created_at,
      unitNumber: session.unit_number || session.unitNumber,
      motion: session.motion || session.topic,
      content: session.content || '',
      rubricScores: session.rubric_scores || session.rubricScores
    }
    
    // Calculate rubric trends if we have scores
    if (enriched.rubricScores && index > 0) {
      const prevSession = sessions[index - 1]
      if (prevSession.rubric_scores || prevSession.rubricScores) {
        const prevScores = prevSession.rubric_scores || prevSession.rubricScores
        const trends = {
          improving: [] as string[],
          declining: [] as string[],
          volatile: [] as string[]
        }
        
        Object.keys(enriched.rubricScores).forEach(key => {
          const current = enriched.rubricScores![key]
          const previous = prevScores[key]
          if (current > previous) trends.improving.push(key)
          else if (current < previous) trends.declining.push(key)
        })
        
        enriched.rubricTrends = trends
      }
    }
    
    // Extract key phrases
    const content = enriched.content.toLowerCase()
    enriched.keyPhrases = {
      positive: [],
      concern: []
    }
    
    // Positive indicators
    const positiveWords = ['excellent', 'strong', 'effective', 'confident', 'improved', 'well']
    positiveWords.forEach(word => {
      if (content.includes(word)) {
        enriched.keyPhrases!.positive.push(word)
      }
    })
    
    // Concern indicators
    const concernWords = ['needs', 'work on', 'struggled', 'difficulty', 'challenge', 'weak']
    concernWords.forEach(word => {
      if (content.includes(word)) {
        enriched.keyPhrases!.concern.push(word)
      }
    })
    
    // Determine instructor tone
    const positiveCount = enriched.keyPhrases.positive.length
    const concernCount = enriched.keyPhrases.concern.length
    
    if (positiveCount > concernCount * 2) {
      enriched.instructorTone = 'encouraging'
    } else if (concernCount > positiveCount * 2) {
      enriched.instructorTone = 'critical'
    } else {
      enriched.instructorTone = 'balanced'
    }
    
    return enriched
  })
}

// Export singleton instance
export const diagnosticEngine = new DiagnosticEngine()