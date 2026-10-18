import { formatBRL, formatPct, type Incomplete, type Result, type Verdict } from "@calc/core";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ReactNode } from "react";

export const VERDICT = {
  viavel: { label: "Viável", Icon: CheckCircle2, inverse: "text-success-on-inverse", soft: "bg-success-soft text-success" },
  marginal: { label: "Marginal", Icon: AlertTriangle, inverse: "text-warning-on-inverse", soft: "bg-warning-soft text-warning" },
  inviavel: { label: "Inviável", Icon: XCircle, inverse: "text-danger-on-inverse", soft: "bg-danger-soft text-danger" },
} satisfies Record<Verdict, unknown>;

const MISSING: Record<Incomplete["missing"][number], string> = {
  salePrice: "o preço de venda",
  builtArea: "a área construída",
  cub: "o custo por m² (CUB)",
};

export function missingText(m: Incomplete["missing"]): string {
  const parts = m.map((x) => MISSING[x]);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} e ${parts.at(-1)}` : parts[0]!;
}

export function VerdictBadge({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) return <span className="inline-flex rounded-pill bg-surface-muted px-2 text-xs font-bold text-text-muted">Incompleto</span>;
  const v = VERDICT[verdict];
  return (
    <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0 text-xs font-bold ${v.soft}`}>
      <v.Icon aria-hidden className="h-3 w-3" />
      {v.label}
    </span>
  );
}

function why(r: Result): string {
  if (r.verdict === "inviavel") return "O custo total passa do que a venda rende.";
  if (r.verdict === "marginal")
    return r.irrAm != null
      ? `Dá lucro, mas rende ${formatPct(r.irrAm)} ao mês, abaixo da sua TMA de ${formatPct(r.tmaAm)}.`
      : `Dá lucro, mas o VPL na sua TMA de ${formatPct(r.tmaAm)} é negativo.`;
  return r.irrAm != null ? `Rende ${formatPct(r.irrAm)} ao mês, acima da sua TMA de ${formatPct(r.tmaAm)}.` : "VPL positivo na sua TMA.";
}

/** Cartão escuro do veredito. aria-live só anuncia o essencial. */
export function VerdictCard({ result, extra }: { result: Result | Incomplete | null; extra?: ReactNode }) {
  if (!result) return null;
  if (!result.ok)
    return (
      <section aria-live="polite" className="rounded-2xl bg-surface-inverse p-6 text-on-inverse shadow-raised">
        <p className="text-lg font-extrabold">Falta pouco</p>
        <p className="mt-1 text-sm text-on-inverse-muted">Preencha {missingText(result.missing)} para ver o resultado.</p>
      </section>
    );
  const v = VERDICT[result.verdict];
  return (
    <section aria-live="polite" aria-atomic className="rounded-2xl bg-surface-inverse p-6 text-on-inverse shadow-raised">
      <p className={`inline-flex items-center gap-2 text-lg font-extrabold ${v.inverse}`}>
        <v.Icon aria-hidden className="h-5 w-5" />
        {v.label}
      </p>
      <p className="mb-1 mt-2 break-words text-4xl tabular-nums">{formatBRL(result.profit)}</p>
      <p className="text-sm text-on-inverse-muted">lucro líquido, depois de impostos. {why(result)}</p>
      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-label uppercase tracking-[0.04em] text-on-inverse-muted">TIR</dt>
          <dd className="text-2xl tabular-nums">{result.irrAm != null ? `${formatPct(result.irrAm)} a.m.` : "indefinida"}</dd>
        </div>
        <div>
          <dt className="text-label uppercase tracking-[0.04em] text-on-inverse-muted">Margem</dt>
          <dd className="text-2xl tabular-nums">{formatPct(result.margin, 1)}</dd>
        </div>
      </dl>
      {extra}
    </section>
  );
}

export function Kpi({ label, value, negative, hint }: { label: string; value: string; negative?: boolean; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <dl>
        <dt className="text-label uppercase tracking-[0.04em] text-text-muted">{label}</dt>
        <dd className={`mt-1 break-words text-2xl tabular-nums ${negative ? "text-danger" : ""}`}>{value}</dd>
        {hint && <dd className="mt-1 text-xs text-text-muted">{hint}</dd>}
      </dl>
    </div>
  );
}
