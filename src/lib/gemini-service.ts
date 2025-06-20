import { GoogleGenAI } from '@google/genai';

export interface CourseObjectiveAnalysis {
  skills: Array<{
    skill_name: string;
    objective_source: string;
    behavioral_indicators: string[];
    assessment_criteria: string;
    growth_levels: {
      beginner: string;
      intermediate: string;
      advanced: string;
    };
    data_mapping: {
      attendance_categories: string[];
      feedback_keywords: string[];
      work_sample_indicators: string[];
    };
  }>;
}

export interface FeedbackAnalysis {
  suggested_focus_areas: Array<{
    skill_name: string;
    importance_level: 'high' | 'medium' | 'low';
    reasoning: string;
    evidence: string[];
  }>;
  growth_patterns: Array<{
    skill: string;
    trend: 'improving' | 'stable' | 'declining';
    evidence: string;
  }>;
  recommendations: string[];
}

export class GeminiService {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private model: string = 'gemini-2.5-flash';

  constructor() {
    // Load all 4 API keys from environment
    this.apiKeys = [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4
    ].filter(Boolean) as string[];

    if (this.apiKeys.length === 0) {
      throw new Error('At least one GEMINI_API_KEY_* environment variable is required');
    }

    console.log(`GeminiService initialized with ${this.apiKeys.length} API keys`);
  }

