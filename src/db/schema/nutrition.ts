import { pgTable, uuid, text, timestamp, date, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { users } from "./users";

export const nutritionPlans = pgTable("nutrition_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  createdById: uuid("created_by_id").notNull().references(() => users.id), // personal ou nutricionista parceiro
  title: text("title").notNull(),
  targetCalories: numeric("target_calories", { precision: 6, scale: 0 }),
  targetProteinG: numeric("target_protein_g", { precision: 6, scale: 0 }),
  targetCarbsG: numeric("target_carbs_g", { precision: 6, scale: 0 }),
  targetFatG: numeric("target_fat_g", { precision: 6, scale: 0 }),
  guidelines: text("guidelines"), // orientações gerais em texto livre
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Registro opcional do que o aluno comeu (diário alimentar simples)
export const nutritionLogs = pgTable("nutrition_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
  meal: text("meal"), // café da manhã, almoço, jantar, lanche
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
});

// Nutricionista parceiro externo vinculado a um ou mais alunos
export const externalNutritionists = pgTable("external_nutritionists", {
  id: uuid("id").defaultRandom().primaryKey(),
  trainerId: uuid("trainer_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  crn: text("crn"), // registro profissional
  email: text("email"),
  phone: text("phone"),
});

export const nutritionPlansRelations = relations(nutritionPlans, ({ one }) => ({
  student: one(students, { fields: [nutritionPlans.studentId], references: [students.id] }),
}));
