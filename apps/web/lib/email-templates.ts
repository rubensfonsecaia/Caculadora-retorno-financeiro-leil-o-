import { APP_NAME } from "@/lib/brand";
import { SITE_URL } from "@/lib/env";

// Textos escritos para este produto. Sempre com versão em texto puro.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function wrap(title: string, paragraphs: string[], cta?: { label: string; url: string }) {
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-weight:800;margin:0 0 24px">${esc(APP_NAME)}</p>
<h1 style="font-size:22px;margin:0 0 16px">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="font-size:16px;line-height:24px;color:#475569;margin:0 0 16px">${esc(p)}</p>`).join("")}
${cta ? `<p style="margin:24px 0"><a href="${esc(cta.url)}" style="background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;display:inline-block">${esc(cta.label)}</a></p>` : ""}
</div></body></html>`;
  const text = [title, "", ...paragraphs, ...(cta ? ["", `${cta.label}: ${cta.url}`] : [])].join("\n");
  return { html, text };
}

export function paymentFailedEmail(name: string) {
  const subject = "Não conseguimos cobrar sua assinatura";
  return {
    subject,
    ...wrap(
      subject,
      [
        `${name ? `${name}, a` : "A"} última cobrança do plano Pro não passou. Seus projetos continuam salvos.`,
        "Atualize o cartão para não perder os recursos do Pro. Se preferir cancelar, também dá para fazer pelo mesmo link, em um clique.",
      ],
      { label: "Atualizar pagamento", url: `${SITE_URL}/planos` },
    ),
  };
}

export function cubStaleEmail(stale: { uf: string; standard: string; refMonth: string | null }[]) {
  const subject = `Tabela CUB: ${stale.length} ${stale.length === 1 ? "valor desatualizado" : "valores desatualizados"}`;
  return {
    subject,
    ...wrap(
      subject,
      [
        "Estes estados e padrões estão sem CUB dos últimos 2 meses:",
        stale.map((s) => `${s.uf} ${s.standard}: ${s.refMonth ?? "sem dado"}`).join("; "),
        "Importe os valores novos do Sinduscon de cada estado, com o link da fonte.",
      ],
      { label: "Abrir importação", url: `${SITE_URL}/config` },
    ),
  };
}
