import { describe, expect, it } from "vitest";
import {
  aaToAm,
  applyScenario,
  breakEvenSalePrice,
  compute,
  computeTax,
  DEFAULT_SCENARIOS,
  defaultInputs,
  formatBRL,
  formatBRLShort,
  formatPct,
  inputsSchema,
  irr,
  maxLandPrice,
  npv,
  parseBR,
  spendWeights,
  type Inputs,
  type Result,
} from "../src";

function ok(i: Inputs): Result {
  const r = compute(i);
  if (!r.ok) throw new Error("incompleto: " + r.missing.join(","));
  return r;
}

/** Caso feito à mão: terreno 100 mil, obra 100 mil em 2 meses, venda 300 mil no mês 2. */
function simple(): Inputs {
  const i = defaultInputs();
  i.land = { priceCents: 10_000_000, itbiBps: 0, deedBps: 0, registryBps: 0, buyBrokerageBps: 0, areaM2: 200, otherCents: 0 };
  i.build = {
    ...i.build,
    builtAreaM2: 100,
    cubM2Cents: 100_000,
    realCostFactorBps: 10_000,
    permitsCents: 0,
    utilitiesCents: 0,
    extrasCents: 0,
    bdiBps: 0,
    contingencyBps: 0,
  };
  i.schedule = { buildMonths: 2, spendCurve: "linear", manualCurveBps: [], monthsToSell: 0 };
  i.financing = { financedBps: 0, rateAaBps: 1_200, release: "per_measure", graceMonths: 0 };
  i.sale = { mode: "total", priceCents: 30_000_000, priceM2Cents: 0, brokerageBps: 0, discountBps: 0 };
  i.tax = { regime: "isento", rateOverrideBps: null };
  return i;
}

describe("parseBR / formatação", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["1234,56", 1234.56],
    ["1234.56", 1234.56],
    ["1.234", 1234],
    ["1.234.567", 1234567],
    ["R$ 280.000,00", 280000],
    ["12,5%", 12.5],
    ["0,5", 0.5],
    ["−1.000", -1000],
  ])("%s → %s", (raw, n) => expect(parseBR(raw)).toBeCloseTo(n, 6));

  it.each(["", "abc", "1,2,3x", "-"])("%s → null", (raw) => expect(parseBR(raw)).toBeNull());

  it("formata em pt-BR com sinal de menos tipográfico", () => {
    expect(formatBRL(182300)).toBe("R$ 182.300");
    expect(formatBRL(-12400)).toBe("−R$ 12.400");
    expect(formatBRLShort(1_250_000)).toBe("R$ 1,25 mi");
    expect(formatBRLShort(182_300)).toBe("R$ 182 mil");
    expect(formatPct(0.021)).toBe("2,10%");
  });
});

describe("matemática financeira", () => {
  it("converte taxa anual em mensal por juros compostos, não dividindo por 12", () => {
    expect(aaToAm(0.12)).toBeCloseTo(0.0094888, 6);
  });

  it("acha a TIR de fluxos simples", () => {
    expect(irr([-100, 110])).toBeCloseTo(0.1, 9);
    expect(irr([-1000, 0, 0, 1331])).toBeCloseTo(0.1, 9);
    expect(irr([-100, -50, 250])).toBeCloseTo((-50 + Math.sqrt(2500 + 100_000)) / 200 - 1, 9);
  });

  it("devolve null sem troca de sinal ou com mais de uma raiz", () => {
    expect(irr([100, 50])).toBeNull();
    expect(irr([-100, -5])).toBeNull();
    expect(irr([-100, 230, -132])).toBeNull(); // raízes em 10% e 20%
  });

  it("bate com a TIR por Newton da calculadora de leilão quando há uma raiz só", () => {
    // mesmo algoritmo de calcularTIR() do index.html, para conferir o porte
    function newton(f: number[]): number {
      let t = 0.02;
      for (let it = 0; it < 100; it++) {
        let v = 0, d = 0;
        for (let k = 0; k < f.length; k++) {
          const fat = Math.pow(1 + t, k);
          v += f[k]! / fat;
          if (k > 0) d -= (k * f[k]!) / (fat * (1 + t));
        }
        const n = t - v / d;
        if (Math.abs(n - t) < 1e-10) return n;
        t = n;
      }
      return t;
    }
    const flows = [-350_000, -2_100, -2_100, -2_100, -2_100, -2_100, 455_000];
    expect(irr(flows)!).toBeCloseTo(newton(flows), 8);
  });
});

