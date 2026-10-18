"use client";

import { compute, defaultInputs, inputsSchema, INPUTS_VERSION, type Inputs } from "@calc/core";
import {
  FREE_PROJECT_LIMIT,
  PlanLimitError,
  type CubValue,
  type Profile,
  type Project,
  type ProjectPatch,
  type Repo,
  type SaveResult,
  type Scenario,
  type Session,
  type ShareLink,
} from "./types";

// Camada de dados de demonstração: tudo fica no localStorage deste navegador.
// Imita as regras do schema.sql (dono por registro, limite do plano free,
// versão otimista) para que a troca pelo Supabase não mude as telas.

interface Db {
  profiles: Profile[];
  projects: Project[];
  scenarios: Scenario[];
  shareLinks: ShareLink[];
  cub: CubValue[];
}

const DB_KEY = "cc:db:v1";
const SESSION_KEY = "cc:session:v1";
const LATENCY_MS = 120;

const listeners = new Set<() => void>();
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => fn());
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // modo privado ou armazenamento cheio: segue em memória nesta aba
  }
}

let memoryDb: Db | null = null;
function db(): Db {
  if (!memoryDb) memoryDb = read<Db>(DB_KEY, { profiles: [], projects: [], scenarios: [], shareLinks: [], cub: [] });
  return memoryDb;
}
function commit() {
  write(DB_KEY, db());
  notify();
}

const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS));
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function session(): Session | null {
  return read<Session | null>(SESSION_KEY, null);
}
function requireUser(): Session {
  const s = session();
  if (!s) throw new Error("not_authenticated");
  return s;
}

function summarize(inputs: Inputs) {
  const r = compute(inputs);
  if (!r.ok) return { verdict: null, profitCents: null, totalCostCents: null, irrAmBps: null };
  return {
    verdict: r.verdict,
    profitCents: Math.round(r.profit * 100),
    totalCostCents: Math.round(r.totalCost * 100),
    irrAmBps: r.irrAm != null ? Math.round(r.irrAm * 10_000) : null,
  };
}

function own<T extends { userId: string }>(p: T | undefined, s: Session): T | undefined {
  return p && p.userId === s.userId ? p : undefined;
}

function seedProjects(userId: string, profile: Profile): Project[] {
  const base = defaultInputs();
  base.bench.tmaAmBps = profile.defaultTmaAmBps;
  base.bench.selicAaBps = profile.defaultSelicAaBps;
  const sobrado: Inputs = base;
  const geminadas: Inputs = {
    ...base,
    land: { ...base.land, priceCents: 32_000_000, areaM2: 300 },
    build: { ...base.build, builtAreaM2: 2 * 95, cubM2Cents: 230_000 },
    schedule: { ...base.schedule, buildMonths: 12, monthsToSell: 6 },
    financing: { ...base.financing, financedBps: 6_000 },
    sale: { ...base.sale, priceCents: 2 * 54_000_000 },
  };
  const t = now();
  return [
    { name: "Exemplo: sobrado 140 m²", address: "", units: 1, inputs: sobrado },
    { name: "Exemplo: 2 casas geminadas", address: "", units: 2, inputs: geminadas },
  ].map((p) => ({
    id: uuid(),
    userId,
    status: "estudo" as const,
    inputsVersion: INPUTS_VERSION,
    version: 1,
    createdAt: t,
    updatedAt: t,
    ...p,
    ...summarize(p.inputs),
  }));
}

