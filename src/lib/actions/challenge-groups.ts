"use server";

import { db } from "@/db";
import {
  students, users, challengeGroups, challengeGroupMembers, challengeGroupMessages,
  challengeActivities, challengeActivityCompletions, challengeCheckins,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toDbText, toDbTextOrNull, toDisplayText } from "@/lib/text-case";

/** Pontos por check-in de academia. Atividades usam o valor definido pelo personal. */
const CHECKIN_POINTS = 1;

/** Data de hoje no fuso do Brasil (YYYY-MM-DD). O servidor roda em UTC, então não dá para usar new Date() direto. */
function todayBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function requireTrainer() {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") throw new Error("Não autorizado");
  return session.user.id;
}

async function requireStudent() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") throw new Error("Não autorizado");
  const [student] = await db.select().from(students).where(eq(students.userId, session.user.id)).limit(1);
  if (!student) throw new Error("Aluno não encontrado");
  return student;
}

async function requireOwnedGroup(trainerId: string, groupId: string) {
  const [group] = await db
    .select()
    .from(challengeGroups)
    .where(and(eq(challengeGroups.id, groupId), eq(challengeGroups.trainerId, trainerId)))
    .limit(1);
  if (!group) throw new Error("Grupo não encontrado");
  return group;
}

async function requireMembership(studentId: string, groupId: string) {
  const [group] = await db
    .select()
    .from(challengeGroups)
    .innerJoin(challengeGroupMembers, eq(challengeGroupMembers.groupId, challengeGroups.id))
    .where(and(eq(challengeGroups.id, groupId), eq(challengeGroupMembers.studentId, studentId)))
    .limit(1);
  if (!group) throw new Error("Você não participa deste grupo");
  return group.challenge_groups;
}

/** Ranking do grupo: pontos = soma das atividades concluídas + check-ins. */
async function buildRanking(groupId: string) {
  const members = await db
    .select({ studentId: challengeGroupMembers.studentId, name: users.name })
    .from(challengeGroupMembers)
    .innerJoin(students, eq(students.id, challengeGroupMembers.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .where(eq(challengeGroupMembers.groupId, groupId));

  const activities = await db
    .select({ id: challengeActivities.id, points: challengeActivities.points })
    .from(challengeActivities)
    .where(eq(challengeActivities.groupId, groupId));

  const completions = activities.length === 0 ? [] : await db
    .select({ activityId: challengeActivityCompletions.activityId, studentId: challengeActivityCompletions.studentId })
    .from(challengeActivityCompletions)
    .where(inArray(challengeActivityCompletions.activityId, activities.map((a) => a.id)));

  const checkins = await db
    .select({ studentId: challengeCheckins.studentId })
    .from(challengeCheckins)
    .where(eq(challengeCheckins.groupId, groupId));

  const pointsByActivity = new Map(activities.map((a) => [a.id, a.points]));

  return members
    .map((m) => {
      const done = completions.filter((c) => c.studentId === m.studentId);
      const checkinCount = checkins.filter((c) => c.studentId === m.studentId).length;
      const activityPoints = done.reduce((sum, c) => sum + (pointsByActivity.get(c.activityId) ?? 0), 0);
      return {
        studentId: m.studentId,
        name: toDisplayText(m.name),
        completions: done.length,
        checkins: checkinCount,
        points: activityPoints + checkinCount * CHECKIN_POINTS,
      };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "pt-BR"));
}

// ---------- Personal: grupos ----------

export async function listTrainerGroups() {
  const trainerId = await requireTrainer();
  const groups = await db
    .select()
    .from(challengeGroups)
    .where(eq(challengeGroups.trainerId, trainerId))
    .orderBy(asc(challengeGroups.name));
  if (groups.length === 0) return [];

  const members = await db
    .select({ groupId: challengeGroupMembers.groupId })
    .from(challengeGroupMembers)
    .where(inArray(challengeGroupMembers.groupId, groups.map((g) => g.id)));
  const activities = await db
    .select({ groupId: challengeActivities.groupId })
    .from(challengeActivities)
    .where(inArray(challengeActivities.groupId, groups.map((g) => g.id)));

  return groups.map((g) => ({
    id: g.id,
    name: toDisplayText(g.name),
    description: g.description ? toDisplayText(g.description) : null,
    memberCount: members.filter((m) => m.groupId === g.id).length,
    activityCount: activities.filter((a) => a.groupId === g.id).length,
  }));
}

const groupSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome para o grupo"),
  description: z.string().optional(),
});

