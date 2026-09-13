import { pgTable, uuid, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { students } from "./students";

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationTypeEnum = pgEnum("notification_type", [
  "workout_reminder", "payment_due", "session_reminder", "message", "educational", "general",
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const educationalContent = pgTable("educational_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  trainerId: uuid("trainer_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  body: text("body"),
  mediaUrl: text("media_url"),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
});

/**
 * Inscrições de push notification (Web Push API). Um usuário pode ter mais
 * de uma (ex.: celular + desktop) — cada uma é uma "endpoint" de navegador
 * distinta. Removida quando o navegador reporta a inscrição como inválida.
 */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  student: one(students, { fields: [messages.studentId], references: [students.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));
