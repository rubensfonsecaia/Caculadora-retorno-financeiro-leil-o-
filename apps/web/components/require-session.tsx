"use client";

import { LogIn } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { useSession } from "@/lib/hooks";

export function RequireSession({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const path = usePathname();
  if (loading)
    return (
      <div aria-busy className="grid gap-4">
        <Skeleton className="h-7 w-[16rem]" />
        <Skeleton className="h-[8rem] w-full" />
      </div>
    );
  if (!session)
    return (
      <Card>
        <EmptyState
          icon={<LogIn />}
          title="Entre para ver seus projetos"
          text="Os estudos salvos ficam na sua conta."
          action={<ButtonLink href={`/entrar?next=${encodeURIComponent(path)}`}>Entrar</ButtonLink>}
        />
      </Card>
    );
  return <>{children}</>;
}
