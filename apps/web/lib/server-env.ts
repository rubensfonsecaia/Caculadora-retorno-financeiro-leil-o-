import "server-only";
import { z } from "zod";

// Segredos: só no servidor. `import "server-only"` quebra o build se algum
// componente do navegador importar este arquivo.
const schema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().startsWith("price_").optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().startsWith("price_").optional(),
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  CRON_SECRET: z.string().min(16).optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;
export function serverEnv(): ServerEnv {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

/** Lê um segredo obrigatório para esta operação, com mensagem clara se faltar. */
export function requireEnv<K extends keyof ServerEnv>(k: K): NonNullable<ServerEnv[K]> {
  const v = serverEnv()[k];
  if (!v) throw new Error(`Variável de ambiente ausente: ${k}. Veja apps/web/.env.example.`);
  return v as NonNullable<ServerEnv[K]>;
}
