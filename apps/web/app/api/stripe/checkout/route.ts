import { z } from "zod";
import { stripe } from "@/lib/billing/stripe";
import { SITE_URL } from "@/lib/env";
import { allow } from "@/lib/rate-limit";
import { requireEnv } from "@/lib/server-env";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const body = z.object({ interval: z.enum(["month", "year"]) });

// Assinar o Pro: cria (ou reaproveita) o cliente no Stripe e abre o Checkout
// hospedado. Nenhum dado de cartão passa por aqui.
export async function POST(req: Request) {
  const { user } = await currentUser();
  if (!user) return Response.json({ error: "not_authenticated" }, { status: 401 });
  if (!(await allow(`checkout:${user.id}`, 5, 600))) return Response.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  const price = parsed.data.interval === "year" ? requireEnv("STRIPE_PRICE_PRO_YEARLY") : requireEnv("STRIPE_PRICE_PRO_MONTHLY");
  const admin = supabaseAdmin();
  const { data: sub } = await admin.from("subscriptions").select("stripe_customer_id, status").eq("user_id", user.id).maybeSingle();
  if (sub && ["active", "trialing"].includes(sub.status)) return Response.json({ error: "already_subscribed" }, { status: 409 });

  let customer = sub?.stripe_customer_id as string | undefined;
  if (!customer) {
    const c = await stripe().customers.create({ email: user.email, metadata: { user_id: user.id } });
    customer = c.id;
    // guarda o vínculo já agora: o webhook acha o usuário pelo cliente
    const { error } = await admin.from("subscriptions").insert({ user_id: user.id, stripe_customer_id: customer, status: "incomplete" });
    if (error) return Response.json({ error: "db_error" }, { status: 500 });
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    locale: "pt-BR",
    success_url: `${SITE_URL}/planos?assinatura=ok`,
    cancel_url: `${SITE_URL}/planos`,
  });
  return Response.json({ url: session.url });
}
