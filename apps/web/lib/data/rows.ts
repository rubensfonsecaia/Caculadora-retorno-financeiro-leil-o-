import { compute, inputsSchema, type Inputs } from "@calc/core";
import { z } from "zod";
import type { CubValue, Profile, Project, ProjectStatus, Scenario, ShareLink } from "./types";

// Conversão entre as linhas do banco (snake_case, centavos, bps) e os tipos do
// app. Usado no navegador (leituras) e no servidor (escritas).

export function summarize(inputs: Inputs) {
  const r = compute(inputs);
  if (!r.ok) return { verdict: null, profitCents: null, totalCostCents: null, irrAmBps: null };
  return {
    verdict: r.verdict,
    profitCents: Math.round(r.profit * 100),
    totalCostCents: Math.round(r.totalCost * 100),
    irrAmBps: r.irrAm != null ? Math.round(r.irrAm * 10_000) : null,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function projectFromRow(r: any): Project {
  const parsed = inputsSchema.safeParse(r.inputs);
  const inputs = parsed.success ? parsed.data : (r.inputs as Inputs);
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    address: r.address ?? "",
    status: r.status as ProjectStatus,
    units: r.units,
    inputs,
    inputsVersion: r.inputs_version,
    // o resumo salvo pode faltar (seed, migração); recalcula com o mesmo motor
    ...(parsed.success ? summarize(inputs) : { verdict: r.verdict, profitCents: r.profit_cents, totalCostCents: r.total_cost_cents, irrAmBps: r.irr_am_bps }),
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function scenarioFromRow(r: any): Scenario {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    priceDeltaBps: r.price_delta_bps,
    costDeltaBps: r.cost_delta_bps,
    buildDeltaMonths: r.build_delta_months,
    sellDeltaMonths: r.sell_delta_months,
    sort: r.sort,
  };
}

export function profileFromRow(r: any, email: string): Profile {
  return {
    id: r.id,
    email,
    name: r.name ?? "",
    plan: r.plan,
    defaultTmaAmBps: r.default_tma_am_bps,
    defaultSelicAaBps: r.default_selic_aa_bps,
    defaultUf: r.default_uf,
    defaultTaxRegime: r.default_tax_regime,
    isAdmin: r.is_admin,
  };
}

export function cubFromRow(r: any): CubValue {
  return { uf: r.uf, standard: r.standard, refMonth: String(r.ref_month).slice(0, 7), valueM2Cents: Number(r.value_m2_cents), sourceUrl: r.source_url };
}

export function shareLinkFromRow(r: any): ShareLink {
  return { id: r.id, projectId: r.project_id, token: r.token, revokedAt: r.revoked_at, createdAt: r.created_at };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Validação das escritas (servidor). Mesmos limites do schema SQL.
export const projectPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    address: z.string().max(300),
    status: z.enum(["rascunho", "estudo", "em_obra", "vendido", "arquivado"]),
    units: z.number().int().min(1).max(50),
    inputs: inputsSchema,
  })
  .partial();

export const scenarioSchema = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  priceDeltaBps: z.number().int().min(-9000).max(9000),
  costDeltaBps: z.number().int().min(-9000).max(9000),
  buildDeltaMonths: z.number().int().min(-24).max(60),
  sellDeltaMonths: z.number().int().min(-24).max(60),
});

export const profilePatchSchema = z
  .object({
    name: z.string().trim().max(120),
    defaultTmaAmBps: z.number().int().min(0).max(10_000),
    defaultSelicAaBps: z.number().int().min(0).max(10_000),
    defaultUf: z.string().regex(/^[A-Z]{2}$/).nullable(),
    defaultTaxRegime: z.enum(["pf_ganho_capital", "pj_presumido", "pj_ret", "isento"]),
  })
  .partial();

export const cubRowsSchema = z
  .array(
    z.object({
      uf: z.string().regex(/^[A-Z]{2}$/),
      standard: z.string().min(2).max(12),
      refMonth: z.string().regex(/^\d{4}-\d{2}$/),
      valueM2Cents: z.number().int().positive().max(1e9),
      sourceUrl: z.string().url().max(500),
    }),
  )
  .min(1)
  .max(500);
