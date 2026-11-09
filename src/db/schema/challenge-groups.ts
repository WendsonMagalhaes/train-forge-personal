import { pgTable, uuid, text, timestamp, integer, date, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { students } from "./students";

// Grupo de desafios criado pelo personal (estilo "gym rats"): alunos reunidos
// para cumprir atividades e fazer check-in de academia, com chat próprio.
export const challengeGroups = pgTable("challenge_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  trainerId: uuid("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const challengeGroupMembers = pgTable("challenge_group_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => challengeGroups.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("challenge_group_members_unique").on(table.groupId, table.studentId),
]);

export const challengeGroupMessages = pgTable("challenge_group_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => challengeGroups.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Atividade montada pelo personal dentro do grupo (ex: "Treinar pernas 3x", "Beber 3L de água").
// O aluno marca como concluída; cada conclusão soma os pontos da atividade.
export const challengeActivities = pgTable("challenge_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => challengeGroups.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  points: integer("points").notNull().default(1),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const challengeActivityCompletions = pgTable("challenge_activity_completions", {
  id: uuid("id").defaultRandom().primaryKey(),
  activityId: uuid("activity_id").notNull().references(() => challengeActivities.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("challenge_activity_completions_unique").on(table.activityId, table.studentId),
]);

// Check-in de academia: no máximo um por aluno, por grupo, por dia.
export const challengeCheckins = pgTable("challenge_checkins", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => challengeGroups.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  checkinDate: date("checkin_date").notNull(),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("challenge_checkins_unique").on(table.groupId, table.studentId, table.checkinDate),
]);

export const challengeGroupsRelations = relations(challengeGroups, ({ many }) => ({
  members: many(challengeGroupMembers),
  activities: many(challengeActivities),
  messages: many(challengeGroupMessages),
}));
