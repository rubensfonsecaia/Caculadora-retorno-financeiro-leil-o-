"use client";

import { defaultInputs, inputsSchema, UFS, type Inputs } from "@calc/core";
import type { Profile } from "./data";

// Rascunho da calculadora rápida (S02): fica no navegador, sem conta, e
// sobrevive ao cadastro para virar projeto (F02).
const KEY = "cc:draft:v1";

/** Rascunho salvo, ou null se não houver um válido. */
export function loadDraft(): Inputs | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = inputsSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    }
  } catch {
    /* sem armazenamento: começa do padrão */
  }
  return null;
}

/** Estudo novo com as premissas padrão da conta (S16), quando houver. */
export function newInputs(profile: Profile | null): Inputs {
  const i = defaultInputs();
  if (!profile) return i;
  i.bench = { tmaAmBps: profile.defaultTmaAmBps, selicAaBps: profile.defaultSelicAaBps };
  i.tax = { regime: profile.defaultTaxRegime, rateOverrideBps: null };
  if (profile.defaultUf && (UFS as readonly string[]).includes(profile.defaultUf)) i.build.uf = profile.defaultUf as Inputs["build"]["uf"];
  return i;
}

export function saveDraft(i: Inputs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(i));
  } catch {
    /* ignora */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignora */
  }
}
