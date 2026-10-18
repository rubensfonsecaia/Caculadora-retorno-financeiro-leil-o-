import { FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Card>
      <EmptyState icon={<FileQuestion />} title="Página não encontrada" text="O endereço pode estar errado ou a página mudou de lugar." action={<ButtonLink href="/">Ir para o início</ButtonLink>} />
    </Card>
  );
}
