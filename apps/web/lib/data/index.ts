import { BACKEND } from "@/lib/env";
import { localRepo, subscribe as localSubscribe } from "./local-repo";
import { supabaseRepo, subscribe as supabaseSubscribe } from "./supabase-repo";
import type { Repo } from "./types";

// Supabase quando NEXT_PUBLIC_SUPABASE_URL e a chave anon existem;
// senão, demonstração com localStorage.
export const repo: Repo = BACKEND === "supabase" ? supabaseRepo : localRepo;
export const subscribe = BACKEND === "supabase" ? supabaseSubscribe : localSubscribe;
export * from "./types";
