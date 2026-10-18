import { stripe } from "@/lib/billing/stripe";
import { SITE_URL } from "@/lib/env";
import { allow } from "@/lib/rate-limit";
import { currentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Portal do cliente do Stripe: trocar cartão, ver faturas e cancelar em um
// clique. Configure no painel do Stripe (Settings > Billing > Customer portal)
// com "cancelar" ligado.
export async function POST() {
  const { db, user } = await currentUser();
  if (!user) return Response.json({ error: "not_authenticated" }, { status: 401 });
  if (!(await allow(`portal:${user.id}`, 10, 600))) return Response.json({ error: "rate_limited" }, { status: 429 });
  const { data: sub } = await db.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return Response.json({ error: "no_customer" }, { status: 404 });
  const session = await stripe().billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${SITE_URL}/planos`, locale: "pt-BR" });
  return Response.json({ url: session.url });
}
