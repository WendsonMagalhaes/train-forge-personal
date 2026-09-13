"use server";

import { db } from "@/db";
import { plans, subscriptions, payments, students, users, invoices } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, asc, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addMonths, formatISO } from "date-fns";
import {
  getOrCreateCustomer,
  createCharge,
  getCharge,
  type AsaasBillingType,
} from "@/lib/payments/asaas";

async function requireTrainer() {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") throw new Error("Não autorizado");
  return session.user;
}

const MONTHS_BY_CYCLE: Record<string, number> = {
  monthly: 1, quarterly: 3, semiannual: 6, annual: 12,
};

// ---------- Planos ----------
// (sem alterações nesta fase)

const planSchema = z.object({
  name: z.string().min(2, "Informe o nome do plano"),
  price: z.string().min(1, "Informe o preço"),
  billingCycle: z.enum(["monthly", "quarterly", "semiannual", "annual", "single"]),
  sessionsIncluded: z.string().optional(),
});

export async function listPlans() {
  const trainer = await requireTrainer();
  return db.select().from(plans).where(eq(plans.trainerId, trainer.id)).orderBy(asc(plans.name));
}

export async function createPlan(formData: FormData) {
  const trainer = await requireTrainer();

  const parsed = planSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    billingCycle: formData.get("billingCycle"),
    sessionsIncluded: formData.get("sessionsIncluded") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const priceCents = Math.round(parseFloat(parsed.data.price.replace(",", ".")) * 100);
  if (Number.isNaN(priceCents) || priceCents <= 0) return { error: "Informe um preço válido" };

  await db.insert(plans).values({
    trainerId: trainer.id,
    name: parsed.data.name,
    priceCents,
    billingCycle: parsed.data.billingCycle,
    sessionsIncluded: parsed.data.sessionsIncluded ? Number(parsed.data.sessionsIncluded) : undefined,
  });

  revalidatePath("/dashboard/finance");
  return { success: true };
}

export async function deletePlan(planId: string) {
  const trainer = await requireTrainer();
  await db.delete(plans).where(and(eq(plans.id, planId), eq(plans.trainerId, trainer.id)));
  revalidatePath("/dashboard/finance");
}

// ---------- Assinaturas ----------
// (sem alterações nesta fase)

const subscriptionSchema = z.object({
  studentId: z.string().min(1, "Selecione um aluno"),
  planId: z.string().min(1, "Selecione um plano"),
});

export async function listSubscriptionsOverview() {
  const trainer = await requireTrainer();

  const rows = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      startedAt: subscriptions.startedAt,
      nextDueDate: subscriptions.nextDueDate,
      studentId: students.id,
      studentName: users.name,
      planId: plans.id,
      planName: plans.name,
      priceCents: plans.priceCents,
      billingCycle: plans.billingCycle,
    })
    .from(subscriptions)
    .innerJoin(students, eq(students.id, subscriptions.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(plans.trainerId, trainer.id))
    .orderBy(asc(subscriptions.nextDueDate));

  const result = [];
  for (const sub of rows) {
    const [pendingPayment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.subscriptionId, sub.id), eq(payments.status, "pending")))
      .orderBy(asc(payments.dueDate))
      .limit(1);

    const [latestPaidPayment] = await db
      .select({ id: payments.id, paidAt: payments.paidAt })
      .from(payments)
      .where(and(eq(payments.subscriptionId, sub.id), eq(payments.status, "paid")))
      .orderBy(desc(payments.paidAt))
      .limit(1);

    result.push({ ...sub, pendingPayment: pendingPayment ?? null, latestPaidPayment: latestPaidPayment ?? null });
  }
  return result;
}

