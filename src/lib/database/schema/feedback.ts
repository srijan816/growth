import { pgTable, uuid, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { students } from './users';

// Enums
export const feedbackTypeEnum = pgEnum('feedback_type_enum', ['primary', 'secondary', 'written', 'verbal', 'assessment']);

// Parsed student feedback table
export const parsedStudentFeedback = pgTable('parsed_student_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id),
  studentName: text('student_name').notNull(),
  classCode: text('class_code').notNull(),
  className: text('class_name'),
  unitNumber: text('unit_number').notNull(),
  lessonNumber: text('lesson_number'),
  date: text('date'),
  topic: text('topic'),
  motion: text('motion'),
  feedbackType: text('feedback_type'),
  content: text('content').notNull(),
  rawContent: text('raw_content'),
  htmlContent: text('html_content'),
  duration: text('duration'),
  filePath: text('file_path').notNull(),
  uniqueId: text('unique_id').unique().notNull(),
  instructor: text('instructor'),
  
  // Additional fields for enhanced feedback
  skillAssessments: text('skill_assessments').default('[]'),
  actionItems: text('action_items').array(),
  nextSteps: text('next_steps').array(),
  
  parsedAt: timestamp('parsed_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Feedback parsing status table
export const feedbackParsingStatus = pgTable('feedback_parsing_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  totalFilesProcessed: integer('total_files_processed').default(0),
  totalFeedbackRecords: integer('total_feedback_records').default(0),
  totalStudents: integer('total_students').default(0),
  parsingStartedAt: timestamp('parsing_started_at', { withTimezone: true }),
  parsingCompletedAt: timestamp('parsing_completed_at', { withTimezone: true }),
  parsingErrors: text('parsing_errors').default('[]'),
  isComplete: boolean('is_complete').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const parsedStudentFeedbackRelations = relations(parsedStudentFeedback, ({ one }) => ({
  student: one(students, {
    fields: [parsedStudentFeedback.studentId],
    references: [students.id],
  }),
}));

// Type exports
export type ParsedStudentFeedback = typeof parsedStudentFeedback.$inferSelect;
export type NewParsedStudentFeedback = typeof parsedStudentFeedback.$inferInsert;
export type FeedbackParsingStatus = typeof feedbackParsingStatus.$inferSelect;
export type NewFeedbackParsingStatus = typeof feedbackParsingStatus.$inferInsert;

// Import for type resolution
import { integer, boolean } from 'drizzle-orm/pg-core';