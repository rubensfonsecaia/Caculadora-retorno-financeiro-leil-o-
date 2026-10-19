"use server";

import { INPUTS_VERSION } from "@calc/core";
import { z } from "zod";
import { stripe } from "@/lib/billing/stripe";
import { cubRowsSchema, profilePatchSchema, projectFromRow, projectPatchSchema, scenarioFromRow, scenarioSchema, shareLinkFromRow, summarize } from "@/lib/data/rows";
import type { Project, SaveResult, Scenario, ShareLink } from "@/lib/data/types";
import { allow } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/server-env";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

// Todas as escritas passam por aqui: usuário conferido no servidor, entrada
// validada com zod, e a RLS do banco por baixo (cliente com o JWT do usuário).
// Erros voltam como código, não como exceção (o Next esconde mensagens em produção).

export type Res<T> = { ok: true; data: T } | { ok: false; code: string };
const fail = (code: string): { ok: false; code: string } => ({ ok: false, code });
const uuid = z.string().uuid();

async function auth() {
  const { db, user } = await currentUser();
  return user ? { db, user } : null;
}

export async function createProjectAction(input: unknown): Promise<Res<Project>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  const parsed = projectPatchSchema.required({ name: true, inputs: true }).safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const p = parsed.data;
  const { data, error } = await a.db
    .from("projects")
    .insert({
      user_id: a.user.id,
      name: p.name,
      address: p.address ?? "",
      units: p.units ?? 1,
      inputs: p.inputs,
      inputs_version: INPUTS_VERSION,
      ...dbSummary(p.inputs),
    })
    .select()
    .single();
  if (error) return fail(error.message.includes("plan_limit_reached") ? "plan_limit" : "db_error");
  return { ok: true, data: projectFromRow(data) };
}

function dbSummary(inputs: Parameters<typeof summarize>[0]) {
  const s = summarize(inputs);
  return { verdict: s.verdict, profit_cents: s.profitCents, total_cost_cents: s.totalCostCents, irr_am_bps: s.irrAmBps };
}

export async function saveProjectAction(id: unknown, version: unknown, patch: unknown): Promise<Res<SaveResult>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  const pid = uuid.safeParse(id);
  const ver = z.number().int().min(1).safeParse(version);
  const body = projectPatchSchema.safeParse(patch);
  if (!pid.success || !ver.success || !body.success) return fail("invalid_input");
  const b = body.data;
  const row: Record<string, unknown> = { version: ver.data + 1 };
  if (b.name !== undefined) row.name = b.name;
  if (b.address !== undefined) row.address = b.address;
  if (b.status !== undefined) row.status = b.status;
  if (b.units !== undefined) row.units = b.units;
  if (b.inputs !== undefined) Object.assign(row, { inputs: b.inputs, inputs_version: INPUTS_VERSION }, dbSummary(b.inputs));

  // concorrência otimista: só grava se ninguém salvou depois da versão lida
  const { data, error } = await a.db.from("projects").update(row).eq("id", pid.data).eq("version", ver.data).select();
  if (error) return fail(error.message.includes("plan_limit_reached") ? "plan_limit" : "db_error");
  if (data.length) return { ok: true, data: { ok: true, project: projectFromRow(data[0]) } };
  const { data: cur } = await a.db.from("projects").select().eq("id", pid.data).maybeSingle();
  return { ok: true, data: cur ? { ok: false, reason: "conflict", current: projectFromRow(cur) } : { ok: false, reason: "not_found" } };
}

export async function duplicateProjectAction(id: unknown): Promise<Res<Project>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  const pid = uuid.safeParse(id);
  if (!pid.success) return fail("invalid_input");
  const { data: src } = await a.db.from("projects").select().eq("id", pid.data).maybeSingle();
  if (!src) return fail("not_found");
  return createProjectAction({ name: `${src.name} (cópia)`.slice(0, 120), address: src.address, units: src.units, inputs: src.inputs });
}

export async function deleteProjectAction(id: unknown): Promise<Res<null>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  const pid = uuid.safeParse(id);
  if (!pid.success) return fail("invalid_input");
  const { error } = await a.db.from("projects").delete().eq("id", pid.data);
  return error ? fail("db_error") : { ok: true, data: null };
}

export async function upsertScenarioAction(input: unknown): Promise<Res<Scenario>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  const p = scenarioSchema.safeParse(input);
  if (!p.success) return fail("invalid_input");
  const s = p.data;
  const row = {
    project_id: s.projectId,
    user_id: a.user.id,
    name: s.name,
    price_delta_bps: s.priceDeltaBps,
    cost_delta_bps: s.costDeltaBps,
    build_delta_months: s.buildDeltaMonths,
    sell_delta_months: s.sellDeltaMonths,
  };
  const q = s.id
    ? a.db.from("scenarios").update(row).eq("id", s.id).select().single()
    : a.db.from("scenarios").insert(row).select().single();
  const { data, error } = await q;
  if (error) return fail(error.code === "23505" ? "duplicate_name" : "db_error");
  return { ok: true, data: scenarioFromRow(data) };
}

export async function deleteScenarioAction(id: unknown): Promise<Res<null>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  const sid = uuid.safeParse(id);
  if (!sid.success) return fail("invalid_input");
  const { error } = await a.db.from("scenarios").delete().eq("id", sid.data);
  return error ? fail("db_error") : { ok: true, data: null };
}

