import type Stripe from "stripe";
import { stripe } from "@/lib/billing/stripe";
import { supabaseBillingStore } from "@/lib/billing/store";
import { handleStripeEvent } from "@/lib/billing/webhook";
import { sendEmail } from "@/lib/email";
import { requireEnv } from "@/lib/server-env";

export const runtime = "nodejs";

// Stripe → nós. Lê o corpo cru (a assinatura é sobre os bytes exatos),
// confere a assinatura e só então processa. 4xx = assinatura ruim (o Stripe
// não reenvia); 5xx = falha nossa (o Stripe reenvia, e o handler é idempotente).
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("assinatura ausente", { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return new Response("assinatura inválida", { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event, {
      store: supabaseBillingStore(),
      retrieveSubscription: (id) => stripe().subscriptions.retrieve(id),
      sendEmail,
    });
    return Response.json({ received: true, result });
  } catch (e) {
    console.error("stripe_webhook_error", event.type, event.id, (e as Error).message);
    return new Response("erro ao processar", { status: 500 });
  }
}
