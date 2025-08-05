import { db } from '../database/drizzle';
import { students, users, attendances, parsedStudentFeedback, classSessions, courses } from '../database/schema';
import { eq, desc, gte, and } from 'drizzle-orm';
import { GrowthAnalyticsEngine } from '../analytics/growth-engine';
import { format, subDays, subWeeks } from 'date-fns';

interface DigestData {
  student: {
    id: string;
    name: string;
    gradeLevel: string;
  };
  period: {
    start: Date;
    end: Date;
    type: 'weekly' | 'monthly';
  };
  growth: {
    overallScore: number;
    trend: number;
    level: string;
    percentile: number;
  };
  attendance: {
    rate: number;
    classesAttended: number;
    totalClasses: number;
  };
  achievements: string[];
  feedback: Array<{
    date: Date;
    strengths: string;
    improvements: string;
  }>;
  upcomingClasses: Array<{
    date: Date;
    courseName: string;
    topic?: string;
  }>;
}

export class EmailDigestService {
  private growthEngine: GrowthAnalyticsEngine;

  constructor() {
    this.growthEngine = new GrowthAnalyticsEngine();
  }

  async generateDigest(
    studentId: string,
    digestType: 'weekly' | 'monthly' = 'weekly'
  ): Promise<DigestData> {
    const endDate = new Date();
    const startDate = digestType === 'weekly' 
      ? subWeeks(endDate, 1) 
      : subWeeks(endDate, 4);

    // Fetch student info
    const studentData = await db
      .select({
        id: students.id,
        name: users.name,
        gradeLevel: students.gradeLevel
      })
      .from(students)
      .innerJoin(users, eq(students.id, users.id))
      .where(eq(students.id, studentId))
      .limit(1);

    if (!studentData[0]) {
      throw new Error('Student not found');
    }

    // Get growth analytics
    const growthData = await this.growthEngine.calculateStudentGrowth(
      studentId,
      digestType === 'weekly' ? 'week' : 'month'
    );

    // Calculate attendance
    const attendanceData = await this.calculateAttendance(studentId, startDate, endDate);

    // Get recent feedback
    const feedbackData = await this.getRecentFeedback(studentId, startDate, endDate);

    // Get achievements
    const achievements = this.extractAchievements(growthData);

    // Get upcoming classes
    const upcomingClasses = await this.getUpcomingClasses(studentId);

    return {
      student: studentData[0],
      period: {
        start: startDate,
        end: endDate,
        type: digestType
      },
      growth: {
        overallScore: growthData.overall.score,
        trend: growthData.overall.trend,
        level: growthData.overall.level,
        percentile: growthData.overall.percentile
      },
      attendance: attendanceData,
      achievements,
      feedback: feedbackData,
      upcomingClasses
    };
  }

  private async calculateAttendance(studentId: string, startDate: Date, endDate: Date) {
    const attendance = await db
      .select({
        status: attendances.status
      })
      .from(attendances)
      .innerJoin(classSessions, eq(attendances.sessionId, classSessions.id))
      .where(
        and(
          eq(attendances.studentId, studentId),
          gte(classSessions.sessionDate, startDate)
        )
      );

    const totalClasses = attendance.length;
    const classesAttended = attendance.filter(a => 
      a.status === 'present' || a.status === 'makeup'
    ).length;

    return {
      rate: totalClasses > 0 ? Math.round((classesAttended / totalClasses) * 100) : 0,
      classesAttended,
      totalClasses
    };
  }

  private async getRecentFeedback(studentId: string, startDate: Date, endDate: Date) {
    const feedback = await db
      .select({
        createdAt: parsedStudentFeedback.createdAt,
        strengths: parsedStudentFeedback.strengths,
        improvements: parsedStudentFeedback.improvements
      })
      .from(parsedStudentFeedback)
      .where(
        and(
          eq(parsedStudentFeedback.studentId, studentId),
          gte(parsedStudentFeedback.createdAt, startDate)
        )
      )
      .orderBy(desc(parsedStudentFeedback.createdAt))
      .limit(3);

    return feedback.map(f => ({
      date: f.createdAt,
      strengths: f.strengths || 'No specific strengths noted',
      improvements: f.improvements || 'No specific improvements noted'
    }));
  }

