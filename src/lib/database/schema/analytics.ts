import { pgTable, uuid, timestamp, text, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { students, instructors } from './users';
import { classes } from './courses';

// Enums
export const activityTypeEnum = pgEnum('activity_type', ['feedback', 'achievement', 'enrollment', 'class_completion']);
export const trendDirectionEnum = pgEnum('trend_direction', ['up', 'down', 'stable']);

// Recommendations table (renamed from aiRecommendations to match database)
export const recommendations = pgTable('recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull(),
  studentName: text('student_name').notNull(),
  growthArea: text('growth_area').notNull(),
  priority: text('priority').notNull(),
  category: text('category').notNull(),
  recommendation: text('recommendation').notNull(),
  specificActions: text('specific_actions').array().notNull().default([]),
  timeframe: text('timeframe').notNull(),
  measurableGoals: text('measurable_goals').array().notNull().default([]),
  resources: text('resources').array().notNull().default([]),
  instructorNotes: text('instructor_notes'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Keep aiRecommendations as alias for backward compatibility
export const aiRecommendations = recommendations;

// Student analysis cache table
export const studentAnalysisCache = pgTable('student_analysis_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentName: text('student_name').unique().notNull(),
  analysisData: text('analysis_data').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Activity log table
export const activityLog = pgTable('activity_log', {
  activityId: uuid('activity_id').primaryKey().defaultRandom(),
  activityType: activityTypeEnum('activity_type').notNull(),
  studentId: uuid('student_id').references(() => students.id),
  classId: uuid('class_id').references(() => classes.classId),
  instructorId: uuid('instructor_id').references(() => instructors.instructorId),
  description: text('description').notNull(),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Program metrics summary table
export const programMetricsSummary = pgTable('program_metrics_summary', {
  metricId: uuid('metric_id').primaryKey().defaultRandom(),
  programType: text('program_type').notNull().unique(),
  totalStudents: integer('total_students').default(0),
  totalClasses: integer('total_classes').default(0),
  averageAttendance: integer('average_attendance').default(0),
  averageGrowth: integer('average_growth').default(0),
  recentFeedbackCount: integer('recent_feedback_count').default(0),
  topPerformers: integer('top_performers').default(0),
  needsAttention: integer('needs_attention').default(0),
  completionRate: integer('completion_rate').default(0),
  trendDirection: trendDirectionEnum('trend_direction').default('stable'),
  lastCalculated: timestamp('last_calculated', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const activityLogRelations = relations(activityLog, ({ one }) => ({
  student: one(students, {
    fields: [activityLog.studentId],
    references: [students.id],
  }),
  class: one(classes, {
    fields: [activityLog.classId],
    references: [classes.classId],
  }),
  instructor: one(instructors, {
    fields: [activityLog.instructorId],
    references: [instructors.instructorId],
  }),
}));

// Type exports
export type AIRecommendation = typeof aiRecommendations.$inferSelect;
export type NewAIRecommendation = typeof aiRecommendations.$inferInsert;
export type StudentAnalysisCache = typeof studentAnalysisCache.$inferSelect;
export type NewStudentAnalysisCache = typeof studentAnalysisCache.$inferInsert;
export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
export type ProgramMetricsSummary = typeof programMetricsSummary.$inferSelect;
export type NewProgramMetricsSummary = typeof programMetricsSummary.$inferInsert;