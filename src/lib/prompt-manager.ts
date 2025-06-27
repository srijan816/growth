import { readFileSync } from 'fs'
import { join } from 'path'

// Prompt Manager for loading and managing AI prompts from ai-prompts.md

interface StudentAnalysisInput {
  studentName: string
  level: 'primary' | 'secondary'
  feedbackSessions: Array<{
    unitNumber: string
    date: string
    feedbackType: 'primary' | 'secondary'
    motion?: string
    content: string
    bestAspects?: string
    improvementAreas?: string
    teacherComments?: string
    duration?: string
  }>
}

interface ClassInsightsInput {
  className: string
  level: 'primary' | 'secondary'
  studentAnalyses: Array<{
    studentName: string
    metrics: any
    skillAssessment: any[]
  }>
}

interface CourseObjectiveInput {
  program: string
  objectives: string[]
}

interface ComparisonInput {
  student: {
    name: string
    metrics: any
    startDate: string
    currentUnit: string
  }
  baseline: {
    level: 'primary' | 'secondary'
    expectedMetrics: any
  }
  peerGroup: {
    averageMetrics: any
    topPerformers: any[]
  }
}

export class PromptManager {
  private prompts: Map<string, string> = new Map()
  private promptsLoaded: boolean = false

  constructor() {
    this.loadPrompts()
  }

  /**
   * Load prompts from ai-prompts.md file
   */
  private loadPrompts(): void {
    try {
      // In production, this would read from the actual file
      // For now, we'll embed the prompts directly
      this.initializePrompts()
      this.promptsLoaded = true
    } catch (error) {
      console.error('Error loading prompts:', error)
      this.promptsLoaded = false
    }
  }

