import { pgTable, uuid, timestamp, text, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { students, users } from './users';
import { classSessions } from './sessions';

// Enums
export const recordingStatusEnum = pgEnum('recording_status', ['uploaded', 'transcribing', 'transcribed', 'analyzing', 'completed', 'failed']);

// Speech recordings table
export const speechRecordings = pgTable('speech_recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  sessionId: uuid('session_id').references(() => classSessions.id),
  instructorId: uuid('instructor_id').notNull().references(() => users.id),
  audioFilePath: text('audio_file_path').notNull(),
  durationSeconds: integer('duration_seconds'),
  speechTopic: text('speech_topic'),
  motion: text('motion'),
  status: recordingStatusEnum('status').default('uploaded'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// AI generated feedback table
export const aiGeneratedFeedback = pgTable('ai_generated_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordingId: uuid('recording_id').notNull().references(() => speechRecordings.id),
  transcription: text('transcription'),
  rubricScores: text('rubric_scores'),
  strengths: text('strengths'),
  improvementAreas: text('improvement_areas'),
  teacherComments: text('teacher_comments'),
  modelVersion: text('model_version'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const speechRecordingsRelations = relations(speechRecordings, ({ one }) => ({
  student: one(students, {
    fields: [speechRecordings.studentId],
    references: [students.id],
  }),
  session: one(classSessions, {
    fields: [speechRecordings.sessionId],
    references: [classSessions.id],
  }),
  instructor: one(users, {
    fields: [speechRecordings.instructorId],
    references: [users.id],
  }),
  aiFeedback: one(aiGeneratedFeedback),
}));

export const aiGeneratedFeedbackRelations = relations(aiGeneratedFeedback, ({ one }) => ({
  recording: one(speechRecordings, {
    fields: [aiGeneratedFeedback.recordingId],
    references: [speechRecordings.id],
  }),
}));

// Type exports
export type SpeechRecording = typeof speechRecordings.$inferSelect;
export type NewSpeechRecording = typeof speechRecordings.$inferInsert;
export type AIGeneratedFeedback = typeof aiGeneratedFeedback.$inferSelect;
export type NewAIGeneratedFeedback = typeof aiGeneratedFeedback.$inferInsert;