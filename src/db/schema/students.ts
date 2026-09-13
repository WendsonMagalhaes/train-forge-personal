import { pgTable, uuid, text, timestamp, pgEnum, date, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const studentStatusEnum = pgEnum("student_status", ["active", "inactive", "locked"]);

// Extends `users` (role = student) with trainer-facing CRM data
export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  trainerId: uuid("trainer_id").notNull().references(() => users.id),
  phone: text("phone"),
  birthDate: date("birth_date"),
  gender: text("gender"),
  goals: text("goals").array(), // múltipla escolha — ver src/lib/constants.ts (STUDENT_GOAL_OPTIONS)
  status: studentStatusEnum("status").notNull().default("active"),
  startedAt: date("started_at").defaultNow(),
  // CPF do aluno — necessário para criar cliente/cobrança no gateway de
  // pagamento (Asaas exige cpfCnpj). Coletado sob demanda na primeira
  // cobrança via gateway, não no cadastro. Nullable de propósito.
  cpf: text("cpf"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Anamnese — filled once, editable, versioned via updatedAt
export const studentHealthHistory = pgTable("student_health_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  hasInjuries: boolean("has_injuries").default(false),
  injuriesDetail: text("injuries_detail"),
  hasChronicConditions: boolean("has_chronic_conditions").default(false),
  chronicConditionsDetail: text("chronic_conditions_detail"),
  medications: text("medications"),
  medicalRestrictions: text("medical_restrictions"),
  familyHistory: text("family_history"),
  smoker: boolean("smoker").default(false),
  alcoholUse: text("alcohol_use"),
  sleepQuality: text("sleep_quality"),
  stressLevel: text("stress_level"),
  physicalActivityHistory: text("physical_activity_history"),
  medicalClearance: boolean("medical_clearance").default(false), // atestado médico
  consentSignedAt: timestamp("consent_signed_at"), // LGPD + termo de responsabilidade
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const noteTypeEnum = pgEnum("note_type", ["general", "session", "financial", "alert"]);

export const studentNotes = pgTable("student_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id),
  type: noteTypeEnum("type").notNull().default("general"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentStatusLog = pgTable("student_status_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  previousStatus: studentStatusEnum("previous_status"),
  newStatus: studentStatusEnum("new_status").notNull(),
  reason: text("reason"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  trainer: one(users, { fields: [students.trainerId], references: [users.id] }),
  healthHistory: many(studentHealthHistory),
  notes: many(studentNotes),
  statusLog: many(studentStatusLog),
}));