export async function createSubscription(formData: FormData) {
  const trainer = await requireTrainer();

  const parsed = subscriptionSchema.safeParse({
    studentId: formData.get("studentId"),
    planId: formData.get("planId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, parsed.data.planId), eq(plans.trainerId, trainer.id)))
    .limit(1);
  if (!plan) return { error: "Plano não encontrado" };

  const todayStr = formatISO(new Date(), { representation: "date" });

  const [sub] = await db
    .insert(subscriptions)
    .values({ studentId: parsed.data.studentId, planId: plan.id, status: "active", startedAt: todayStr, nextDueDate: todayStr })
    .returning();

  await db.insert(payments).values({
    subscriptionId: sub.id,
    studentId: parsed.data.studentId,
    amountCents: plan.priceCents,
    status: "pending",
    dueDate: todayStr,
  });

  revalidatePath("/dashboard/finance");
  return { success: true };
}

export async function deleteSubscription(subscriptionId: string) {
  const trainer = await requireTrainer();

  const [owned] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(subscriptions.id, subscriptionId), eq(plans.trainerId, trainer.id)))
    .limit(1);
  if (!owned) return;

  await db.delete(subscriptions).where(eq(subscriptions.id, subscriptionId));
  revalidatePath("/dashboard/finance");
}

// ---------- Pagamentos: marcação manual (cash/other, continua igual) ----------

export async function markPaymentPaid(paymentId: string, method: "pix" | "credit_card" | "boleto" | "cash" | "other") {
  await requireTrainer();

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return { error: "Pagamento não encontrado" };

  await db.update(payments).set({ status: "paid", paidAt: new Date(), method }).where(eq(payments.id, paymentId));

  await advanceSubscriptionAfterPayment(paymentId);

  revalidatePath("/dashboard/finance");
  return { success: true };
}

/**
 * Lógica de renovação compartilhada entre a marcação manual e a confirmação
 * automática via webhook do gateway: avança a assinatura pro próximo
 * vencimento e já cria o próximo `payment` como pendente.
 */
async function advanceSubscriptionAfterPayment(paymentId: string) {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return;

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, payment.subscriptionId)).limit(1);
  if (!sub) return;

  const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId)).limit(1);
  const monthsToAdd = plan ? MONTHS_BY_CYCLE[plan.billingCycle] : undefined;

  if (plan && monthsToAdd) {
    const nextDueStr = formatISO(addMonths(new Date(sub.nextDueDate), monthsToAdd), { representation: "date" });
    await db.update(subscriptions).set({ status: "active", nextDueDate: nextDueStr }).where(eq(subscriptions.id, sub.id));

    const [nextPayment] = await db
      .insert(payments)
      .values({
        subscriptionId: sub.id,
        studentId: payment.studentId,
        amountCents: plan.priceCents,
        status: "pending",
        dueDate: nextDueStr,
      })
      .returning();

    // Se essa assinatura já usa cobrança via gateway (o pagamento anterior
    // tinha um gatewayChargeId), tenta gerar a próxima cobrança
    // automaticamente. Best-effort: se falhar (ex: CPF ainda não
    // cadastrado), o pagamento simplesmente fica pendente pra geração manual.
    if (payment.gatewayChargeId && payment.method && payment.method !== "cash" && payment.method !== "other") {
      try {
        await createGatewayCharge({ paymentId: nextPayment.id, method: payment.method as "pix" | "boleto" | "credit_card" });
      } catch {
        // silencioso — o personal pode gerar a cobrança manualmente depois
      }
    }
  } else {
    // pacote avulso (single) — sem próxima cobrança automática
    await db.update(subscriptions).set({ status: "active" }).where(eq(subscriptions.id, sub.id));
  }
}

// ---------- Pagamentos: cobrança real via Asaas ----------

const METHOD_TO_BILLING_TYPE: Record<"pix" | "boleto" | "credit_card", AsaasBillingType> = {
  pix: "PIX",
  boleto: "BOLETO",
  credit_card: "CREDIT_CARD",
};

const BILLING_TYPE_TO_METHOD: Record<string, "pix" | "boleto" | "credit_card" | "other"> = {
  PIX: "pix",
  BOLETO: "boleto",
  CREDIT_CARD: "credit_card",
};

const chargeSchema = z.object({
  paymentId: z.string().uuid(),
  method: z.enum(["pix", "boleto", "credit_card"]),
  cpf: z.string().optional(),
});

