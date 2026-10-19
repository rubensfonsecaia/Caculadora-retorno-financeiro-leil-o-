"use client";

import { compute, type Inputs, type Result, type Incomplete } from "@calc/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlanLimitError, repo, subscribe, type Project, type ProjectPatch, type Session } from "./data";

/** Recarrega `load` sempre que a camada de dados avisa que mudou. */
export function useLive<T>(load: () => Promise<T>, deps: unknown[]): { data: T | undefined; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);
  useEffect(() => {
    let alive = true;
    const go = () =>
      run()
        .then((d) => alive && (setData(d), setError(null)))
        .catch((e: Error) => alive && setError(e))
        .finally(() => alive && setLoading(false));
    go();
    const off = subscribe(go);
    return () => {
      alive = false;
      off();
    };
  }, [run]);
  return { data, loading, error };
}

export function useSession(): { session: Session | null; loading: boolean } {
  const { data, loading } = useLive(() => repo.getSession(), []);
  return { session: data ?? null, loading };
}

export function useResult(inputs: Inputs | undefined): Result | Incomplete | null {
  return useMemo(() => (inputs ? compute(inputs) : null), [inputs]);
}

export type SaveState = "idle" | "saving" | "saved" | "conflict" | "error" | "limit" | "signed_out";

/**
 * Projeto com edição local e autosave (debounce). Manda a versão que leu;
 * se outra aba salvou antes, para e avisa (conflict) em vez de sobrescrever.
 */
export function useProjectEditor(id: string) {
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [conflict, setConflict] = useState<Project | null>(null);
  const pending = useRef<ProjectPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(0);

  useEffect(() => {
    let alive = true;
    repo.getProject(id).then((p) => {
      if (!alive) return;
      setProject(p);
      if (p) versionRef.current = p.version;
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    setSaveState("saving");
    try {
      const r = await repo.saveProject(id, versionRef.current, patch);
      if (r.ok) {
        versionRef.current = r.project.version;
        setSaveState("saved");
      } else if (r.reason === "conflict") {
        setConflict(r.current);
        setSaveState("conflict");
      } else setSaveState("error");
    } catch (e) {
      if (e instanceof PlanLimitError) {
        // desfaz na tela a mudança de situação que o limite recusou
        if (patch.status) setProject((cur) => (cur ? { ...cur, status: "arquivado" } : cur));
        setSaveState("limit");
      } else if (!(await repo.getSession().catch(() => null))) setSaveState("signed_out"); // BUG-008
      else setSaveState("error");
    }
  }, [id]);

  useEffect(() => () => void flush(), [flush]);

  // BUG-010: fechar ou recarregar com edição ainda no debounce perdia a edição
  // em silêncio; agora o navegador pergunta antes de sair.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!Object.keys(pending.current).length) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const patch = useCallback(
    (p: ProjectPatch) => {
      setProject((cur) => (cur ? { ...cur, ...p } : cur));
      pending.current = { ...pending.current, ...p };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 700);
    },
    [flush],
  );

  const updateInputs = useCallback(
    (fn: (i: Inputs) => Inputs) => {
      setProject((cur) => {
        if (!cur) return cur;
        const inputs = fn(cur.inputs);
        pending.current = { ...pending.current, inputs };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), 700);
        return { ...cur, inputs };
      });
    },
    [flush],
  );

  /** Resolve o conflito: "mine" grava por cima, "theirs" descarta o que está aqui. */
  const resolveConflict = useCallback(
    async (keep: "mine" | "theirs") => {
      if (!conflict || !project) return;
      versionRef.current = conflict.version;
      if (keep === "theirs") {
        setProject(conflict);
      } else {
        pending.current = { name: project.name, address: project.address, status: project.status, units: project.units, inputs: project.inputs };
        await flush();
      }
      setConflict(null);
      setSaveState("idle");
    },
    [conflict, project, flush],
  );

  return { project, patch, updateInputs, saveState, conflict, resolveConflict, flush };
}
