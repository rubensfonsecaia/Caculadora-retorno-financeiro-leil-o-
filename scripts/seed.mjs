#!/usr/bin/env node
// Dados de desenvolvimento: 2 usuários de teste, 2 projetos cada, e uma tabela
// CUB FICTÍCIA (valores inventados, marcados como tal na fonte). Nada de pessoas
// reais. Recusa rodar fora de localhost sem --allow-remote.
//
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SEED_PASSWORD=... node scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_PASSWORD;
if (!url || !key || !password) {
  console.error("Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SEED_PASSWORD.");
  process.exit(1);
}
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1"].includes(host) && !process.argv.includes("--allow-remote")) {
  console.error(`Recusado: ${host} não é local. Use --allow-remote só num projeto de teste.`);
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const FICTITIOUS = "https://exemplo.invalid/cub-ficticio";
const cub = [
  ["SP", "R1-N", 245_000],
  ["SP", "R1-B", 205_000],
  ["MG", "R1-N", 228_000],
  ["PR", "R1-N", 236_000],
].map(([uf, standard, value]) => ({ uf, standard, ref_month: "2026-09-01", value_m2_cents: value, source_url: FICTITIOUS }));

function inputs(over = {}) {
  const base = {
    land: { priceCents: 28_000_000, itbiBps: 300, deedBps: 100, registryBps: 80, buyBrokerageBps: 0, areaM2: 250, otherCents: 0 },
    build: {
      builtAreaM2: 140, uf: "SP", cubStandard: "R1-N", cubMode: "manual", cubM2Cents: 250_000, cubRefMonth: null,
      realCostFactorBps: 12_000, permitsCents: 2_500_000, utilitiesCents: 800_000, extrasCents: 1_500_000, bdiBps: 0, contingencyBps: 1_000,
    },
    schedule: { buildMonths: 10, spendCurve: "s_curve", manualCurveBps: [], monthsToSell: 4 },
    financing: { financedBps: 0, rateAaBps: 1_200, release: "per_measure", graceMonths: 0 },
    sale: { mode: "total", priceCents: 120_000_000, priceM2Cents: 0, brokerageBps: 500, discountBps: 0 },
    tax: { regime: "pf_ganho_capital", rateOverrideBps: null },
    bench: { tmaAmBps: 100, selicAaBps: 1_500 },
  };
  return { ...base, ...over };
}

async function user(email, name) {
  const { data: list } = await db.auth.admin.listUsers();
  const found = list?.users.find((u) => u.email === email);
  if (found) return found.id;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) throw error;
  return data.user.id;
}

const { error: cubErr } = await db.from("cub_values").upsert(cub, { onConflict: "uf,standard,ref_month" });
if (cubErr) throw cubErr;

for (const [email, name] of [
  ["teste1@exemplo.invalid", "Pessoa Teste Um"],
  ["teste2@exemplo.invalid", "Pessoa Teste Dois"],
]) {
  const id = await user(email, name);
  const { count } = await db.from("projects").select("id", { count: "exact", head: true }).eq("user_id", id);
  if (count) continue;
  const { error } = await db.from("projects").insert([
    { user_id: id, name: "Sobrado 140 m² (teste)", inputs: inputs() },
    {
      user_id: id,
      name: "2 geminadas (teste)",
      units: 2,
      inputs: inputs({
        build: { ...inputs().build, builtAreaM2: 190, cubM2Cents: 230_000 },
        financing: { financedBps: 6_000, rateAaBps: 1_200, release: "per_measure", graceMonths: 0 },
        sale: { ...inputs().sale, priceCents: 108_000_000 },
      }),
    },
  ]);
  if (error) throw error;
  console.log("ok", email);
}
console.log("seed pronto (CUB fictício: fonte", FICTITIOUS + ")");