export async function createChallengeGroup(formData: FormData) {
  const trainerId = await requireTrainer();
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [created] = await db
    .insert(challengeGroups)
    .values({
      trainerId,
      name: toDbText(parsed.data.name),
      description: toDbTextOrNull(parsed.data.description),
    })
    .returning({ id: challengeGroups.id });

  revalidatePath("/dashboard/grupos");
  return { success: true, id: created.id };
}

export async function deleteChallengeGroup(groupId: string) {
  const trainerId = await requireTrainer();
  await requireOwnedGroup(trainerId, groupId);
  await db.delete(challengeGroups).where(eq(challengeGroups.id, groupId));
  revalidatePath("/dashboard/grupos");
}

export async function getTrainerGroupDetail(groupId: string) {
  const trainerId = await requireTrainer();
  const group = await requireOwnedGroup(trainerId, groupId);

  const members = await db
    .select({ studentId: challengeGroupMembers.studentId, name: users.name })
    .from(challengeGroupMembers)
    .innerJoin(students, eq(students.id, challengeGroupMembers.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .where(eq(challengeGroupMembers.groupId, groupId));

  // Alunos do personal que ainda não estão no grupo (para o seletor de inclusão)
  const allStudents = await db
    .select({ id: students.id, name: users.name })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(eq(students.trainerId, trainerId));
  const memberIds = new Set(members.map((m) => m.studentId));

  const activities = await db
    .select()
    .from(challengeActivities)
    .where(eq(challengeActivities.groupId, groupId))
    .orderBy(desc(challengeActivities.createdAt));

  const completions = activities.length === 0 ? [] : await db
    .select({ activityId: challengeActivityCompletions.activityId })
    .from(challengeActivityCompletions)
    .where(inArray(challengeActivityCompletions.activityId, activities.map((a) => a.id)));

  const recentCheckins = await db
    .select({ studentId: challengeCheckins.studentId, checkinDate: challengeCheckins.checkinDate, checkedAt: challengeCheckins.checkedAt, name: users.name })
    .from(challengeCheckins)
    .innerJoin(students, eq(students.id, challengeCheckins.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .where(eq(challengeCheckins.groupId, groupId))
    .orderBy(desc(challengeCheckins.checkedAt))
    .limit(30);

  return {
    group: {
      id: group.id,
      name: toDisplayText(group.name),
      description: group.description ? toDisplayText(group.description) : null,
    },
    members: members
      .map((m) => ({ studentId: m.studentId, name: toDisplayText(m.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    availableStudents: allStudents
      .filter((s) => !memberIds.has(s.id))
      .map((s) => ({ id: s.id, name: toDisplayText(s.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    activities: activities.map((a) => ({
      id: a.id,
      title: toDisplayText(a.title),
      description: a.description ? toDisplayText(a.description) : null,
      points: a.points,
      dueDate: a.dueDate,
      completedCount: completions.filter((c) => c.activityId === a.id).length,
    })),
    ranking: await buildRanking(groupId),
    recentCheckins: recentCheckins.map((c) => ({
      name: toDisplayText(c.name),
      checkinDate: c.checkinDate,
      checkedAt: c.checkedAt,
    })),
  };
}

export async function addChallengeGroupMember(groupId: string, studentId: string) {
  const trainerId = await requireTrainer();
  await requireOwnedGroup(trainerId, groupId);

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.trainerId, trainerId)))
    .limit(1);
  if (!student) return { error: "Aluno não encontrado" };

  await db
    .insert(challengeGroupMembers)
    .values({ groupId, studentId })
    .onConflictDoNothing();

  revalidatePath(`/dashboard/grupos/${groupId}`);
  return { success: true };
}

export async function removeChallengeGroupMember(groupId: string, studentId: string) {
  const trainerId = await requireTrainer();
  await requireOwnedGroup(trainerId, groupId);
  await db
    .delete(challengeGroupMembers)
    .where(and(eq(challengeGroupMembers.groupId, groupId), eq(challengeGroupMembers.studentId, studentId)));
  revalidatePath(`/dashboard/grupos/${groupId}`);
}

const activitySchema = z.object({
  title: z.string().trim().min(2, "Informe o nome da atividade"),
  description: z.string().optional(),
  points: z.coerce.number().int().min(1, "Pontos mínimos: 1").max(100, "Pontos máximos: 100").default(1),
  dueDate: z.string().optional(),
});

export async function createChallengeActivity(groupId: string, formData: FormData) {
  const trainerId = await requireTrainer();
  await requireOwnedGroup(trainerId, groupId);

  const parsed = activitySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    points: formData.get("points") || 1,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(challengeActivities).values({
    groupId,
    title: toDbText(parsed.data.title),
    description: toDbTextOrNull(parsed.data.description),
    points: parsed.data.points,
    dueDate: parsed.data.dueDate || null,
  });

  revalidatePath(`/dashboard/grupos/${groupId}`);
  revalidatePath(`/portal/grupos/${groupId}`);
  return { success: true };
}

export async function deleteChallengeActivity(groupId: string, activityId: string) {
  const trainerId = await requireTrainer();
  await requireOwnedGroup(trainerId, groupId);
  await db
    .delete(challengeActivities)
    .where(and(eq(challengeActivities.id, activityId), eq(challengeActivities.groupId, groupId)));
  revalidatePath(`/dashboard/grupos/${groupId}`);
  revalidatePath(`/portal/grupos/${groupId}`);
}

// ---------- Chat do grupo (personal e alunos membros) ----------

async function requireGroupAccess(groupId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado");
  if (session.user.role === "trainer") {
    await requireOwnedGroup(session.user.id, groupId);
    return { userId: session.user.id };
  }
  if (session.user.role === "student") {
    const student = await requireStudent();
    await requireMembership(student.id, groupId);
    return { userId: session.user.id };
  }
  throw new Error("Não autorizado");
}

export async function listGroupMessages(groupId: string) {
  await requireGroupAccess(groupId);
  const rows = await db
    .select({
      id: challengeGroupMessages.id,
      senderId: challengeGroupMessages.senderId,
      content: challengeGroupMessages.content,
      createdAt: challengeGroupMessages.createdAt,
      senderName: users.name,
    })
    .from(challengeGroupMessages)
    .innerJoin(users, eq(users.id, challengeGroupMessages.senderId))
    .where(eq(challengeGroupMessages.groupId, groupId))
    .orderBy(asc(challengeGroupMessages.createdAt))
    .limit(200);

  return rows.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    senderName: toDisplayText(r.senderName),
    content: r.content,
    createdAt: r.createdAt,
    readAt: null,
  }));
}

export async function sendGroupMessage(groupId: string, content: string) {
  const { userId } = await requireGroupAccess(groupId);
  const text = content.trim();
  if (!text) return { error: "Escreva uma mensagem" };
  if (text.length > 2000) return { error: "Mensagem muito longa" };

  await db.insert(challengeGroupMessages).values({ groupId, senderId: userId, content: text });
  return { success: true };
}

// ---------- Aluno: grupos, atividades e check-in ----------

export async function listMyChallengeGroups() {
  const student = await requireStudent();
  const groups = await db
    .select({ id: challengeGroups.id, name: challengeGroups.name, description: challengeGroups.description })
    .from(challengeGroupMembers)
    .innerJoin(challengeGroups, eq(challengeGroups.id, challengeGroupMembers.groupId))
    .where(eq(challengeGroupMembers.studentId, student.id))
    .orderBy(asc(challengeGroups.name));

  if (groups.length === 0) return [];

  const ranking = await Promise.all(groups.map((g) => buildRanking(g.id)));
  return groups.map((g, i) => {
    const mine = ranking[i].find((r) => r.studentId === student.id);
    return {
      id: g.id,
      name: toDisplayText(g.name),
      description: g.description ? toDisplayText(g.description) : null,
      myPoints: mine?.points ?? 0,
      myPosition: ranking[i].findIndex((r) => r.studentId === student.id) + 1,
      memberCount: ranking[i].length,
    };
  });
}

export async function getMyGroupDetail(groupId: string) {
  const student = await requireStudent();
  const group = await requireMembership(student.id, groupId);

  const activities = await db
    .select()
    .from(challengeActivities)
    .where(eq(challengeActivities.groupId, groupId))
    .orderBy(asc(challengeActivities.createdAt));

  const completions = activities.length === 0 ? [] : await db
    .select({ activityId: challengeActivityCompletions.activityId, studentId: challengeActivityCompletions.studentId })
    .from(challengeActivityCompletions)
    .where(inArray(challengeActivityCompletions.activityId, activities.map((a) => a.id)));

  const today = todayBR();
  const [todayCheckin] = await db
    .select({ id: challengeCheckins.id })
    .from(challengeCheckins)
    .where(and(
      eq(challengeCheckins.groupId, groupId),
      eq(challengeCheckins.studentId, student.id),
      eq(challengeCheckins.checkinDate, today),
    ))
    .limit(1);

  const myCheckins = await db
    .select({ checkinDate: challengeCheckins.checkinDate })
    .from(challengeCheckins)
    .where(and(eq(challengeCheckins.groupId, groupId), eq(challengeCheckins.studentId, student.id)))
    .orderBy(desc(challengeCheckins.checkinDate));

  const ranking = await buildRanking(groupId);
  const myRow = ranking.find((r) => r.studentId === student.id);

  return {
    myStudentId: student.id,
    group: {
      id: group.id,
      name: toDisplayText(group.name),
      description: group.description ? toDisplayText(group.description) : null,
    },
    today,
    checkedInToday: Boolean(todayCheckin),
    myCheckinCount: myCheckins.length,
    myPoints: myRow?.points ?? 0,
    myPosition: ranking.findIndex((r) => r.studentId === student.id) + 1,
    activities: activities.map((a) => ({
      id: a.id,
      title: toDisplayText(a.title),
      description: a.description ? toDisplayText(a.description) : null,
      points: a.points,
      dueDate: a.dueDate,
      done: completions.some((c) => c.activityId === a.id && c.studentId === student.id),
      completedCount: completions.filter((c) => c.activityId === a.id).length,
    })),
    ranking: ranking.slice(0, 20),
    memberCount: ranking.length,
  };
}

export async function setMyActivityDone(groupId: string, activityId: string, done: boolean) {
  const student = await requireStudent();
  await requireMembership(student.id, groupId);

  const [activity] = await db
    .select({ id: challengeActivities.id })
    .from(challengeActivities)
    .where(and(eq(challengeActivities.id, activityId), eq(challengeActivities.groupId, groupId)))
    .limit(1);
  if (!activity) return { error: "Atividade não encontrada" };

  if (done) {
    await db
      .insert(challengeActivityCompletions)
      .values({ activityId, studentId: student.id })
      .onConflictDoNothing();
  } else {
    await db
      .delete(challengeActivityCompletions)
      .where(and(
        eq(challengeActivityCompletions.activityId, activityId),
        eq(challengeActivityCompletions.studentId, student.id),
      ));
  }

  revalidatePath(`/portal/grupos/${groupId}`);
  return { success: true };
}

export async function gymCheckin(groupId: string) {
  const student = await requireStudent();
  await requireMembership(student.id, groupId);

  const [row] = await db
    .insert(challengeCheckins)
    .values({ groupId, studentId: student.id, checkinDate: todayBR() })
    .onConflictDoNothing()
    .returning({ id: challengeCheckins.id });

  revalidatePath(`/portal/grupos/${groupId}`);
  return { success: true, alreadyDone: !row };
}
