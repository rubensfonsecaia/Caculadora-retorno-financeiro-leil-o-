"use client";

import { SITE_URL } from "@/lib/env";
import { supabaseBrowser } from "@/lib/supabase/client";

// Login de verdade (Supabase Auth). Cada função devolve null em caso de
// sucesso ou uma mensagem em português para mostrar na tela.

export function safeNext(n: string | null | undefined): string {
  // só caminhos internos: evita redirecionar para outro site
  return n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/projetos";
}

const callback = (next: string) => `${SITE_URL}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;

function message(e: { message?: string; status?: number; code?: string } | null): string | null {
  if (!e) return null;
  const m = (e.message ?? "").toLowerCase();
  if (e.code === "invalid_credentials" || m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (e.code === "email_not_confirmed" || m.includes("not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (e.code === "user_already_exists" || m.includes("already registered")) return "Já existe uma conta com este e-mail. Entre ou recupere a senha.";
  if (e.code === "weak_password" || m.includes("password")) return "Senha fraca: use pelo menos 8 caracteres, com letras e números.";
  if (e.status === 429 || m.includes("rate limit")) return "Muitas tentativas. Espere alguns minutos e tente de novo.";
  return "Algo deu errado. Tente de novo em instantes.";
}

export async function signInPassword(email: string, password: string) {
  const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
  return message(error);
}

export async function signUp(email: string, password: string, name: string, next: string) {
  const { error } = await supabaseBrowser().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callback(next), data: { name } },
  });
  return message(error);
}

export async function sendMagicLink(email: string, next: string) {
  const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: callback(next) } });
  return message(error);
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, { redirectTo: callback("/auth/nova-senha") });
  return message(error);
}

export async function updatePassword(password: string) {
  const { error } = await supabaseBrowser().auth.updateUser({ password });
  return message(error);
}

export async function signInWithGoogle(next: string) {
  const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback(next) } });
  return message(error);
}

/** everywhere = encerra a sessão em todos os aparelhos (revoga os refresh tokens). */
export async function signOut(everywhere = false) {
  await supabaseBrowser().auth.signOut({ scope: everywhere ? "global" : "local" });
}
