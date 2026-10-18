// Variáveis públicas (vão para o navegador). Sem Supabase configurado, o app
// roda em modo demonstração com dados no localStorage.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const BACKEND: "supabase" | "demo" = SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : "demo";
