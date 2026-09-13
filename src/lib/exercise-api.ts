import type { MuscleGroup } from "@/lib/constants";

// Formato retornado por https://train-forge.vercel.app/api/exercicios
export type ExternalExercise = {
  id: number;
  nome: string;
  gif: string;
  descricao: string;
  grupoMuscularPrincipal: string;
  categoria: string;
  padraoMovimento: string;
  musculosSecundarios: string[];
};

export const EXTERNAL_EXERCISE_API_URL = "https://train-forge.vercel.app/api/exercicios";

/**
 * A API externa retorna nomes de grupo muscular bem granulares em português
 * (ex: "Glúteo médio", "Peitoral maior"). Aqui a gente bucketiza isso nas
 * categorias amplas que o sistema usa pra filtro (MUSCLE_GROUPS).
 */
const MUSCLE_GROUP_KEYWORDS: Array<{ group: MuscleGroup; keywords: string[] }> = [
  { group: "chest", keywords: ["peito", "peitoral"] },
  { group: "back", keywords: ["costas", "dorsal", "lombar", "trapézio", "trapezio"] },
  { group: "shoulders", keywords: ["ombro", "deltoide", "deltóide"] },
  { group: "biceps", keywords: ["bíceps", "biceps"] },
  { group: "triceps", keywords: ["tríceps", "triceps"] },
  { group: "glutes", keywords: ["glúteo", "gluteo"] },
  { group: "legs", keywords: ["quadríceps", "quadriceps", "posterior de coxa", "panturrilha", "coxa", "quadril", "perna", "adutor", "abdutor"] },
  { group: "core", keywords: ["abdômen", "abdomen", "abdominal", "core", "oblíquo", "obliquo"] },
  { group: "cardio", keywords: ["cardio", "cardiovascular"] },
];

export function mapToMuscleGroup(grupoMuscularPrincipal: string, categoria: string): MuscleGroup {
  const haystack = `${grupoMuscularPrincipal} ${categoria}`.toLowerCase();
  for (const { group, keywords } of MUSCLE_GROUP_KEYWORDS) {
    if (keywords.some((k) => haystack.includes(k))) return group;
  }
  if (categoria.toLowerCase().includes("full") || categoria.toLowerCase().includes("corpo")) return "full_body";
  return "full_body";
}

export async function fetchExternalExercises(): Promise<ExternalExercise[]> {
  const res = await fetch(EXTERNAL_EXERCISE_API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao buscar exercícios da API (status ${res.status})`);
  const json = await res.json();
  // A API passou a devolver um envelope { data: [...] } em vez do array direto.
  const list = Array.isArray(json) ? json : json?.data;
  if (!Array.isArray(list)) throw new Error("Resposta inesperada da API de exercícios");
  return list as ExternalExercise[];
}