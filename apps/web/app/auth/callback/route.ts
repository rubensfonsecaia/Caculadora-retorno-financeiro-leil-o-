import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function safeNext(n: string | null): string {
  return n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/projetos";
}

const OTP_TYPES: EmailOtpType[] = ["signup", "magiclink", "recovery", "email", "email_change", "invite"];

// Volta dos links de e-mail e do Google. Aceita os dois formatos do Supabase:
// ?code=… (PKCE/OAuth) e ?token_hash=…&type=… (templates de e-mail deste repo).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const db = await supabaseServer();

  let ok = false;
  if (code) ok = !(await db.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type && OTP_TYPES.includes(type)) ok = !(await db.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  const dest = ok ? (type === "recovery" ? "/auth/nova-senha" : next) : "/entrar?erro=link";
  return NextResponse.redirect(new URL(dest, url.origin));
}
