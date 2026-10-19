import type { Page } from "@playwright/test";
import { a11y, expect, field, noHorizontalScroll, saveFromCalculator, signIn, test } from "./fixtures";

const tabs = (page: Page, name: string) => page.getByRole("navigation", { name: "Seções do projeto" }).getByRole("link", { name, exact: true });

test.describe("F02 salvar e detalhar um projeto", () => {
  test("F02-H1 salvar sem conta: entrar, voltar e salvar com os mesmos números @mobile", async ({ page }) => {
    await page.goto("/calcular");
    await field(page, "Preço de venda").fill("1.300.000");
    const profitCalc = await page.getByRole("complementary", { name: "Resultado" }).locator("section p").nth(1).innerText();
    await page.getByRole("button", { name: "Salvar projeto" }).click();
    await page.waitForURL(/\/entrar/);
    await page.getByLabel("E-mail").fill(`f02h1-${Date.now()}@exemplo.invalid`);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(/calcular\?salvar=1/);
    await page.getByLabel("Nome do projeto").fill("Casa do teste");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }).click();
    await page.waitForURL(/\/resultado$/);
    await expect(page.getByText(profitCalc, { exact: true }).first()).toBeVisible();
    await noHorizontalScroll(page);
    await a11y(page, "S11");
  });

  test("F02-H2 editar cada aba salva e muda o resultado", async ({ page }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Edição por abas");
    const before = await page.locator("section[aria-live] p").nth(1).innerText();

    await tabs(page, "Terreno").click();
    await field(page, "Preço do terreno").fill("300.000");
    await a11y(page, "S05");
    await tabs(page, "Obra").click();
    await field(page, "Imprevistos").fill("15");
    await a11y(page, "S06");
    await tabs(page, "Prazo").click();
    await page.getByRole("radio", { name: "Igual todo mês" }).click();
    await a11y(page, "S07");
    await tabs(page, "Financiamento").click();
    await page.getByLabel("Parte da obra financiada").fill("50");
    await expect(field(page, "Juros")).toBeVisible();
    await a11y(page, "S08");
    await tabs(page, "Venda").click();
    await field(page, "Corretagem na venda").fill("6");
    await a11y(page, "S09");
    await tabs(page, "Impostos").click();
    await page.getByRole("radio", { name: /Empresa: RET/ }).click();
    await a11y(page, "S10");
    await page.waitForTimeout(1200); // autosave (debounce de 700 ms)
    await expect(page.getByText("Salvo")).toBeVisible({ timeout: 5000 });

    await page.goto(`/projetos/${id}/resultado`);
    const after = await page.locator("section[aria-live] p").nth(1).innerText();
    expect(after).not.toEqual(before);
    await page.goto(`/projetos/${id}/impostos`);
    await expect(page.getByRole("radio", { name: /Empresa: RET/ })).toHaveAttribute("aria-checked", "true");
    await page.goto(`/projetos/${id}/terreno`);
    await expect(field(page, "Preço do terreno")).toHaveValue("300.000,00");
  });

  test("F02-E1 nome longo com emoji e acento @mobile", async ({ page }) => {
    await signIn(page);
    const name = "Sobrado da Conceição 🏠 rua comprida que não acaba nunca, número 1234";
    await saveFromCalculator(page, name);
    await page.goto("/projetos");
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await noHorizontalScroll(page);
    await a11y(page, "S04");
  });

  test("F02-E2 sem nome vira 'Estudo sem nome'", async ({ page }) => {
    await signIn(page);
    await saveFromCalculator(page, "");
    await expect(page.getByLabel("Nome do projeto")).toHaveValue("Estudo sem nome");
  });

  test("F02-E3 duplo clique em salvar cria um projeto só", async ({ page }) => {
    await signIn(page);
    await page.goto("/calcular");
    await page.getByRole("button", { name: "Salvar projeto" }).click();
    await page.getByLabel("Nome do projeto").fill("Clique duplo");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }).dblclick();
    await page.waitForURL(/\/resultado$/);
    await page.goto("/projetos");
    await expect(page.getByRole("heading", { name: "Clique duplo" })).toHaveCount(1);
  });

  test("F02-E4 duas abas: a segunda a salvar é avisada, nada some em silêncio", async ({ page, context }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Duas abas");
    const other = await context.newPage();
    await page.goto(`/projetos/${id}/venda`);
    await other.goto(`/projetos/${id}/venda`);
    await field(page, "Corretagem na venda").fill("4");
    await expect(page.getByText("Salvo")).toBeVisible();
    await field(other, "Corretagem na venda").fill("7");
    await expect(other.getByRole("dialog", { name: "Este projeto mudou em outro lugar" })).toBeVisible({ timeout: 5000 });
  });

  test("F02-E5 recarregar logo depois de editar não corrompe", async ({ page }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Recarregar");
    await page.goto(`/projetos/${id}/venda`);
    await field(page, "Corretagem na venda").fill("4");
    // com edição ainda não salva, sair da página pede confirmação
    const prevented = await page.evaluate(() => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    });
    expect(prevented, "beforeunload com alteração pendente").toBe(true);
    await page.reload();
    await expect(field(page, "Corretagem na venda")).toHaveValue(/^(4,00|5,00)$/);
    await page.goto(`/projetos/${id}/resultado`);
    await expect(page.getByText(/Viável|Marginal|Inviável/).first()).toBeVisible();
  });

  test("F02-E6 limite do plano grátis: 4º projeto recusado, arquivar libera", async ({ page }) => {
    await signIn(page); // conta nova já tem 2 exemplos
    await saveFromCalculator(page, "Terceiro");
    await page.goto("/calcular");
    await page.getByRole("button", { name: "Salvar projeto" }).click();
    await page.getByLabel("Nome do projeto").fill("Quarto");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText(/plano grátis guarda 3 projetos/)).toBeVisible();
    await page.goto("/projetos");
    await expect(page.getByRole("heading", { name: "Quarto" })).toHaveCount(0);
    await page.getByRole("button", { name: /^Arquivar Exemplo: sobrado/ }).click();
    await expect(page.getByText(/2 de 3 projetos ativos/)).toBeVisible();
  });

  test("F02-E7 desarquivar não passa do limite do plano grátis", async ({ page }) => {
    await signIn(page);
    await page.goto("/projetos");
    await page.getByRole("button", { name: /^Arquivar Exemplo: sobrado/ }).click();
    await expect(page.getByText(/1 de 3 projetos ativos/)).toBeVisible();
    await saveFromCalculator(page, "Ocupa a vaga 2");
    await saveFromCalculator(page, "Ocupa a vaga 3");
    await page.goto("/projetos");
    await page.getByRole("button", { name: "Arquivados" }).click();
    await page.getByRole("button", { name: /^Desarquivar Exemplo: sobrado/ }).click();
    await page.getByRole("button", { name: "Ativos" }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/de 3 projetos ativos/)).toBeVisible();
    await expect(page.getByText(/\b[4-9] de 3 projetos ativos/)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Exemplo: sobrado/ })).toHaveCount(0); // continua arquivado
  });

  test("F02-E8 id inexistente mostra 'não encontrado'", async ({ page }) => {
    await signIn(page);
    await page.goto("/projetos/nao-existe/resultado");
    await expect(page.getByRole("heading", { name: "Projeto não encontrado" })).toBeVisible();
  });

  test("F02-E9 outro usuário não vê o projeto", async ({ page }) => {
    await signIn(page, `dono-${Date.now()}@exemplo.invalid`);
    const id = await saveFromCalculator(page, "Só do dono");
    await page.goto("/config");
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await page.waitForURL("/");
    await signIn(page, `outro-${Date.now()}@exemplo.invalid`);
    await page.goto(`/projetos/${id}/resultado`);
    await expect(page.getByRole("heading", { name: "Projeto não encontrado" })).toBeVisible();
    await expect(page.getByText("Só do dono")).toHaveCount(0);
  });

  test("F02-E10 sessão encerrada em outra aba: não salva em nome de ninguém", async ({ page, context }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Sessão");
    await page.goto(`/projetos/${id}/venda`);
    const other = await context.newPage();
    await other.goto("/config");
    await other.getByRole("button", { name: "Sair", exact: true }).click();
    // a aba aberta percebe a saída na hora e não deixa editar em nome de ninguém
    await expect(page.getByRole("heading", { name: "Entre para ver seus projetos" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("Corretagem na venda")).toHaveCount(0);
    await page.goto(`/projetos/${id}/venda`);
    await expect(page.getByRole("heading", { name: "Entre para ver seus projetos" })).toBeVisible();
  });

  test("F02-E11 excluir pelo modal", async ({ page }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Para excluir");
    await page.goto("/projetos");
    await page.getByRole("button", { name: "Excluir Para excluir" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await a11y(page, "modal excluir");
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByRole("heading", { name: "Para excluir" })).toHaveCount(0);
    await page.goto(`/projetos/${id}/resultado`);
    await expect(page.getByRole("heading", { name: "Projeto não encontrado" })).toBeVisible();
  });

  test("F02-N2 link de e-mail inválido volta para entrar", async ({ page }) => {
    await page.goto("/auth/callback?next=/projetos");
    // com Supabase: /entrar?erro=link; na demonstração não há link para conferir: /entrar
    await expect(page).toHaveURL(/\/entrar(\?erro=link)?$/);
  });

  test("F02-N3 nada redireciona para fora do site", async ({ page }) => {
    await page.goto("/auth/callback?next=//evil.com");
    expect(new URL(page.url()).hostname).toBe("localhost");
    await page.goto("/entrar?next=//evil.com");
    await page.getByLabel("E-mail").fill(`n3-${Date.now()}@exemplo.invalid`);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(/\/projetos/);
    expect(new URL(page.url()).hostname).toBe("localhost");
  });
});