  private extractAchievements(growthData: any): string[] {
    const achievements: string[] = [];

    // Check for milestones
    if (growthData.milestones?.achieved?.length > 0) {
      growthData.milestones.achieved.forEach((milestone: any) => {
        achievements.push(milestone.title);
      });
    }

    // Check for growth patterns
    if (growthData.patterns?.length > 0) {
      growthData.patterns.forEach((pattern: any) => {
        if (pattern.type === 'accelerating') {
          achievements.push('Accelerating Growth Pattern');
        } else if (pattern.type === 'consistent') {
          achievements.push('Consistent Performance');
        }
      });
    }

    // Check for skill improvements
    Object.entries(growthData.skills || {}).forEach(([skill, data]: [string, any]) => {
      if (data.growthRate > 10) {
        achievements.push(`Significant improvement in ${skill}`);
      }
    });

    return achievements.slice(0, 5); // Limit to top 5 achievements
  }

  private async getUpcomingClasses(studentId: string): Promise<any[]> {
    // This would need to be implemented based on enrollment and schedule data
    // For now, return empty array
    return [];
  }

  generateHTMLTemplate(digestData: DigestData): string {
    const { student, period, growth, attendance, achievements, feedback, upcomingClasses } = digestData;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Growth Compass - ${period.type === 'weekly' ? 'Weekly' : 'Monthly'} Digest</title>
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
    .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0; }
    .metric { background: #f7f7f7; padding: 20px; border-radius: 8px; }
    .metric-value { font-size: 32px; font-weight: bold; color: #667eea; }
    .metric-label { color: #666; font-size: 14px; }
    .achievement { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px 15px; margin: 10px 0; }
    .feedback-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">Growth Compass ${period.type === 'weekly' ? 'Weekly' : 'Monthly'} Digest</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">
      ${student.name} - Grade ${student.gradeLevel}
    </p>
    <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">
      ${format(period.start, 'MMM dd')} - ${format(period.end, 'MMM dd, yyyy')}
    </p>
  </div>

  <div class="metric-grid">
    <div class="metric">
      <div class="metric-value">${growth.overallScore}%</div>
      <div class="metric-label">Overall Growth Score</div>
    </div>
    <div class="metric">
      <div class="metric-value">${growth.trend > 0 ? '+' : ''}${growth.trend}%</div>
      <div class="metric-label">Growth Trend</div>
    </div>
    <div class="metric">
      <div class="metric-value">${attendance.rate}%</div>
      <div class="metric-label">Attendance Rate</div>
    </div>
    <div class="metric">
      <div class="metric-value">${growth.percentile}th</div>
      <div class="metric-label">Percentile Rank</div>
    </div>
  </div>

  ${achievements.length > 0 ? `
    <h2 style="color: #667eea;">🏆 Achievements This Period</h2>
    ${achievements.map(achievement => `
      <div class="achievement">${achievement}</div>
    `).join('')}
  ` : ''}

  ${feedback.length > 0 ? `
    <h2 style="color: #667eea;">📝 Recent Instructor Feedback</h2>
    ${feedback.map(f => `
      <div class="feedback-card">
        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
          ${format(f.date, 'MMMM dd, yyyy')}
        </p>
        <p style="margin: 10px 0;">
          <strong>Strengths:</strong> ${f.strengths}
        </p>
        <p style="margin: 10px 0;">
          <strong>Areas for Growth:</strong> ${f.improvements}
        </p>
      </div>
    `).join('')}
  ` : ''}

  <div class="footer">
    <p>Keep up the great work! Your child is on a wonderful learning journey.</p>
    <p style="font-size: 12px;">
      <a href="#" style="color: #667eea;">View Full Dashboard</a> | 
      <a href="#" style="color: #667eea;">Update Preferences</a> | 
      <a href="#" style="color: #667eea;">Contact Instructor</a>
    </p>
  </div>
</body>
</html>
    `;
  }
}