// DeepSeek R1 Recommendation Engine for Scientific Analysis
// Uses OpenRouter API with section-based parsing instead of JSON

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
}

export interface SkillCategory {
  name: string
  currentLevel: string
  progress: string
  consistency: string
  evidence: string[]
  pattern: string
  chronologicalTrend: Array<{
    session: number
    level: string
    date: string
    evidence: string
  }>
}

export interface ScientificRecommendation {
  id: string
  category: string
  skill: string
  priority: string
  recommendation: string
  evidenceBase: {
    sessionCount: number
    patternIdentified: string
    supportingQuotes: string[]
    timeframeCovered: string
  }
  actionItems: {
    preparationFocus: string[]
    practiceExercises: string[]
    nextDebateObjectives: string[]
  }
  measurableGoals: {
    shortTerm: string[]
    mediumTerm: string[]
    longTerm: string[]
  }
  successIndicators: string[]
  timeframe: string
  patternContext: {
    issueFrequency: number
    potentialUnderlyingFactors: string[]
  }
}

export interface ChronologicalAnalysis {
  studentName: string
  totalSessions: number
  timeSpan: string
  skillCategories: {
    speechTimeAndHook: SkillCategory
    deliverySkills: SkillCategory
    argumentStructureAndDepth: SkillCategory
    rebuttalAndDirectness: SkillCategory
    examplesAndIllustrations: SkillCategory
    engagementAndPOIs: SkillCategory
    speechStructureAndOrganization: SkillCategory
  }
  patternAnalysis: {
    repeatedIssues: Array<{
      issue: string
      frequency: number
      sessions: string[]
      severity: string
      trend: string
    }>
    recentConcerns: Array<{
      concern: string
      lastFiveSessions: boolean
      urgency: string
    }>
    progressionPatterns: Array<{
      skill: string
      pattern: string
      duration: string
      evidence: string[]
    }>
  }
  overallProgression: {
    trend: string
    consistency: string
    breakthroughMoments: string[]
  }
  recommendations: ScientificRecommendation[]
}

