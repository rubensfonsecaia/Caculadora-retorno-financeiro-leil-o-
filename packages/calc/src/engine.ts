import { aaToAm, irr, npv, payback } from "./finance";
import { bpsToFraction, centsToReais } from "./format";
import type { Inputs } from "./schema";
import { computeTax } from "./tax";

// Convenções (também no memorial de cálculo da tela de resultado):
// - mês 0: compra do terreno, cartório e projetos/alvarás;
// - meses 1..B: obra, desembolso no fim de cada mês pela curva escolhida;
// - mês B + meses para vender: venda, impostos e quitação do financiamento;
// - valores em reais (number); centavos só na borda (inputs e banco).

export interface MonthRow {
  month: number;
  land: number; // terreno + cartório + corretagem de compra (negativo)
  build: number; // obra (negativo)
  financing: number; // liberações (+), juros pagos (−), quitação (−)
  sale: number; // venda líquida de corretagem (+)
  tax: number; // imposto (negativo)
  net: number;
  cumulative: number;
}

export type Verdict = "viavel" | "marginal" | "inviavel";

export interface CostBreakdown {
  land: number; // preço do terreno
  acquisition: number; // ITBI, escritura, registro, corretagem de compra, outros
  build: number; // obra inteira (direto + indireto + BDI + contingência)
  interest: number; // juros do financiamento (pagos ou capitalizados)
  brokerage: number; // corretagem de venda
  tax: number;
}

export interface BuildDetail {
  direct: number; // área × CUB × fator
  indirect: number; // ligações + extras
  permits: number;
  bdi: number;
  contingency: number;
  total: number;
}

export interface Result {
  ok: true;
  months: MonthRow[];
  flows: number[];
  saleMonth: number;
  grossRevenue: number; // VGV depois do desconto de negociação
  netRevenue: number; // depois de corretagem
  costs: CostBreakdown;
  build: BuildDetail;
  totalCost: number; // tudo que sai, sem contar a quitação do principal
  profit: number; // lucro líquido depois de impostos
  margin: number; // lucro / VGV
  maxExposure: number; // pior saldo acumulado (positivo = quanto precisou ter em caixa)
  roi: number; // lucro / exposição máxima
  moic: number; // entradas / saídas do investidor
  irrAm: number | null;
  irrAa: number | null;
  npvAtTma: number;
  payback: number | null;
  discountedPayback: number | null;
  tmaAm: number;
  selicAm: number;
  cdiAm: number;
  taxBasis: "gain" | "revenue" | "none";
  taxEffectiveRate: number;
  loanPeak: number;
  verdict: Verdict;
}

export interface Incomplete {
  ok: false;
  missing: ("salePrice" | "builtArea" | "cub")[];
}

/** Pesos mensais da obra, somando 1. */
export function spendWeights(curve: Inputs["schedule"]["spendCurve"], buildMonths: number, manualBps: number[]): number[] {
  const n = buildMonths;
  if (curve === "manual" && manualBps.length === n) {
    const sum = manualBps.reduce((a, b) => a + b, 0);
    if (sum > 0) return manualBps.map((b) => b / sum);
  }
  if (curve === "s_curve" && n > 1) {
    // smoothstep acumulado: começa devagar, acelera no meio, termina devagar
    const F = (x: number) => x * x * (3 - 2 * x);
    return Array.from({ length: n }, (_, i) => F((i + 1) / n) - F(i / n));
  }
  return Array.from({ length: n }, () => 1 / n);
}

export function buildCost(b: Inputs["build"]): BuildDetail {
  const direct = b.builtAreaM2 * centsToReais(b.cubM2Cents) * bpsToFraction(b.realCostFactorBps);
  const indirect = centsToReais(b.utilitiesCents) + centsToReais(b.extrasCents);
  const permits = centsToReais(b.permitsCents);
  const subtotal = direct + indirect + permits;
  const bdi = subtotal * bpsToFraction(b.bdiBps);
  const contingency = (subtotal + bdi) * bpsToFraction(b.contingencyBps);
  return { direct, indirect, permits, bdi, contingency, total: subtotal + bdi + contingency };
}

export function grossSale(i: Inputs): number {
  const list = i.sale.mode === "per_m2" ? centsToReais(i.sale.priceM2Cents) * i.build.builtAreaM2 : centsToReais(i.sale.priceCents);
  return list * (1 - bpsToFraction(i.sale.discountBps));
}