export type CreateGatewayChargeInput = z.infer<typeof chargeSchema>;

/**
 * Cria (ou reaproveita) o cliente no Asaas e gera uma cobrança real para um
 * `payment` pendente. Retorna o link de pagamento (invoiceUrl) para o
 * personal enviar ao aluno.
 */
export async function createGatewayCharge(input: CreateGatewayChargeInput) {
  const trainer = await requireTrainer();
  const parsed = chargeSchema.parse(input);

  const [payment] = await db.select().from(payments).where(eq(payments.id, parsed.paymentId)).limit(1);
  if (!payment) return { error: "Pagamento não encontrado" };

  const [studentRow] = await db
    .select({
      id: students.id,
      trainerId: students.trainerId,
      cpf: students.cpf,
      name: users.name,
      email: users.email,
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(eq(students.id, payment.studentId))
    .limit(1);

  if (!studentRow || studentRow.trainerId !== trainer.id) {
    return { error: "Aluno não encontrado ou não pertence a este personal." };
  }

  let cpf = studentRow.cpf;
  if (!cpf) {
    if (!parsed.cpf) {
      return { error: "CPF do aluno é obrigatório para gerar a primeira cobrança via gateway.", needsCpf: true };
    }
    cpf = parsed.cpf.replace(/\D/g, "");
    await db.update(students).set({ cpf }).where(eq(students.id, studentRow.id));
  }

  try {
    const customer = await getOrCreateCustomer({
      name: studentRow.name,
      email: studentRow.email || undefined,
      cpfCnpj: cpf,
      externalReference: studentRow.id,
    });

    const charge = await createCharge({
      customer: customer.id,
      billingType: METHOD_TO_BILLING_TYPE[parsed.method],
      value: payment.amountCents / 100,
      dueDate: payment.dueDate,
      description: `Cobrança Train Forge — vencimento ${payment.dueDate}`,
      externalReference: payment.id,
    });

    await db
      .update(payments)
      .set({ gatewayChargeId: charge.id, method: parsed.method })
      .where(eq(payments.id, payment.id));

    revalidatePath("/dashboard/finance");
    return { success: true, invoiceUrl: charge.invoiceUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao gerar cobrança no gateway." };
  }
}

// ---------- Webhook: confirmação automática de pagamento ----------

type Payment = typeof payments.$inferSelect;

/**
 * Normaliza um status vindo do Asaas (seja de evento de webhook, seja de
 * consulta direta via `getCharge`) e aplica no `payment` local. Único ponto
 * de verdade da reconciliação — reaproveitado tanto pelo webhook quanto pela
 * sincronização manual, então as duas vias nunca divergem no que consideram
 * "pago".
 */
async function applyGatewayPaymentStatus(
  payment: Payment,
  info: { status: string; billingType?: string; paymentDate?: string; confirmedDate?: string }
): Promise<{ updated: boolean; newStatus?: "paid" | "overdue" | "refunded" }> {
  const CONFIRMED = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"];
  const REFUNDED = ["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"];
  const OVERDUE = ["OVERDUE"];

  if (CONFIRMED.includes(info.status)) {
    if (payment.status === "paid") return { updated: false };

    const method = BILLING_TYPE_TO_METHOD[info.billingType ?? ""] ?? "other";
    const paidAtRaw = info.confirmedDate || info.paymentDate;
    const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();

    await db.update(payments).set({ status: "paid", paidAt, method }).where(eq(payments.id, payment.id));
    await advanceSubscriptionAfterPayment(payment.id);
    return { updated: true, newStatus: "paid" };
  }

  if (REFUNDED.includes(info.status)) {
    if (payment.status === "refunded") return { updated: false };
    await db.update(payments).set({ status: "refunded" }).where(eq(payments.id, payment.id));
    return { updated: true, newStatus: "refunded" };
  }

  if (OVERDUE.includes(info.status)) {
    if (payment.status === "overdue" || payment.status === "paid") return { updated: false };
    await db.update(payments).set({ status: "overdue" }).where(eq(payments.id, payment.id));
    return { updated: true, newStatus: "overdue" };
  }

  return { updated: false };
}

function revalidateFinancePaths(studentId: string) {
  revalidatePath("/dashboard/finance");
  revalidatePath(`/dashboard/students/${studentId}/finance`);
  revalidatePath("/portal/finance");
}

/** Eventos do Asaas que reconhecemos, mapeados pro "status" equivalente do payment na API deles. */
const WEBHOOK_EVENT_TO_STATUS: Record<string, string> = {
  PAYMENT_CONFIRMED: "CONFIRMED",
  PAYMENT_RECEIVED: "RECEIVED",
  PAYMENT_RECEIVED_IN_CASH: "RECEIVED_IN_CASH",
  PAYMENT_OVERDUE: "OVERDUE",
  PAYMENT_REFUNDED: "REFUNDED",
  PAYMENT_CHARGEBACK_REQUESTED: "CHARGEBACK_REQUESTED",
  PAYMENT_CHARGEBACK_DISPUTE: "CHARGEBACK_DISPUTE",
};

/**
 * Chamado pela rota de webhook (`/api/webhooks/payments`) quando o Asaas
 * notifica uma mudança de status de cobrança. Mantido aqui para
 * reaproveitar toda a lógica de renovação já existente.
 */
export async function handleAsaasWebhookEvent(
  eventType: string,
  chargePayload: { id: string; billingType?: string; paymentDate?: string; confirmedDate?: string }
) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.gatewayChargeId, chargePayload.id))
    .limit(1);

  if (!payment) {
    return { ignored: true, reason: "Cobrança não encontrada localmente." };
  }

  const mappedStatus = WEBHOOK_EVENT_TO_STATUS[eventType];
  if (!mappedStatus) {
    return { ignored: true, reason: `Evento ${eventType} não tratado.` };
  }

  const result = await applyGatewayPaymentStatus(payment, {
    status: mappedStatus,
    billingType: chargePayload.billingType,
    paymentDate: chargePayload.paymentDate,
    confirmedDate: chargePayload.confirmedDate,
  });

  if (!result.updated) {
    return { ignored: true, reason: "Sem mudança de status (já estava refletido no sistema)." };
  }

  revalidateFinancePaths(payment.studentId);
  return { updated: true, newStatus: result.newStatus };
}

