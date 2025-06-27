import { GoogleGenAI } from '@google/genai';
import { StoredStudentFeedback } from './feedback-storage';
import { db } from './postgres';
import fs from 'fs';
import path from 'path';

// Types for Gemini responses
export interface StudentAnalysisResult {
  studentMetrics: {
    overallScore: number;
    growthRate: number;
    consistencyScore: number;
    engagementLevel: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  skillAssessment: Array<{
    skillName: string;
    currentLevel: number;
    progress: number;
    consistency: 'high' | 'medium' | 'low';
    evidence: string[];
  }>;
  attentionNeeded: {
    requiresAttention: boolean;
    severity: 'high' | 'medium' | 'low' | 'none';
    primaryConcern: string;
    specificIssues: string[];
    suggestedInterventions: string[];
    reasoning: string;
  };
  achievements: {
    recentBreakthroughs: string[];
    masteredSkills: string[];
    notableImprovements: string[];
    readyForAdvancement: boolean;
    recognitionSuggestions: string[];
    reasoning: string;
  };
  recommendations: {
    immediateActions: string[];
    skillFocusAreas: string[];
    practiceActivities: string[];
    parentCommunication: string;
  };
}

export interface ClassInsightsResult {
  classMetrics: {
    averageGrowthRate: number;
    topPerformingSkill: string;
    mostImprovedSkill: string;
    commonChallenges: string[];
    classEngagementLevel: number;
  };
  keyInsights: Array<{
    insight: string;
    affectedStudents: number;
    percentage: number;
    recommendation: string;
    reasoning: string;
  }>;
  celebrationPoints: Array<{
    achievement: string;
    studentCount: number;
    significance: string;
  }>;
}

export class GeminiAnalyzer {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private prompts: Map<string, string>;
  private analysisCache: Map<string, { analysis: StudentAnalysisResult; timestamp: number }>;

  constructor() {
    // Get all 4 API keys
    this.apiKeys = [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2, 
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4
    ].filter(key => key) as string[];
    
    if (this.apiKeys.length === 0) {
      throw new Error('No Gemini API keys found. Please set GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GEMINI_API_KEY_4 environment variables.');
    }
    
    console.log(`🔑 Initialized with ${this.apiKeys.length} API keys`);
    
    // Load prompts and initialize in-memory cache (for this session only)
    this.prompts = this.loadPrompts();
    this.analysisCache = new Map();
    
    // Ensure database cache table exists
    this.ensureCacheTable();
  }

