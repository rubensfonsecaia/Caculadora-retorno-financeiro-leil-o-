import { compute, grossSale, type Result } from "./engine";
import { npv } from "./finance";
import { reaisToCents } from "./format";
import type { Inputs } from "./schema";

function npvWith(i: Inputs, rate: number): number | null {
  const r = compute(i);
  return r.ok ? npv(rate, r.flows) : null;
}

/** Busca binária num parâmetro monotônico: maior x em [lo, hi] com f(x) ≥ 0. */
function maxWhere(f: (x: number) => number | null, lo: number, hi: number): number | null {
  const flo = f(lo);
  if (flo == null || flo < 0) return null;
  if ((f(hi) ?? -1) >= 0) return hi;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if ((f(mid) ?? -1) >= 0) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Maior preço de terreno (R$) que ainda entrega `targetAm` ao mês
 * (VPL a essa taxa ≥ 0). Null se nem com terreno de graça dá.
 */
export function maxLandPrice(i: Inputs, targetAm: number): number | null {
  const ceiling = Math.max(grossSale(i), 1);
  return maxWhere(
    (price) => npvWith({ ...i, land: { ...i.land, priceCents: reaisToCents(price) } }, targetAm),
    0,
    ceiling,
  );
}

/** Menor preço de venda (R$, antes do desconto) com lucro ≥ 0. */
export function breakEvenSalePrice(i: Inputs): number | null {
  const profitAt = (price: number) => {
    const r = compute({ ...i, sale: { ...i.sale, mode: "total", priceCents: reaisToCents(price) } });
    return r.ok ? r.profit : null;
  };
  // lucro cresce com o preço; procura o menor preço com lucro ≥ 0
  let lo = 0.01;
  let hi = 1e6;
  while ((profitAt(hi) ?? -1) < 0 && hi < 1e12) hi *= 2;
  if ((profitAt(hi) ?? -1) < 0) return null;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if ((profitAt(mid) ?? -1) >= 0) hi = mid;
    else lo = mid;
  }
  return hi;
}

export interface ScenarioDelta {
  name: string;
  priceDeltaBps: number; // −500 = preço 5% menor
  costDeltaBps: number; // +1000 = obra 10% mais cara
  buildDeltaMonths: number;
  sellDeltaMonths: number;
}

export const DEFAULT_SCENARIOS: ScenarioDelta[] = [
  { name: "Esperado", priceDeltaBps: 0, costDeltaBps: 0, buildDeltaMonths: 0, sellDeltaMonths: 0 },
  { name: "Pessimista", priceDeltaBps: -500, costDeltaBps: 500, buildDeltaMonths: 1, sellDeltaMonths: 2 },
  { name: "Muito pessimista", priceDeltaBps: -1000, costDeltaBps: 1000, buildDeltaMonths: 2, sellDeltaMonths: 4 },
];

const scale = (cents: number, bps: number) => Math.max(0, Math.round(cents * (1 + bps / 10_000)));

export function applyScenario(i: Inputs, s: ScenarioDelta): Inputs {
  return {
    ...i,
    sale: { ...i.sale, priceCents: scale(i.sale.priceCents, s.priceDeltaBps), priceM2Cents: scale(i.sale.priceM2Cents, s.priceDeltaBps) },
    build: {
      ...i.build,
      cubM2Cents: scale(i.build.cubM2Cents, s.costDeltaBps),
      utilitiesCents: scale(i.build.utilitiesCents, s.costDeltaBps),
      extrasCents: scale(i.build.extrasCents, s.costDeltaBps),
    },
    schedule: {
      ...i.schedule,
      buildMonths: Math.max(1, i.schedule.buildMonths + s.buildDeltaMonths),
      monthsToSell: Math.max(0, i.schedule.monthsToSell + s.sellDeltaMonths),
      // a curva manual não sobrevive a mudança de prazo
      spendCurve: s.buildDeltaMonths !== 0 && i.schedule.spendCurve === "manual" ? "s_curve" : i.schedule.spendCurve,
    },
  };
}

export interface TornadoBar {
  label: string;
  low: number; // lucro com a variação desfavorável
  high: number; // lucro com a favorável
}

/** Quanto o lucro muda com ±10% de preço, ±10% de custo e ±3 meses de prazo de venda. */
export function tornado(i: Inputs, base: Result): TornadoBar[] {
  const p = (s: Partial<ScenarioDelta>) => {
    const r = compute(applyScenario(i, { name: "", priceDeltaBps: 0, costDeltaBps: 0, buildDeltaMonths: 0, sellDeltaMonths: 0, ...s }));
    return r.ok ? r.profit : base.profit;
  };
  return [
    { label: "Preço de venda ±10%", low: p({ priceDeltaBps: -1000 }), high: p({ priceDeltaBps: 1000 }) },
    { label: "Custo da obra ±10%", low: p({ costDeltaBps: 1000 }), high: p({ costDeltaBps: -1000 }) },
    { label: "Prazo de venda ±3 meses", low: p({ sellDeltaMonths: 3 }), high: p({ sellDeltaMonths: -3 }) },
  ].sort((a, b) => b.high - b.low - (a.high - a.low));
}