/**
 * Reconciliação manual: consulta o status atual da cobrança direto na API do
 * Asaas e aplica no `payment` local. Serve de rede de segurança pro personal
 * quando o webhook ainda não está configurado no painel do Asaas, ou quando
 * uma notificação pontual não chegou.
 */
export async function syncGatewayCharge(paymentId: string) {
  const trainer = await requireTrainer();

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return { error: "Pagamento não encontrado." };
  if (!payment.gatewayChargeId) return { error: "Este pagamento não tem cobrança gerada no Asaas." };

  const [owned] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, payment.studentId), eq(students.trainerId, trainer.id)))
    .limit(1);
  if (!owned) return { error: "Aluno não encontrado ou não pertence a este personal." };

  try {
    const charge = await getCharge(payment.gatewayChargeId);
    const result = await applyGatewayPaymentStatus(payment, {
      status: charge.status,
      billingType: charge.billingType,
    });

    if (!result.updated) {
      return { success: true, message: "Nenhuma mudança — o status já está atualizado." };
    }

    revalidateFinancePaths(payment.studentId);

    const messageByStatus: Record<string, string> = {
      paid: "Pagamento confirmado no Asaas!",
      overdue: "Cobrança marcada como atrasada.",
      refunded: "Cobrança marcada como reembolsada.",
    };
    return { success: true, message: messageByStatus[result.newStatus ?? ""] ?? "Status atualizado." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao consultar o Asaas." };
  }
}

// ---------- Recibo / Nota ----------

const RECEIPT_YEAR = () => new Date().getFullYear();

