import { toDisplayText } from "@/lib/text-case";

export const TRAINFORGE_URL = "https://trainforge.wdxsolutions.online/";

/**
 * Converte o telefone cadastrado para o formato do wa.me (DDI + DDD + número, só dígitos).
 * Sem DDI, assume Brasil (55). Devolve null se não der para montar um número válido.
 */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits.length >= 12 ? digits : null;
}

export function buildWelcomeMessage(args: { name: string; email: string; password: string }): string {
  const firstName = toDisplayText(args.name).split(" ")[0] || "aluno(a)";
  return [
    `Oi, ${firstName}! 💪`,
    ``,
    `Seja muito bem-vindo(a) ao *Train Forge*! 🎉`,
    `Aqui você acompanha os seus treinos do dia, registra a sua evolução e fica por dentro de tudo com o seu personal.`,
    ``,
    `*Para acessar pela primeira vez:*`,
    `🔗 Link: ${TRAINFORGE_URL}`,
    `📧 E-mail: ${args.email}`,
    `🔑 Senha provisória: ${args.password}`,
    ``,
    `No primeiro acesso o sistema vai pedir para você criar a sua senha pessoal. Guarde bem ela! 🔒`,
    ``,
    `📲 Dica: na tela de login, role até *Instalar o app no celular* e deixe o Train Forge na sua tela inicial.`,
    ``,
    `Bora treinar! 🏋️🔥`,
  ].join("\n");
}

export function buildWhatsappUrl(phone: string | null | undefined, message: string): string {
  const number = whatsappNumber(phone);
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}
