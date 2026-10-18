"use client";

import { compute } from "@calc/core";
import { Link2Off } from "lucide-react";
import { useParams } from "next/navigation";
import { ReportBody } from "@/components/project/report-body";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { repo } from "@/lib/data";
import { useLive } from "@/lib/hooks";

export default function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const { data, loading } = useLive(() => repo.getSharedProject(token), [token]);
  if (loading) return <Skeleton className="h-[24rem] w-full" />;
  const r = data ? compute(data.inputs) : null;
  if (!data || !r?.ok)
    return (
      <Card>
        <EmptyState icon={<Link2Off />} title="Link indisponível" text="Ele foi desativado, ou o estudo não existe mais." action={<ButtonLink href="/calcular">Fazer o meu estudo</ButtonLink>} />
      </Card>
    );
  return (
    <div className="mx-auto max-w-[56rem]">
      <ReportBody name={data.name} address={data.address} inputs={data.inputs} r={r} />
    </div>
  );
}
