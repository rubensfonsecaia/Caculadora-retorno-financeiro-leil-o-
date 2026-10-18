import type Stripe from "stripe";
import { paymentFailedEmail } from "@/lib/email-templates";

// Lógica do webhook do Stripe, sem banco nem rede: tudo entra por `deps`.
// O status da assinatura mora no nosso banco, escrito só por aqui; o app lê
// de lá e nunca confia no navegador.

export const PAID: Stripe.Subscription.Status[] = ["active", "trialing"];

export interface SubscriptionRow {
  userId: string;
  customerId: string;
  subscriptionId: string;
  priceId: string | null;
  status: Stripe.Subscription.Status;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface BillingStore {
  hasEvent(id: string): Promise<boolean>;
  markEvent(id: string, type: string): Promise<void>;
  userIdForCustomer(customerId: string): Promise<string | null>;
  upsertSubscription(row: SubscriptionRow): Promise<void>;
  setPlan(userId: string, plan: "free" | "pro"): Promise<void>;
  emailForUser(userId: string): Promise<{ email: string; name: string } | null>;
}

export interface BillingDeps {
  store: BillingStore;
  retrieveSubscription(id: string): Promise<Stripe.Subscription>;
  sendEmail(msg: { to: string; subject: string; text: string; html: string }): Promise<unknown>;
}

const idOf = (x: string | { id: string } | null | undefined) => (typeof x === "string" ? x : (x?.id ?? null));

/** Fim do período atual: na API atual ele fica em cada item da assinatura. */
function periodEnd(sub: Stripe.Subscription): string | null {
  const ends = sub.items.data.map((i) => i.current_period_end).filter((n): n is number => typeof n === "number");
  return ends.length ? new Date(Math.max(...ends) * 1000).toISOString() : null;
}

export async function syncSubscription(deps: BillingDeps, sub: Stripe.Subscription, userIdHint?: string | null): Promise<boolean> {
  const customerId = idOf(sub.customer);
  if (!customerId) return false;
  const userId = userIdHint ?? sub.metadata?.user_id ?? (await deps.store.userIdForCustomer(customerId));
  if (!userId) return false;
  await deps.store.upsertSubscription({
    userId,
    customerId,
    subscriptionId: sub.id,
    priceId: sub.items.data[0]?.price?.id ?? null,
    status: sub.status,
    currentPeriodEnd: periodEnd(sub),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  });
  await deps.store.setPlan(userId, PAID.includes(sub.status) ? "pro" : "free");
  return true;
}

export type HandleResult = "duplicate" | "handled" | "ignored";

/**
 * Idempotente: um evento já registrado é ignorado, e cada efeito é um upsert
 * (repetir dá o mesmo resultado). O registro do evento vem depois do efeito,
 * para que uma falha no meio faça o Stripe reenviar em vez de perder o evento.
 */
export async function handleStripeEvent(event: Stripe.Event, deps: BillingDeps): Promise<HandleResult> {
  if (await deps.store.hasEvent(event.id)) return "duplicate";
  let handled = false;

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      const subId = idOf(s.subscription);
      if (s.mode === "subscription" && subId) {
        const sub = await deps.retrieveSubscription(subId);
        handled = await syncSubscription(deps, sub, s.client_reference_id ?? s.metadata?.user_id ?? null);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      handled = await syncSubscription(deps, event.data.object);
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object;
      const customerId = idOf(inv.customer);
      const userId = customerId ? await deps.store.userIdForCustomer(customerId) : null;
      const who = userId ? await deps.store.emailForUser(userId) : null;
      if (who) {
        await deps.sendEmail({ to: who.email, ...paymentFailedEmail(who.name) });
        handled = true;
      }
      break;
    }
  }

  await deps.store.markEvent(event.id, event.type);
  return handled ? "handled" : "ignored";
}