describe("motor: caso feito à mão", () => {
  it("monta o fluxo mês a mês", () => {
    const r = ok(simple());
    expect(r.flows).toEqual([-100_000, -50_000, 250_000]);
    expect(r.profit).toBeCloseTo(100_000, 6);
    expect(r.maxExposure).toBeCloseTo(150_000, 6);
    expect(r.roi).toBeCloseTo(100_000 / 150_000, 9);
    expect(r.margin).toBeCloseTo(1 / 3, 9);
    expect(r.moic).toBeCloseTo(250_000 / 150_000, 9);
    expect(r.payback).toBe(2);
    expect(r.irrAm).toBeCloseTo((-50 + Math.sqrt(2500 + 100_000)) / 200 - 1, 9);
    expect(r.verdict).toBe("viavel");
  });

  it("PF paga 15% sobre venda − corretagem − terreno − obra", () => {
    const i = simple();
    i.tax.regime = "pf_ganho_capital";
    i.sale.brokerageBps = 500; // 15 mil
    const r = ok(i);
    expect(r.costs.tax).toBeCloseTo((300_000 - 15_000 - 100_000 - 100_000) * 0.15, 6);
    expect(r.profit).toBeCloseTo(85_000 - 12_750, 6);
  });

  it("RET cobra 4% sobre a receita bruta; alíquota pode ser trocada", () => {
    const i = simple();
    i.tax.regime = "pj_ret";
    expect(ok(i).costs.tax).toBeCloseTo(12_000, 6);
    i.tax.rateOverrideBps = 100;
    expect(ok(i).costs.tax).toBeCloseTo(3_000, 6);
  });

  it("faixas do ganho de capital acima de R$ 5 mi", () => {
    const t = computeTax({ regime: "pf_ganho_capital", rateOverride: null, grossRevenue: 0, gain: 6_000_000 });
    expect(t.amount).toBeCloseTo(5_000_000 * 0.15 + 1_000_000 * 0.175, 6);
  });

  it("financiamento por medição: juros sobre o saldo e quitação na venda", () => {
    const i = simple();
    i.financing = { financedBps: 5_000, rateAaBps: 1_200, release: "per_measure", graceMonths: 0 };
    const r = ok(i);
    const rm = aaToAm(0.12);
    expect(r.flows[0]).toBeCloseTo(-100_000, 6);
    expect(r.flows[1]).toBeCloseTo(-25_000, 6);
    expect(r.flows[2]).toBeCloseTo(-50_000 + 25_000 - 25_000 * rm - 50_000 + 300_000, 6);
    expect(r.costs.interest).toBeCloseTo(25_000 * rm, 6);
    expect(r.profit).toBeCloseTo(100_000 - 25_000 * rm, 6);
    expect(r.loanPeak).toBeCloseTo(50_000, 6);
  });

  it("carência capitaliza os juros em vez de pagar", () => {
    const i = simple();
    i.schedule.monthsToSell = 2;
    i.financing = { financedBps: 10_000, rateAaBps: 1_200, release: "upfront", graceMonths: 4 };
    const r = ok(i);
    const rm = aaToAm(0.12);
    // libera 100 mil no mês 1, juros dos meses 2..4 entram no saldo
    for (let m = 1; m < r.saleMonth; m++) expect(r.months[m]!.financing).toBeCloseTo(m === 1 ? 100_000 : 0, 6);
    expect(r.costs.interest).toBeCloseTo(100_000 * (Math.pow(1 + rm, 3) - 1), 4);
  });

  it("custos de projeto vão no mês 0 com BDI e contingência", () => {
    const i = simple();
    i.build.permitsCents = 1_000_000; // 10 mil
    i.build.contingencyBps = 1_000;
    const r = ok(i);
    expect(r.months[0]!.build).toBeCloseTo(-11_000, 6);
    expect(r.build.total).toBeCloseTo(110_000 * 1.1, 6);
    const totalBuild = r.months.reduce((a, m) => a + m.build, 0);
    expect(totalBuild).toBeCloseTo(-r.build.total, 6);
  });

  it("veredito: marginal quando dá lucro mas rende menos que a TMA", () => {
    const i = simple();
    i.sale.priceCents = 20_500_000; // lucro de 5 mil em 2 meses
    i.bench.tmaAmBps = 500;
    expect(ok(i).verdict).toBe("marginal");
    i.sale.priceCents = 19_000_000;
    expect(ok(i).verdict).toBe("inviavel");
  });

  it("avisa o que falta em vez de calcular com zero", () => {
    const i = simple();
    i.sale.priceCents = 0;
    i.build.builtAreaM2 = 0;
    const r = compute(i);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(["salePrice", "builtArea"]);
  });
});

describe("curva de desembolso", () => {
  it.each(["linear", "s_curve"] as const)("%s soma 1", (c) => {
    const w = spendWeights(c, 10, []);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
  it("curva S é simétrica e mais pesada no meio", () => {
    const w = spendWeights("s_curve", 6, []);
    expect(w[0]).toBeCloseTo(w[5]!, 12);
    expect(w[2]!).toBeGreaterThan(w[0]!);
  });
  it("manual com tamanho errado cai para linear", () => {
    expect(spendWeights("manual", 3, [5000, 5000])).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });
});

describe("resolvedores", () => {
  it("preço máximo do terreno zera o VPL na taxa alvo", () => {
    const i = simple();
    const p = maxLandPrice(i, 0.02)!;
    const r = ok({ ...i, land: { ...i.land, priceCents: Math.round(p * 100) } });
    expect(npv(0.02, r.flows)).toBeGreaterThanOrEqual(-1);
    const r2 = ok({ ...i, land: { ...i.land, priceCents: Math.round(p * 100) + 100_000 } });
    expect(npv(0.02, r2.flows)).toBeLessThan(0);
  });

  it("preço máximo é null quando nem de graça dá", () => {
    const i = simple();
    i.sale.priceCents = 5_000_000;
    expect(maxLandPrice(i, 0.01)).toBeNull();
  });

  it("ponto de equilíbrio do preço de venda", () => {
    const p = breakEvenSalePrice(simple())!;
    expect(p).toBeCloseTo(200_000, 0);
  });

  it("cenários pioram o lucro em ordem", () => {
    const i = defaultInputs();
    const profits = DEFAULT_SCENARIOS.map((s) => ok(applyScenario(i, s)).profit);
    expect(profits[0]!).toBeGreaterThan(profits[1]!);
    expect(profits[1]!).toBeGreaterThan(profits[2]!);
  });
});

describe("schema", () => {
  it("os valores padrão passam na validação e dão um estudo completo", () => {
    expect(inputsSchema.parse(defaultInputs())).toBeTruthy();
    expect(compute(defaultInputs()).ok).toBe(true);
  });
  it("rejeita centavos fracionados e taxas negativas", () => {
    const i = defaultInputs() as unknown as { land: { priceCents: number; itbiBps: number } };
    i.land.priceCents = 10.5;
    expect(inputsSchema.safeParse(i).success).toBe(false);
  });
});
