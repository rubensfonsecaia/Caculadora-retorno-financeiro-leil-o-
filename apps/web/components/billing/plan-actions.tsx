"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { repo } from "@/lib/data";
import { BACKEND } from "@/lib/env";
import { errorMessage } from "@/lib/errors";
import { useLive } from "@/lib/hooks";

async function go(path: string, body?: unknown): Promise<string | null> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (json.url) {
    window.location.assign(json.url);
    return null;
  }
  return json.error ?? "unknown";
}

/** Botões do plano Pro: assinar (Checkout) ou gerenciar/cancelar (Portal). O plano vem do banco, escrito pelo webhook. */
export function ProActions() {
  const { data: profile, loading } = useLive(() => repo.getSession().then((s) => (s ? repo.getProfile() : null)), []);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const params = useSearchParams();

  if (BACKEND === "demo")
    return (
      <Button className="w-full" disabled title="Pagamento precisa do Supabase e do Stripe configurados">
        Assinar (indisponível na demonstração)
      </Button>
    );
  if (loading) return <Button className="w-full" loading>Carregando</Button>;
  if (!profile)
    return (
      <ButtonLink href="/entrar?next=/planos" className="w-full">
        Entrar para assinar
      </ButtonLink>
    );

  const run = async (key: string, path: string, body?: unknown) => {
    setBusy(key);
    const err = await go(path, body);
    if (err) {
      toast("error", errorMessage(err));
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-3">
      {params.get("assinatura") === "ok" && profile.plan !== "pro" && (
        <Notice tone="info">Pagamento recebido. A assinatura aparece aqui em alguns segundos; recarregue a página.</Notice>
      )}
      {profile.plan === "pro" ? (
        <>
          <p className="text-sm font-bold text-success">Você assina o Pro.</p>
          <Button variant="secondary" className="w-full" loading={busy === "portal"} onClick={() => run("portal", "/api/stripe/portal")}>
            Gerenciar ou cancelar
          </Button>
        </>
      ) : (
        <>
          <Button className="w-full" loading={busy === "month"} onClick={() => run("month", "/api/stripe/checkout", { interval: "month" })}>
            Assinar mensal
          </Button>
          <Button variant="secondary" className="w-full" loading={busy === "year"} onClick={() => run("year", "/api/stripe/checkout", { interval: "year" })}>
            Assinar anual
          </Button>
        </>
      )}
    </div>
  );
}
