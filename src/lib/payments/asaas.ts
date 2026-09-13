/**
 * Cliente mínimo para a API do Asaas (https://docs.asaas.com).
 *
 * Variáveis de ambiente necessárias:
 * - ASAAS_API_KEY      -> chave de API (sandbox ou produção)
 * - ASAAS_API_URL       -> opcional, default aponta pro sandbox
 * - ASAAS_WEBHOOK_TOKEN -> token configurado no painel do Asaas para
 *                          validar a origem dos webhooks recebidos
 */

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api-sandbox.asaas.com/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";

export type AsaasCustomer = {
  id: string;
  name: string;
  email?: string;
  cpfCnpj: string;
  externalReference?: string;
};

export type AsaasCharge = {
  id: string;
  status: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  invoiceUrl: string;
  externalReference?: string;
};

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!ASAAS_API_KEY) {
    throw new Error(
      "ASAAS_API_KEY não configurada. Defina a variável de ambiente para habilitar cobranças reais."
    );
  }

  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...(init?.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.errors?.[0]?.description || `Erro ao comunicar com o Asaas (HTTP ${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

/** Busca um cliente Asaas já criado para este aluno via externalReference (id do aluno no nosso banco). */
export async function findCustomerByExternalReference(
  externalReference: string
): Promise<AsaasCustomer | null> {
  const data = await asaasFetch<{ data: AsaasCustomer[] }>(
    `/customers?externalReference=${encodeURIComponent(externalReference)}`
  );
  return data.data?.[0] ?? null;
}

export async function createCustomer(input: {
  name: string;
  email?: string;
  cpfCnpj: string;
  externalReference: string;
}): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Reaproveita o cliente Asaas do aluno se já existir; cria um novo caso contrário. */
export async function getOrCreateCustomer(input: {
  name: string;
  email?: string;
  cpfCnpj: string;
  externalReference: string;
}): Promise<AsaasCustomer> {
  const existing = await findCustomerByExternalReference(input.externalReference);
  if (existing) return existing;
  return createCustomer(input);
}

export async function createCharge(input: {
  customer: string;
  billingType: AsaasBillingType;
  value: number; // em reais, ex: 250.00
  dueDate: string; // yyyy-mm-dd
  description?: string;
  externalReference?: string; // usamos o id do payment local aqui
}): Promise<AsaasCharge> {
  return asaasFetch<AsaasCharge>("/payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getCharge(chargeId: string): Promise<AsaasCharge> {
  return asaasFetch<AsaasCharge>(`/payments/${chargeId}`);
}

/** Valida o header enviado pelo Asaas nos webhooks contra o token configurado. */
export function isValidWebhookToken(receivedToken: string | null) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) return false; // sem token configurado -> nunca aceita (fail closed)
  return receivedToken === expected;
}
