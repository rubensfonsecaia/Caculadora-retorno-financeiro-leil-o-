import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { requireEnv } from "@/lib/server-env";

/** Cliente do servidor com a sessão do usuário (cookies http-only). A RLS vale. */
export async function supabaseServer(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // chamado de um Server Component: o middleware renova os cookies
        }
      },
    },
  });
}

/**
 * Service role: ignora a RLS. Só para webhook, jobs e exclusão de conta.
 * Nunca passe dados do usuário para cá sem conferir de quem são.
 */
export function supabaseAdmin(): SupabaseClient {
  return createClient(SUPABASE_URL, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Usuário da requisição, validado no servidor de auth (não só o cookie). */
export async function currentUser() {
  const db = await supabaseServer();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return { db, user: null };
  return { db, user: data.user };
}
