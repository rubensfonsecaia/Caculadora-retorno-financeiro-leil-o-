import "server-only";
import { serverEnv } from "@/lib/server-env";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Conta uma tentativa para `key` e diz se ainda está dentro de `max` por
 * `windowSeconds`. Sem a service role (desenvolvimento), não limita.
 */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  if (!serverEnv().SUPABASE_SERVICE_ROLE_KEY) return true;
  const { data, error } = await supabaseAdmin().rpc("hit_rate_limit", { p_key: key, p_window_seconds: windowSeconds, p_max: max });
  if (error) {
    console.error("rate_limit_error", error.code);
    return true; // falha aberta: não derruba o produto se a tabela der erro
  }
  return data === true;
}
