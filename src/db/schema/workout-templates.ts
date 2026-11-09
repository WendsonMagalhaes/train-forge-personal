import { pgTable, uuid, text, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { exercises, seriesTypeEnum } from "./workouts";

// Modelo de treino ("treino pronto") criado pelo personal. Fica na biblioteca
// do personal e NÃO pertence a um aluno: quando é aplicado a uma ficha, os
// blocos são COPIADOS para a ficha, então editar o modelo depois não altera
// fichas já montadas.
export const workoutTemplates = pgTable("workout_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  trainerId: uuid("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // ex: "Tríceps", "Peito"
  // Grupos musculares trabalhados (rótulos exibidos, ex: ["Peito", "Tríceps"]).
  muscles: jsonb("muscles").$type<string[]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bloco dentro do modelo — mesma ideia de workoutBlocks (série simples, bi-set, etc.)
export const workoutTemplateBlocks = pgTable("workout_template_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").notNull().references(() => workoutTemplates.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").default(0),
  seriesType: seriesTypeEnum("series_type").notNull().default("simples"),
  rounds: integer("rounds").notNull().default(1),
  restSeconds: integer("rest_seconds"),
  notes: text("notes"),
});

// Exercício prescrito dentro de um bloco do modelo
export const workoutTemplateExercises = pgTable("workout_template_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateBlockId: uuid("template_block_id").notNull().references(() => workoutTemplateBlocks.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
  orderIndex: integer("order_index").default(0),
  reps: text("reps"),
  loadKg: numeric("load_kg", { precision: 6, scale: 2 }),
  tempo: text("tempo"),
  holdSeconds: integer("hold_seconds"),
  notes: text("notes"),
  setsDetail: jsonb("sets_detail").$type<Array<{
    setNumber: number;
    label?: string;
    reps?: string;
    loadKg?: number;
    restSeconds?: number;
    holdSeconds?: number;
  }>>(),
});

export const workoutTemplatesRelations = relations(workoutTemplates, ({ one, many }) => ({
  trainer: one(users, { fields: [workoutTemplates.trainerId], references: [users.id] }),
  blocks: many(workoutTemplateBlocks),
}));

export const workoutTemplateBlocksRelations = relations(workoutTemplateBlocks, ({ one, many }) => ({
  template: one(workoutTemplates, { fields: [workoutTemplateBlocks.templateId], references: [workoutTemplates.id] }),
  exercises: many(workoutTemplateExercises),
}));

export const workoutTemplateExercisesRelations = relations(workoutTemplateExercises, ({ one }) => ({
  block: one(workoutTemplateBlocks, { fields: [workoutTemplateExercises.templateBlockId], references: [workoutTemplateBlocks.id] }),
  exercise: one(exercises, { fields: [workoutTemplateExercises.exerciseId], references: [exercises.id] }),
}));
