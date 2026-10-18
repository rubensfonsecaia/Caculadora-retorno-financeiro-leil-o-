"use client";

import { TAX_LABELS, TAX_REGIMES, UFS, type TaxRegime } from "@calc/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireSession } from "@/components/require-session";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, PageTitle, Skeleton } from "@/components/ui/card";
import { FieldShell, PercentField, SelectField, TextField } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { repo, type CubValue, type Profile } from "@/lib/data";
import { BACKEND } from "@/lib/env";
import { errorMessage } from "@/lib/errors";

/** CSV: uf;padrao;mes(AAAA-MM);valor_m2;url_da_fonte */
function parseCubCsv(text: string): { rows: CubValue[]; errors: string[] } {
  const rows: CubValue[] = [];
  const errors: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^uf[;,]/i.test(l))
    .forEach((line, k) => {
      const [uf, standard, refMonth, value, url] = line.split(/[;\t]/).map((x) => x?.trim() ?? "");
      const v = Number((value ?? "").replace(/\./g, "").replace(",", "."));
      if (!uf || !/^[A-Z]{2}$/.test(uf) || !standard || !/^\d{4}-\d{2}$/.test(refMonth ?? "") || !(v > 0) || !/^https?:\/\//.test(url ?? ""))
        errors.push(`Linha ${k + 1}: “${line.slice(0, 60)}”`);
      else rows.push({ uf, standard, refMonth: refMonth!, valueM2Cents: Math.round(v * 100), sourceUrl: url! });
    });
  return { rows, errors };
}

