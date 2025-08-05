import { pgTable, uuid, timestamp, text, integer, unique, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { students } from './users';
import { courses } from './courses';

// Enums
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'completed', 'withdrawn']);

// Enrollments table
export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  enrollmentId: uuid('enrollment_id').unique(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  courseId: uuid('course_id').notNull().references(() => courses.id),
  enrolledDate: timestamp('enrolled_date', { mode: 'date' }).defaultNow(),
  enrollmentDate: timestamp('enrollment_date', { mode: 'date' }).defaultNow(),
  status: text('status').default('active'),
  attendanceRate: integer('attendance_rate').default(0),
  participationScore: integer('participation_score').default(0),
  progressMetrics: text('progress_metrics').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueStudentCourse: unique().on(table.studentId, table.courseId),
}));

// Relations
export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

// Type exports
export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;