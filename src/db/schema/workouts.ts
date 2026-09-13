import { pgTable, uuid, text, timestamp, integer, numeric, pgEnum, boolean, date, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { users } from "./users";

export const muscleGroupEnum = pgEnum("muscle_group", [
  "chest", "back", "shoulders", "biceps", "triceps", "legs", "glutes", "core", "cardio", "full_body",
]);

// Tipo de série/método de treino do bloco. Determina quantos exercícios o
// bloco comporta (ex: bi-set = 2, tri-set = 3) e se ele usa detalhamento
// série a série (pirâmides, drop-set, rest-pause, cluster...).
export const seriesTypeEnum = pgEnum("series_type", [
  "simples",
  "piramide_crescente",
  "piramide_decrescente",
  "biset",
  "triset",
  "superset",
  "dropset",
  "rest_pause",
  "cluster",
  "german_volume",
  "fst7",
  "circuito",
  "isometria",
]);

// Biblioteca de exercícios — compartilhada por todos os alunos de um trainer.
// Pode ser cadastrada manualmente ou importada de uma API externa de exercícios.
export const exercises = pgTable("exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  trainerId: uuid("trainer_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  muscleGroup: muscleGroupEnum("muscle_group").notNull(),
  // Nome específico do músculo/grupo, como veio da fonte (ex: "Glúteo médio") —
  // mais granular que o enum acima, usado só para exibição/filtro fino.
  muscleGroupDetail: text("muscle_group_detail"),
  secondaryMuscles: jsonb("secondary_muscles").$type<string[]>(),
  category: text("category"), // ex: "Lower Body"
  movementPattern: text("movement_pattern"), // ex: "Abdução"
  equipment: text("equipment"),
  videoUrl: text("video_url"), // gif/vídeo de execução
  imageUrl: text("image_url"),
  instructions: text("instructions"),
  source: text("source").default("custom").notNull(), // "custom" | "api"
  externalId: text("external_id"), // id na API de origem, usado pra evitar duplicar na importação
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("exercises_trainer_external_unique").on(table.trainerId, table.externalId),
]);

// Exercícios substitutos — pra cada exercício, o personal pode indicar um ou mais
// exercícios que trabalham os mesmos músculos e servem como alternativa (ex: falta
// de equipamento, lesão pontual, variação de estímulo). Relação direcional e simples:
// "exerciseId" tem "substituteExerciseId" como substituto (não implica o contrário
// automaticamente — o personal cadastra dos dois lados se quiser que seja mútuo).
export const exerciseSubstitutes = pgTable("exercise_substitutes", {
  id: uuid("id").defaultRandom().primaryKey(),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  substituteExerciseId: uuid("substitute_exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("exercise_substitutes_pair_unique").on(table.exerciseId, table.substituteExerciseId),
]);

// Ciclo de treino (meso/microciclo) — ex: "Bloco 1 - Hipertrofia (4 semanas)"
export const workoutCycles = pgTable("workout_cycles", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  goal: text("goal"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ficha de treino (ex: "Treino A - Peito/Tríceps") dentro de um ciclo
export const workoutPlans = pgTable("workout_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  cycleId: uuid("cycle_id").notNull().references(() => workoutCycles.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // "Treino A"
  weekdays: text("weekdays"), // csv simples: "mon,thu"
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Um bloco/slot dentro de uma ficha. Representa UM método de treino aplicado a
// um ou mais exercícios em sequência: série simples (1 exercício), bi-set/tri-set/
// superset/circuito (2+ exercícios executados em sequência a cada rodada), ou
// métodos avançados de um único exercício (pirâmide, drop-set, rest-pause,
// cluster, método alemão, FST-7, isometria) cujo detalhamento série a série
// fica em `workoutBlockExercises.setsDetail`.
export const workoutBlocks = pgTable("workout_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => workoutPlans.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").default(0),
  seriesType: seriesTypeEnum("series_type").notNull().default("simples"),
  // Nº de séries (série simples/bi-set/tri-set/superset/circuito) ou nº de
  // séries detalhadas (métodos avançados — calculado a partir do setsDetail).
  rounds: integer("rounds").notNull().default(1),
  restSeconds: integer("rest_seconds"), // descanso entre séries
  notes: text("notes"),
});

// Exercício prescrito dentro de um bloco. Um bloco "simples" tem 1 linha; um
// bi-set tem 2; um tri-set tem 3; um circuito pode ter várias.
export const workoutBlockExercises = pgTable("workout_block_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  blockId: uuid("block_id").notNull().references(() => workoutBlocks.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
  orderIndex: integer("order_index").default(0),
  reps: text("reps"), // "8-12" ou "AMRAP" — usado como padrão quando não há setsDetail
  loadKg: numeric("load_kg", { precision: 6, scale: 2 }),
  tempo: text("tempo"), // ex "2-0-2"
  holdSeconds: integer("hold_seconds"), // usado em isometria
  notes: text("notes"),
  // Detalhamento série a série — usado por pirâmides, drop-set, rest-pause,
  // cluster, método alemão e FST-7. Cada item é uma "linha" executada em
  // sequência: { setNumber, label?, reps?, loadKg?, restSeconds?, holdSeconds? }
  setsDetail: jsonb("sets_detail").$type<Array<{
    setNumber: number;
    label?: string;
    reps?: string;
    loadKg?: number;
    restSeconds?: number;
    holdSeconds?: number;
  }>>(),
});

export const exercisesRelations = relations(exercises, ({ many }) => ({
  blockExercises: many(workoutBlockExercises),
  substitutes: many(exerciseSubstitutes, { relationName: "substitutesFor" }),
  substituteOf: many(exerciseSubstitutes, { relationName: "substituteExercise" }),
}));

export const exerciseSubstitutesRelations = relations(exerciseSubstitutes, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseSubstitutes.exerciseId],
    references: [exercises.id],
    relationName: "substitutesFor",
  }),
  substitute: one(exercises, {
    fields: [exerciseSubstitutes.substituteExerciseId],
    references: [exercises.id],
    relationName: "substituteExercise",
  }),
}));

export const workoutCyclesRelations = relations(workoutCycles, ({ one, many }) => ({
  student: one(students, { fields: [workoutCycles.studentId], references: [students.id] }),
  plans: many(workoutPlans),
}));

export const workoutPlansRelations = relations(workoutPlans, ({ one, many }) => ({
  cycle: one(workoutCycles, { fields: [workoutPlans.cycleId], references: [workoutCycles.id] }),
  blocks: many(workoutBlocks),
}));

export const workoutBlocksRelations = relations(workoutBlocks, ({ one, many }) => ({
  plan: one(workoutPlans, { fields: [workoutBlocks.planId], references: [workoutPlans.id] }),
  exercises: many(workoutBlockExercises),
}));

export const workoutBlockExercisesRelations = relations(workoutBlockExercises, ({ one }) => ({
  block: one(workoutBlocks, { fields: [workoutBlockExercises.blockId], references: [workoutBlocks.id] }),
  exercise: one(exercises, { fields: [workoutBlockExercises.exerciseId], references: [exercises.id] }),
}));
