import { pgTable, uuid, text, timestamp, date, numeric, pgEnum, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { users } from "./users";

export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "quarterly", "semiannual", "annual", "single"]);

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  trainerId: uuid("trainer_id").notNull().references(() => users.id),
  name: text("name").notNull(), // "Mensal Individual", "Pacote Trimestral"
  priceCents: integer("price_cents").notNull(),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  sessionsIncluded: integer("sessions_included"), // null = ilimitado
  active: text("active").default("true"),
});

export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "canceled", "paused"]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => plans.id),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  startedAt: date("started_at").notNull(),
  nextDueDate: date("next_due_date").notNull(),
  canceledAt: date("canceled_at"),
});

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "overdue", "refunded"]);
export const paymentMethodEnum = pgEnum("payment_method", ["pix", "credit_card", "boleto", "cash", "other"]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id),
  amountCents: integer("amount_cents").notNull(),
  method: paymentMethodEnum("method"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  dueDate: date("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  // referência ao gateway (Asaas/Pagar.me) para reconciliação via webhook
  gatewayChargeId: text("gateway_charge_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  pdfUrl: text("pdf_url"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  subscription: one(subscriptions, { fields: [payments.subscriptionId], references: [subscriptions.id] }),
  student: one(students, { fields: [payments.studentId], references: [students.id] }),
  invoices: many(invoices),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  student: one(students, { fields: [subscriptions.studentId], references: [students.id] }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
  payments: many(payments),
}));