  /**
   * Get the next API key in rotation
   */
  private getNextApiKey(): string {
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  /**
   * Create GoogleGenAI instance with current API key
   */
  private createClient(): GoogleGenAI {
    return new GoogleGenAI({
      apiKey: this.getNextApiKey(),
    });
  }

  /**
   * Generate content with structured output and thinking budget
   */
  private async generateStructuredContent(
    prompt: string,
    thinkingBudget: number = 4000
  ): Promise<any> {
    const ai = this.createClient();
    
    const config = {
      thinkingConfig: {
        thinkingBudget,
      },
      responseMimeType: 'application/json' as const,
    };

    const contents = [
      {
        role: 'user' as const,
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    try {
      const response = await ai.models.generateContentStream({
        model: this.model,
        config,
        contents,
      });

      let fullResponse = '';
      for await (const chunk of response) {
        if (chunk.text) {
          fullResponse += chunk.text;
        }
      }

      // Parse the JSON response
      return JSON.parse(fullResponse);
    } catch (error) {
      console.error('Error generating structured content:', error);
      throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze course objectives and extract measurable skill components
   */
  async analyzeCourseObjectives(
    program: string,
    objectives: string[]
  ): Promise<CourseObjectiveAnalysis> {
    const prompt = `You are an educational assessment expert. Analyze the following course objectives for a ${program} program and extract measurable skill components.

Course Objectives:
${objectives.map((obj, index) => `${index + 1}. ${obj}`).join('\n')}

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

Return response in JSON format with this structure:
{
  "skills": [
    {
      "skill_name": "Public Speaking Confidence",
      "objective_source": "Develop confident public speaking abilities",
      "behavioral_indicators": ["Eye contact", "Voice projection", "Reduced filler words"],
      "assessment_criteria": "Progression from reading scripts to impromptu speaking",
      "growth_levels": {
        "beginner": "Reads from script with minimal eye contact",
        "intermediate": "Speaks with notes, maintains some eye contact",
        "advanced": "Delivers impromptu speeches with confident body language"
      },
      "data_mapping": {
        "attendance_categories": ["Attitude & Efforts", "Application of Skills/Content"],
        "feedback_keywords": ["confidence", "eye contact", "voice", "body language"],
        "work_sample_indicators": ["speech recordings", "presentation materials"]
      }
    }
  ]
}

Focus on skills that can be tracked through the available data sources. Make the growth levels specific and observable.`;

    // Use higher thinking budget for complex course objective analysis
    return await this.generateStructuredContent(prompt, 6000);
  }

  /**
   * Analyze student feedback history and suggest focus areas
   */
  async analyzeFeedbackHistory(
    studentName: string,
    feedbackHistory: Array<{
      content: string;
      date: string;
      type: 'primary' | 'secondary';
      unitNumber: string;
    }>
  ): Promise<FeedbackAnalysis> {
    const prompt = `You are an educational growth analyst. Analyze the feedback history for student "${studentName}" and identify patterns, growth areas, and recommendations.

Feedback History (${feedbackHistory.length} entries):
${feedbackHistory.map((feedback, index) => `
Entry ${index + 1} (${feedback.type}, Unit ${feedback.unitNumber}, ${feedback.date}):
${feedback.content}
`).join('\n---\n')}

Analyze this feedback to identify:
1. Suggested focus areas ranked by importance
2. Growth patterns over time
3. Specific recommendations for improvement

Return response in JSON format:
{
  "suggested_focus_areas": [
    {
      "skill_name": "Essay Structure",
      "importance_level": "high",
      "reasoning": "Consistently mentioned across multiple feedback entries",
      "evidence": ["Quote from feedback 1", "Quote from feedback 2"]
    }
  ],
  "growth_patterns": [
    {
      "skill": "Public Speaking Confidence",
      "trend": "improving",
      "evidence": "Comparison of early vs recent feedback"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ]
}

Focus on patterns that appear across multiple feedback entries and provide specific evidence from the feedback text.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error analyzing feedback history with Gemini:', error);
      throw new Error(`Failed to analyze feedback history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate insights from multiple students' data for class-level analysis
   */
  async analyzeClassTrends(
    className: string,
    studentsData: Array<{
      studentName: string;
      recentFeedback: string;
      attendanceRatings: { [key: string]: number };
      unitProgress: string;
    }>
  ): Promise<{
    classOverview: string;
    commonChallenges: string[];
    topPerformers: string[];
    interventionNeeded: string[];
    recommendations: string[];
  }> {
    const prompt = `You are an educational analytics expert. Analyze the class data for "${className}" and provide insights about overall trends, challenges, and recommendations.

Class Data (${studentsData.length} students):
${studentsData.map((student, index) => `
Student ${index + 1}: ${student.studentName}
Unit Progress: ${student.unitProgress}
Recent Attendance Ratings: ${JSON.stringify(student.attendanceRatings)}
Recent Feedback: ${student.recentFeedback}
`).join('\n---\n')}

Provide analysis in JSON format:
{
  "classOverview": "Overall summary of class performance and trends",
  "commonChallenges": ["Challenge 1", "Challenge 2"],
  "topPerformers": ["Student 1", "Student 2"],
  "interventionNeeded": ["Student who needs attention"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Focus on identifying patterns across students and actionable insights for the instructor.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error analyzing class trends with Gemini:', error);
      throw new Error(`Failed to analyze class trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract and categorize skills from raw feedback content
   */
  async extractSkillsFromFeedback(
    feedbackContent: string,
    program: string
  ): Promise<{
    identifiedSkills: string[];
    strengths: string[];
    improvementAreas: string[];
    skillMapping: { [skill: string]: string[] };
  }> {
    const prompt = `Extract and categorize skills mentioned in this ${program} feedback:

Feedback Content:
${feedbackContent}

Identify:
1. All skills explicitly or implicitly mentioned
2. Areas identified as strengths
3. Areas needing improvement
4. Map each skill to specific evidence from the feedback

Return in JSON format:
{
  "identifiedSkills": ["Skill 1", "Skill 2"],
  "strengths": ["Strength 1", "Strength 2"],
  "improvementAreas": ["Area 1", "Area 2"],
  "skillMapping": {
    "Skill 1": ["Evidence quote 1", "Evidence quote 2"]
  }
}

Focus on ${program}-specific skills and provide specific quotes as evidence.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error extracting skills from feedback with Gemini:', error);
      throw new Error(`Failed to extract skills from feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default GeminiService;