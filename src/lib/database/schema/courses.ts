import { pgTable, uuid, text, time, integer, pgEnum, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, instructors } from './users';
import { enrollments } from './enrollments';
import { classSessions } from './sessions';

// Enums
export const programTypeEnum = pgEnum('program_type', ['PSD', 'WRITING', 'RAPS', 'CRITICAL']);
export const courseLevelEnum = pgEnum('course_level', ['PRIMARY', 'SECONDARY']);
export const courseStatusEnum = pgEnum('course_status', ['active', 'completed', 'cancelled']);

// Courses table
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseCode: text('course_code').unique(),
  courseName: text('course_name'),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  level: text('level'),
  programType: text('program_type'),
  dayOfWeek: text('day_of_week'),
  startTime: time('start_time'),
  durationMinutes: integer('duration_minutes'),
  instructorId: uuid('instructor_id').references(() => users.id),
  maxStudents: integer('max_students'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  enrollments: many(enrollments),
  sessions: many(classSessions),
  classMetrics: one(classMetrics),
}));

// Class metrics table
export const classMetrics = pgTable('class_metrics', {
  metricId: uuid('metric_id').primaryKey().defaultRandom(),
  classId: uuid('class_id').notNull().references(() => classes.classId).unique(),
  totalStudents: integer('total_students').notNull().default(0),
  activeStudents: integer('active_students').notNull().default(0),
  averageAttendance: integer('average_attendance').default(0),
  averageParticipation: integer('average_participation').default(0),
  completionRate: integer('completion_rate').default(0),
  growthTrend: text('growth_trend').default('stable'),
  lastCalculated: timestamp('last_calculated', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Classes table (comprehensive class information)
export const classes = pgTable('classes', {
  classId: uuid('class_id').primaryKey().defaultRandom(),
  classCode: text('class_code').unique().notNull(),
  className: text('class_name').notNull(),
  programType: text('program_type').notNull(),
  level: text('level').notNull(),
  classType: text('class_type').notNull().default('REGULAR'),
  instructorId: uuid('instructor_id').notNull().references(() => instructors.instructorId),
  currentUnit: integer('current_unit').default(1),
  currentLesson: integer('current_lesson').default(1),
  totalUnits: integer('total_units').default(8),
  lessonsPerUnit: integer('lessons_per_unit').default(4),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }).notNull(),
  scheduleDayOfWeek: integer('schedule_day_of_week'),
  scheduleStartTime: time('schedule_start_time'),
  scheduleEndTime: time('schedule_end_time'),
  durationMinutes: integer('duration_minutes').default(90),
  location: text('location'),
  timezone: text('timezone').default('UTC'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Relations for classes
export const classesRelations = relations(classes, ({ one, many }) => ({
  instructor: one(instructors, {
    fields: [classes.instructorId],
    references: [instructors.instructorId],
  }),
  metrics: one(classMetrics),
}));

// Type exports
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type ClassMetrics = typeof classMetrics.$inferSelect;
export type NewClassMetrics = typeof classMetrics.$inferInsert;

// Relations are defined after all tables are imported in index.ts