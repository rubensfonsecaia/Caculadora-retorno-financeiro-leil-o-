"use client";

import { ArrowLeft, Check, CloudOff, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProjectCtx, SECTIONS } from "@/components/project/context";
import { MobileResultBar } from "@/components/project/result-bar";
import { RequireSession } from "@/components/require-session";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { SelectField } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { STATUS_LABEL, type ProjectStatus } from "@/lib/data";
import { useProjectEditor, useResult, type SaveState } from "@/lib/hooks";

function SaveIndicator({ state }: { state: SaveState }) {
  const map: Record<SaveState, ReactNode> = {
    idle: null,
    saving: (
      <>
        <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        Salvando…
      </>
    ),
    saved: (
      <>
        <Check aria-hidden className="h-4 w-4 text-success" />
        Salvo
      </>
    ),
    conflict: "Alterado em outra aba",
    error: (
      <>
        <CloudOff aria-hidden className="h-4 w-4 text-danger" />
        Não salvou
      </>
    ),
  };
  return (
    <span role="status" className="inline-flex items-center gap-1 text-xs font-bold text-text-muted">
      {map[state]}
    </span>
  );
}

function Shell({ id, children }: { id: string; children: ReactNode }) {
  const editor = useProjectEditor(id);
  const path = usePathname();
  const r = useResult(editor.project?.inputs);
  const current = path.split("/")[3] ?? "resultado";
  const isReport = current === "relatorio";

  if (editor.project === undefined)
    return (
      <div aria-busy className="grid gap-4">
        <Skeleton className="h-9 w-[24rem] max-w-full" />
        <Skeleton className="h-[var(--layout-input-height)] w-full" />
        <Skeleton className="h-[20rem] w-full" />
      </div>
    );
  if (editor.project === null)
    return (
      <Card>
        <EmptyState icon={<FileText />} title="Projeto não encontrado" text="Ele pode ter sido excluído, ou é de outra conta." action={<ButtonLink href="/projetos">Ver meus projetos</ButtonLink>} />
      </Card>
    );

  const p = editor.project;
  if (isReport) return <ProjectCtx.Provider value={editor}>{children}</ProjectCtx.Provider>;

  return (
    <ProjectCtx.Provider value={editor}>
      <div className="mb-4">
        <Link href="/projetos" className="inline-flex items-center gap-1 rounded text-sm font-bold text-accent">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Projetos
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-0 basis-full md:basis-0 md:flex-1">
          <label htmlFor="project-name" className="sr-only">
            Nome do projeto
          </label>
          <input
            id="project-name"
            value={p.name}
            maxLength={120}
            onChange={(e) => editor.patch({ name: e.target.value })}
            className="w-full min-w-0 rounded-lg bg-transparent px-1 text-2xl outline-none hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus sm:text-3xl"
          />
          <div className="mt-1 flex flex-wrap items-center gap-3 px-1">
            <SaveIndicator state={editor.saveState} />
          </div>
        </div>
        <SelectField
          label="Situação"
          value={p.status}
          onChange={(s: ProjectStatus) => editor.patch({ status: s })}
          options={(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          className="w-[11rem]"
        />
        <ButtonLink href={`/projetos/${id}/relatorio`} variant="secondary">
          <FileText aria-hidden className="h-4 w-4" />
          Relatório
        </ButtonLink>
      </div>

      <nav aria-label="Seções do projeto" className="mb-6 overflow-x-auto border-b border-border">
        <ul className="flex gap-5">
          {SECTIONS.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/projetos/${id}/${s.slug}`}
                aria-current={current === s.slug ? "page" : undefined}
                className="inline-block whitespace-nowrap border-b-2 border-transparent py-3 text-sm font-bold text-text-muted hover:text-text aria-[current=page]:border-accent aria-[current=page]:text-text focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {children}

      {current !== "resultado" && <MobileResultBar r={r} href={`/projetos/${id}/resultado`} />}

      <Modal
        open={editor.saveState === "conflict"}
        onOpenChange={() => {}}
        title="Este projeto mudou em outro lugar"
        description="Outra aba ou aparelho salvou uma versão mais nova enquanto você editava. Qual você quer manter?"
      >
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => editor.resolveConflict("theirs")}>
            Usar a outra versão
          </Button>
          <Button onClick={() => editor.resolveConflict("mine")}>Manter o que está aqui</Button>
        </div>
      </Modal>
    </ProjectCtx.Provider>
  );
}

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireSession>
      <Shell id={id}>{children}</Shell>
    </RequireSession>
  );
}
