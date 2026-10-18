import type { Inputs, TaxRegime, Verdict } from "@calc/core";

export type ProjectStatus = "rascunho" | "estudo" | "em_obra" | "vendido" | "arquivado";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  rascunho: "Rascunho",
  estudo: "Em estudo",
  em_obra: "Em obra",
  vendido: "Vendido",
  arquivado: "Arquivado",
};

export interface Project {
  id: string;
  userId: string;
  name: string;
  address: string;
  status: ProjectStatus;
  units: number;
  inputs: Inputs;
  inputsVersion: number;
  verdict: Verdict | null;
  profitCents: number | null;
  totalCostCents: number | null;
  irrAmBps: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  priceDeltaBps: number;
  costDeltaBps: number;
  buildDeltaMonths: number;
  sellDeltaMonths: number;
  sort: number;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro";
  defaultTmaAmBps: number;
  defaultSelicAaBps: number;
  defaultUf: string | null;
  defaultTaxRegime: TaxRegime;
  isAdmin: boolean;
}

export interface CubValue {
  uf: string;
  standard: string;
  refMonth: string; // AAAA-MM
  valueM2Cents: number;
  sourceUrl: string;
}

export interface ShareLink {
  id: string;
  projectId: string;
  token: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
}

export type ProjectPatch = Partial<Pick<Project, "name" | "address" | "status" | "units" | "inputs">>;

export type SaveResult =
  | { ok: true; project: Project }
  | { ok: false; reason: "conflict"; current: Project }
  | { ok: false; reason: "not_found" };

export const FREE_PROJECT_LIMIT = 3;

export class PlanLimitError extends Error {
  constructor() {
    super("plan_limit_reached");
  }
}

/**
 * O contrato da camada de dados. Hoje: localStorage (local-repo.ts).
 * Depois: Supabase com as mesmas assinaturas (replica-backend).
 */
export interface Repo {
  getSession(): Promise<Session | null>;
  signIn(email: string, name: string): Promise<Session>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;

  getProfile(): Promise<Profile>;
  updateProfile(patch: Partial<Omit<Profile, "id" | "email" | "plan" | "isAdmin">>): Promise<Profile>;

  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(input: { name: string; inputs: Inputs; address?: string; units?: number }): Promise<Project>;
  saveProject(id: string, version: number, patch: ProjectPatch): Promise<SaveResult>;
  duplicateProject(id: string): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  listScenarios(projectId: string): Promise<Scenario[]>;
  upsertScenario(s: Omit<Scenario, "id" | "sort"> & { id?: string }): Promise<Scenario>;
  deleteScenario(id: string): Promise<void>;

  latestCub(uf: string, standard: string): Promise<CubValue | null>;
  importCub(rows: CubValue[]): Promise<number>;

  listShareLinks(projectId: string): Promise<ShareLink[]>;
  createShareLink(projectId: string): Promise<ShareLink>;
  revokeShareLink(id: string): Promise<void>;
  getSharedProject(token: string): Promise<Pick<Project, "name" | "address" | "units" | "inputs" | "updatedAt"> | null>;
}
