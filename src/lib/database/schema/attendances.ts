import { pgTable, uuid, timestamp, integer, text, unique, pgEnum, check } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { students, users } from './users';
import { classSessions } from './sessions';

// Enums
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'makeup']);

// Attendances table
export const attendances = pgTable('attendances', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => classSessions.id),
  studentId: uuid('student_id').notNull().references(() => students.id),
  status: attendanceStatusEnum('status').notNull(),
  
  // Rating columns (1-5 scale)
  attitudeEfforts: integer('attitude_efforts'),
  askingQuestions: integer('asking_questions'),
  applicationSkills: integer('application_skills'),
  applicationFeedback: integer('application_feedback'),
  
  // Legacy column names (for backward compatibility)
  attitudeRating: integer('attitude_rating'),
  askingQuestionsRating: integer('asking_questions_rating'),
  applicationRating: integer('application_rating'),
  feedbackRating: integer('feedback_rating'),
  
  notes: text('notes'),
  recordedBy: uuid('recorded_by').references(() => users.id),
  markedBy: uuid('marked_by').references(() => users.id),
  markedAt: timestamp('marked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueSessionStudent: unique().on(table.sessionId, table.studentId),
  attitudeCheck: check('attitude_check', sql`${table.attitudeEfforts} >= 1 AND ${table.attitudeEfforts} <= 5`),
  questionsCheck: check('questions_check', sql`${table.askingQuestions} >= 1 AND ${table.askingQuestions} <= 5`),
  skillsCheck: check('skills_check', sql`${table.applicationSkills} >= 1 AND ${table.applicationSkills} <= 5`),
  feedbackCheck: check('feedback_check', sql`${table.applicationFeedback} >= 1 AND ${table.applicationFeedback} <= 5`),
}));

// Relations
export const attendancesRelations = relations(attendances, ({ one }) => ({
  session: one(classSessions, {
    fields: [attendances.sessionId],
    references: [classSessions.id],
  }),
  student: one(students, {
    fields: [attendances.studentId],
    references: [students.id],
  }),
  recordedByUser: one(users, {
    fields: [attendances.recordedBy],
    references: [users.id],
  }),
  markedByUser: one(users, {
    fields: [attendances.markedBy],
    references: [users.id],
  }),
}));

// Type exports
export type Attendance = typeof attendances.$inferSelect;
export type NewAttendance = typeof attendances.$inferInsert;