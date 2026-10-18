"use client";

import { createContext, useContext } from "react";
import type { useProjectEditor } from "@/lib/hooks";

type Editor = ReturnType<typeof useProjectEditor>;
export const ProjectCtx = createContext<Editor | null>(null);

export function useProjectCtx(): Editor {
  const c = useContext(ProjectCtx);
  if (!c) throw new Error("useProjectCtx fora de ProjectCtx");
  return c;
}

export const SECTIONS = [
  { slug: "terreno", label: "Terreno" },
  { slug: "obra", label: "Obra" },
  { slug: "prazo", label: "Prazo" },
  { slug: "financiamento", label: "Financiamento" },
  { slug: "venda", label: "Venda" },
  { slug: "impostos", label: "Impostos" },
  { slug: "resultado", label: "Resultado" },
  { slug: "fluxo", label: "Fluxo de caixa" },
  { slug: "cenarios", label: "Cenários" },
] as const;
export type SectionSlug = (typeof SECTIONS)[number]["slug"];
