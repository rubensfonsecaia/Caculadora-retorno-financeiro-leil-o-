import type { TaxRegime } from "./schema";

// ATENÇÃO: alíquotas de referência, levantadas no recon a partir de fontes
// públicas (algumas antigas). Precisam de revisão de um contador antes de o
// produto ser vendido. Ver replica/recon.md, fontes 17 a 19.
export const TAX_TABLE_VERSION = "2026-10-ref";

/** Faixas do ganho de capital de pessoa física (Lei 13.259/2016). */
export const PF_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 5_000_000, rate: 0.15 },
  { upTo: 10_000_000, rate: 0.175 },
  { upTo: 30_000_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.225 },
];

/** Alíquota sobre a receita bruta, quando o regime tributa a receita. */
export const REVENUE_RATES: Record<"pj_presumido" | "pj_ret", number> = {
  // PIS 0,65% + COFINS 3% + IRPJ 15% × 8% + CSLL 9% × 12%; sem o adicional de IRPJ
  pj_presumido: 0.0593,
  // RET da incorporação com patrimônio de afetação (1% no MCMV, não modelado)
  pj_ret: 0.04,
};

export const TAX_LABELS: Record<TaxRegime, string> = {
  pf_ganho_capital: "Pessoa física: ganho de capital",
  pj_presumido: "Empresa: lucro presumido",
  pj_ret: "Empresa: RET",
  isento: "Sem imposto",
};

function pfTax(gain: number): number {
  if (gain <= 0) return 0;
  let tax = 0;
  let from = 0;
  for (const b of PF_BRACKETS) {
    const slice = Math.min(gain, b.upTo) - from;
    if (slice <= 0) break;
    tax += slice * b.rate;
    from = b.upTo;
  }
  return tax;
}

export interface TaxInput {
  regime: TaxRegime;
  /** substitui a alíquota padrão: no PF vira alíquota única sobre o ganho */
  rateOverride: number | null;
  grossRevenue: number;
  /** receita − corretagem − custo de aquisição e de obra documentados */
  gain: number;
}

export function computeTax(t: TaxInput): { amount: number; base: number; effectiveRate: number; basis: "gain" | "revenue" | "none" } {
  switch (t.regime) {
    case "isento":
      return { amount: 0, base: 0, effectiveRate: 0, basis: "none" };
    case "pf_ganho_capital": {
      const base = Math.max(0, t.gain);
      const amount = t.rateOverride != null ? base * t.rateOverride : pfTax(base);
      return { amount, base, effectiveRate: base > 0 ? amount / base : 0, basis: "gain" };
    }
    default: {
      const rate = t.rateOverride ?? REVENUE_RATES[t.regime];
      const base = Math.max(0, t.grossRevenue);
      return { amount: base * rate, base, effectiveRate: rate, basis: "revenue" };
    }
  }
}