  /**
   * Get next API key in rotation
   */
  private getNextApiKey(): string {
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    console.log(`🔄 Using API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
    return key;
  }

  /**
   * Create AI client instance with current API key
   */
  private createClient() {
    const apiKey = this.getNextApiKey();
    return new GoogleGenAI({
      apiKey: apiKey
    });
  }

  /**
   * Get cached analysis from database if available and recent
   */
  private async getCachedAnalysis(studentName: string): Promise<StudentAnalysisResult | null> {
    try {
      const result = await db.query(`
        SELECT analysis_data, created_at, feedback_hash
        FROM student_analysis_cache 
        WHERE student_name = $1 
        AND created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC 
        LIMIT 1
      `, [studentName]);

      if (result.rows.length > 0) {
        const cached = result.rows[0];
        console.log(`📦 Using cached analysis for ${studentName} from ${cached.created_at}`);
        return JSON.parse(cached.analysis_data);
      }
    } catch (error) {
      console.error(`Error getting cached analysis for ${studentName}:`, error);
    }
    return null;
  }

  /**
   * Cache analysis result in database
   */
  private async cacheAnalysis(studentName: string, analysis: StudentAnalysisResult, feedbackHash: string): Promise<void> {
    try {
      await db.query(`
        INSERT INTO student_analysis_cache (student_name, analysis_data, feedback_hash, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (student_name) 
        DO UPDATE SET 
          analysis_data = EXCLUDED.analysis_data,
          feedback_hash = EXCLUDED.feedback_hash,
          created_at = EXCLUDED.created_at
      `, [studentName, JSON.stringify(analysis), feedbackHash]);
      
      console.log(`💾 Cached analysis for ${studentName} in database`);
    } catch (error) {
      console.error(`Error caching analysis for ${studentName}:`, error);
    }
  }

  /**
   * Create hash of feedback content to detect changes
   */
  private createFeedbackHash(feedbacks: StoredStudentFeedback[]): string {
    const content = feedbacks
      .map(f => `${f.unit_number}:${f.content}:${f.parsed_at}`)
      .sort()
      .join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Ensure cache table exists
   */
  private async ensureCacheTable(): Promise<void> {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS student_analysis_cache (
          id SERIAL PRIMARY KEY,
          student_name VARCHAR(255) UNIQUE NOT NULL,
          analysis_data JSONB NOT NULL,
          feedback_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_student_analysis_cache_name 
        ON student_analysis_cache(student_name)
      `);
      
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_student_analysis_cache_created 
        ON student_analysis_cache(created_at)
      `);
    } catch (error) {
      console.error('Error ensuring cache table exists:', error);
    }
  }

  /**
   * Load prompts from markdown file
   */
  private loadPrompts(): Map<string, string> {
    const prompts = new Map<string, string>();
    
    try {
      const promptsPath = path.join(process.cwd(), 'src', 'lib', 'ai-prompts.md');
      const promptContent = fs.readFileSync(promptsPath, 'utf-8');
      
      // Extract sections
      const sections = promptContent.split('##').filter(s => s.trim());
      
      for (const section of sections) {
        const lines = section.trim().split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n');
        
        if (title.includes('Student Performance Analysis')) {
          prompts.set('studentAnalysis', content);
        } else if (title.includes('Class Insights Analysis')) {
          prompts.set('classInsights', content);
        } else if (title.includes('Growth Comparison')) {
          prompts.set('growthComparison', content);
        }
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      // Fallback to basic prompts
      prompts.set('studentAnalysis', this.getDefaultStudentPrompt());
    }
    
    return prompts;
  }

  /**
   * Analyze individual student performance
   */
  async analyzeStudent(
    studentName: string,
    feedbacks: StoredStudentFeedback[]
  ): Promise<StudentAnalysisResult | null> {
    if (feedbacks.length === 0) {
      console.log(`❌ No feedback data for ${studentName} - analysis not possible`);
      return null;
    }

    // Create feedback hash to detect changes
    const feedbackHash = this.createFeedbackHash(feedbacks);

    // Check database cache first
    const cached = await this.getCachedAnalysis(studentName);
    if (cached) {
      return cached;
    }

    console.log(`🤖 Analyzing ${studentName} with Gemini AI...`);

    // Prepare input data
    const level = feedbacks[0].feedback_type === 'primary' ? 'primary' : 'secondary';
    const inputData = {
      studentName,
      level,
      feedbackSessions: feedbacks.map(f => ({
        unitNumber: f.unit_number,
        date: f.parsed_at,
        feedbackType: f.feedback_type,
        motion: f.motion || '',
        content: f.content,
        bestAspects: f.best_aspects || '',
        improvementAreas: f.improvement_areas || '',
        teacherComments: f.teacher_comments || '',
        duration: f.duration || ''
      }))
    };

    try {
      // Get the prompt
      const basePrompt = this.prompts.get('studentAnalysis') || this.getDefaultStudentPrompt();
      
      // Construct the full prompt
      const prompt = `${basePrompt}\n\nInput Data:\n${JSON.stringify(inputData, null, 2)}\n\nPlease analyze this student's performance and provide the structured output as specified.`;

      // Create fresh AI client with next API key
      const ai = this.createClient();

      const config = {
        thinkingConfig: {
          thinkingBudget: -1,
        },
        responseMimeType: 'application/json',
      };

      const contents = [{
        role: 'user',
        parts: [{ text: prompt }]
      }];

      // Generate content with Gemini 2.5 Flash
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config,
        contents
      });

      const text = response.text;
      
      // Check if response is empty or invalid
      if (!text || text.trim().length === 0) {
        console.error(`❌ Empty response from Gemini for ${studentName} - no analysis possible`);
        return null;
      }
      
