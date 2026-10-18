import { z } from "zod";

// Dinheiro em centavos (inteiro). Taxas em basis points (1% = 100).
const cents = z.number().int().min(0).max(1e13);
const bps = z.number().int().min(0).max(100_000);
const months = z.number().int().min(0).max(240);

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

export const CUB_STANDARDS = ["R1-B", "R1-N", "R1-A", "PP-4", "R8-N"] as const;

export const TAX_REGIMES = ["pf_ganho_capital", "pj_presumido", "pj_ret", "isento"] as const;
export type TaxRegime = (typeof TAX_REGIMES)[number];

export const landSchema = z.object({
  priceCents: cents,
  itbiBps: bps,
  deedBps: bps,
  registryBps: bps,
  buyBrokerageBps: bps,
  areaM2: z.number().min(0).max(1e7),
  otherCents: cents,
});

export const buildSchema = z.object({
  builtAreaM2: z.number().min(0).max(1e6),
  uf: z.enum(UFS),
  cubStandard: z.enum(CUB_STANDARDS),
  cubMode: z.enum(["auto", "manual"]),
  cubM2Cents: cents,
  cubRefMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
  realCostFactorBps: z.number().int().min(5_000).max(30_000), // 1,00x = 10.000
  permitsCents: cents, // projetos, alvará, habite-se: pagos no mês 0
  utilitiesCents: cents, // ligações de água, luz, esgoto
  extrasCents: cents, // muro, piscina, paisagismo
  bdiBps: bps,
  contingencyBps: bps,
});

export const scheduleSchema = z.object({
  buildMonths: z.number().int().min(1).max(120),
  spendCurve: z.enum(["linear", "s_curve", "manual"]),
  manualCurveBps: z.array(bps).max(120),
  monthsToSell: months,
});

export const financingSchema = z.object({
  financedBps: z.number().int().min(0).max(10_000), // % do custo da obra
  rateAaBps: bps,
  release: z.enum(["upfront", "per_measure"]),
  graceMonths: months, // meses em que os juros são capitalizados em vez de pagos
});

export const saleSchema = z.object({
  mode: z.enum(["total", "per_m2"]),
  priceCents: cents,
  priceM2Cents: cents,
  brokerageBps: bps,
  discountBps: z.number().int().min(0).max(9_000),
});

export const taxSchema = z.object({
  regime: z.enum(TAX_REGIMES),
  rateOverrideBps: bps.nullable(),
});

export const benchSchema = z.object({
  tmaAmBps: bps, // taxa mínima de atratividade, ao mês
  selicAaBps: bps,
});

export const inputsSchema = z.object({
  land: landSchema,
  build: buildSchema,
  schedule: scheduleSchema,
  financing: financingSchema,
  sale: saleSchema,
  tax: taxSchema,
  bench: benchSchema,
});

export type Inputs = z.infer<typeof inputsSchema>;
export const INPUTS_VERSION = 1;

/** Valores de partida de um estudo novo: uma casa de 140 m² num terreno de 250 m². */
export function defaultInputs(): Inputs {
  return {
    land: {
      priceCents: 28_000_000,
      itbiBps: 300,
      deedBps: 100,
      registryBps: 80,
      buyBrokerageBps: 0,
      areaM2: 250,
      otherCents: 0,
    },
    build: {
      builtAreaM2: 140,
      uf: "SP",
      cubStandard: "R1-N",
      cubMode: "manual",
      cubM2Cents: 250_000,
      cubRefMonth: null,
      realCostFactorBps: 12_000,
      permitsCents: 2_500_000,
      utilitiesCents: 800_000,
      extrasCents: 1_500_000,
      bdiBps: 0,
      contingencyBps: 1_000,
    },
    schedule: { buildMonths: 10, spendCurve: "s_curve", manualCurveBps: [], monthsToSell: 4 },
    financing: { financedBps: 0, rateAaBps: 1_200, release: "per_measure", graceMonths: 0 },
    sale: { mode: "total", priceCents: 120_000_000, priceM2Cents: 0, brokerageBps: 500, discountBps: 0 },
    tax: { regime: "pf_ganho_capital", rateOverrideBps: null },
    bench: { tmaAmBps: 100, selicAaBps: 1_500 },
  };
}
