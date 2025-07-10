import { GoogleGenAI } from '@google/genai'
import { SchemaType } from '@google/generative-ai'
import { DEBATE_METRICS, type MetricScore } from '@/types/debate-metrics'
import { AI_CONFIG, getOptimalModel, withRetry } from './ai-config'
import type { 
  EnrichedFeedbackSession, 
  ExtractedPatterns, 
  DiagnosticAnalysis, 
  PersonalizedRecommendation 
} from './ai-diagnostic-engine'

/**
 * Optimized AI Diagnostic Engine with reduced prompt sizes and better performance
 */

interface OptimizedSession {
  date: string
  key_points: string[]
  rubric_scores: Record<string, number>
  instructor_tone: 'positive' | 'critical' | 'balanced'
}

export class OptimizedDiagnosticEngine {
  private apiKey: string
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('Gemini API key required')
    }
  }

  /**
   * Pre-process sessions to extract only essential information
   */
  private preprocessSessions(sessions: EnrichedFeedbackSession[]): OptimizedSession[] {
    return sessions.map(session => {
      const content = session.content.toLowerCase()
      
      // Extract key sentences instead of full content
      const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 20)
      const keyPoints: string[] = []
      
      // Use configuration for priority phrases
      const priorityPhrases = [
        ...AI_CONFIG.contentPriorities.highPriority,
        ...AI_CONFIG.contentPriorities.positive,
        ...AI_CONFIG.contentPriorities.improvement
      ]
      
      // Extract sentences containing priority phrases
      for (const sentence of sentences) {
        if (keyPoints.length >= AI_CONFIG.optimization.maxKeyPoints) break
        if (priorityPhrases.some(phrase => sentence.includes(phrase))) {
          keyPoints.push(sentence.trim())
        }
      }
      
      // If not enough key points, add first few sentences
      if (keyPoints.length < 3) {
        keyPoints.push(...sentences.slice(0, 3 - keyPoints.length).map(s => s.trim()))
      }
      
      // Determine tone
      const positiveCount = (content.match(/excellent|strong|good|effective|confident|improved/g) || []).length
      const negativeCount = (content.match(/needs|weak|poor|struggled|difficulty|work on/g) || []).length
      
      let tone: 'positive' | 'critical' | 'balanced' = 'balanced'
      if (positiveCount > negativeCount * 1.5) tone = 'positive'
      else if (negativeCount > positiveCount * 1.5) tone = 'critical'
      
      return {
        date: session.date,
        key_points: keyPoints,
        rubric_scores: session.rubricScores || {},
        instructor_tone: tone
      }
    })
  }

  /**
   * Single-pass comprehensive analysis to reduce API calls
   */
  async analyzeStudentComprehensive(
    sessions: EnrichedFeedbackSession[],
    studentName: string,
    level: 'primary' | 'secondary' = 'primary'
  ): Promise<{
    patterns: ExtractedPatterns
    diagnosis: DiagnosticAnalysis
    recommendations: PersonalizedRecommendation[]
    debateMetrics: {
      metrics: MetricScore[]
      overallScore: number
    }
  }> {
    console.log(`🚀 Starting optimized analysis for ${studentName}...`)
    
    // Pre-process sessions to reduce data size
    const optimizedSessions = this.preprocessSessions(sessions)
    console.log(`📊 Reduced data from ${JSON.stringify(sessions).length} to ${JSON.stringify(optimizedSessions).length} chars`)
    
    const ai = new GoogleGenAI({ apiKey: this.apiKey })
    
    // Build a single, comprehensive prompt
    const prompt = this.buildComprehensivePrompt(optimizedSessions, studentName, level)
    console.log(`📝 Optimized prompt length: ${prompt.length} characters`)
    
    // Select optimal model based on data size
    const model = getOptimalModel(prompt.length)
    console.log(`🤖 Using model: ${model}`)
    
    const config = {
      responseMimeType: 'application/json',
      responseSchema: this.getComprehensiveSchema(),
      temperature: 0.5,
      maxOutputTokens: 16384,
    }
    
    try {
      // Use retry wrapper for resilience
      const result = await withRetry(
        async () => {
          const response = await ai.models.generateContentStream({
            model,
            config,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          })
          
          let responseText = ''
          for await (const chunk of response) {
            responseText += chunk.text
          }
          
          return JSON.parse(responseText)
        },
        {
          onRetry: (attempt, error) => {
            console.log(`⚠️ Retry attempt ${attempt} after error:`, error.message)
          }
        }
      )
      
      // Calculate debate metrics scores
      const overallScore = result.debateMetrics.reduce((sum: number, m: any) => {
        const metric = DEBATE_METRICS.find(dm => dm.id === m.metricId)
        return sum + (m.score * (metric?.weight || 0))
      }, 0) / DEBATE_METRICS.reduce((sum, m) => sum + m.weight, 0)
      
      console.log('✅ Comprehensive analysis complete!')
      
      return {
        patterns: result.patterns,
        diagnosis: result.diagnosis,
        recommendations: result.recommendations,
        debateMetrics: {
          metrics: result.debateMetrics,
          overallScore
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error)
      throw new Error('Failed to complete analysis')
    }
  }

  private buildComprehensivePrompt(
    sessions: OptimizedSession[],
    studentName: string,
    level: string
  ): string {
    // Create a compact rubric trends summary
    const rubricTrends = this.calculateRubricTrends(sessions)
    
    return `Analyze ${studentName}'s debate performance (${level} level) across ${sessions.length} sessions.

RUBRIC TRENDS:
${rubricTrends}

KEY FEEDBACK POINTS:
${sessions.map((s, i) => `Session ${i+1} (${s.date}):
- Tone: ${s.instructor_tone}
- Key points: ${s.key_points.join('; ')}
- Scores: ${Object.entries(s.rubric_scores).map(([k,v]) => `${k}:${v}`).join(', ')}`).join('\n\n')}

ANALYSIS TASKS:
1. Extract 3-5 skill trends with evidence
2. Identify top 3 strengths and critical issues
3. Diagnose 2-3 root causes for main issues
4. Create student learning profile
5. Generate 3 specific recommendations with exercises
6. Score all 11 debate metrics (1-5 scale)

Be concise but specific. Focus on actionable insights.`
  }

  private calculateRubricTrends(sessions: OptimizedSession[]): string {
    if (sessions.length < 2) return 'Insufficient data for trends'
    
    const trends: Record<string, string> = {}
    const rubricKeys = Object.keys(sessions[0].rubric_scores)
    
    for (const key of rubricKeys) {
      const scores = sessions.map(s => s.rubric_scores[key] || 0)
      const firstScore = scores[0]
      const lastScore = scores[scores.length - 1]
      const avgChange = (lastScore - firstScore) / scores.length
      
      if (avgChange > 0.2) trends[key] = '↑'
      else if (avgChange < -0.2) trends[key] = '↓'
      else trends[key] = '→'
    }
    
    return Object.entries(trends)
      .map(([key, trend]) => `${key}: ${trend}`)
      .join(', ')
  }

  private getComprehensiveSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        patterns: {
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
                  evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                },
                required: ['skill', 'trajectory', 'currentLevel', 'evidence']
              }
            },
            strengthSignatures: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  strength: { type: SchemaType.STRING },
                  consistency: { type: SchemaType.NUMBER },
                  evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                },
                required: ['strength', 'consistency', 'evidence']
              }
            },
            criticalIssues: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  issue: { type: SchemaType.STRING },
                  severity: { type: SchemaType.STRING },
                  frequency: { type: SchemaType.NUMBER }
                },
                required: ['issue', 'severity', 'frequency']
              }
            }
          },
          required: ['skillTrends', 'strengthSignatures', 'criticalIssues']
        },
        diagnosis: {
          type: SchemaType.OBJECT,
          properties: {
            rootCauses: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  symptom: { type: SchemaType.STRING },
                  cause: { type: SchemaType.STRING },
                  category: { type: SchemaType.STRING }
                },
                required: ['symptom', 'cause', 'category']
              }
            },
            learningProfile: {
              type: SchemaType.OBJECT,
              properties: {
                style: { type: SchemaType.STRING },
                motivators: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                anxietyTriggers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ['style', 'motivators', 'anxietyTriggers']
            }
          },
          required: ['rootCauses', 'learningProfile']
        },
        recommendations: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              focus: { type: SchemaType.STRING },
              solution: { type: SchemaType.STRING },
              exercises: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    duration: { type: SchemaType.STRING }
                  },
                  required: ['name', 'description', 'duration']
                }
              }
            },
            required: ['focus', 'solution', 'exercises']
          }
        },
        debateMetrics: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              metricId: { type: SchemaType.STRING },
              score: { type: SchemaType.NUMBER },
              trend: { type: SchemaType.STRING }
            },
            required: ['metricId', 'score', 'trend']
          }
        }
      },
      required: ['patterns', 'diagnosis', 'recommendations', 'debateMetrics']
    }
  }
}

// Export optimized instance
export const optimizedDiagnosticEngine = new OptimizedDiagnosticEngine()