export const localRepo: Repo = {
  async getSession() {
    return session();
  },

  async signIn(email, name) {
    await wait();
    const d = db();
    let profile = d.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!profile) {
      profile = {
        id: uuid(),
        email,
        name,
        plan: "free",
        defaultTmaAmBps: 100,
        defaultSelicAaBps: 1_500,
        defaultUf: null,
        defaultTaxRegime: "pf_ganho_capital",
        isAdmin: true, // modo demonstração: quem entra pode importar a tabela CUB
      };
      d.profiles.push(profile);
      d.projects.push(...seedProjects(profile.id, profile));
    }
    const s: Session = { userId: profile.id, email: profile.email };
    write(SESSION_KEY, s);
    commit();
    return s;
  },

  async signOut() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* nada a fazer */
    }
    notify();
  },

  async deleteAccount() {
    const s = requireUser();
    const d = db();
    const ids = new Set(d.projects.filter((p) => p.userId === s.userId).map((p) => p.id));
    d.projects = d.projects.filter((p) => !ids.has(p.id));
    d.scenarios = d.scenarios.filter((x) => !ids.has(x.projectId));
    d.shareLinks = d.shareLinks.filter((x) => !ids.has(x.projectId));
    d.profiles = d.profiles.filter((p) => p.id !== s.userId);
    commit();
    await this.signOut();
  },

  async getProfile() {
    const s = requireUser();
    const p = db().profiles.find((x) => x.id === s.userId);
    if (!p) throw new Error("not_found");
    return { ...p };
  },

  async updateProfile(patch) {
    await wait();
    const s = requireUser();
    const p = db().profiles.find((x) => x.id === s.userId);
    if (!p) throw new Error("not_found");
    Object.assign(p, patch);
    commit();
    return { ...p };
  },

  async listProjects() {
    await wait();
    const s = requireUser();
    return db()
      .projects.filter((p) => p.userId === s.userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((p) => structuredClone(p));
  },

  async getProject(id) {
    await wait();
    const s = requireUser();
    const p = own(db().projects.find((x) => x.id === id), s);
    return p ? structuredClone(p) : null;
  },

  async createProject({ name, inputs, address = "", units = 1 }) {
    await wait();
    const s = requireUser();
    const d = db();
    const profile = d.profiles.find((x) => x.id === s.userId);
    const active = d.projects.filter((p) => p.userId === s.userId && p.status !== "arquivado").length;
    if (profile?.plan === "free" && active >= FREE_PROJECT_LIMIT) throw new PlanLimitError();
    const parsed = inputsSchema.parse(inputs);
    const t = now();
    const p: Project = {
      id: uuid(),
      userId: s.userId,
      name: name.trim().slice(0, 120) || "Estudo sem nome",
      address,
      status: "estudo",
      units,
      inputs: parsed,
      inputsVersion: INPUTS_VERSION,
      version: 1,
      createdAt: t,
      updatedAt: t,
      ...summarize(parsed),
    };
    d.projects.push(p);
    commit();
    return structuredClone(p);
  },

  async saveProject(id, version, patch: ProjectPatch): Promise<SaveResult> {
    await wait();
    const s = requireUser();
    const p = own(db().projects.find((x) => x.id === id), s);
    if (!p) return { ok: false, reason: "not_found" };
    if (p.version !== version) return { ok: false, reason: "conflict", current: structuredClone(p) };
    if (patch.inputs) {
      p.inputs = inputsSchema.parse(patch.inputs);
      Object.assign(p, summarize(p.inputs));
    }
    if (patch.name !== undefined) p.name = patch.name.trim().slice(0, 120) || p.name;
    if (patch.address !== undefined) p.address = patch.address.slice(0, 300);
    if (patch.status !== undefined) p.status = patch.status;
    if (patch.units !== undefined) p.units = Math.max(1, Math.min(50, Math.round(patch.units)));
    p.version += 1;
    p.updatedAt = now();
    commit();
    return { ok: true, project: structuredClone(p) };
  },

  async duplicateProject(id) {
    const s = requireUser();
    const p = own(db().projects.find((x) => x.id === id), s);
    if (!p) throw new Error("not_found");
    return this.createProject({ name: `${p.name} (cópia)`.slice(0, 120), inputs: p.inputs, address: p.address, units: p.units });
  },

  async deleteProject(id) {
    await wait();
    const s = requireUser();
    const d = db();
    if (!own(d.projects.find((x) => x.id === id), s)) return;
    d.projects = d.projects.filter((p) => p.id !== id);
    d.scenarios = d.scenarios.filter((x) => x.projectId !== id);
    d.shareLinks = d.shareLinks.filter((x) => x.projectId !== id);
    commit();
  },

  async listScenarios(projectId) {
    await wait();
    const s = requireUser();
    if (!own(db().projects.find((x) => x.id === projectId), s)) return [];
    return db()
      .scenarios.filter((x) => x.projectId === projectId)
      .sort((a, b) => a.sort - b.sort)
      .map((x) => ({ ...x }));
  },

  async upsertScenario(input) {
    await wait();
    const s = requireUser();
    const d = db();
    if (!own(d.projects.find((x) => x.id === input.projectId), s)) throw new Error("not_found");
    if (input.id) {
      const sc = d.scenarios.find((x) => x.id === input.id);
      if (!sc) throw new Error("not_found");
      Object.assign(sc, input);
      commit();
      return { ...sc };
    }
    const sort = d.scenarios.filter((x) => x.projectId === input.projectId).length;
    const sc: Scenario = { ...input, id: uuid(), sort };
    d.scenarios.push(sc);
    commit();
    return { ...sc };
  },

  async deleteScenario(id) {
    const s = requireUser();
    const d = db();
    const sc = d.scenarios.find((x) => x.id === id);
    if (!sc || !own(d.projects.find((p) => p.id === sc.projectId), s)) return;
    d.scenarios = d.scenarios.filter((x) => x.id !== id);
    commit();
  },

  async latestCub(uf, standard) {
    const rows = db().cub.filter((c) => c.uf === uf && c.standard === standard);
    rows.sort((a, b) => b.refMonth.localeCompare(a.refMonth));
    return rows[0] ? { ...rows[0] } : null;
  },

  async importCub(rows) {
    await wait();
    const s = requireUser();
    const profile = db().profiles.find((p) => p.id === s.userId);
    if (!profile?.isAdmin) throw new Error("forbidden");
    const d = db();
    let n = 0;
    for (const r of rows) {
      const i = d.cub.findIndex((c) => c.uf === r.uf && c.standard === r.standard && c.refMonth === r.refMonth);
      if (i >= 0) d.cub[i] = r;
      else d.cub.push(r);
      n++;
    }
    commit();
    return n;
  },

  async listShareLinks(projectId) {
    const s = requireUser();
    if (!own(db().projects.find((x) => x.id === projectId), s)) return [];
    return db().shareLinks.filter((l) => l.projectId === projectId).map((l) => ({ ...l }));
  },

  async createShareLink(projectId) {
    await wait();
    const s = requireUser();
    if (!own(db().projects.find((x) => x.id === projectId), s)) throw new Error("not_found");
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const l: ShareLink = { id: uuid(), projectId, token, revokedAt: null, createdAt: now() };
    db().shareLinks.push(l);
    commit();
    return { ...l };
  },

  async revokeShareLink(id) {
    const s = requireUser();
    const l = db().shareLinks.find((x) => x.id === id);
    if (!l || !own(db().projects.find((p) => p.id === l.projectId), s)) return;
    l.revokedAt = now();
    commit();
  },

  async getSharedProject(token) {
    await wait();
    const l = db().shareLinks.find((x) => x.token === token && !x.revokedAt);
    const p = l && db().projects.find((x) => x.id === l.projectId);
    return p ? { name: p.name, address: p.address, units: p.units, inputs: structuredClone(p.inputs), updatedAt: p.updatedAt } : null;
  },
};