      try {
        const analysis = JSON.parse(text) as StudentAnalysisResult;
        
        // Validate the analysis structure
        if (!analysis.studentMetrics || !analysis.attentionNeeded || !analysis.achievements) {
          console.error(`❌ Invalid analysis structure from Gemini for ${studentName} - no analysis possible`);
          return null;
        }
        
        // Cache successful result in database
        await this.cacheAnalysis(studentName, analysis, feedbackHash);
        
        console.log(`✅ Successfully analyzed ${studentName} with AI`);
        return analysis;
      } catch (parseError) {
        console.error(`❌ Error parsing Gemini response for ${studentName}:`, parseError);
        console.log(`Raw response length: ${text?.length || 0}`);
        console.log(`Raw response preview: ${text?.substring(0, 200) || 'no text'}...`);
        return null;
      }

    } catch (error) {
      console.error(`❌ Error in Gemini analysis for ${studentName}:`, error);
      return null;
    }
  }

  /**
   * Analyze students in batches to avoid quota exhaustion
   */
  async analyzeStudentsBatch(
    studentsData: Map<string, StoredStudentFeedback[]>,
    batchSize: number = 5,
    startFromStudent?: string
  ): Promise<{
    analyses: Array<{ studentName: string; analysis: StudentAnalysisResult }>;
    hasMore: boolean;
    nextStudent?: string;
    totalProcessed: number;
    totalCached: number;
    totalFailed: number;
  }> {
    const studentNames = Array.from(studentsData.keys());
    let startIndex = 0;
    
    // Find starting position if specified
    if (startFromStudent) {
      const foundIndex = studentNames.indexOf(startFromStudent);
      if (foundIndex !== -1) {
        startIndex = foundIndex;
      }
    }
    
    console.log(`📊 Processing batch of ${batchSize} students starting from index ${startIndex}`);
    
    const batch = studentNames.slice(startIndex, startIndex + batchSize);
    const analyses: Array<{ studentName: string; analysis: StudentAnalysisResult }> = [];
    
    let processedCount = 0;
    let cachedCount = 0;
    let failedCount = 0;
    
    for (const studentName of batch) {
      try {
        const feedbacks = studentsData.get(studentName) || [];
        
        // Check if we have cached result
        const cached = this.getCachedAnalysis(studentName);
        if (cached) {
          analyses.push({ studentName, analysis: cached });
          cachedCount++;
        } else {
          // Process with AI with retry logic
          let analysis = null;
          let retryCount = 0;
          const maxRetries = 2;
          
          while (!analysis && retryCount < maxRetries) {
            try {
              analysis = await this.analyzeStudent(studentName, feedbacks);
              
              // Check if we got a proper analysis
              if (analysis && analysis.studentMetrics) {
                analyses.push({ studentName, analysis });
                processedCount++;
                break;
              } else {
                // AI analysis failed - don't add to results
                console.log(`⚠️ No analysis available for ${studentName} - skipping`);
                failedCount++;
                break;
              }
            } catch (retryError) {
              retryCount++;
              console.log(`🔄 Retry ${retryCount}/${maxRetries} for ${studentName}`);
              
              if (retryCount >= maxRetries) {
                // Max retries reached - don't add to results
                console.log(`❌ Max retries reached for ${studentName} - no analysis available`);
                failedCount++;
              } else {
                // Wait longer before retry
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }
          
          // Add longer delay between API calls to avoid rate limiting and quota exhaustion
          if (processedCount > 0) {
            console.log(`⏱️ Waiting 3 seconds before next API call...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      } catch (error) {
        console.error(`❌ Failed to analyze ${studentName}:`, error);
        failedCount++;
        // Don't add any analysis for failed students
      }
    }
    
    const nextIndex = startIndex + batchSize;
    const hasMore = nextIndex < studentNames.length;
    const nextStudent = hasMore ? studentNames[nextIndex] : undefined;
    
    console.log(`📈 Batch complete: ${processedCount} processed, ${cachedCount} cached, ${failedCount} failed`);
    
    return {
      analyses,
      hasMore,
      nextStudent,
      totalProcessed: processedCount,
      totalCached: cachedCount,
      totalFailed: failedCount
    };
  }

  /**
   * Analyze class-wide insights
   */
  async analyzeClass(
    className: string,
    level: 'primary' | 'secondary',
    studentAnalyses: Array<{ studentName: string; analysis: StudentAnalysisResult }>
  ): Promise<ClassInsightsResult | null> {
    const inputData = {
      className,
      level,
      studentAnalyses: studentAnalyses.map(({ studentName, analysis }) => ({
        studentName,
        metrics: analysis.studentMetrics,
        skillAssessment: analysis.skillAssessment
      }))
    };

    try {
      const basePrompt = this.prompts.get('classInsights') || this.getDefaultClassPrompt();
      const prompt = `${basePrompt}\n\nInput Data:\n${JSON.stringify(inputData, null, 2)}\n\nPlease analyze the class performance and provide insights.`;

      // Create fresh AI client with next API key
      const ai = this.createClient();

      const config = {
        thinkingConfig: {
          thinkingBudget: -1,
        },
        responseMimeType: 'application/json',
      };

      const contents = [{
        role: 'user',
        parts: [{ text: prompt }]
      }];

      // Generate content with Gemini 2.5 Flash
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config,
        contents
      });

      const text = response.text;
      
      if (!text || text.trim().length === 0) {
        console.error(`❌ Empty response from Gemini for class analysis`);
        return null;
      }
      
      return JSON.parse(text) as ClassInsightsResult;

    } catch (error) {
      console.error('Error in class analysis:', error);
      return null;
    }
  }

  /**
   * Get default student prompt
   */
  private getDefaultStudentPrompt(): string {
    return `You are an educational analyst. Analyze the student's feedback and provide structured insights about their performance, growth, and areas needing attention.`;
  }

  /**
   * Get default class prompt
   */
  private getDefaultClassPrompt(): string {
    return `You are an educational analyst. Analyze the class performance data and provide insights about trends, achievements, and areas for improvement.`;
  }
}

export default GeminiAnalyzer;