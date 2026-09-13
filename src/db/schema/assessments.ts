import { pgTable, uuid, text, timestamp, date, numeric, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";

export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  assessedAt: date("assessed_at").notNull(),
  weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
  heightCm: numeric("height_cm", { precision: 5, scale: 2 }),
  bodyFatPct: numeric("body_fat_pct", { precision: 4, scale: 1 }),
  muscleMassKg: numeric("muscle_mass_kg", { precision: 5, scale: 2 }),

  // circunferências (cm)
  waistCm: numeric("waist_cm", { precision: 5, scale: 1 }),
  hipCm: numeric("hip_cm", { precision: 5, scale: 1 }),
  chestCm: numeric("chest_cm", { precision: 5, scale: 1 }),
  armRightCm: numeric("arm_right_cm", { precision: 5, scale: 1 }),
  armLeftCm: numeric("arm_left_cm", { precision: 5, scale: 1 }),
  thighRightCm: numeric("thigh_right_cm", { precision: 5, scale: 1 }),
  thighLeftCm: numeric("thigh_left_cm", { precision: 5, scale: 1 }),

  // dobras cutâneas (mm) — protocolo Pollock 7 dobras (opcional, preencher as usadas)
  skinfoldTriceps: numeric("skinfold_triceps", { precision: 4, scale: 1 }),
  skinfoldSubscapular: numeric("skinfold_subscapular", { precision: 4, scale: 1 }),
  skinfoldSuprailiac: numeric("skinfold_suprailiac", { precision: 4, scale: 1 }),
  skinfoldAbdominal: numeric("skinfold_abdominal", { precision: 4, scale: 1 }),
  skinfoldThigh: numeric("skinfold_thigh", { precision: 4, scale: 1 }),
  skinfoldChest: numeric("skinfold_chest", { precision: 4, scale: 1 }),
  skinfoldMidaxillary: numeric("skinfold_midaxillary", { precision: 4, scale: 1 }),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assessmentPhotos = pgTable("assessment_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  angle: text("angle"), // front | side | back
  url: text("url").notNull(), // Vercel Blob URL
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const physicalTestTypeEnum = pgEnum("physical_test_type", [
  "strength", "flexibility", "endurance", "vo2max", "other",
]);

export const physicalTests = pgTable("physical_tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  testedAt: date("tested_at").notNull(),
  type: physicalTestTypeEnum("type").notNull(),
  name: text("name").notNull(), // ex: "Supino 1RM", "Teste de Cooper", "Sentar e alcançar"
  value: numeric("value", { precision: 8, scale: 2 }),
  unit: text("unit"), // kg, seg, cm, ml/kg/min
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  student: one(students, { fields: [assessments.studentId], references: [students.id] }),
  photos: many(assessmentPhotos),
}));
