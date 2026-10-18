import { PlanLimitError, RepoError } from "@/lib/data";

const MESSAGES: Record<string, string> = {
  not_authenticated: "Sua sessão expirou. Entre de novo.",
  invalid_input: "Algum valor está fora do permitido. Confira os campos.",
  rate_limited: "Muitas tentativas seguidas. Espere alguns minutos.",
  forbidden: "Você não tem permissão para isso.",
  not_found: "Não encontrado. Pode ter sido excluído.",
  duplicate_name: "Já existe um cenário com esse nome.",
  bad_type: "Use uma imagem PNG ou JPG.",
  too_large: "A imagem passa de 1 MB.",
  unsupported_in_demo: "Isso só funciona com a conta de verdade, não na demonstração.",
  billing_error: "Não deu para falar com o sistema de pagamento. Tente de novo.",
  already_subscribed: "Você já assina o Pro.",
  no_customer: "Ainda não há assinatura para gerenciar.",
};

/** Mensagem em português para qualquer erro da camada de dados ou das rotas. */
export function errorMessage(e: unknown): string {
  if (e instanceof PlanLimitError) return "O plano grátis guarda 3 projetos ativos. Arquive um ou veja os planos.";
  const code = e instanceof RepoError ? e.code : typeof e === "string" ? e : "";
  return MESSAGES[code] ?? "Algo deu errado. Tente de novo.";
}