  /**
   * Initialize prompts with content from ai-prompts.md
   */
  private initializePrompts(): void {
    // Student Performance Analysis Prompt
    this.prompts.set('student-analysis', `You are an expert educational analyst specializing in Public Speaking & Debating (PSD) programs. You will analyze chronological feedback data for a student to identify growth patterns, challenges, and provide actionable insights.

CRITICAL ANALYSIS FOCUS - Track these specific pattern indicators:

**Pattern Recognition Guidelines:**
1. **Hook Development**: Look for creativity, audience engagement, confidence in openings, and improvement in hook variety over time
2. **Speech Time Management**: Track adherence to specified time limits, pacing control, and ability to cover all points within time constraints
3. **Vocal Projection**: Monitor volume consistency, audibility across room, voice strength, and control under pressure
4. **Clarity & Fluency**: Assess pronunciation, speech rhythm, filler word reduction, and smooth delivery improvements
5. **Argument Structure & Depth**: Evaluate logical flow, evidence quality, reasoning complexity, and argument sophistication progression
6. **Rebuttal Skills**: Analyze responsiveness to opponents, quality of counterarguments, and real-time thinking ability
7. **Examples & Illustrations**: Review relevance, variety, effectiveness in supporting arguments, and cultural appropriateness
8. **Engagement (POIs)**: Track Point of Information handling, audience interaction, confidence in Q&A, and leadership presence
9. **Speech Structure & Organization**: Monitor signposting, transitions, conclusion strength, and overall coherence

**Improvement Pattern Analysis:**
- Track consistent improvement vs. fluctuating performance
- Identify breakthrough moments and skill mastery points
- Detect regression patterns and underlying causes
- Recognize transfer of skills between different speech types
- Assess adaptation to increasing difficulty levels

Analyze the student's feedback and provide detailed insights in these areas:

1. **Performance Metrics**: Overall score and trend with specific reference to the 9 skill areas
2. **Skill Assessment**: Comprehensive analysis of all 9 categories with evidence-based scoring
3. **Attention Needed**: Early warning system for declining performance or persistent issues
4. **Key Achievements**: Pattern-based recognition of skill mastery and breakthroughs
5. **Targeted Recommendations**: Category-specific action plans for improvement

Return response in JSON format with this exact structure:
{
  "studentMetrics": {
    "overallScore": <number 1-10>,
    "growthRate": <number points per unit>,
    "consistencyScore": <number 0-1>,
    "engagementLevel": <number 1-5>,
    "trend": "improving|stable|declining"
  },
  "skillAssessment": [
    {
      "skillName": "Hook Development",
      "currentLevel": <number 1-10>,
      "progress": <number -1 to 1>,
      "consistency": "high|medium|low",
      "evidence": ["specific quote or observation from feedback"]
    },
    {
      "skillName": "Speech Time Management", 
      "currentLevel": <number 1-10>,
      "progress": <number -1 to 1>,
      "consistency": "high|medium|low",
      "evidence": ["specific quote or observation from feedback"]
    },
    {
      "skillName": "Vocal Projection",
      "currentLevel": <number 1-10>, 
      "progress": <number -1 to 1>,
      "consistency": "high|medium|low",
      "evidence": ["specific quote or observation from feedback"]
    },
    {
      "skillName": "Clarity & Fluency",
      "currentLevel": <number 1-10>,
      "progress": <number -1 to 1>, 
      "consistency": "high|medium|low",
      "evidence": ["specific quote or observation from feedback"]
    },
    {
      "skillName": "Argument Structure & Depth",
      "currentLevel": <number 1-10>,
      "progress": <number -1 to 1>,
      "consistency": "high|medium|low", 
      "evidence": ["specific quote or observation from feedback"]
    },
    {
      "skillName": "Rebuttal Skills",
      "currentLevel": <number 1-10>,
      "progress": <number -1 to 1>,
      "consistency": "high|medium|low",
      "evidence": ["specific quote or observation from feedback"]
    },
    {
      "skillName": "Examples & Illustrations", 
      "currentLevel": <number 1-10>,
      "progress": <number -1 to 1>,
      "consistency": "high|medium|low",
      "evidence": ["specific quote or observation from feedback"]
    },
    {
      "skillName": "Engagement (POIs)",
      "currentLevel": <number 1-10>,
      "progress": <number -1 to 1>, 
      "consistency": "high|medium|low",
      "evidence": ["specific quote or observation from feedback"]
    },
    {
      "skillName": "Speech Structure & Organization",
      "currentLevel": <number 1-10>,
      "progress": <number -1 to 1>,
      "consistency": "high|medium|low",
      "evidence": ["specific quote or observation from feedback"]
    }
  ],
  "attentionNeeded": {
    "requiresAttention": <boolean>,
    "severity": "high|medium|low|none",
    "primaryConcern": "<specific concern if any>",
    "specificIssues": ["issue 1 if any", "issue 2 if any"],
    "suggestedInterventions": ["intervention 1 if needed", "intervention 2 if needed"],
    "reasoning": "<explain how you identified this pattern from the feedback>"
  },
  "achievements": {
    "recentBreakthroughs": ["breakthrough 1 if any", "breakthrough 2 if any"],
    "masteredSkills": ["mastered skill 1 if any", "mastered skill 2 if any"],
    "notableImprovements": ["improvement 1 if any", "improvement 2 if any"],
    "readyForAdvancement": <boolean>,
    "recognitionSuggestions": ["suggestion 1 if any", "suggestion 2 if any"],
    "reasoning": "<explain what evidence led to identifying these achievements>"
  },
  "recommendations": {
    "immediateActions": ["action 1", "action 2", "action 3"],
    "skillFocusAreas": ["skill area 1", "skill area 2"],
    "practiceActivities": ["activity 1", "activity 2"],
    "parentCommunication": "<1-2 sentence summary for parents>"
  }
}

Analysis Guidelines:
- Calculate growth rate by comparing early vs recent performance across all 9 skill areas
- Track improvement patterns within each category: consistent growth, plateau periods, breakthrough moments, regression phases
- Use evidence-based scoring: extract specific quotes and observations that demonstrate skill level in each category
- Pattern analysis triggers:
  * **Hook Development**: Track creativity evolution, engagement impact, confidence growth
  * **Time Management**: Monitor adherence trends, improvement in pacing, adaptation to different time limits
  * **Vocal Projection**: Assess volume consistency patterns, adaptation to room size, stress response
  * **Clarity & Fluency**: Track filler word reduction, pronunciation improvement, rhythm development
  * **Argument Structure**: Monitor logical complexity growth, evidence sophistication, reasoning depth
  * **Rebuttal Skills**: Assess response quality trends, real-time thinking improvement, engagement with opponents
  * **Examples & Illustrations**: Track relevance improvement, variety expansion, cultural sensitivity growth
  * **Engagement (POIs)**: Monitor confidence patterns, leadership development, audience connection
  * **Structure & Organization**: Track signposting consistency, transition smoothness, conclusion strength
- Set attention triggers for: declining performance (3+ sessions), persistent issues, engagement < 3.0, consistency < 0.5, plateau in critical skills
- Identify achievements: skill mastery milestones, cross-skill transfer, consistent high performance, breakthrough moments, readiness indicators
- Level expectations with skill-specific benchmarks:
  * **Primary level**: 2-3 min speeches, basic structure mastery, engagement ≥ 3.0, foundational skills in all 9 areas
  * **Secondary level**: 4-5 min speeches, advanced arguments, engagement ≥ 3.5, sophisticated application across all 9 categories`)

    // Class Insights Analysis Prompt
    this.prompts.set('class-insights', `Analyze feedback data across multiple students to identify class-wide patterns, trending skills, and collective achievements.

Generate insights about class performance and trends.

Return response in JSON format:
{
  "classMetrics": {
    "averageGrowthRate": <number>,
    "topPerformingSkill": "<skill name>",
    "mostImprovedSkill": "<skill name>",
    "commonChallenges": ["challenge 1", "challenge 2"],
    "classEngagementLevel": <number>
  },
  "keyInsights": [
    {
      "insight": "<specific observation>",
      "affectedStudents": <number>,
      "percentage": <number>,
      "recommendation": "<actionable suggestion>",
      "reasoning": "<explain what data patterns led to this insight>"
    }
  ],
  "celebrationPoints": [
    {
      "achievement": "<class achievement>",
      "studentCount": <number>,
      "significance": "<why this matters>"
    }
  ]
}`)

    // Course Objective Analysis Prompt
    this.prompts.set('course-objectives', `You are an educational assessment expert. Analyze the following course objectives and extract measurable skill components.

For each objective, identify:
1. Core skill being developed
2. Measurable behavioral indicators
3. Assessment criteria that could be tracked over time
4. Suggested growth metrics (beginner → intermediate → advanced)

Existing student data sources:
- Weekly attendance ratings (Attitude & Efforts, Asking Questions, Application of Skills/Content, Application of Feedback)
- Written instructor feedback documents
- Student work samples (essays, speeches, projects)

Context: This is for co-curricular programs focused on Public Speaking & Debating (PSD), Academic Writing, RAPS (Research Analysis & Problem Solving), and Critical Thinking.

Return response in JSON format:
{
  "skills": [
    {
      "skill_name": "<skill name>",
      "objective_source": "<which objective this comes from>",
      "behavioral_indicators": ["indicator 1", "indicator 2", "indicator 3"],
      "assessment_criteria": "<how to measure progress>",
      "growth_levels": {
        "beginner": "<observable beginner behavior>",
        "intermediate": "<observable intermediate behavior>",
        "advanced": "<observable advanced behavior>"
      },
      "data_mapping": {
        "attendance_categories": ["relevant category 1", "relevant category 2"],
        "feedback_keywords": ["keyword 1", "keyword 2", "keyword 3"],
        "work_sample_indicators": ["indicator 1", "indicator 2"]
      }
    }
  ]
}

Focus on skills that can be tracked through the available data sources. Make the growth levels specific and observable.`)

    // Growth Comparison Prompt
    this.prompts.set('growth-comparison', `Compare a student's performance against baseline metrics and peer performance to provide contextualized feedback.

Provide comparative analysis highlighting relative strengths and areas for improvement.

Return response in JSON format:
{
  "comparisonResults": {
    "performanceVsBaseline": {
      "status": "exceeding|meeting|below",
      "gaps": ["gap 1", "gap 2"],
      "strengths": ["strength 1", "strength 2"]
    },
    "performanceVsPeers": {
      "ranking": "top|middle|bottom",
      "percentile": <number>,
      "competitiveAdvantages": ["advantage 1", "advantage 2"],
      "improvementOpportunities": ["opportunity 1", "opportunity 2"]
    }
  },
  "personalizedGoals": [
    {
      "goal": "<specific goal>",
      "targetMetric": <number>,
      "timeframe": "<specific timeframe>",
      "actionSteps": ["step 1", "step 2", "step 3"]
    }
  ]
}`)
  }

