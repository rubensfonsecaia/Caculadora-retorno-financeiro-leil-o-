import Stripe from "stripe";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Rotas de verdade (handlers do Next), com o banco e o envio trocados por dublês.
const handled: string[] = [];
vi.mock("@/lib/billing/store", () => ({ supabaseBillingStore: () => ({}) }));
vi.mock("@/lib/billing/webhook", () => ({
  handleStripeEvent: async (e: Stripe.Event) => {
    handled.push(e.id);
    return "handled";
  },
}));
vi.mock("@/lib/jobs", () => ({ JOBS: { prune: () => null }, runJob: async () => ({ status: "ok", detail: {} }) }));

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_segredo";
  process.env.CRON_SECRET = "segredo-do-cron-com-16+";
});

describe("POST /api/stripe/webhook", () => {
  const payload = JSON.stringify({ id: "evt_route", object: "event", type: "customer.subscription.updated", data: { object: {} } });
  const post = async (headers: Record<string, string>, body = payload) => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    return POST(new Request("http://x/api/stripe/webhook", { method: "POST", headers, body }));
  };

  it("400 sem cabeçalho de assinatura", async () => {
    expect((await post({})).status).toBe(400);
  });

  it("400 com assinatura inválida, sem processar", async () => {
    const res = await post({ "stripe-signature": "t=1,v1=abc" });
    expect(res.status).toBe(400);
    expect(handled).not.toContain("evt_route");
  });

  it("200 e processa com assinatura válida", async () => {
    const header = new Stripe("sk_test_fake").webhooks.generateTestHeaderString({ payload, secret: "whsec_test_segredo" });
    const res = await post({ "stripe-signature": header });
    expect(res.status).toBe(200);
    expect(handled).toContain("evt_route");
  });
});

describe("GET /api/cron/[job]", () => {
  const get = async (job: string, auth?: string) => {
    const { GET } = await import("@/app/api/cron/[job]/route");
    return GET(new Request(`http://x/api/cron/${job}`, { headers: auth ? { authorization: auth } : {} }), { params: Promise.resolve({ job }) });
  };
  it("401 sem o segredo", async () => {
    expect((await get("prune")).status).toBe(401);
    expect((await get("prune", "Bearer errado")).status).toBe(401);
  });
  it("404 para job desconhecido", async () => {
    expect((await get("nao-existe", "Bearer segredo-do-cron-com-16+")).status).toBe(404);
  });
  it("200 com o segredo certo", async () => {
    expect((await get("prune", "Bearer segredo-do-cron-com-16+")).status).toBe(200);
  });
});
