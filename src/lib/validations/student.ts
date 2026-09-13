import { z } from "zod";

export const createStudentSchema = z.object({
  name: z.string().min(2, "Informe o nome completo"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  goals: z.array(z.string()).optional().default([]),
});

export const healthHistorySchema = z.object({
  hasInjuries: z.boolean().default(false),
  injuriesDetail: z.string().optional(),
  hasChronicConditions: z.boolean().default(false),
  chronicConditionsDetail: z.string().optional(),
  medications: z.string().optional(),
  medicalRestrictions: z.string().optional(),
  familyHistory: z.string().optional(),
  smoker: z.boolean().default(false),
  alcoholUse: z.string().optional(),
  sleepQuality: z.string().optional(),
  stressLevel: z.string().optional(),
  physicalActivityHistory: z.string().optional(),
  medicalClearance: z.boolean().default(false),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type HealthHistoryInput = z.infer<typeof healthHistorySchema>;
