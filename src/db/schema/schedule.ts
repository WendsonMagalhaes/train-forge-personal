import { pgTable, uuid, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { users } from "./users";

export const sessionModeEnum = pgEnum("session_mode", ["in_person", "online"]);
export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled", "confirmed", "completed", "missed", "rescheduled", "canceled",
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  trainerId: uuid("trainer_id").notNull().references(() => users.id),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  mode: sessionModeEnum("mode").notNull().default("in_person"),
  location: text("location"),
  status: sessionStatusEnum("status").notNull().default("scheduled"),
  confirmedByStudent: boolean("confirmed_by_student").default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  isReplacementFor: uuid("is_replacement_for"), // aponta pra sessão original em caso de reposição
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  student: one(students, { fields: [sessions.studentId], references: [students.id] }),
  trainer: one(users, { fields: [sessions.trainerId], references: [users.id] }),
}));
