import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// A senha provisória só existe em texto claro no momento do cadastro/reset.
// Para o personal conseguir repassá-la depois pelo WhatsApp, ela fica guardada
// CIFRADA (AES-256-GCM). A chave é derivada do AUTH_SECRET, então nunca vai
// para o cliente e não precisa de variável nova no ambiente.

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado");
  return createHash("sha256").update(`provisional-password:${secret}`).digest();
}

export function encryptProvisionalPassword(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString("base64")).join(".");
}

export function decryptProvisionalPassword(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