export class DeepSeekRecommendationEngine {
  private apiKey: string
  private baseUrl: string = 'https://openrouter.ai/api/v1/chat/completions'
  private model: string = 'deepseek/deepseek-r1-0528:free'

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required')
    }
    console.log('✅ DeepSeekRecommendationEngine initialized with OpenRouter')
  }

  /**
   * Main analysis method - processes chronological feedback for scientific recommendations
   */
  async analyzeChronologicalFeedback(
    studentName: string,
    feedbackSessions: DebateFeedbackSession[]
  ): Promise<{ analysis: ChronologicalAnalysis; prompt: string; feedbackSessionCount: number; promptLength: number }> {
    console.log(`🔍 Starting DeepSeek analysis for ${studentName} with ${feedbackSessions.length} sessions`)
    
    // Sort sessions chronologically (oldest first)
    const sortedSessions = feedbackSessions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    console.log('📝 Building section-based analysis prompt...')
    const prompt = this.buildSectionBasedPrompt(studentName, sortedSessions)
    
    try {
      console.log('🤖 Sending request to DeepSeek R1 via OpenRouter...')
      console.log('📝 Prompt length:', prompt.length, 'characters')
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Growth Compass - Student Analysis',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('❌ OpenRouter API error:', response.status, response.statusText)
        console.error('❌ Error details:', errorData)
        
        // Handle specific OpenRouter errors
        if (response.status === 503) {
          throw new Error(`DeepSeek model is at maximum capacity. Please try again later.`)
        } else if (response.status === 402) {
          throw new Error(`Insufficient credits for DeepSeek model. Please add credits to your OpenRouter account.`)
        } else if (response.status === 401) {
          throw new Error(`Invalid OpenRouter API key.`)
        } else if (response.status === 429) {
          throw new Error(`Rate limit exceeded for DeepSeek model.`)
        }
        
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorData}`)
      }

      const data = await response.json()
      console.log('📥 Full API response:', JSON.stringify(data, null, 2))
      
      // Check if there's an error in the response (OpenRouter returns 200 but with error object)
      if (data.error) {
        console.error('❌ OpenRouter API error in response:', data.error)
        
        if (data.error.code === 503) {
          throw new Error(`DeepSeek model is at maximum capacity. Please try again later.`)
        } else if (data.error.code === 402) {
          throw new Error(`Insufficient credits for DeepSeek model. Please add credits to your OpenRouter account.`)
        } else {
          throw new Error(`OpenRouter API error: ${data.error.message}`)
        }
      }
      
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        console.error('❌ No content in API response')
        console.error('❌ Response structure:', JSON.stringify(data, null, 2))
        throw new Error('No content received from DeepSeek API')
      }

      console.log('📥 Processing DeepSeek response...')
      console.log('📊 Response length:', content.length, 'characters')
      
      // Parse the section-based response
      const analysis = this.parseSectionBasedResponse(content, studentName, sortedSessions)
      
      console.log('✅ DeepSeek analysis completed successfully')
      
      return {
        analysis,
        prompt,
        feedbackSessionCount: sortedSessions.length,
        promptLength: prompt.length
      }
    } catch (error) {
      console.error('❌ Error in DeepSeek analysis:', error)
      throw new Error(`Failed to analyze feedback with DeepSeek: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Build section-based prompt instead of JSON-structured prompt
   */
  private buildSectionBasedPrompt(studentName: string, sessions: DebateFeedbackSession[]): string {
    // Create session data
    const sessionData = sessions.map((session, index) => {
      const content = session.content?.substring(0, 800) || 'No content available'
      const bestAspects = session.bestAspects?.substring(0, 200) || ''
      const improvementAreas = session.improvementAreas?.substring(0, 200) || ''
      const teacherComments = session.teacherComments?.substring(0, 200) || ''
      
      return `
## SESSION ${index + 1} - ${session.date}
**Unit:** ${session.unitNumber}
${session.motion ? `**Motion:** ${session.motion.substring(0, 100)}` : ''}

**Feedback Content:**
${content}

${bestAspects ? `**Best Aspects:** ${bestAspects}` : ''}
${improvementAreas ? `**Areas for Improvement:** ${improvementAreas}` : ''}
${teacherComments ? `**Teacher Comments:** ${teacherComments}` : ''}
`
    }).join('\n---\n')

    const timeSpan = sessions.length > 0 ? `${sessions[0].date} to ${sessions[sessions.length - 1].date}` : ''

    return `# Debate Performance Analysis for ${studentName}

You are an expert debate coach analyzing chronological feedback data to provide evidence-based recommendations. Analyze the following ${sessions.length} feedback sessions spanning ${timeSpan}.

## Analysis Instructions

1. **Pattern Recognition**: Examine feedback chronologically to identify recurring themes, improvements, and persistent challenges
2. **Evidence-Based Assessment**: Base all assessments on specific quotes from the feedback
3. **Skill Categorization**: Analyze these seven core debate skills:
   - Speech Time & Hook Quality
   - Delivery Skills (vocal projection, clarity, fluency)
   - Argument Structure & Depth
   - Rebuttal & Directness
   - Examples & Illustrations
   - Engagement & POIs
   - Speech Structure & Organization

4. **Provide Actionable Recommendations**: Give specific, measurable actions based on identified patterns

## Feedback Data

${sessionData}

## Required Response Format

Please provide your analysis in the following sections (use exactly these section headers):

### SKILL_CATEGORIES_ANALYSIS
For each of the 7 skills, provide:
- Current Level: (Novice/Developing/Proficient/Advanced)
- Progress Pattern: (Improving/Stable/Declining/Breakthrough)  
- Consistency: (High/Medium/Low)
- Key Evidence: (2-3 specific quotes from feedback)

### PATTERN_ANALYSIS
- Repeated Issues: (issues appearing in multiple sessions with frequency and trend)
- Recent Concerns: (concerns from last 5 sessions with urgency level)
- Progression Patterns: (skill development patterns over time)

### OVERALL_PROGRESSION
- Overall Trend: (Improving/Declining/Stable)
- Consistency Level: (High/Medium/Low)
- Breakthrough Moments: (significant improvements noted)

### RECOMMENDATIONS
For each recommendation provide:
- Priority: (High/Medium/Low)
- Skill Area: (which of the 7 skills)
- Specific Recommendation: (clear, actionable advice)
- Evidence Base: (pattern identified and supporting quotes)
- Action Items: (specific exercises and practice focus)
- Measurable Goals: (short-term and medium-term objectives)
- Success Indicators: (how to measure improvement)
- Timeframe: (when to expect results)

Focus on providing evidence-based recommendations that will genuinely help improve debate performance through systematic skill development.`
  }

  /**
   * Parse the section-based response from DeepSeek
   */
  private parseSectionBasedResponse(content: string, studentName: string, sessions: DebateFeedbackSession[]): ChronologicalAnalysis {
    console.log('🔍 Parsing section-based response...')
    
    // Extract sections using regex
    const sections = {
      skillCategories: this.extractSection(content, 'SKILL_CATEGORIES_ANALYSIS'),
      patternAnalysis: this.extractSection(content, 'PATTERN_ANALYSIS'),
      overallProgression: this.extractSection(content, 'OVERALL_PROGRESSION'),
      recommendations: this.extractSection(content, 'RECOMMENDATIONS')
    }

    // Parse skill categories
    const skillCategories = this.parseSkillCategories(sections.skillCategories)
    
    // Parse pattern analysis
    const patternAnalysis = this.parsePatternAnalysis(sections.patternAnalysis)
    
    // Parse overall progression
    const overallProgression = this.parseOverallProgression(sections.overallProgression)
    
    // Parse recommendations
    const recommendations = this.parseRecommendations(sections.recommendations)

    return {
      studentName,
      totalSessions: sessions.length,
      timeSpan: sessions.length > 0 ? `${sessions[0].date} to ${sessions[sessions.length - 1].date}` : '',
      skillCategories,
      patternAnalysis,
      overallProgression,
      recommendations
    }
  }

  private extractSection(content: string, sectionName: string): string {
    const regex = new RegExp(`### ${sectionName}([\\s\\S]*?)(?=### |$)`, 'i')
    const match = content.match(regex)
    return match ? match[1].trim() : ''
  }

  private parseSkillCategories(content: string): ChronologicalAnalysis['skillCategories'] {
    // Basic parsing - extract key information for each skill
    const skillNames = [
      'speechTimeAndHook',
      'deliverySkills', 
      'argumentStructureAndDepth',
      'rebuttalAndDirectness',
      'examplesAndIllustrations',
      'engagementAndPOIs',
      'speechStructureAndOrganization'
    ]

    const skillCategories: any = {}

    skillNames.forEach(skillKey => {
      skillCategories[skillKey] = {
        name: this.getSkillDisplayName(skillKey),
        currentLevel: this.extractField(content, 'Current Level') || 'Developing',
        progress: this.extractField(content, 'Progress Pattern') || 'Stable',
        consistency: this.extractField(content, 'Consistency') || 'Medium',
        evidence: this.extractEvidence(content),
        pattern: 'stable',
        chronologicalTrend: []
      }
    })

    return skillCategories
  }

  private parsePatternAnalysis(content: string): ChronologicalAnalysis['patternAnalysis'] {
    return {
      repeatedIssues: this.extractRepeatedIssues(content),
      recentConcerns: this.extractRecentConcerns(content),
      progressionPatterns: this.extractProgressionPatterns(content)
    }
  }

  private parseOverallProgression(content: string): ChronologicalAnalysis['overallProgression'] {
    return {
      trend: this.extractField(content, 'Overall Trend') || 'Stable',
      consistency: this.extractField(content, 'Consistency Level') || 'Medium',
      breakthroughMoments: this.extractList(content, 'Breakthrough Moments')
    }
  }

  private parseRecommendations(content: string): ScientificRecommendation[] {
    // Split recommendations by common patterns
    const recSections = content.split(/(?=Priority:|Skill Area:)/g).filter(section => section.trim())
    
    return recSections.slice(0, 5).map((section, index) => ({
      id: `deepseek_rec_${index + 1}`,
      category: 'skill_development',
      skill: this.extractField(section, 'Skill Area') || 'General Development',
      priority: this.extractField(section, 'Priority')?.toLowerCase() || 'medium',
      recommendation: this.extractField(section, 'Specific Recommendation') || 'Continue practicing debate skills',
      evidenceBase: {
        sessionCount: 1,
        patternIdentified: this.extractField(section, 'Evidence Base') || 'Pattern analysis',
        supportingQuotes: this.extractList(section, 'Evidence Base'),
        timeframeCovered: 'Recent sessions'
      },
      actionItems: {
        preparationFocus: this.extractList(section, 'Action Items'),
        practiceExercises: this.extractList(section, 'Action Items'),
        nextDebateObjectives: this.extractList(section, 'Action Items')
      },
      measurableGoals: {
        shortTerm: this.extractList(section, 'Measurable Goals'),
        mediumTerm: this.extractList(section, 'Measurable Goals'),
        longTerm: []
      },
      successIndicators: this.extractList(section, 'Success Indicators'),
      timeframe: this.extractField(section, 'Timeframe') || '2-4 weeks',
      patternContext: {
        issueFrequency: 0.7,
        potentialUnderlyingFactors: ['Practice needed', 'Skill development']
      }
    }))
  }

  private getSkillDisplayName(skillKey: string): string {
    const displayNames = {
      speechTimeAndHook: 'Speech Time & Hook Quality',
      deliverySkills: 'Delivery Skills',
      argumentStructureAndDepth: 'Argument Structure & Depth',
      rebuttalAndDirectness: 'Rebuttal & Directness',
      examplesAndIllustrations: 'Examples & Illustrations',
      engagementAndPOIs: 'Engagement & POIs',
      speechStructureAndOrganization: 'Speech Structure & Organization'
    }
    return displayNames[skillKey] || skillKey
  }

  private extractField(content: string, fieldName: string): string {
    const regex = new RegExp(`${fieldName}:?\\s*([^\\n]+)`, 'i')
    const match = content.match(regex)
    return match ? match[1].trim() : ''
  }

  private extractEvidence(content: string): string[] {
    const evidenceMatch = content.match(/Key Evidence:?\s*([^#]*)/i)
    if (!evidenceMatch) return []
    
    return evidenceMatch[1]
      .split(/[-•]/)
      .map(item => item.trim())
      .filter(item => item.length > 10)
      .slice(0, 3)
  }

  private extractList(content: string, fieldName: string): string[] {
    const match = content.match(new RegExp(`${fieldName}:?\\s*([^#]*?)(?=\\n\\n|$)`, 'i'))
    if (!match) return []
    
    return match[1]
      .split(/[-•\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 5)
      .slice(0, 3)
  }

  private extractRepeatedIssues(content: string): any[] {
    const issues = this.extractList(content, 'Repeated Issues')
    return issues.map((issue, index) => ({
      issue: issue.substring(0, 100),
      frequency: 3,
      sessions: ['Session 1', 'Session 2'],
      severity: 'medium',
      trend: 'stable'
    }))
  }

  private extractRecentConcerns(content: string): any[] {
    const concerns = this.extractList(content, 'Recent Concerns')
    return concerns.map(concern => ({
      concern: concern.substring(0, 100),
      lastFiveSessions: true,
      urgency: 'moderate'
    }))
  }

  private extractProgressionPatterns(content: string): any[] {
    const patterns = this.extractList(content, 'Progression Patterns')
    return patterns.map(pattern => ({
      skill: 'General Development',
      pattern: 'consistent_growth',
      duration: '4-6 weeks',
      evidence: [pattern.substring(0, 100)]
    }))
  }

  /**
   * Public method to build prompt for debugging
   */
  public buildScientificAnalysisPrompt(studentName: string, sessions: DebateFeedbackSession[]): string {
    return this.buildSectionBasedPrompt(studentName, sessions)
  }
}

// Export singleton instance
export const deepSeekRecommendationEngine = new DeepSeekRecommendationEngine()