import { pgTable, uuid, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { workoutPlans, workoutBlockExercises } from "./workouts";

// Um "treino feito" pelo aluno, referenciando a ficha prescrita
export const workoutLogs = pgTable("workout_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => workoutPlans.id),
  performedAt: timestamp("performed_at").defaultNow().notNull(),
  durationMinutes: integer("duration_minutes"),
  overallFeeling: text("overall_feeling"), // "leve" | "moderado" | "intenso" | "exausto"
  notes: text("notes"),
});

// Feedback/carga real por exercício (dentro de um bloco) do treino feito
export const workoutLogExercises = pgTable("workout_log_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  workoutLogId: uuid("workout_log_id").notNull().references(() => workoutLogs.id, { onDelete: "cascade" }),
  blockExerciseId: uuid("block_exercise_id").references(() => workoutBlockExercises.id),
  setsCompleted: integer("sets_completed"),
  repsCompleted: text("reps_completed"),
  loadKg: numeric("load_kg", { precision: 6, scale: 2 }), // carga real levantada (para progressão)
  difficultyRpe: integer("difficulty_rpe"), // escala de esforço percebido 1-10
  hadPain: boolean("had_pain").default(false),
  painDetail: text("pain_detail"),
  skipped: boolean("skipped").default(false),
});

export const workoutLogsRelations = relations(workoutLogs, ({ one, many }) => ({
  student: one(students, { fields: [workoutLogs.studentId], references: [students.id] }),
  plan: one(workoutPlans, { fields: [workoutLogs.planId], references: [workoutPlans.id] }),
  exerciseLogs: many(workoutLogExercises),
}));

export const workoutLogExercisesRelations = relations(workoutLogExercises, ({ one }) => ({
  log: one(workoutLogs, { fields: [workoutLogExercises.workoutLogId], references: [workoutLogs.id] }),
  blockExercise: one(workoutBlockExercises, { fields: [workoutLogExercises.blockExerciseId], references: [workoutBlockExercises.id] }),
}));