  /**
   * Get student analysis prompt with substituted values
   */
  getStudentAnalysisPrompt(input: StudentAnalysisInput): string {
    const basePrompt = this.prompts.get('student-analysis') || ''
    
    // Build the input data section
    const inputData = `
STUDENT: ${input.studentName}
LEVEL: ${input.level}
FEEDBACK SESSIONS (${input.feedbackSessions.length} total):

${input.feedbackSessions.map((session, index) => `
Session ${index + 1}:
- Unit: ${session.unitNumber}
- Date: ${session.date}
- Type: ${session.feedbackType}
${session.motion ? `- Motion/Topic: ${session.motion}` : ''}
${session.duration ? `- Duration: ${session.duration}` : ''}

Feedback Content:
${session.content}

${session.bestAspects ? `Best Aspects: ${session.bestAspects}` : ''}
${session.improvementAreas ? `Areas for Improvement: ${session.improvementAreas}` : ''}
${session.teacherComments ? `Teacher Comments: ${session.teacherComments}` : ''}
`).join('\n---\n')}
`

    return inputData + '\n\n' + basePrompt
  }

  /**
   * Get class insights prompt with substituted values
   */
  getClassInsightsPrompt(input: ClassInsightsInput): string {
    const basePrompt = this.prompts.get('class-insights') || ''
    
    const inputData = `
CLASS: ${input.className}
LEVEL: ${input.level}
STUDENT COUNT: ${input.studentAnalyses.length}

STUDENT DATA:
${input.studentAnalyses.map((student, index) => `
Student ${index + 1}: ${student.studentName}
Metrics: ${JSON.stringify(student.metrics, null, 2)}
Top Skills: ${student.skillAssessment.slice(0, 3).map(s => `${s.skillName} (Level ${s.currentLevel})`).join(', ')}
`).join('\n---\n')}
`

    return inputData + '\n\n' + basePrompt
  }

