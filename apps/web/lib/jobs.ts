import "server-only";
import { stripe } from "@/lib/billing/stripe";
import { supabaseBillingStore } from "@/lib/billing/store";
import { syncSubscription } from "@/lib/billing/webhook";
import { sendEmail } from "@/lib/email";
import { cubStaleEmail } from "@/lib/email-templates";
import { serverEnv } from "@/lib/server-env";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Tenta de novo com espera crescente (0,5 s, 1 s, 2 s…). */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 500): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw last;
}

type JobResult = { status: "ok" | "partial" | "failed"; detail: Record<string, unknown> };

/** Item que falhou mesmo depois das tentativas: vai para job_runs como dead_letter. */
async function deadLetter(job: string, detail: Record<string, unknown>, error: unknown) {
  await supabaseAdmin().from("job_runs").insert({ job, status: "dead_letter", detail, error: String((error as Error)?.message ?? error).slice(0, 500) });
}

const UF_STANDARDS_TRACKED = ["R1-B", "R1-N", "R1-A"];

/** Mensal: avisa o admin quando o CUB de algum estado/padrão já usado está velho. */
async function cubStale(): Promise<JobResult> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("cub_values").select("uf, standard, ref_month");
  if (error) throw error;
  const latest = new Map<string, string>();
  for (const r of data) {
    const k = `${r.uf}|${r.standard}`;
    if (!latest.has(k) || latest.get(k)! < r.ref_month) latest.set(k, r.ref_month);
  }
  const limit = new Date();
  limit.setUTCMonth(limit.getUTCMonth() - 2);
  const cutoff = limit.toISOString().slice(0, 7);
  const stale = [...latest.entries()]
    .map(([k, m]) => ({ uf: k.split("|")[0]!, standard: k.split("|")[1]!, refMonth: m.slice(0, 7) }))
    .filter((x) => UF_STANDARDS_TRACKED.includes(x.standard) && x.refMonth < cutoff);
  const admin = serverEnv().ADMIN_EMAIL;
  if (stale.length && admin) await withRetry(() => sendEmail({ to: admin, ...cubStaleEmail(stale) }));
  return { status: "ok", detail: { tracked: latest.size, stale: stale.length, emailed: !!(stale.length && admin) } };
}

/** Diário: confere cada assinatura no Stripe e corrige o que um webhook perdido deixou errado. */
async function stripeReconcile(): Promise<JobResult> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("subscriptions").select("user_id, stripe_subscription_id").not("stripe_subscription_id", "is", null);
  if (error) throw error;
  const deps = { store: supabaseBillingStore(), retrieveSubscription: (id: string) => stripe().subscriptions.retrieve(id), sendEmail };
  let ok = 0;
  let failed = 0;
  for (const row of data) {
    try {
      const sub = await withRetry(() => stripe().subscriptions.retrieve(row.stripe_subscription_id));
      await syncSubscription(deps, sub, row.user_id);
      ok++;
    } catch (e) {
      failed++;
      await deadLetter("stripe-reconcile", { subscription: row.stripe_subscription_id }, e);
    }
  }
  return { status: failed ? (ok ? "partial" : "failed") : "ok", detail: { checked: data.length, ok, failed } };
}

/** Diário: apaga janelas antigas de rate limit. */
async function prune(): Promise<JobResult> {
  const { data, error } = await supabaseAdmin().rpc("prune_rate_limits");
  if (error) throw error;
  return { status: "ok", detail: { removed: data } };
}

export const JOBS = { "cub-stale": cubStale, "stripe-reconcile": stripeReconcile, prune } as const;
export type JobName = keyof typeof JOBS;

/** Roda um job e grava o resultado em job_runs (horários em UTC). */
export async function runJob(name: JobName): Promise<JobResult> {
  const db = supabaseAdmin();
  try {
    const r = await JOBS[name]();
    await db.from("job_runs").insert({ job: name, status: r.status, detail: r.detail });
    return r;
  } catch (e) {
    await db.from("job_runs").insert({ job: name, status: "failed", error: String((e as Error)?.message ?? e).slice(0, 500) });
    return { status: "failed", detail: {} };
  }
}
