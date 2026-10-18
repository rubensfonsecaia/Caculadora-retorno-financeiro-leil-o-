import "server-only";
import Stripe from "stripe";
import { requireEnv } from "@/lib/server-env";

let client: Stripe | null = null;

/** Cliente Stripe com a chave do usuário (teste até o /replica-deploy). */
export function stripe(): Stripe {
  if (!client) client = new Stripe(requireEnv("STRIPE_SECRET_KEY"), { maxNetworkRetries: 2, appInfo: { name: "calculadora-construcao" } });
  return client;
}

export const PAID_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing"];
