export const USER_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "trainer", label: "Personal" },
  { value: "student", label: "Aluno" },
];

export const USER_ROLE_LABEL: Record<string, string> = Object.fromEntries(
  USER_ROLE_OPTIONS.map((o) => [o.value, o.label])
);

export const STUDENT_GOAL_OPTIONS = [
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "emagrecimento", label: "Emagrecimento" },
  { value: "condicionamento", label: "Condicionamento físico" },
  { value: "saude_geral", label: "Saúde geral" },
  { value: "reabilitacao", label: "Reabilitação / pós-lesão" },
  { value: "performance_esportiva", label: "Performance esportiva" },
  { value: "qualidade_de_vida", label: "Qualidade de vida" },
  { value: "estetica", label: "Estética" },
  { value: "forca", label: "Ganho de força" },
  { value: "flexibilidade", label: "Mobilidade e flexibilidade" },
];

export const MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "biceps", "triceps", "legs", "glutes", "core", "cardio", "full_body",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: "Peito", back: "Costas", shoulders: "Ombros", biceps: "Bíceps", triceps: "Tríceps",
  legs: "Pernas", glutes: "Glúteos", core: "Core", cardio: "Cardio", full_body: "Corpo inteiro",
};

// ---------- Tipos de série (métodos de treino) ----------

export const SERIES_TYPES = [
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
] as const;

export type SeriesType = (typeof SERIES_TYPES)[number];

export const SERIES_TYPE_OPTIONS: { value: SeriesType; label: string; description: string }[] = [
  { value: "simples", label: "Série simples", description: "X séries x Y repetições, carga fixa." },
  { value: "piramide_crescente", label: "Pirâmide crescente", description: "Carga aumenta e repetições diminuem a cada série." },
  { value: "piramide_decrescente", label: "Pirâmide decrescente", description: "Começa pesado e vai aliviando a carga a cada série." },
  { value: "biset", label: "Bi-set", description: "2 exercícios feitos em sequência, sem descanso entre eles." },
  { value: "triset", label: "Tri-set", description: "3 exercícios em sequência, sem descanso entre eles." },
  { value: "superset", label: "Superset", description: "2 a 4 exercícios em sequência (geralmente antagonistas)." },
  { value: "dropset", label: "Drop-set", description: "Reduz a carga progressivamente na mesma série, sem descanso, até a falha." },
  { value: "rest_pause", label: "Rest-pause", description: "Falha, descansa 10-15s, continua a mesma série." },
  { value: "cluster", label: "Cluster set", description: "Divide uma série em mini-blocos com pausas curtas." },
  { value: "german_volume", label: "Método alemão (GVT)", description: "10 séries x 10 repetições com carga fixa." },
  { value: "fst7", label: "FST-7", description: "7 séries do último exercício de um grupo muscular, descanso curto." },
  { value: "circuito", label: "Circuito", description: "Vários exercícios em sequência, pouco ou nenhum descanso." },
  { value: "isometria", label: "Isometria", description: "Tempo sob tensão em vez de repetições." },
];

export const SERIES_TYPE_LABEL: Record<SeriesType, string> = Object.fromEntries(
  SERIES_TYPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<SeriesType, string>;

// Quantos exercícios um bloco desse tipo de série comporta.
export const SERIES_TYPE_EXERCISE_COUNT: Record<SeriesType, { min: number; max: number }> = {
  simples: { min: 1, max: 1 },
  piramide_crescente: { min: 1, max: 1 },
  piramide_decrescente: { min: 1, max: 1 },
  dropset: { min: 1, max: 1 },
  rest_pause: { min: 1, max: 1 },
  cluster: { min: 1, max: 1 },
  german_volume: { min: 1, max: 1 },
  fst7: { min: 1, max: 1 },
  isometria: { min: 1, max: 1 },
  biset: { min: 2, max: 2 },
  triset: { min: 3, max: 3 },
  superset: { min: 2, max: 4 },
  circuito: { min: 2, max: 8 },
};

// Tipos de série cujas séries são detalhadas linha a linha (setsDetail) em vez
// de usar apenas "rounds x reps" fixo.
export const SERIES_TYPES_WITH_SET_DETAIL: SeriesType[] = [
  "piramide_crescente", "piramide_decrescente", "dropset", "rest_pause", "cluster", "german_volume", "fst7",
];

// Tipo de série cujo exercício é medido em tempo (segundos) em vez de repetições.
export const SERIES_TYPES_TIME_BASED: SeriesType[] = ["isometria"];

export const WEEKDAY_OPTIONS = [
  { value: "mon", label: "Seg" },
  { value: "tue", label: "Ter" },
  { value: "wed", label: "Qua" },
  { value: "thu", label: "Qui" },
  { value: "fri", label: "Sex" },
  { value: "sat", label: "Sáb" },
  { value: "sun", label: "Dom" },
];

export const SESSION_MODE_LABEL: Record<string, string> = {
  in_person: "Presencial",
  online: "Online",
};

export const SESSION_STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Concluída",
  missed: "Falta",
  rescheduled: "Reagendada",
  canceled: "Cancelada",
};

export const BILLING_CYCLE_OPTIONS = [
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
  { value: "single", label: "Pacote avulso" },
];

export const BILLING_CYCLE_LABEL: Record<string, string> = Object.fromEntries(
  BILLING_CYCLE_OPTIONS.map((o) => [o.value, o.label])
);

export const PAYMENT_METHOD_OPTIONS = [
  { value: "pix", label: "Pix" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "cash", label: "Dinheiro" },
  { value: "other", label: "Outro" },
];

export const PAYMENT_METHOD_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label])
);

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Atrasado",
  refunded: "Reembolsado",
};
