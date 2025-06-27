import { GoogleGenAI } from '@google/genai';
import { StoredStudentFeedback } from './feedback-storage';
import { StudentAnalysisResult, ClassInsightsResult, GeminiAnalyzer } from './gemini-analysis';

export interface BatchAnalysisResult {
  analyses: Array<{
    studentName: string;
    analysis: StudentAnalysisResult;
  }>;
  totalProcessed: number;
  totalCached: number;
  totalFailed: number;
  processingTime: number;
}

export class GeminiBatchAnalyzer extends GeminiAnalyzer {
  private readonly BATCH_SIZE = 10; // Process 10 students at once
  private readonly MAX_CONCURRENT_BATCHES = 4; // Use all 4 API keys concurrently

  /**
   * Analyze multiple students in parallel batches
   */
  async analyzeStudentsBatch(
    studentsData: Map<string, StoredStudentFeedback[]>
  ): Promise<BatchAnalysisResult> {
    const startTime = Date.now();
    const results: Array<{ studentName: string; analysis: StudentAnalysisResult }> = [];
    let totalCached = 0;
    let totalFailed = 0;

    // Convert map to array for easier batching
    const students = Array.from(studentsData.entries());
    
    // Check cache for all students first
    const cachePromises = students.map(async ([studentName]) => {
      const cached = await this.getCachedAnalysis(studentName);
      if (cached) {
        totalCached++;
        return { studentName, analysis: cached, fromCache: true };
      }
      return null;
    });

    const cacheResults = await Promise.all(cachePromises);
    
    // Add cached results
    for (const result of cacheResults) {
      if (result && result.fromCache) {
        results.push({ studentName: result.studentName, analysis: result.analysis });
      }
    }

    // Filter out students that were cached
    const uncachedStudents = students.filter(([studentName]) => 
      !cacheResults.some(r => r?.studentName === studentName)
    );

    // Process uncached students in batches
    const batches = this.createBatches(uncachedStudents, this.BATCH_SIZE);
    
    // Process batches concurrently (up to MAX_CONCURRENT_BATCHES at a time)
    for (let i = 0; i < batches.length; i += this.MAX_CONCURRENT_BATCHES) {
      const concurrentBatches = batches.slice(i, i + this.MAX_CONCURRENT_BATCHES);
      
      const batchPromises = concurrentBatches.map((batch, index) => 
        this.processBatch(batch, i + index)
      );

      const batchResults = await Promise.all(batchPromises);
      
      for (const batchResult of batchResults) {
        results.push(...batchResult.successes);
        totalFailed += batchResult.failures;
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Batch analysis complete: ${results.length} analyzed (${totalCached} cached) in ${processingTime}ms`);

    return {
      analyses: results,
      totalProcessed: results.length - totalCached,
      totalCached,
      totalFailed,
      processingTime
    };
  }

  /**
   * Process a batch of students with a single AI call
   */
  private async processBatch(
    batch: Array<[string, StoredStudentFeedback[]]>,
    batchIndex: number
  ): Promise<{ successes: Array<{ studentName: string; analysis: StudentAnalysisResult }>; failures: number }> {
    const successes: Array<{ studentName: string; analysis: StudentAnalysisResult }> = [];
    let failures = 0;

    try {
      // Prepare batch input
      const batchInput = batch.map(([studentName, feedbacks]) => ({
        studentName,
        level: feedbacks[0]?.feedback_type || 'unknown',
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
      }));

      // Get batch prompt
      const batchPrompt = this.getBatchPrompt();
      const prompt = `${batchPrompt}\n\nAnalyze these ${batch.length} students:\n${JSON.stringify(batchInput, null, 2)}`;

      // Use rotating API key
      const ai = this.createClient();
      const config = {
        thinkingConfig: {
          thinkStyle: 'detailed' as any,
          maxThinkingTokens: 8192
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      };

      const result = await ai.think(prompt, config);
      const response = JSON.parse(result.response);

      // Process each student's analysis
      for (const studentAnalysis of response.analyses) {
        const studentName = studentAnalysis.studentName;
        const analysis = studentAnalysis.analysis;

        if (this.validateAnalysisResult(analysis)) {
          successes.push({ studentName, analysis });
          
          // Cache the result
          await this.cacheAnalysis(studentName, analysis);
        } else {
          failures++;
        }
      }

      console.log(`📦 Batch ${batchIndex}: Processed ${successes.length} students successfully`);

    } catch (error) {
      console.error(`❌ Batch ${batchIndex} failed:`, error);
      failures = batch.length;

      // Fallback: Process individually
      for (const [studentName, feedbacks] of batch) {
        try {
          const analysis = await this.analyzeStudent(studentName, feedbacks);
          if (analysis) {
            successes.push({ studentName, analysis });
          } else {
            failures++;
          }
        } catch (individualError) {
          console.error(`Failed to analyze ${studentName} individually:`, individualError);
          failures++;
        }
      }
    }

    return { successes, failures };
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get batch analysis prompt
   */
  private getBatchPrompt(): string {
    return `You are an expert educational analyst. Analyze the performance of multiple students based on their feedback data.

For EACH student, provide a complete analysis following this exact structure:

{
  "analyses": [
    {
      "studentName": "Student Name",
      "analysis": {
        "studentMetrics": {
          "overallScore": number (0-10),
          "growthRate": number (-1 to 1),
          "consistencyScore": number (0-10),
          "engagementLevel": number (0-10),
          "trend": "improving" | "stable" | "declining"
        },
        "skillAssessment": [
          {
            "skillName": string,
            "currentLevel": number (0-10),
            "progress": number (-1 to 1),
            "consistency": "high" | "medium" | "low",
            "evidence": [string]
          }
        ],
        "attentionNeeded": {
          "requiresAttention": boolean,
          "severity": "high" | "medium" | "low" | "none",
          "primaryConcern": string,
          "specificIssues": [string],
          "suggestedInterventions": [string],
          "reasoning": string
        },
        "achievements": {
          "recentBreakthroughs": [string],
          "masteredSkills": [string],
          "notableImprovements": [string],
          "readyForAdvancement": boolean,
          "recognitionSuggestions": [string],
          "reasoning": string
        },
        "recommendations": {
          "immediateActions": [string],
          "skillFocusAreas": [string],
          "practiceActivities": [string],
          "parentCommunication": string
        }
      }
    }
  ]
}

Focus on the 9 core debate skills:
1. Hook Development
2. Speech Time Management
3. Vocal Projection
4. Clarity & Fluency
5. Argument Structure & Depth
6. Rebuttal Skills
7. Examples & Illustrations
8. Engagement (POIs)
9. Speech Structure & Organization

Provide actionable, specific insights for each student.`;
  }

  /**
   * Validate analysis result structure
   */
  private validateAnalysisResult(analysis: any): analysis is StudentAnalysisResult {
    return (
      analysis &&
      analysis.studentMetrics &&
      analysis.skillAssessment &&
      analysis.attentionNeeded &&
      analysis.achievements &&
      analysis.recommendations
    );
  }
}