import { stripe } from "@/lib/billing/stripe";
import { BACKEND, SITE_URL } from "@/lib/env";
import { allow } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/server-env";
import { currentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Portal do cliente do Stripe: trocar cartão, ver faturas e cancelar em um
// clique. Configure no painel do Stripe (Settings > Billing > Customer portal)
// com "cancelar" ligado.
export async function POST() {
  // BUG-003: sem Supabase/Stripe configurados, responde 503 em vez de quebrar
  if (BACKEND === "demo" || !serverEnv().STRIPE_SECRET_KEY) return Response.json({ error: "not_configured" }, { status: 503 });
  const { db, user } = await currentUser();
  if (!user) return Response.json({ error: "not_authenticated" }, { status: 401 });
  if (!(await allow(`portal:${user.id}`, 10, 600))) return Response.json({ error: "rate_limited" }, { status: 429 });
  const { data: sub } = await db.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return Response.json({ error: "no_customer" }, { status: 404 });
  const session = await stripe().billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${SITE_URL}/planos`, locale: "pt-BR" });
  return Response.json({ url: session.url });
}
