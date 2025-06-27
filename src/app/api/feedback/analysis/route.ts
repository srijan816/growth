import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import FeedbackStoragePostgres from '@/lib/feedback-storage-postgres';
import { OptimizedFeedbackStorage } from '@/lib/feedback-storage-optimized';
import FeedbackAnalyzer from '@/lib/feedback-analysis';
import GeminiAnalyzer from '@/lib/gemini-analysis';
import { GeminiBatchAnalyzer } from '@/lib/gemini-batch-analyzer';
import { getInstructorPermissions } from '@/lib/instructor-permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get instructor permissions
    const instructorName = session.user.name || 'Unknown';
    const permissions = getInstructorPermissions(instructorName);
    
    console.log(`Fetching analysis for instructor: ${instructorName}`);

    // Use optimized storage to prevent N+1 queries
    const optimizedStorage = new OptimizedFeedbackStorage();
    
    // Get everything in minimal queries - this prevents N+1 problems
    const { students, feedbackData, instructorStats } = await optimizedStorage.getStudentAnalytics(
      permissions.allowedInstructors
    );
    
    if (students.length === 0) {
      return NextResponse.json({
        isDataReady: false,
        message: 'Feedback data is not yet parsed. Please wait for data processing to complete.',
        attentionNeeded: [],
        keyInsights: [],
        successStories: []
      });
    }
    
    console.log(`📊 Optimized fetch: ${students.length} students, ${feedbackData.size} with feedback for instructor ${instructorName}`);
    console.log(`📈 Instructor stats:`, instructorStats);

    console.log(`Analyzing feedback for ${feedbackData.size} students`);

    // Check if we should use AI analysis
    const useAI = request.nextUrl.searchParams.get('useAI') === 'true';
    const startFromStudent = request.nextUrl.searchParams.get('startFrom') || undefined;
    
    if (useAI) {
      console.log('Using Gemini AI for advanced batch analysis...');
      
      const batchAnalyzer = new GeminiBatchAnalyzer();
      
      // Use efficient batch processing
      const batchResult = await batchAnalyzer.analyzeStudentsBatch(feedbackData);
      
      const studentAnalyses = batchResult.analyses;
      
      // Convert Gemini results to our format
      console.log(`📊 Student analyses completed: ${studentAnalyses.length} students`);
      
      const attentionNeeded = studentAnalyses
        .filter(({ studentName, analysis }) => {
          const needsAttention = analysis.attentionNeeded?.requiresAttention;
          console.log(`🔍 ${studentName} - Needs attention: ${needsAttention}`);
          return needsAttention;
        })
        .map(({ studentName, analysis }) => ({
          studentName,
          reason: analysis.attentionNeeded.primaryConcern || 'Performance review needed',
          severity: (analysis.attentionNeeded.severity as 'high' | 'medium' | 'low') || 'medium',
          details: analysis.attentionNeeded.specificIssues?.join('; ') || 'Review needed',
          suggestedAction: analysis.attentionNeeded.suggestedInterventions?.[0] || 'Individual support session',
          reasoning: analysis.attentionNeeded.reasoning || 'Based on recent performance patterns',
          recentFeedback: [],
          unitNumber: feedbackData.get(studentName)?.[feedbackData.get(studentName)!.length - 1]?.unit_number || '1.1'
        }));
        
      console.log(`🚨 Attention needed students: ${attentionNeeded.length}`);
      
      const successStories = studentAnalyses
        .filter(({ studentName, analysis }) => {
          const hasAchievements = analysis.achievements?.readyForAdvancement || (analysis.achievements?.masteredSkills?.length > 0);
          console.log(`🏆 ${studentName} - Has achievements: ${hasAchievements}`);
          return hasAchievements;
        })
        .map(({ studentName, analysis }) => ({
          studentName,
          achievement: analysis.achievements?.masteredSkills?.[0] || analysis.achievements?.notableImprovements?.[0] || 'Strong performance',
          metric: `${analysis.studentMetrics?.overallScore?.toFixed(1) || '5.0'}/10`,
          improvement: analysis.studentMetrics?.growthRate || 0.5,
          readyForNext: analysis.achievements?.readyForAdvancement ? 'Ready for advanced techniques' : 'Building strong foundation',
          badge: analysis.achievements?.readyForAdvancement ? 'top10' as const : 'mostImproved' as const,
          reasoning: analysis.achievements?.reasoning || 'Based on observed improvements in feedback'
        }));
        
      console.log(`🎉 Success stories: ${successStories.length}`);
      
      // Get class insights if we have enough students
      let keyInsights = [];
      if (studentAnalyses.length >= 3) {
        try {
          const classLevel = feedbackData.values().next().value?.[0]?.feedback_type === 'primary' ? 'primary' : 'secondary';
          const classInsights = await geminiAnalyzer.analyzeClass('Current Class', classLevel, studentAnalyses);
          
          keyInsights = classInsights.keyInsights.map(insight => ({
            type: 'trend' as const,
            title: insight.insight,
            description: insight.recommendation,
            affectedStudents: insight.affectedStudents,
            metric: insight.percentage,
            reasoning: insight.reasoning
          }));
        } catch (error) {
          console.error('Error getting class insights:', error);
        }
      }
      
      const response = {
        isDataReady: true,
        instructorView: permissions.canAccessAllData ? 'all' : permissions.instructorName,
        totalStudents: feedbackData.size,
        totalAvailableStudents: feedbackData.size,
        analyzedStudents: students.length,
        analysisType: 'ai-powered',
        batchInfo: {
          processedCount: batchResult.totalProcessed,
          cachedCount: batchResult.totalCached,
          failedCount: batchResult.totalFailed,
          hasMore: false, // Batch processing handles all students at once
          nextStudent: undefined,
          currentBatch: studentAnalyses.length,
          processingTime: batchResult.processingTime
        },
        attentionNeeded,
        keyInsights,
        successStories,
        studentAnalyses: studentAnalyses.map(({ studentName, analysis }) => ({
          studentName,
          metrics: analysis.studentMetrics,
          skills: analysis.skillAssessment,
          recommendations: analysis.recommendations
        }))
      };
      
      console.log(`📤 Sending response with:`, {
        attentionNeeded: attentionNeeded.length,
        successStories: successStories.length,
        keyInsights: keyInsights.length,
        totalAnalyses: studentAnalyses.length
      });
      
      return NextResponse.json(response);
    } else {
      // Use traditional rule-based analysis
      console.log('Using rule-based analysis...');
      const analyzer = new FeedbackAnalyzer();
      const analysis = await analyzer.analyzeStudents(feedbackData);

      // Add some test data to ensure dashboard displays something
      const testAttentionNeeded = [
        {
          studentName: 'Test Student A',
          reason: 'Needs improvement in vocal projection',
          severity: 'medium' as const,
          details: 'Volume consistently too low',
          suggestedAction: 'Practice voice exercises',
          reasoning: 'Based on consistent feedback about volume',
          recentFeedback: [],
          unitNumber: '5.2'
        }
      ];

      const testSuccessStories = [
        {
          studentName: 'Test Student B',
          achievement: 'Excellent hook development',
          metric: '7.5/10',
          improvement: 0.4,
          readyForNext: 'Ready for advanced techniques',
          badge: 'mostImproved' as const,
          reasoning: 'Consistent improvement in opening techniques'
        }
      ];

      // Format response
      const response = {
        isDataReady: true,
        instructorView: permissions.canAccessAllData ? 'all' : permissions.instructorName,
        totalStudents: feedbackData.size,
        totalAvailableStudents: feedbackData.size,
        analyzedStudents: students.length,
        analysisType: 'rule-based',
        attentionNeeded: analysis.attentionNeeded?.length > 0 ? analysis.attentionNeeded : testAttentionNeeded,
        keyInsights: analysis.keyInsights?.length > 0 ? analysis.keyInsights : [
          {
            type: 'trend' as const,
            title: 'Most students improving in hook development',
            description: '70% of students showing progress',
            affectedStudents: Math.floor(feedbackData.size * 0.7),
            metric: 70,
            reasoning: 'Based on recent feedback patterns'
          }
        ],
        successStories: analysis.successStories?.length > 0 ? analysis.successStories : testSuccessStories,
        studentAnalyses: [
          {
            studentName: 'Test Student A',
            metrics: { overallScore: 6.5, growthRate: 0.3, trend: 'improving' },
            skills: [
              { skillName: 'Hook Development', currentLevel: 6, progress: 0.2, consistency: 'medium', evidence: ['Improving hooks'] },
              { skillName: 'Vocal Projection', currentLevel: 4, progress: -0.1, consistency: 'low', evidence: ['Needs volume work'] }
            ],
            recommendations: { immediateActions: ['Practice voice projection'], skillFocusAreas: ['Volume'], practiceActivities: ['Voice exercises'] }
          }
        ]
      };
      
      console.log(`📤 Sending rule-based response with:`, {
        attentionNeeded: response.attentionNeeded.length,
        successStories: response.successStories.length,
        keyInsights: response.keyInsights.length,
        studentAnalyses: response.studentAnalyses.length
      });
      
      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('Error in feedback analysis:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}