  /**
   * Get course objective analysis prompt with substituted values
   */
  getCourseObjectiveAnalysisPrompt(input: CourseObjectiveInput): string {
    const basePrompt = this.prompts.get('course-objectives') || ''
    
    const inputData = `
PROGRAM: ${input.program}

COURSE OBJECTIVES:
${input.objectives.map((obj, index) => `${index + 1}. ${obj}`).join('\n')}
`

    return inputData + '\n\n' + basePrompt
  }

  /**
   * Get growth comparison prompt with substituted values
   */
  getGrowthComparisonPrompt(input: ComparisonInput): string {
    const basePrompt = this.prompts.get('growth-comparison') || ''
    
    const inputData = `
STUDENT DATA:
Name: ${input.student.name}
Start Date: ${input.student.startDate}
Current Unit: ${input.student.currentUnit}
Metrics: ${JSON.stringify(input.student.metrics, null, 2)}

BASELINE EXPECTATIONS (${input.baseline.level} level):
${JSON.stringify(input.baseline.expectedMetrics, null, 2)}

PEER GROUP PERFORMANCE:
Average Metrics: ${JSON.stringify(input.peerGroup.averageMetrics, null, 2)}
Top Performers: ${JSON.stringify(input.peerGroup.topPerformers, null, 2)}
`

    return inputData + '\n\n' + basePrompt
  }

  /**
   * Get a custom prompt template
   */
  getCustomPrompt(promptKey: string, substitutions: Record<string, any>): string {
    const basePrompt = this.prompts.get(promptKey) || ''
    
    let prompt = basePrompt
    
    // Replace placeholders with actual values
    Object.entries(substitutions).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      const replacement = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
      prompt = prompt.replace(new RegExp(placeholder, 'g'), replacement)
    })
    
    return prompt
  }

  /**
   * Check if prompts are loaded successfully
   */
  isReady(): boolean {
    return this.promptsLoaded
  }
}