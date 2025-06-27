import { GoogleGenerativeAI } from '@google/generative-ai'

// AI Recommendation System for Student Growth
// Analyzes student feedback and provides specific improvement strategies

interface StudentFeedback {
  unitNumber: string
  topic: string
  content: string
  feedbackType: 'primary' | 'secondary'
  strengths?: string[]
  improvements?: string[]
  rubricScores?: Array<{ category: string; score: string }>
}

interface GrowthArea {
  skill: string
  trend: 'declining' | 'stable' | 'improving'
  priority: 'high' | 'medium' | 'low'
  evidenceCount: number
}

interface AIRecommendation {
  id: string
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
  lastUpdated: Date
}

interface ProgramContext {
  programType: 'PSD' | 'Academic Writing' | 'RAPS' | 'Critical Thinking'
  level: string
  objectives: string[]
}

class AIRecommendationEngine {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable is required')
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  }

  /**
   * Generate personalized improvement recommendations for a student
   */
  async generateRecommendations(
    studentName: string,
    feedbackHistory: StudentFeedback[],
    growthAreas: GrowthArea[],
    programContext: ProgramContext
  ): Promise<AIRecommendation[]> {
    try {
      const prompt = this.buildRecommendationPrompt(
        studentName,
        feedbackHistory,
        growthAreas,
        programContext
      )

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      return this.parseRecommendations(text, studentName)
    } catch (error) {
      console.error('Error generating AI recommendations:', error)
      return this.getFallbackRecommendations(studentName, growthAreas, programContext)
    }
  }

  /**
   * Build comprehensive prompt for AI recommendation generation
   */
  private buildRecommendationPrompt(
    studentName: string,
    feedbackHistory: StudentFeedback[],
    growthAreas: GrowthArea[],
    programContext: ProgramContext
  ): string {
    const recentFeedback = feedbackHistory.slice(-5) // Last 5 feedback sessions
    const strengths = this.extractStrengths(feedbackHistory)
    const patterns = this.identifyPatterns(feedbackHistory)

    return `
You are an expert educational consultant specializing in ${programContext.programType} skill development. 
Analyze the following student data and provide specific, actionable improvement recommendations.

STUDENT: ${studentName}
PROGRAM: ${programContext.programType} (${programContext.level})
PROGRAM OBJECTIVES: ${programContext.objectives.join(', ')}

RECENT FEEDBACK HISTORY:
${recentFeedback.map((f, i) => `
Session ${i + 1} - ${f.topic} (${f.feedbackType})
Content: ${f.content.substring(0, 500)}...
${f.rubricScores ? 'Rubric Scores: ' + f.rubricScores.map(r => `${r.category}: ${r.score}`).join(', ') : ''}
`).join('\n')}

IDENTIFIED GROWTH AREAS:
${growthAreas.map(area => `
- ${area.skill}: ${area.trend} trend (${area.priority} priority, ${area.evidenceCount} instances)`).join('\n')}

STUDENT STRENGTHS:
${strengths.join(', ')}

OBSERVED PATTERNS:
${patterns.join(', ')}

Please provide recommendations in the following JSON format:
{
  "recommendations": [
    {
      "growthArea": "specific skill name",
      "priority": "high|medium|low",
      "category": "skill-building|practice|mindset|technique",
      "recommendation": "clear, specific recommendation in 1-2 sentences",
      "specificActions": [
        "actionable step 1",
        "actionable step 2",
        "actionable step 3"
      ],
      "timeframe": "suggested timeframe (e.g., '2-3 weeks', 'next 5 sessions')",
      "measurableGoals": [
        "specific measurable outcome 1",
        "specific measurable outcome 2"
      ],
      "resources": [
        "specific resource or exercise",
        "practice material or technique"
      ],
      "instructorNotes": "guidance for instructor on implementation",
      "confidence": 85
    }
  ]
}

GUIDELINES:
1. Focus on the top 3-4 most impactful growth areas
2. Provide specific, actionable steps, not generic advice
3. Include measurable goals that can be tracked in future sessions
4. Consider the student's strengths when designing improvement strategies
5. Tailor recommendations to ${programContext.programType} specific skills
6. Ensure recommendations are appropriate for ${programContext.level} level
7. Include confidence score (0-100) based on evidence quality
8. Prioritize areas showing declining trends
9. Build on existing strengths to address weaknesses
10. Include specific timeframes for implementation and assessment

Return only valid JSON, no additional text.`
  }

  /**
   * Parse AI response into structured recommendations
   */
  private parseRecommendations(aiResponse: string, studentName: string): AIRecommendation[] {
    try {
      const parsed = JSON.parse(aiResponse)
      
      return parsed.recommendations.map((rec: any, index: number) => ({
        id: `${studentName}-${Date.now()}-${index}`,
        studentName,
        growthArea: rec.growthArea,
        priority: rec.priority,
        category: rec.category,
        recommendation: rec.recommendation,
        specificActions: rec.specificActions || [],
        timeframe: rec.timeframe,
        measurableGoals: rec.measurableGoals || [],
        resources: rec.resources || [],
        instructorNotes: rec.instructorNotes,
        confidence: rec.confidence || 75,
        lastUpdated: new Date()
      }))
    } catch (error) {
      console.error('Error parsing AI recommendations:', error)
      return []
    }
  }

  /**
   * Extract strengths from feedback history
   */
  private extractStrengths(feedbackHistory: StudentFeedback[]): string[] {
    const strengths: string[] = []
    
    feedbackHistory.forEach(feedback => {
      if (feedback.strengths) {
        strengths.push(...feedback.strengths)
      }
      
      // Extract positive language from content
      const content = feedback.content.toLowerCase()
      if (content.includes('excellent') || content.includes('strong') || content.includes('good')) {
        const sentences = feedback.content.split('.')
        sentences.forEach(sentence => {
          if (sentence.toLowerCase().includes('excellent') || 
              sentence.toLowerCase().includes('strong') || 
              sentence.toLowerCase().includes('good')) {
            strengths.push(sentence.trim())
          }
        })
      }
    })
    
    return [...new Set(strengths)].slice(0, 5) // Remove duplicates, max 5
  }

  /**
   * Identify patterns in feedback
   */
  private identifyPatterns(feedbackHistory: StudentFeedback[]): string[] {
    const patterns: string[] = []
    
    // Look for recurring themes
    const allContent = feedbackHistory.map(f => f.content.toLowerCase()).join(' ')
    
    const commonIssues = [
      'time management',
      'eye contact',
      'voice projection',
      'argument structure',
      'evidence usage',
      'conclusion',
      'introduction',
      'body language',
      'pace',
      'clarity'
    ]
    
    commonIssues.forEach(issue => {
      const count = (allContent.match(new RegExp(issue, 'g')) || []).length
      if (count >= 2) {
        patterns.push(`Recurring mentions of ${issue} (${count} times)`)
      }
    })
    
    return patterns
  }

  /**
   * Fallback recommendations when AI fails
   */
  private getFallbackRecommendations(
    studentName: string,
    growthAreas: GrowthArea[],
    programContext: ProgramContext
  ): AIRecommendation[] {
    const fallbackTemplates = {
      'PSD': {
        'delivery': {
          recommendation: 'Focus on voice projection and eye contact to enhance delivery confidence',
          actions: ['Practice speaking with diaphragmatic breathing', 'Record practice sessions to review body language', 'Use the mirror technique for eye contact'],
          goals: ['Maintain eye contact for 80% of speech time', 'Project voice to back of room without strain']
        },
        'argumentation': {
          recommendation: 'Strengthen argument structure with clear claim-evidence-warrant progression',
          actions: ['Use the CEW template for each argument', 'Practice outlining before speaking', 'Study strong debate examples'],
          goals: ['Include 3 well-structured arguments per speech', 'Connect evidence clearly to claims']
        }
      },
      'Academic Writing': {
        'structure': {
          recommendation: 'Improve essay organization with clear paragraph structure and transitions',
          actions: ['Use topic sentences for each paragraph', 'Practice transition phrases', 'Create detailed outlines'],
          goals: ['Each paragraph has clear main idea', 'Smooth flow between paragraphs']
        }
      }
    }

    return growthAreas.slice(0, 3).map((area, index) => ({
      id: `${studentName}-fallback-${index}`,
      studentName,
      growthArea: area.skill,
      priority: area.priority,
      category: 'skill-building' as const,
      recommendation: fallbackTemplates[programContext.programType]?.[area.skill.toLowerCase()]?.recommendation || 
                    `Focus on developing ${area.skill} through targeted practice and feedback`,
      specificActions: fallbackTemplates[programContext.programType]?.[area.skill.toLowerCase()]?.actions || 
                      ['Practice regularly', 'Seek specific feedback', 'Study examples'],
      timeframe: '2-3 weeks',
      measurableGoals: fallbackTemplates[programContext.programType]?.[area.skill.toLowerCase()]?.goals || 
                      [`Improve ${area.skill} performance by 20%`],
      resources: ['Instructor guidance', 'Practice materials'],
      instructorNotes: `Work with student on ${area.skill} using structured approach`,
      confidence: 60,
      lastUpdated: new Date()
    }))
  }

  /**
   * Generate quick improvement tip for specific skill
   */
  async generateQuickTip(skill: string, programType: string): Promise<string> {
    try {
      const prompt = `Provide a concise, actionable tip for improving "${skill}" in ${programType}. 
      Keep it under 50 words and make it specific and practical.`
      
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text().trim()
    } catch (error) {
      return `Practice ${skill} regularly with focused attention on specific techniques and seek targeted feedback.`
    }
  }

  /**
   * Analyze progress on existing recommendations
   */
  async analyzeProgress(
    recommendations: AIRecommendation[],
    newFeedback: StudentFeedback[]
  ): Promise<{ recommendation: AIRecommendation; progress: 'improved' | 'stable' | 'needs_attention'; evidence: string }[]> {
    const progressAnalysis = []
    
    for (const rec of recommendations) {
      const relevantFeedback = newFeedback.filter(f => 
        f.content.toLowerCase().includes(rec.growthArea.toLowerCase())
      )
      
      if (relevantFeedback.length > 0) {
        const analysis = await this.analyzeSkillProgress(rec.growthArea, relevantFeedback)
        progressAnalysis.push({
          recommendation: rec,
          progress: analysis.progress,
          evidence: analysis.evidence
        })
      }
    }
    
    return progressAnalysis
  }

  private async analyzeSkillProgress(skill: string, feedback: StudentFeedback[]): Promise<{ progress: 'improved' | 'stable' | 'needs_attention'; evidence: string }> {
    try {
      const prompt = `Analyze if there's improvement in "${skill}" based on this recent feedback:
      
      ${feedback.map(f => f.content).join('\n\n')}
      
      Respond with JSON: {"progress": "improved|stable|needs_attention", "evidence": "brief explanation"}`
      
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      const analysis = JSON.parse(text)
      return analysis
    } catch (error) {
      return { progress: 'stable', evidence: 'Unable to analyze progress automatically' }
    }
  }
}

export { AIRecommendationEngine, type AIRecommendation, type GrowthArea, type StudentFeedback, type ProgramContext }