/**
 * Garante que exista um registro de invoice (recibo) para um pagamento já
 * confirmado, gerando um número sequencial simples. O PDF em si é montado
 * sob demanda pela rota `/api/invoices/[paymentId]/pdf` — aqui só
 * garantimos o registro/numeração.
 */
export async function getOrCreateInvoiceForPayment(paymentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado.");

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment || payment.status !== "paid") {
    throw new Error("Pagamento não encontrado ou ainda não confirmado.");
  }

  const [studentRow] = await db
    .select({ trainerId: students.trainerId, userId: students.userId })
    .from(students)
    .where(eq(students.id, payment.studentId))
    .limit(1);
  if (!studentRow) throw new Error("Aluno não encontrado.");

  const isOwnerTrainer = session.user.role === "trainer" && session.user.id === studentRow.trainerId;
  const isOwnerStudent = session.user.role === "student" && session.user.id === studentRow.userId;
  if (!isOwnerTrainer && !isOwnerStudent) throw new Error("Não autorizado.");

  const [existing] = await db.select().from(invoices).where(eq(invoices.paymentId, paymentId)).limit(1);
  if (existing) return existing;

  const [{ value: seq }] = await db
    .select({ value: count() })
    .from(invoices)
    .innerJoin(payments, eq(payments.id, invoices.paymentId))
    .innerJoin(students, eq(students.id, payments.studentId))
    .where(eq(students.trainerId, studentRow.trainerId));

  const number = `REC-${RECEIPT_YEAR()}-${String(Number(seq) + 1).padStart(5, "0")}`;

  const [invoice] = await db.insert(invoices).values({ paymentId, number }).returning();
  return invoice;
}

// ---------- Histórico de cobranças por aluno ----------

async function fetchPaymentHistory(studentId: string) {
  return db
    .select({
      id: payments.id,
      amountCents: payments.amountCents,
      method: payments.method,
      status: payments.status,
      dueDate: payments.dueDate,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
      gatewayChargeId: payments.gatewayChargeId,
      planName: plans.name,
      billingCycle: plans.billingCycle,
    })
    .from(payments)
    .innerJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(payments.studentId, studentId))
    .orderBy(desc(payments.dueDate));
}

/** Todas as movimentações (pagamentos) de todos os alunos do personal — visão consolidada da página Financeiro. */
export async function listAllPaymentsHistory() {
  const trainer = await requireTrainer();

  return db
    .select({
      id: payments.id,
      amountCents: payments.amountCents,
      method: payments.method,
      status: payments.status,
      dueDate: payments.dueDate,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
      gatewayChargeId: payments.gatewayChargeId,
      studentId: students.id,
      studentName: users.name,
      planName: plans.name,
      billingCycle: plans.billingCycle,
    })
    .from(payments)
    .innerJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(students, eq(students.id, payments.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .where(eq(students.trainerId, trainer.id))
    .orderBy(desc(payments.dueDate));
}
export async function listPaymentHistoryForStudent(studentId: string) {
  const trainer = await requireTrainer();

  const [owned] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.trainerId, trainer.id)))
    .limit(1);
  if (!owned) throw new Error("Aluno não encontrado ou não pertence a este personal.");

  return fetchPaymentHistory(studentId);
}

/** Histórico de faturas do próprio aluno + assinatura vigente — usado no portal do aluno. */
export async function getMyPaymentHistory() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") throw new Error("Não autorizado");

  const [student] = await db.select().from(students).where(eq(students.userId, session.user.id)).limit(1);
  if (!student) throw new Error("Perfil de aluno não encontrado.");

  const [subscription] = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      nextDueDate: subscriptions.nextDueDate,
      planId: plans.id,
      planName: plans.name,
      priceCents: plans.priceCents,
      billingCycle: plans.billingCycle,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.studentId, student.id))
    .orderBy(desc(subscriptions.startedAt))
    .limit(1);

  const history = await fetchPaymentHistory(student.id);
  return { subscription: subscription ?? null, history };
}
