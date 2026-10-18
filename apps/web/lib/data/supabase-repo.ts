"use client";

import { inputsSchema } from "@calc/core";
import {
  createProjectAction,
  createShareLinkAction,
  deleteAccountAction,
  deleteProjectAction,
  deleteScenarioAction,
  duplicateProjectAction,
  importCubAction,
  removeLogoAction,
  revokeShareLinkAction,
  saveProjectAction,
  updateProfileAction,
  uploadLogoAction,
  upsertScenarioAction,
  type Res,
} from "@/app/actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cubFromRow, profileFromRow, projectFromRow, scenarioFromRow, shareLinkFromRow } from "./rows";
import { PlanLimitError, RepoError, type Repo, type Session } from "./types";

// Leituras: direto do navegador, com o JWT do usuário (a RLS filtra).
// Escritas: server actions (app/actions.ts), que validam e recalculam.

const listeners = new Set<() => void>();
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const notify = () => listeners.forEach((fn) => fn());

let authWired = false;
function db() {
  const c = supabaseBrowser();
  if (!authWired) {
    authWired = true;
    c.auth.onAuthStateChange(() => notify());
  }
  return c;
}

function unwrap<T>(r: Res<T>): T {
  if (r.ok) return r.data;
  if (r.code === "plan_limit") throw new PlanLimitError();
  throw new RepoError(r.code);
}

async function write<T>(p: Promise<Res<T>>): Promise<T> {
  const v = unwrap(await p);
  notify();
  return v;
}

async function uid(): Promise<{ id: string; email: string }> {
  const { data } = await db().auth.getUser();
  if (!data.user) throw new RepoError("not_authenticated");
  return { id: data.user.id, email: data.user.email ?? "" };
}

export const supabaseRepo: Repo = {
  async getSession(): Promise<Session | null> {
    const { data } = await db().auth.getUser();
    return data.user ? { userId: data.user.id, email: data.user.email ?? "" } : null;
  },

  async signIn() {
    throw new RepoError("use_auth_module"); // login de verdade em lib/auth.ts
  },

  async signOut(everywhere = false) {
    await db().auth.signOut({ scope: everywhere ? "global" : "local" });
    notify();
  },

  async deleteAccount() {
    await write(deleteAccountAction("EXCLUIR"));
    await db().auth.signOut({ scope: "local" });
  },

  async getProfile() {
    const u = await uid();
    const { data, error } = await db().from("profiles").select().eq("id", u.id).single();
    if (error) throw new RepoError("db_error");
    return profileFromRow(data, u.email);
  },

  async getLogoUrl() {
    const u = await uid();
    const { data } = await db().from("profiles").select("logo_path").eq("id", u.id).single();
    if (!data?.logo_path) return null;
    const { data: signed } = await db().storage.from("logos").createSignedUrl(data.logo_path, 600);
    return signed?.signedUrl ?? null;
  },

  async uploadLogo(file) {
    const form = new FormData();
    form.set("file", file);
    await write(uploadLogoAction(form));
  },

  async removeLogo() {
    await write(removeLogoAction());
  },

  async updateProfile(patch) {
    await write(updateProfileAction(patch));
    return this.getProfile();
  },

  async listProjects() {
    const { data, error } = await db().from("projects").select().order("updated_at", { ascending: false });
    if (error) throw new RepoError("db_error");
    return data.map(projectFromRow);
  },

  async getProject(id) {
    const { data, error } = await db().from("projects").select().eq("id", id).maybeSingle();
    if (error && error.code !== "22P02") throw new RepoError("db_error"); // 22P02: id não é uuid
    return data ? projectFromRow(data) : null;
  },

  async createProject(input) {
    return write(createProjectAction({ ...input, inputs: inputsSchema.parse(input.inputs) }));
  },

  async saveProject(id, version, patch) {
    return write(saveProjectAction(id, version, patch));
  },

  async duplicateProject(id) {
    return write(duplicateProjectAction(id));
  },

  async deleteProject(id) {
    await write(deleteProjectAction(id));
  },

  async listScenarios(projectId) {
    const { data, error } = await db().from("scenarios").select().eq("project_id", projectId).order("sort").order("created_at");
    if (error) throw new RepoError("db_error");
    return data.map(scenarioFromRow);
  },

  async upsertScenario(s) {
    return write(upsertScenarioAction(s));
  },

  async deleteScenario(id) {
    await write(deleteScenarioAction(id));
  },

  async latestCub(uf, standard) {
    const { data } = await db()
      .from("cub_values")
      .select()
      .eq("uf", uf)
      .eq("standard", standard)
      .order("ref_month", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? cubFromRow(data) : null;
  },

  async importCub(rows) {
    return write(importCubAction(rows));
  },

  async listShareLinks(projectId) {
    const { data, error } = await db().from("share_links").select().eq("project_id", projectId).order("created_at");
    if (error) throw new RepoError("db_error");
    return data.map(shareLinkFromRow);
  },

  async createShareLink(projectId) {
    return write(createShareLinkAction(projectId));
  },

  async revokeShareLink(id) {
    await write(revokeShareLinkAction(id));
  },

  async getSharedProject(token) {
    // função security definer: o visitante sem conta só lê o projeto deste token
    const { data, error } = await db().rpc("get_shared_project", { p_token: token });
    if (error || !data?.length) return null;
    const r = data[0];
    const parsed = inputsSchema.safeParse(r.inputs);
    if (!parsed.success) return null;
    return { name: r.name, address: r.address ?? "", units: r.units, inputs: parsed.data, updatedAt: r.updated_at };
  },
};
