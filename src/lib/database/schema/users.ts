import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'instructor', 'student']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  role: text('role').default('instructor'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  student: one(students, {
    fields: [users.id],
    references: [students.id],
  }),
  instructor: one(instructors, {
    fields: [users.id],
    references: [instructors.instructorId],
  }),
  // coursesTaught: many(courses), // Circular dependency
  // recordedAttendances: many(attendances), // Circular dependency
}));

// Students table
export const students = pgTable('students', {
  id: uuid('id').primaryKey().references(() => users.id),
  studentNumber: text('student_number').unique(),
  email: text('email'),
  phone: text('phone'),
  parentName: text('parent_name'),
  parentEmail: text('parent_email'),
  parentPhone: text('parent_phone'),
  dateOfBirth: timestamp('date_of_birth', { mode: 'date' }),
  school: text('school'),
  gradeLevel: text('grade_level'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Relations for students
export const studentsRelations = relations(students, ({ one }) => ({
  user: one(users, {
    fields: [students.id],
    references: [users.id],
  }),
  // enrollments: many(enrollments), // Circular dependency
  // attendances: many(attendances), // Circular dependency  
  // feedback: many(parsedStudentFeedback), // Circular dependency
  // achievements: many(studentAchievements), // Circular dependency
  // speechRecordings: many(speechRecordings), // Circular dependency
}));

// Instructors table
export const instructors = pgTable('instructors', {
  instructorId: uuid('instructor_id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  specializations: text('specializations').array(),
  permissions: text('permissions').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Relations for instructors
export const instructorsRelations = relations(instructors, ({ one }) => ({
  user: one(users),
  // courses: many(courses), // Circular dependency - defined in courses.ts
  // classes: many(classes), // Circular dependency - defined in sessions.ts
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Instructor = typeof instructors.$inferSelect;
export type NewInstructor = typeof instructors.$inferInsert;

// Relations are defined after all tables are imported in index.ts