export async function updateProfileAction(patch: unknown): Promise<Res<null>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  const p = profilePatchSchema.safeParse(patch);
  if (!p.success) return fail("invalid_input");
  const d = p.data;
  const row: Record<string, unknown> = {};
  if (d.name !== undefined) row.name = d.name;
  if (d.defaultTmaAmBps !== undefined) row.default_tma_am_bps = d.defaultTmaAmBps;
  if (d.defaultSelicAaBps !== undefined) row.default_selic_aa_bps = d.defaultSelicAaBps;
  if (d.defaultUf !== undefined) row.default_uf = d.defaultUf;
  if (d.defaultTaxRegime !== undefined) row.default_tax_regime = d.defaultTaxRegime;
  const { error } = await a.db.from("profiles").update(row).eq("id", a.user.id);
  return error ? fail("db_error") : { ok: true, data: null };
}

export async function importCubAction(rows: unknown): Promise<Res<number>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  if (!(await allow(`cub_import:${a.user.id}`, 10, 3600))) return fail("rate_limited");
  const p = cubRowsSchema.safeParse(rows);
  if (!p.success) return fail("invalid_input");
  const { data, error } = await a.db
    .from("cub_values")
    .upsert(
      p.data.map((r) => ({ uf: r.uf, standard: r.standard, ref_month: `${r.refMonth}-01`, value_m2_cents: r.valueM2Cents, source_url: r.sourceUrl })),
      { onConflict: "uf,standard,ref_month" },
    )
    .select("id");
  if (error) return fail(error.code === "42501" ? "forbidden" : "db_error"); // RLS: só admin escreve
  return { ok: true, data: data.length };
}

export async function createShareLinkAction(projectId: unknown): Promise<Res<ShareLink>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  if (!(await allow(`share:${a.user.id}`, 20, 3600))) return fail("rate_limited");
  const pid = uuid.safeParse(projectId);
  if (!pid.success) return fail("invalid_input");
  const { data, error } = await a.db.from("share_links").insert({ project_id: pid.data, user_id: a.user.id }).select().single();
  return error ? fail("db_error") : { ok: true, data: shareLinkFromRow(data) };
}

export async function revokeShareLinkAction(id: unknown): Promise<Res<null>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  const lid = uuid.safeParse(id);
  if (!lid.success) return fail("invalid_input");
  const { error } = await a.db.from("share_links").update({ revoked_at: new Date().toISOString() }).eq("id", lid.data);
  return error ? fail("db_error") : { ok: true, data: null };
}

const LOGO_TYPES = { "image/png": "png", "image/jpeg": "jpg" } as const;
const LOGO_MAX_BYTES = 1024 * 1024;

export async function uploadLogoAction(form: FormData): Promise<Res<null>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  if (!(await allow(`logo:${a.user.id}`, 10, 3600))) return fail("rate_limited");
  const file = form.get("file");
  if (!(file instanceof File)) return fail("invalid_input");
  const ext = LOGO_TYPES[file.type as keyof typeof LOGO_TYPES];
  if (!ext) return fail("bad_type"); // sem SVG: pode carregar script
  if (file.size > LOGO_MAX_BYTES) return fail("too_large");
  const bytes = new Uint8Array(await file.arrayBuffer());
  // confere a assinatura do arquivo, não só o tipo declarado
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if ((ext === "png" && !isPng) || (ext === "jpg" && !isJpg)) return fail("bad_type");
  const dir = a.user.id;
  await a.db.storage.from("logos").remove([`${dir}/logo.png`, `${dir}/logo.jpg`]);
  const { error } = await a.db.storage.from("logos").upload(`${dir}/logo.${ext}`, bytes, { contentType: file.type, upsert: true });
  if (error) return fail("upload_error");
  await a.db.from("profiles").update({ logo_path: `${dir}/logo.${ext}` }).eq("id", a.user.id);
  return { ok: true, data: null };
}

export async function removeLogoAction(): Promise<Res<null>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  await a.db.storage.from("logos").remove([`${a.user.id}/logo.png`, `${a.user.id}/logo.jpg`]);
  await a.db.from("profiles").update({ logo_path: null }).eq("id", a.user.id);
  return { ok: true, data: null };
}

/**
 * Exclusão de verdade: apaga o cliente no Stripe (cancela a assinatura),
 * os arquivos do Storage e o usuário (cascade apaga perfil, projetos,
 * cenários e links).
 */
export async function deleteAccountAction(confirmation: unknown): Promise<Res<null>> {
  const a = await auth();
  if (!a) return fail("not_authenticated");
  if (confirmation !== "EXCLUIR") return fail("invalid_input");
  if (!(await allow(`delete_account:${a.user.id}`, 3, 3600))) return fail("rate_limited");
  const admin = supabaseAdmin();
  const uid = a.user.id;

  const { data: sub } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", uid).maybeSingle();
  if (sub?.stripe_customer_id && serverEnv().STRIPE_SECRET_KEY) {
    try {
      await stripe().customers.del(sub.stripe_customer_id);
    } catch (e) {
      // cliente já apagado no Stripe: segue; outro erro: para antes de apagar a conta
      if ((e as { code?: string }).code !== "resource_missing") return fail("billing_error");
    }
  }
  await admin.storage.from("logos").remove([`${uid}/logo.png`, `${uid}/logo.jpg`]);
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return fail("delete_error");
  await a.db.auth.signOut({ scope: "local" });
  return { ok: true, data: null };
}
