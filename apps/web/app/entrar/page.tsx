"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, PageTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/fields";
import { Notice } from "@/components/ui/notice";
import { repo } from "@/lib/data";

function safeNext(n: string | null): string {
  // só caminhos internos: evita redirecionar para outro site
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/projetos";
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Digite um e-mail válido, como voce@exemplo.com.");
      return;
    }
    setBusy(true);
    setError(null);
    await repo.signIn(email.trim(), name.trim());
    router.push(next);
  }

  return (
    <div className="mx-auto max-w-[28rem]">
      <PageTitle title="Entrar" sub="Para salvar estudos e comparar terrenos." />
      <Card>
        <form className="grid gap-5" onSubmit={submit} noValidate>
          <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} required />
          <TextField label="Seu nome (opcional)" autoComplete="name" value={name} onChange={setName} />
          {error && (
            <p role="alert" className="text-sm font-bold text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={busy}>
            Entrar
          </Button>
          <Button variant="secondary" disabled title="Chega com o login de verdade">
            Entrar com Google (em breve)
          </Button>
        </form>
      </Card>
      <Notice tone="info" className="mt-4">
        Versão de demonstração: não há senha nem e-mail de confirmação, e tudo fica salvo só neste navegador. O login de verdade chega no próximo passo.
      </Notice>
    </div>
  );
}

export default function EntrarPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
