import "server-only";
import { serverEnv } from "@/lib/server-env";

/**
 * E-mail transacional pela API do Resend, do domínio do usuário (EMAIL_FROM).
 * Sem RESEND_API_KEY (desenvolvimento), não envia e avisa no log.
 * Nunca registra o conteúdo nem o destinatário no log.
 */
export async function sendEmail(msg: { to: string; subject: string; text: string; html: string }): Promise<"sent" | "skipped"> {
  const { RESEND_API_KEY, EMAIL_FROM } = serverEnv();
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    console.warn("email_skipped: RESEND_API_KEY ou EMAIL_FROM ausente");
    return "skipped";
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
  });
  if (!res.ok) throw new Error(`resend_${res.status}`);
  return "sent";
}
