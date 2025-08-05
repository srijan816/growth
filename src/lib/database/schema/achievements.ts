import { pgTable, uuid, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { students } from './users';
import { classes } from './courses';

// Enums
export const achievementTypeEnum = pgEnum('achievement_type', ['academic', 'participation', 'improvement', 'leadership']);
export const evidenceTypeEnum = pgEnum('evidence_type', ['text', 'image', 'link', 'document']);

// Student achievements table
export const studentAchievements = pgTable('student_achievements', {
  achievementId: uuid('achievement_id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  title: text('title').notNull(),
  description: text('description'),
  achievementType: achievementTypeEnum('achievement_type').default('academic'),
  dateEarned: timestamp('date_earned', { mode: 'date' }).defaultNow(),
  evidenceType: evidenceTypeEnum('evidence_type'),
  evidenceContent: text('evidence_content'),
  evidenceUrl: text('evidence_url'),
  relatedClassId: uuid('related_class_id').references(() => classes.classId),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Student uncategorized data table
export const studentUncategorizedData = pgTable('student_uncategorized_data', {
  dataId: uuid('data_id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  title: text('title').notNull(),
  description: text('description'),
  dataType: text('data_type').notNull(),
  content: text('content').notNull(),
  url: text('url'),
  tags: text('tags').array(),
  uploadDate: timestamp('upload_date', { mode: 'date' }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const studentAchievementsRelations = relations(studentAchievements, ({ one }) => ({
  student: one(students, {
    fields: [studentAchievements.studentId],
    references: [students.id],
  }),
  relatedClass: one(classes, {
    fields: [studentAchievements.relatedClassId],
    references: [classes.classId],
  }),
}));

export const studentUncategorizedDataRelations = relations(studentUncategorizedData, ({ one }) => ({
  student: one(students, {
    fields: [studentUncategorizedData.studentId],
    references: [students.id],
  }),
}));

// Type exports
export type StudentAchievement = typeof studentAchievements.$inferSelect;
export type NewStudentAchievement = typeof studentAchievements.$inferInsert;
export type StudentUncategorizedData = typeof studentUncategorizedData.$inferSelect;
export type NewStudentUncategorizedData = typeof studentUncategorizedData.$inferInsert;