export function compute(i: Inputs): Result | Incomplete {
  const missing: Incomplete["missing"] = [];
  if (grossSale(i) <= 0) missing.push("salePrice");
  if (i.build.builtAreaM2 <= 0) missing.push("builtArea");
  if (i.build.cubM2Cents <= 0) missing.push("cub");
  if (missing.length) return { ok: false, missing };

  const B = i.schedule.buildMonths;
  const saleMonth = B + i.schedule.monthsToSell;
  const N = saleMonth + 1;
  const rows: MonthRow[] = Array.from({ length: N }, (_, m) => ({
    month: m, land: 0, build: 0, financing: 0, sale: 0, tax: 0, net: 0, cumulative: 0,
  }));
  const row = (m: number) => rows[m]!;

  // terreno
  const landPrice = centsToReais(i.land.priceCents);
  const acquisition =
    landPrice * bpsToFraction(i.land.itbiBps + i.land.deedBps + i.land.registryBps + i.land.buyBrokerageBps) +
    centsToReais(i.land.otherCents);
  row(0).land = -(landPrice + acquisition);

  // obra: projetos/alvarás no mês 0 (com sua parte de BDI e contingência), o resto pela curva
  const bd = buildCost(i.build);
  const markup = (1 + bpsToFraction(i.build.bdiBps)) * (1 + bpsToFraction(i.build.contingencyBps));
  const permitsLoaded = bd.permits * markup;
  row(0).build = -permitsLoaded;
  const curveTotal = bd.total - permitsLoaded;
  const w = spendWeights(i.schedule.spendCurve, B, i.schedule.manualCurveBps);
  const monthlyBuild = w.map((x) => x * curveTotal);
  for (let m = 1; m <= B; m++) row(m).build = -monthlyBuild[m - 1]!;

  // financiamento da obra: liberação por medição ou tudo no mês 1; juros mensais
  // sobre o saldo; na carência os juros entram no saldo; quitação na venda
  const fin = i.financing;
  const financedShare = bpsToFraction(fin.financedBps);
  const rateAm = aaToAm(bpsToFraction(fin.rateAaBps));
  let balance = 0;
  let interest = 0;
  let loanPeak = 0;
  if (financedShare > 0) {
    for (let m = 1; m <= saleMonth; m++) {
      const accrued = balance * rateAm; // juros do mês sobre o saldo do mês anterior
      interest += accrued;
      if (m <= fin.graceMonths) balance += accrued;
      else row(m).financing -= accrued;
      let release = 0;
      if (fin.release === "per_measure" && m <= B) release = monthlyBuild[m - 1]! * financedShare;
      if (fin.release === "upfront" && m === 1) release = curveTotal * financedShare;
      balance += release;
      row(m).financing += release;
      loanPeak = Math.max(loanPeak, balance);
    }
    row(saleMonth).financing -= balance; // quitação
  }

  // venda
  const gross = grossSale(i);
  const brokerage = gross * bpsToFraction(i.sale.brokerageBps);
  const netRevenue = gross - brokerage;
  row(saleMonth).sale = netRevenue;

  // imposto: base do ganho de capital = venda − corretagem − aquisição − obra
  const gain = netRevenue - (landPrice + acquisition) - bd.total;
  const tax = computeTax({
    regime: i.tax.regime,
    rateOverride: i.tax.rateOverrideBps != null ? bpsToFraction(i.tax.rateOverrideBps) : null,
    grossRevenue: gross,
    gain,
  });
  row(saleMonth).tax = -tax.amount;

  // totais
  let acc = 0;
  let minAcc = 0;
  let inflows = 0;
  let outflows = 0;
  for (const r of rows) {
    r.net = r.land + r.build + r.financing + r.sale + r.tax;
    acc += r.net;
    r.cumulative = acc;
    minAcc = Math.min(minAcc, acc);
    if (r.net >= 0) inflows += r.net;
    else outflows -= r.net;
  }
  const flows = rows.map((r) => r.net);
  const profit = acc;
  const maxExposure = -minAcc;
  const tmaAm = bpsToFraction(i.bench.tmaAmBps);
  const selicAm = aaToAm(bpsToFraction(i.bench.selicAaBps));
  const cdiAm = aaToAm(Math.max(0, bpsToFraction(i.bench.selicAaBps) - 0.001));
  const irrAm = irr(flows);
  const npvAtTma = npv(tmaAm, flows);

  const costs: CostBreakdown = {
    land: landPrice,
    acquisition,
    build: bd.total,
    interest,
    brokerage,
    tax: tax.amount,
  };
  const totalCost = costs.land + costs.acquisition + costs.build + costs.interest + costs.brokerage + costs.tax;

  let verdict: Verdict;
  if (profit <= 0) verdict = "inviavel";
  else if (irrAm != null ? irrAm >= tmaAm : npvAtTma >= 0) verdict = "viavel";
  else verdict = "marginal";

  return {
    ok: true,
    months: rows,
    flows,
    saleMonth,
    grossRevenue: gross,
    netRevenue,
    costs,
    build: bd,
    totalCost,
    profit,
    margin: gross > 0 ? profit / gross : 0,
    maxExposure,
    roi: maxExposure > 0 ? profit / maxExposure : 0,
    moic: outflows > 0 ? inflows / outflows : 0,
    irrAm,
    irrAa: irrAm != null ? Math.pow(1 + irrAm, 12) - 1 : null,
    npvAtTma,
    payback: payback(flows),
    discountedPayback: payback(flows, tmaAm),
    tmaAm,
    selicAm,
    cdiAm,
    taxBasis: tax.basis,
    taxEffectiveRate: tax.effectiveRate,
    loanPeak,
    verdict,
  };
}