function CubImport() {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <Card>
      <h2 className="text-lg">Tabela CUB</h2>
      <p className="mb-4 mt-1 text-sm text-text-muted">
        Cole os valores do Sinduscon do seu estado, um por linha, separados por ponto e vírgula: <code className="font-mono">UF;padrão;AAAA-MM;valor;link da fonte</code>. O link é obrigatório para saber de onde veio cada número.
      </p>
      <FieldShell id="cub-csv" label="Linhas da tabela" hint="Ex.: SP;R1-N;2026-09;2.440,15;https://… (o valor deste exemplo é ilustrativo)">
        <textarea
          id="cub-csv"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          aria-describedby="cub-csv-msg"
          className="w-full rounded-lg border border-border-input bg-surface p-3 font-mono text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
      </FieldShell>
      {errors.length > 0 && (
        <Notice tone="error" className="mt-3">
          Estas linhas não foram lidas: {errors.slice(0, 5).join("; ")}
          {errors.length > 5 && ` e mais ${errors.length - 5}.`}
        </Notice>
      )}
      <Button
        className="mt-4"
        variant="secondary"
        loading={busy}
        disabled={!text.trim()}
        onClick={async () => {
          const { rows, errors } = parseCubCsv(text);
          setErrors(errors);
          if (!rows.length) return;
          setBusy(true);
          try {
            const n = await repo.importCub(rows);
            toast("success", `${n} valores importados.`);
            if (!errors.length) setText("");
          } catch (e) {
            toast("error", errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Importar
      </Button>
    </Card>
  );
}

function LogoSection() {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => {
    repo.getLogoUrl().then(setUrl).catch(() => setUrl(null));
  }, []);
  if (BACKEND === "demo")
    return (
      <Card>
        <h2 className="text-lg">Logo no relatório</h2>
        <Notice tone="info" className="mt-3">
          Disponível com a conta de verdade (Supabase configurado).
        </Notice>
      </Card>
    );
  return (
    <Card>
      <h2 className="text-lg">Logo no relatório</h2>
      <p className="mb-4 mt-1 text-sm text-text-muted">PNG ou JPG, até 1 MB. Aparece no topo do relatório que você imprime.</p>
      <div className="flex flex-wrap items-center gap-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Seu logo" className="h-9 max-w-[12rem] rounded object-contain" />
        ) : (
          <span className="text-sm text-text-muted">Sem logo.</span>
        )}
        <label className="inline-flex h-[var(--layout-touch-target-min)] cursor-pointer items-center rounded-lg border border-border-input bg-surface px-4 text-sm font-bold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
          {busy ? "Enviando…" : "Escolher imagem"}
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 1024 * 1024) return toast("error", errorMessage("too_large"));
              setBusy(true);
              try {
                await repo.uploadLogo(f);
                setUrl(await repo.getLogoUrl());
                toast("success", "Logo salvo.");
              } catch (err) {
                toast("error", errorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {url && (
          <Button variant="ghost" onClick={async () => (await repo.removeLogo(), setUrl(null))}>
            Remover
          </Button>
        )}
      </div>
    </Card>
  );
}

function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    repo.getProfile().then(setProfile);
  }, []);
  if (!profile) return <Skeleton className="h-[20rem] w-full" />;
  const set = (p: Partial<Profile>) => setProfile({ ...profile, ...p });

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <h2 className="text-lg">Premissas padrão</h2>
        <p className="mb-5 mt-1 text-sm text-text-muted">Usadas em cada estudo novo. Estudos já salvos não mudam.</p>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await repo.updateProfile({
              name: profile.name,
              defaultTmaAmBps: profile.defaultTmaAmBps,
              defaultSelicAaBps: profile.defaultSelicAaBps,
              defaultUf: profile.defaultUf,
                defaultTaxRegime: profile.defaultTaxRegime,
              });
              toast("success", "Premissas salvas.");
            } catch (e) {
              toast("error", errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <TextField label="Seu nome" value={profile.name} onChange={(name) => set({ name })} />
          <SelectField label="Estado" value={profile.defaultUf ?? ""} onChange={(uf) => set({ defaultUf: uf || null })} options={[{ value: "", label: "—" }, ...UFS.map((u) => ({ value: u, label: u }))]} />
          <PercentField label="Sua TMA" unit="% a.m." bps={profile.defaultTmaAmBps} onBps={(b) => set({ defaultTmaAmBps: b })} />
          <PercentField label="Selic" unit="% a.a." bps={profile.defaultSelicAaBps} onBps={(b) => set({ defaultSelicAaBps: b })} />
          <SelectField<TaxRegime>
            label="Imposto"
            value={profile.defaultTaxRegime}
            onChange={(t) => set({ defaultTaxRegime: t })}
            options={TAX_REGIMES.map((t) => ({ value: t, label: TAX_LABELS[t] }))}
          />
          <div className="flex items-end">
            <Button type="submit" loading={busy}>
              Salvar premissas
            </Button>
          </div>
        </form>
      </Card>

      <LogoSection />

      {profile.isAdmin && <CubImport />}

      <Card>
        <h2 className="text-lg">Conta</h2>
        <p className="mb-4 mt-1 text-sm text-text-muted">
          {profile.email} · plano {profile.plan === "free" ? "grátis" : "Pro"}
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/planos" variant="secondary">
            Planos
          </ButtonLink>
          <Button
            variant="secondary"
            onClick={async () => {
              await repo.signOut();
              router.push("/");
            }}
          >
            Sair
          </Button>
          {BACKEND === "supabase" && (
            <Button
              variant="secondary"
              onClick={async () => {
                await repo.signOut(true);
                router.push("/");
              }}
            >
              Sair de todos os aparelhos
            </Button>
          )}
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Excluir conta
          </Button>
        </div>
      </Card>

      <Modal open={confirmDelete} onOpenChange={setConfirmDelete} title="Excluir sua conta?" description="Todos os projetos, cenários, links e o logo somem, e a assinatura é cancelada. Não dá para desfazer.">
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await repo.deleteAccount();
                router.push("/");
              } catch (e) {
                toast("error", errorMessage(e));
                setDeleting(false);
              }
            }}
          >
            Excluir tudo
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function ConfigPage() {
  return (
    <RequireSession>
      <PageTitle title="Conta" />
      <Settings />
    </RequireSession>
  );
}
