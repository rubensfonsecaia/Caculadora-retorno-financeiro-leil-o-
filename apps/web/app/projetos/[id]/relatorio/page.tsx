"use client";

import { ArrowLeft, Link2, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useProjectCtx } from "@/components/project/context";
import { ReportBody } from "@/components/project/report-body";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { missingText } from "@/components/ui/verdict";
import { repo } from "@/lib/data";
import { useLive, useResult } from "@/lib/hooks";
import { BACKEND } from "@/lib/env";
import { errorMessage } from "@/lib/errors";

function ShareLinks({ projectId }: { projectId: string }) {
  const { data: links = [] } = useLive(() => repo.listShareLinks(projectId), [projectId]);
  const toast = useToast();
  const active = links.filter((l) => !l.revokedAt);
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base">Link só para leitura</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            let url: string;
            try {
              const l = await repo.createShareLink(projectId);
              url = `${location.origin}/p/${l.token}`;
            } catch (e) {
              return toast("error", errorMessage(e));
            }
            try {
              await navigator.clipboard.writeText(url);
              toast("success", "Link copiado.");
            } catch {
              toast("info", url);
            }
          }}
        >
          <Link2 aria-hidden className="h-4 w-4" />
          Criar link
        </Button>
      </div>
      {active.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhum link ativo.</p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {active.map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-surface-muted px-2 py-1 font-mono text-xs">/p/{l.token}</code>
              <Button variant="ghost" size="sm" onClick={() => repo.revokeShareLink(l.id)} aria-label="Desativar este link">
                <Trash2 aria-hidden className="h-4 w-4" />
                Desativar
              </Button>
            </li>
          ))}
        </ul>
      )}
      {BACKEND === "demo" && <Notice tone="warn">Na demonstração o link só abre neste navegador. Com o Supabase configurado, abre para qualquer pessoa.</Notice>}
    </div>
  );
}

export default function RelatorioPage() {
  const { project } = useProjectCtx();
  const r = useResult(project?.inputs);
  const { data: logoUrl } = useLive(() => repo.getLogoUrl().catch(() => null), []);
  if (!project) return null;
  return (
    <div className="mx-auto grid max-w-[56rem] gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/projetos/${project.id}/resultado`} className="inline-flex items-center gap-1 rounded text-sm font-bold text-accent">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Voltar ao projeto
        </Link>
        <Button onClick={() => window.print()} disabled={!r?.ok}>
          <Printer aria-hidden className="h-4 w-4" />
          Imprimir ou salvar PDF
        </Button>
      </div>
      {r?.ok ? (
        <ReportBody name={project.name} address={project.address} inputs={project.inputs} r={r} logoUrl={logoUrl} />
      ) : (
        <Notice tone="info">Preencha {r ? missingText(r.missing) : "os dados"} para gerar o relatório.</Notice>
      )}
      <ShareLinks projectId={project.id} />
    </div>
  );
}
