"use client";

import { MailCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PasswordField } from "@/components/auth/password-field";
import { Segmented } from "@/components/ui/choice";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/fields";
import { Notice } from "@/components/ui/notice";
import { safeNext, sendMagicLink, sendPasswordReset, signInPassword, signInWithGoogle, signUp } from "@/lib/auth";
import { repo } from "@/lib/data";
import { BACKEND } from "@/lib/env";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ErrorText({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="text-sm font-bold text-danger">
      {text}
    </p>
  ) : null;
}

function DemoSignIn({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
      <Card>
        <form
          className="grid gap-5"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (!EMAIL.test(email.trim())) return setError("Digite um e-mail válido, como voce@exemplo.com.");
            setBusy(true);
            await repo.signIn(email.trim(), name.trim());
            router.push(next);
          }}
        >
          <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} required />
          <TextField label="Seu nome (opcional)" autoComplete="name" value={name} onChange={setName} />
          <ErrorText text={error} />
          <Button type="submit" size="lg" loading={busy}>
            Entrar
          </Button>
        </form>
      </Card>
      <Notice tone="info" className="mt-4">
        Versão de demonstração: sem senha e sem e-mail de confirmação; tudo fica só neste navegador. Com o Supabase configurado, esta tela vira o login de verdade.
      </Notice>
    </>
  );
}

type Mode = "entrar" | "criar" | "link" | "esqueci";

function RealSignIn({ next, linkError }: { next: string; linkError: boolean }) {
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(linkError ? "O link expirou ou já foi usado. Peça outro." : null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (sent)
    return (
      <Card>
        <EmptyState icon={<MailCheck />} title="Confira seu e-mail" text={sent} action={<Button variant="secondary" onClick={() => setSent(null)}>Voltar</Button>} />
      </Card>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!EMAIL.test(em)) return setError("Digite um e-mail válido, como voce@exemplo.com.");
    if ((mode === "entrar" || mode === "criar") && password.length < 8) return setError("A senha tem pelo menos 8 caracteres.");
    setBusy(true);
    setError(null);
    let err: string | null = null;
    if (mode === "entrar") {
      err = await signInPassword(em, password);
      if (!err) return router.push(next);
    } else if (mode === "criar") {
      err = await signUp(em, password, name.trim(), next);
      if (!err) setSent(`Mandamos um link para ${em}. Abra para confirmar a conta.`);
    } else if (mode === "link") {
      err = await sendMagicLink(em, next);
      if (!err) setSent(`Mandamos um link de acesso para ${em}. Ele vale por 1 hora.`);
    } else {
      err = await sendPasswordReset(em);
      // mesma resposta exista ou não a conta: não revela quem é cliente
      if (!err) setSent(`Se houver uma conta com ${em}, chega um link para criar uma senha nova.`);
    }
    setError(err);
    setBusy(false);
  }

  const label: Record<Mode, string> = { entrar: "Entrar", criar: "Criar conta", link: "Mandar link", esqueci: "Mandar link de nova senha" };
  return (
    <Card>
      <div className="mb-5">
        <Segmented<Mode>
          label="Como entrar"
          value={mode === "esqueci" ? "entrar" : mode}
          onChange={(m) => (setMode(m), setError(null))}
          options={[
            { value: "entrar", label: "Senha" },
            { value: "link", label: "Link por e-mail" },
            { value: "criar", label: "Criar conta" },
          ]}
        />
      </div>
      <form className="grid gap-5" noValidate onSubmit={submit}>
        <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} required />
        {mode === "criar" && <TextField label="Seu nome (opcional)" autoComplete="name" value={name} onChange={setName} />}
        {(mode === "entrar" || mode === "criar") && (
          <PasswordField
            label="Senha"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "criar" ? "new-password" : "current-password"}
            hint={mode === "criar" ? "Pelo menos 8 caracteres." : undefined}
          />
        )}
        <ErrorText text={error} />
        <Button type="submit" size="lg" loading={busy}>
          {label[mode]}
        </Button>
        {mode === "entrar" && (
          <Button variant="ghost" onClick={() => (setMode("esqueci"), setError(null))}>
            Esqueci a senha
          </Button>
        )}
        {mode === "esqueci" && <p className="text-sm text-text-muted">Digite o e-mail da conta e mandamos um link para criar uma senha nova.</p>}
      </form>
      <div className="my-5 border-t border-border" />
      <Button variant="secondary" className="w-full" onClick={async () => setError(await signInWithGoogle(next))}>
        Entrar com Google
      </Button>
    </Card>
  );
}

function SignIn() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  return (
    <div className="mx-auto max-w-[28rem]">
      <PageTitle title="Entrar" sub="Para salvar estudos e comparar terrenos." />
      {BACKEND === "demo" ? <DemoSignIn next={next} /> : <RealSignIn next={next} linkError={params.get("erro") === "link"} />}
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
