"use server";

import { db } from "@/db";
import { students, users, messages, notifications, educationalContent } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendEmail, renderNotificationEmail, appBaseUrl } from "@/lib/notifications/email";
import { sendPushToUser } from "@/lib/notifications/push";

async function requireTrainer() {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") throw new Error("Não autorizado");
  return session.user;
}

async function requireStudent() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") throw new Error("Não autorizado");
  const [student] = await db.select().from(students).where(eq(students.userId, session.user.id)).limit(1);
  if (!student) throw new Error("Perfil de aluno não encontrado");
  return student;
}

/**
 * Política de canais por tipo de notificação: além do sino in-app (sempre
 * criado), quais tipos também valem push e/ou e-mail. Mensagens de chat e
 * conteúdo educativo só valem push (in-app + e-mail a cada mensagem seria
 * spam); lembrete de sessão e cobrança valem os três canais, por serem
 * tempo-sensíveis e menos frequentes.
 */
const NOTIFICATION_CHANNELS: Record<(typeof notifications.$inferInsert)["type"], { email: boolean; push: boolean }> = {
  workout_reminder: { email: false, push: true },
  session_reminder: { email: true, push: true },
  payment_due: { email: true, push: true },
  message: { email: false, push: true },
  educational: { email: false, push: true },
  general: { email: false, push: false },
};

/**
 * Cria uma notificação in-app para um usuário e, conforme a política do
 * tipo, também dispara push e/ou e-mail. Reaproveitado por outros módulos
 * (ex.: lembrete de sessão). Best-effort: falha de push/e-mail nunca derruba
 * a notificação in-app (que já foi persistida antes).
 */
export async function notify(userId: string, input: { type: (typeof notifications.$inferInsert)["type"]; title: string; body?: string; link?: string }) {
  await db.insert(notifications).values({ userId, ...input });

  const channels = NOTIFICATION_CHANNELS[input.type];
  if (!channels?.email && !channels?.push) return;

  try {
    if (channels.push) {
      await sendPushToUser(userId, { title: input.title, body: input.body, url: input.link });
    }

    if (channels.email) {
      const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: input.title,
          text: input.body,
          html: renderNotificationEmail({
            title: input.title,
            body: input.body,
            ctaLabel: input.link ? "Abrir no Train Forge" : undefined,
            ctaUrl: input.link ? `${appBaseUrl()}${input.link}` : undefined,
          }),
        });
      }
    }
  } catch (err) {
    // Nunca deixa uma falha de push/e-mail quebrar o fluxo que chamou notify().
    console.error("[notify] erro ao enviar push/e-mail:", err);
  }
}

// ---------- Chat: lado do personal ----------

export async function listChatThreads() {
  const trainer = await requireTrainer();

  const rows = await db
    .select({
      studentId: students.id,
      studentName: users.name,
      status: students.status,
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(eq(students.trainerId, trainer.id))
    .orderBy(users.name);

  if (rows.length === 0) return [];

  // Última mensagem + não lidas por aluno (mensagens do aluno para o personal)
  const threads = await Promise.all(
    rows.map(async (r) => {
      const last = await db
        .select()
        .from(messages)
        .where(eq(messages.studentId, r.studentId))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      const unread = await db
        .select()
        .from(messages)
        .where(and(eq(messages.studentId, r.studentId), isNull(messages.readAt), ne(messages.senderId, trainer.id)));

      return {
        studentId: r.studentId,
        studentName: r.studentName,
        status: r.status,
        lastMessage: last[0]?.content ?? null,
        lastMessageAt: last[0]?.createdAt ?? null,
        unreadCount: unread.length,
      };
    })
  );

  return threads.sort((a, b) => {
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}

export async function listMessagesWithStudent(studentId: string) {
  const trainer = await requireTrainer();

  const [owned] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.trainerId, trainer.id)))
    .limit(1);
  if (!owned) throw new Error("Aluno não encontrado");

  return db.select().from(messages).where(eq(messages.studentId, studentId)).orderBy(messages.createdAt);
}

export async function sendMessageToStudent(studentId: string, content: string) {
  const trainer = await requireTrainer();
  if (!content.trim()) return { error: "Mensagem vazia." };

  const [owned] = await db
    .select({ userId: students.userId, name: users.name })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(and(eq(students.id, studentId), eq(students.trainerId, trainer.id)))
    .limit(1);
  if (!owned) return { error: "Aluno não encontrado." };

  await db.insert(messages).values({ studentId, senderId: trainer.id, content: content.trim() });
  await notify(owned.userId, {
    type: "message",
    title: `Nova mensagem de ${trainer.name ?? "seu personal"}`,
    body: content.trim().slice(0, 120),
    link: "/portal/chat",
  });

  revalidatePath("/dashboard/chat");
  return { success: true };
}

export async function markThreadReadByTrainer(studentId: string) {
  const trainer = await requireTrainer();
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.studentId, studentId), isNull(messages.readAt), ne(messages.senderId, trainer.id)));
  revalidatePath("/dashboard/chat");
}

