import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleStripeEvent, type BillingDeps, type BillingStore, type SubscriptionRow } from "@/lib/billing/webhook";

// Banco em memória com o mesmo contrato do BillingStore real.
function memoryStore() {
  const events = new Map<string, string>();
  const subs = new Map<string, SubscriptionRow>();
  const plans = new Map<string, "free" | "pro">();
  const customers = new Map<string, string>([["cus_1", "user-1"]]);
  const store: BillingStore = {
    hasEvent: async (id) => events.has(id),
    markEvent: async (id, type) => void events.set(id, type),
    userIdForCustomer: async (c) => customers.get(c) ?? null,
    upsertSubscription: async (r) => void subs.set(r.userId, r),
    setPlan: async (u, p) => void plans.set(u, p),
    emailForUser: async (u) => (u === "user-1" ? { email: "pessoa@exemplo.invalid", name: "Ana" } : null),
  };
  return { store, events, subs, plans };
}

function sub(status: Stripe.Subscription.Status, extra: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_1",
    object: "subscription",
    customer: "cus_1",
    status,
    cancel_at_period_end: false,
    metadata: { user_id: "user-1" },
    items: { object: "list", data: [{ current_period_end: 1_800_000_000, price: { id: "price_m" } }], has_more: false, url: "" },
    ...extra,
  } as unknown as Stripe.Subscription;
}

function event<T extends Stripe.Event["type"]>(id: string, type: T, object: unknown): Stripe.Event {
  return { id, object: "event", type, data: { object } } as unknown as Stripe.Event;
}

let mem: ReturnType<typeof memoryStore>;
let deps: BillingDeps;
let sent: { to: string; subject: string }[];

beforeEach(() => {
  mem = memoryStore();
  sent = [];
  deps = {
    store: mem.store,
    retrieveSubscription: vi.fn(async () => sub("active")),
    sendEmail: async (m) => void sent.push({ to: m.to, subject: m.subject }),
  };
});

describe("webhook do Stripe", () => {
  it("checkout concluído busca a assinatura e libera o Pro", async () => {
    const r = await handleStripeEvent(event("evt_1", "checkout.session.completed", { mode: "subscription", subscription: "sub_1", client_reference_id: "user-1" }), deps);
    expect(r).toBe("handled");
    expect(deps.retrieveSubscription).toHaveBeenCalledWith("sub_1");
    expect(mem.plans.get("user-1")).toBe("pro");
    expect(mem.subs.get("user-1")).toMatchObject({ status: "active", priceId: "price_m", currentPeriodEnd: new Date(1_800_000_000_000).toISOString() });
  });

  it("evento repetido não faz nada (idempotência)", async () => {
    const e = event("evt_2", "customer.subscription.updated", sub("active"));
    expect(await handleStripeEvent(e, deps)).toBe("handled");
    mem.plans.set("user-1", "free"); // se reprocessasse, voltaria a "pro"
    expect(await handleStripeEvent(e, deps)).toBe("duplicate");
    expect(mem.plans.get("user-1")).toBe("free");
  });

  it("assinatura cancelada volta para o plano grátis", async () => {
    await handleStripeEvent(event("evt_3", "customer.subscription.deleted", sub("canceled")), deps);
    expect(mem.plans.get("user-1")).toBe("free");
    expect(mem.subs.get("user-1")?.status).toBe("canceled");
  });

  it("past_due não é pago: tira o Pro", async () => {
    await handleStripeEvent(event("evt_4", "customer.subscription.updated", sub("past_due")), deps);
    expect(mem.plans.get("user-1")).toBe("free");
  });

  it("acha o usuário pelo cliente quando a assinatura vem sem metadata", async () => {
    await handleStripeEvent(event("evt_5", "customer.subscription.created", sub("trialing", { metadata: {} })), deps);
    expect(mem.plans.get("user-1")).toBe("pro");
  });

  it("cliente desconhecido: ignora, mas registra o evento", async () => {
    const r = await handleStripeEvent(event("evt_6", "customer.subscription.updated", sub("active", { customer: "cus_x", metadata: {} })), deps);
    expect(r).toBe("ignored");
    expect(mem.events.has("evt_6")).toBe(true);
    expect(mem.plans.size).toBe(0);
  });

  it("pagamento falhou: avisa por e-mail uma vez", async () => {
    const e = event("evt_7", "invoice.payment_failed", { customer: "cus_1" });
    await handleStripeEvent(e, deps);
    await handleStripeEvent(e, deps);
    expect(sent).toEqual([{ to: "pessoa@exemplo.invalid", subject: "Não conseguimos cobrar sua assinatura" }]);
  });

  it("se o efeito falha, o evento não é registrado (o Stripe reenvia)", async () => {
    deps.store.setPlan = async () => {
      throw new Error("db fora");
    };
    await expect(handleStripeEvent(event("evt_8", "customer.subscription.updated", sub("active")), deps)).rejects.toThrow("db fora");
    expect(mem.events.has("evt_8")).toBe(false);
  });

  it("evento de outro tipo é ignorado e registrado", async () => {
    expect(await handleStripeEvent(event("evt_9", "charge.refunded", {}), deps)).toBe("ignored");
  });
});

describe("assinatura do webhook (biblioteca do Stripe, offline)", () => {
  const stripe = new Stripe("sk_test_fake");
  const secret = "whsec_test_segredo";
  const payload = JSON.stringify({ id: "evt_sig", object: "event", type: "customer.subscription.updated", data: { object: {} } });

  it("aceita assinatura válida", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(stripe.webhooks.constructEvent(payload, header, secret).id).toBe("evt_sig");
  });

  it("recusa corpo alterado", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(() => stripe.webhooks.constructEvent(payload.replace("evt_sig", "evt_falso"), header, secret)).toThrow();
  });

  it("recusa outro segredo", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_outro" });
    expect(() => stripe.webhooks.constructEvent(payload, header, secret)).toThrow();
  });

  it("recusa assinatura velha (replay)", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp: Math.floor(Date.now() / 1000) - 3600 });
    expect(() => stripe.webhooks.constructEvent(payload, header, secret)).toThrow();
  });
});
