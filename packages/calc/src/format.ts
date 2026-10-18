// Leitura e escrita de números no formato brasileiro.

/**
 * Lê o que a pessoa digitou. Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234".
 * Um ponto seguido de exatamente 3 dígitos é separador de milhar ("1.234" = 1234).
 * Devolve null se não houver número.
 */
export function parseBR(raw: string): number | null {
  let s = raw.replace(/[R$\s%x]/gi, "").replace(/−/g, "-");
  if (s === "" || s === "-") return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = s.split(".").length - 1;
    if (dots > 1) s = s.replace(/\./g, "");
    else if (dots === 1 && /\.\d{3}$/.test(s)) s = s.replace(".", "");
  }
  if (!/^-?\d*\.?\d*$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brl0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Sinal de menos tipográfico, para "−R$ 12.400" ficar legível. */
function minus(s: string): string {
  return s.replace("-", "−");
}

export function formatBRL(reais: number, opts: { cents?: boolean } = {}): string {
  return minus((opts.cents ? brl : brl0).format(reais)).replace(/ /g, " ");
}

/** "R$ 1,2 mi", "R$ 182 mil", "R$ 950". */
export function formatBRLShort(reais: number): string {
  const a = Math.abs(reais);
  const sign = reais < 0 ? "−" : "";
  const n = (v: number, d: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });
  if (a >= 1e6) return `${sign}R$ ${n(a / 1e6, a >= 1e7 ? 1 : 2)} mi`;
  if (a >= 1e4) return `${sign}R$ ${n(a / 1e3, 0)} mil`;
  return `${sign}R$ ${n(a, 0)}`;
}

export function formatPct(fraction: number, digits = 2): string {
  return minus(
    (fraction * 100).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }),
  ) + "%";
}

/** Número para dentro de um campo de edição (sem "R$"). */
export function formatInput(n: number, digits = 2): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export const centsToReais = (c: number) => c / 100;
export const reaisToCents = (r: number) => Math.round(r * 100);
export const bpsToFraction = (b: number) => b / 10_000;
export const fractionToBps = (f: number) => Math.round(f * 10_000);