// ---------- Chat: lado do aluno ----------

export async function listMyMessages() {
  const student = await requireStudent();
  return db.select().from(messages).where(eq(messages.studentId, student.id)).orderBy(messages.createdAt);
}

export async function sendMessageToTrainer(content: string) {
  const session = await auth();
  const student = await requireStudent();
  if (!content.trim()) return { error: "Mensagem vazia." };

  await db.insert(messages).values({ studentId: student.id, senderId: session!.user.id, content: content.trim() });
  await notify(student.trainerId, {
    type: "message",
    // Antes o título não identificava quem mandou a mensagem — o personal só
    // descobria clicando. Agora leva o nome do aluno e já linka pra thread certa.
    title: `Nova mensagem de ${session?.user?.name ?? "um aluno"}`,
    body: content.trim().slice(0, 120),
    link: `/dashboard/chat/${student.id}`,
  });

  revalidatePath("/portal/chat");
  return { success: true };
}

export async function markThreadReadByStudent() {
  const session = await auth();
  const student = await requireStudent();
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.studentId, student.id), isNull(messages.readAt), ne(messages.senderId, session!.user.id)));
  revalidatePath("/portal/chat");
}

// ---------- Notificações in-app (sino) ----------

export async function listMyNotifications() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado");
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
}

export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado");
  await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)));
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado");
  await db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false)));
}

// ---------- Conteúdo educativo ----------

export async function listEducationalContent() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado");

  const trainerId =
    session.user.role === "trainer"
      ? session.user.id
      : (await db.select({ trainerId: students.trainerId }).from(students).where(eq(students.userId, session.user.id)).limit(1))[0]?.trainerId;

  if (!trainerId) return [];

  return db.select().from(educationalContent).where(eq(educationalContent.trainerId, trainerId)).orderBy(desc(educationalContent.publishedAt));
}

export async function createEducationalContent(formData: FormData) {
  const trainer = await requireTrainer();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const mediaUrl = String(formData.get("mediaUrl") || "").trim();

  if (!title) return { error: "Título é obrigatório." };

  await db.insert(educationalContent).values({
    trainerId: trainer.id,
    title,
    body: body || null,
    mediaUrl: mediaUrl || null,
  });

  // Notifica todos os alunos ativos do personal sobre o novo conteúdo
  const activeStudents = await db
    .select({ userId: students.userId })
    .from(students)
    .where(and(eq(students.trainerId, trainer.id), eq(students.status, "active")));

  await Promise.all(
    activeStudents.map((s) =>
      notify(s.userId, { type: "educational", title: "Novo conteúdo do seu personal", body: title, link: "/portal/chat" })
    )
  );

  revalidatePath("/dashboard/chat");
  revalidatePath("/portal/chat");
  return { success: true };
}
