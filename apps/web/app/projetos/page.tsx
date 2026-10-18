"use client";

import { formatBRLShort, formatPct } from "@calc/core";
import { Archive, ArchiveRestore, Copy, FolderOpen, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RequireSession } from "@/components/require-session";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageTitle, Skeleton } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { VerdictBadge } from "@/components/ui/verdict";
import { FREE_PROJECT_LIMIT, PlanLimitError, repo, STATUS_LABEL, type Project, type ProjectStatus } from "@/lib/data";
import { useLive } from "@/lib/hooks";

const FILTERS: { value: "ativos" | ProjectStatus; label: string }[] = [
  { value: "ativos", label: "Ativos" },
  { value: "estudo", label: "Em estudo" },
  { value: "em_obra", label: "Em obra" },
  { value: "vendido", label: "Vendidos" },
  { value: "arquivado", label: "Arquivados" },
];

function ProjectCard({ p, onDelete }: { p: Project; onDelete: (p: Project) => void }) {
  const toast = useToast();
  const iconBtn =
    "inline-flex h-[var(--layout-touch-target-min)] w-[var(--layout-touch-target-min)] items-center justify-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text";
  return (
    <li className="flex flex-col rounded-xl border border-border bg-surface shadow-card">
      <Link href={`/projetos/${p.id}/resultado`} className="block flex-1 rounded-t-xl p-5 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={p.verdict} />
          {p.status !== "estudo" && <span className="text-xs font-bold text-text-muted">{STATUS_LABEL[p.status]}</span>}
        </div>
        <h2 className="break-words text-lg">{p.name}</h2>
        <p className="mt-1 text-sm tabular-nums text-text-muted">
          {p.profitCents != null ? `Lucro ${formatBRLShort(p.profitCents / 100)}` : "Faltam dados"}
          {p.irrAmBps != null && ` · TIR ${formatPct(p.irrAmBps / 10_000, 1)} a.m.`}
        </p>
        <p className="mt-1 text-xs text-text-muted">Editado em {new Date(p.updatedAt).toLocaleDateString("pt-BR")}</p>
      </Link>
      <div className="flex justify-end gap-1 border-t border-border px-2 py-1">
        <button
          type="button"
          className={iconBtn}
          aria-label={`Duplicar ${p.name}`}
          title="Duplicar"
          onClick={() =>
            repo
              .duplicateProject(p.id)
              .then(() => toast("success", "Cópia criada."))
              .catch((e) => toast("error", e instanceof PlanLimitError ? "O plano grátis guarda 3 projetos ativos." : "Não deu para duplicar."))
          }
        >
          <Copy aria-hidden className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={iconBtn}
          aria-label={p.status === "arquivado" ? `Desarquivar ${p.name}` : `Arquivar ${p.name}`}
          title={p.status === "arquivado" ? "Desarquivar" : "Arquivar"}
          onClick={() => repo.saveProject(p.id, p.version, { status: p.status === "arquivado" ? "estudo" : "arquivado" })}
        >
          {p.status === "arquivado" ? <ArchiveRestore aria-hidden className="h-5 w-5" /> : <Archive aria-hidden className="h-5 w-5" />}
        </button>
        <button type="button" className={`${iconBtn} hover:text-danger`} aria-label={`Excluir ${p.name}`} title="Excluir" onClick={() => onDelete(p)}>
          <Trash2 aria-hidden className="h-5 w-5" />
        </button>
      </div>
    </li>
  );
}

function ProjectList() {
  const { data, loading, error } = useLive(() => Promise.all([repo.listProjects(), repo.getProfile()]), []);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("ativos");
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const [projects, profile] = data ?? [[], null];
  const shown = useMemo(
    () =>
      projects.filter(
        (p) => (filter === "ativos" ? p.status !== "arquivado" : p.status === filter) && p.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [projects, filter, q],
  );
  const active = projects.filter((p) => p.status !== "arquivado").length;
  const atLimit = profile?.plan === "free" && active >= FREE_PROJECT_LIMIT;

  if (error) return <Notice tone="error">Não deu para carregar os projetos. Recarregue a página.</Notice>;

  return (
    <>
      <PageTitle
        title="Meus projetos"
        sub={profile?.plan === "free" ? `${active} de ${FREE_PROJECT_LIMIT} projetos ativos no plano grátis.` : undefined}
        actions={
          atLimit ? (
            <ButtonLink href="/planos" variant="secondary">
              Ver planos
            </ButtonLink>
          ) : (
            <ButtonLink href="/calcular">Novo estudo</ButtonLink>
          )
        }
      />
      {atLimit && (
        <Notice tone="warn" className="mb-6">
          Você chegou a {FREE_PROJECT_LIMIT} projetos ativos. Arquive um para abrir espaço, ou veja os planos.
        </Notice>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-[var(--layout-input-height)] min-w-0 flex-1 items-center gap-2 rounded-lg border border-border-input bg-surface px-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus sm:max-w-[20rem]">
          <Search aria-hidden className="h-4 w-4 text-text-subtle" />
          <input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div role="group" aria-label="Filtrar por situação" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`h-[var(--space-7)] rounded-pill px-3 text-xs font-bold ${filter === f.value ? "bg-accent text-on-accent" : "bg-surface-muted text-text-muted"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <ul aria-busy className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((k) => (
            <li key={k} className="rounded-xl border border-border bg-surface p-5">
              <Skeleton className="mb-3 h-5 w-[5rem]" />
              <Skeleton className="mb-2 h-6 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </li>
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <Card>
          {projects.length === 0 ? (
            <EmptyState icon={<FolderOpen />} title="Nenhum projeto ainda" text="Faça um estudo na calculadora e salve para comparar depois." action={<ButtonLink href="/calcular">Fazer um estudo</ButtonLink>} />
          ) : (
            <EmptyState icon={<Search />} title="Nada por aqui" text="Nenhum projeto com esse filtro ou nome." action={<Button variant="secondary" onClick={() => (setFilter("ativos"), setQ(""))}>Limpar filtros</Button>} />
          )}
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <ProjectCard key={p.id} p={p} onDelete={setToDelete} />
          ))}
        </ul>
      )}

      <Modal
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Excluir “${toDelete?.name ?? ""}”?`}
        description="O estudo, os cenários e os links compartilhados somem. Não dá para desfazer."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setToDelete(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            onClick={async () => {
              if (!toDelete) return;
              setDeleting(true);
              await repo.deleteProject(toDelete.id);
              setDeleting(false);
              setToDelete(null);
              toast("success", "Projeto excluído.");
            }}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default function ProjetosPage() {
  return (
    <RequireSession>
      <ProjectList />
    </RequireSession>
  );
}
