"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, PageTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/auth/password-field";
import { updatePassword } from "@/lib/auth";

export default function NovaSenhaPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="mx-auto max-w-[28rem]">
      <PageTitle title="Nova senha" />
      <Card>
        <form
          className="grid gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.length < 8) return setError("Use pelo menos 8 caracteres.");
            if (pw !== pw2) return setError("As duas senhas não são iguais.");
            setBusy(true);
            const err = await updatePassword(pw);
            setBusy(false);
            if (err) setError(err);
            else router.push("/projetos");
          }}
        >
          <PasswordField label="Nova senha" value={pw} onChange={setPw} autoComplete="new-password" />
          <PasswordField label="Repita a senha" value={pw2} onChange={setPw2} autoComplete="new-password" />
          {error && (
            <p role="alert" className="text-sm font-bold text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={busy}>
            Salvar senha
          </Button>
        </form>
      </Card>
    </div>
  );
}
