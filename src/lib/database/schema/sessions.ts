import { pgTable, uuid, timestamp, text, integer, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { courses } from './courses';
import { attendances } from './attendances';

// Class sessions table
export const classSessions = pgTable('class_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id),
  sessionDate: timestamp('session_date', { mode: 'date' }).notNull(),
  date: timestamp('date', { mode: 'date' }),
  startTime: timestamp('start_time', { withTimezone: true }),
  endTime: timestamp('end_time', { withTimezone: true }),
  status: text('status').default('scheduled'),
  notes: text('notes'),
  unitNumber: integer('unit_number'),
  lessonNumber: text('lesson_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueCourseDate: unique().on(table.courseId, table.sessionDate),
}));

// Relations
export const classSessionsRelations = relations(classSessions, ({ one, many }) => ({
  course: one(courses, {
    fields: [classSessions.courseId],
    references: [courses.id],
  }),
  attendances: many(attendances),
}));

// Type exports
export type ClassSession = typeof classSessions.$inferSelect;
export type NewClassSession = typeof classSessions.$inferInsert;