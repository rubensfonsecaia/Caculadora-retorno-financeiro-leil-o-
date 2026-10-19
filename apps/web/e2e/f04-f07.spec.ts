import type { Page } from "@playwright/test";
import { a11y, expect, field, noHorizontalScroll, saveFromCalculator, signIn, test } from "./fixtures";

const tabs = (page: Page, name: string) => page.getByRole("navigation", { name: "Seções do projeto" }).getByRole("link", { name, exact: true });

test.describe("F04 testar cenários", () => {
  test("F04-H1 cenários fixos pioram em ordem; tornado e preço mínimo @mobile", async ({ page }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Cenários");
    await page.goto(`/projetos/${id}/cenarios`);
    const profit = async (name: string) => {
      const t = await page.getByRole("row", { name: new RegExp(`^${name}`) }).getByRole("cell").nth(1).innerText();
      return Number(t.replace(/[^\d−-]/g, "").replace("−", "-"));
    };
    const [a, b, c] = [await profit("Esperado"), await profit("Pessimista"), await profit("Muito pessimista")];
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    await expect(page.getByText("O que mais mexe no lucro")).toBeVisible();
    await expect(page.getByText("Preço mínimo de venda")).toBeVisible();
    await noHorizontalScroll(page);
    await a11y(page, "S13");
  });

  test("F04-H2 criar, editar e excluir cenário próprio", async ({ page }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Cenário próprio");
    await page.goto(`/projetos/${id}/cenarios`);
    await page.getByRole("button", { name: "Novo cenário" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Nome").fill("Venda lenta");
    await dlg.getByLabel("Prazo de venda").fill("8");
    await a11y(page, "modal cenário");
    await dlg.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("rowheader", { name: "Venda lenta" })).toBeVisible();
    await page.getByRole("button", { name: "Editar Venda lenta" }).click();
    await page.getByRole("dialog").getByLabel("Nome").fill("Venda muito lenta");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("rowheader", { name: "Venda muito lenta" })).toBeVisible();
    await page.getByRole("button", { name: "Excluir Venda muito lenta" }).click();
    await expect(page.getByRole("rowheader", { name: "Venda muito lenta" })).toHaveCount(0);
  });

  test("F04-E1 nome de cenário repetido avisa", async ({ page }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Repetido");
    await page.goto(`/projetos/${id}/cenarios`);
    for (let k = 0; k < 2; k++) {
      await page.getByRole("button", { name: "Novo cenário" }).click();
      await page.getByRole("dialog").getByLabel("Nome").fill("Igual");
      await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    }
    await expect(page.getByText("Já existe um cenário com esse nome.").first()).toBeVisible();
    await page.keyboard.press("Escape"); // fecha o modal que ficou aberto
    await expect(page.getByRole("rowheader", { name: "Igual" })).toHaveCount(1);
  });

  test("F04-E2 preço −90% dá prejuízo sem quebrar", async ({ page }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Extremo");
    await page.goto(`/projetos/${id}/cenarios`);
    await page.getByRole("button", { name: "Novo cenário" }).click();
    await page.getByRole("dialog").getByLabel("Nome").fill("Desastre");
    await page.getByRole("dialog").getByLabel("Preço de venda").fill("-90");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("row", { name: /^Desastre/ }).getByText("Inviável")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/NaN|Infinity/);
  });
});

test.describe("F05 comparar projetos", () => {
  test("F05-H1 lado a lado com o melhor marcado @mobile", async ({ page }) => {
    await signIn(page);
    await page.goto("/comparar");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("(melhor)").first()).toBeAttached();
    await noHorizontalScroll(page);
    await a11y(page, "S14");
  });

  test("F05-E1 com menos de 2 projetos mostra estado vazio", async ({ page }) => {
    await signIn(page);
    await page.goto("/projetos");
    await page.getByRole("button", { name: /^Arquivar Exemplo: sobrado/ }).click();
    await expect(page.getByText(/1 de 3 projetos ativos/)).toBeVisible();
    await page.goto("/comparar");
    await expect(page.getByRole("heading", { name: "Precisa de pelo menos 2 projetos" })).toBeVisible();
  });

  test("F05-E2 no máximo 4 marcados", async ({ page }) => {
    await signIn(page);
    await saveFromCalculator(page, "Terceiro");
    await page.goto("/projetos");
    await page.getByRole("button", { name: /^Arquivar Exemplo: sobrado/ }).click();
    await expect(page.getByText(/2 de 3 projetos ativos/)).toBeVisible();
    await saveFromCalculator(page, "Quarto");
    await page.goto("/projetos");
    await page.getByRole("button", { name: "Arquivados" }).click();
    await page.getByRole("button", { name: /^Desarquivar Exemplo: sobrado/ }).click(); // pode ser recusado (limite)
    await page.goto("/comparar");
    const boxes = page.getByRole("checkbox");
    const n = await boxes.count();
    for (let i = 0; i < n; i++) if (!(await boxes.nth(i).isChecked())) await boxes.nth(i).check();
    let checked = 0;
    for (let i = 0; i < n; i++) if (await boxes.nth(i).isChecked()) checked++;
    expect(checked).toBeLessThanOrEqual(4);
  });
});

test.describe("F06 mandar o estudo para alguém", () => {
  test("F06-H1 criar link, abrir só leitura, revogar @mobile", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await signIn(page);
    const id = await saveFromCalculator(page, "Para o banco");
    await page.goto(`/projetos/${id}/relatorio`);
    await a11y(page, "S15");
    await page.getByRole("button", { name: "Criar link" }).click();
    const code = page.locator("code", { hasText: "/p/" });
    await expect(code).toBeVisible();
    const path = (await code.innerText()).trim();
    const shared = await context.newPage();
    await shared.goto(path);
    await expect(shared.getByRole("heading", { name: "Para o banco" })).toBeVisible();
    await expect(shared.getByRole("textbox")).toHaveCount(0); // só leitura
    await page.getByRole("button", { name: "Desativar este link" }).click();
    await shared.reload();
    await expect(shared.getByRole("heading", { name: "Link indisponível" })).toBeVisible();
    await noHorizontalScroll(page);
  });

  test("F06-H2 imprimir chama a impressão do navegador", async ({ page }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Imprimir");
    await page.goto(`/projetos/${id}/relatorio`);
    await page.evaluate(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => void ((window as unknown as { __printed: number }).__printed += 1);
    });
    await page.getByRole("button", { name: "Imprimir ou salvar PDF" }).click();
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeHidden();
  });

  test("F06-E2 token inventado", async ({ page }) => {
    await page.goto("/p/abc");
    await expect(page.getByRole("heading", { name: "Link indisponível" })).toBeVisible();
    await a11y(page, "link indisponível");
  });

  test("F06-E3 relatório de projeto incompleto pede o dado", async ({ page }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Incompleto");
    await page.goto(`/projetos/${id}/venda`);
    await field(page, "Preço de venda").fill("");
    await page.waitForTimeout(1200);
    await page.goto(`/projetos/${id}/relatorio`);
    await expect(page.getByText(/Preencha o preço de venda para gerar o relatório/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Imprimir ou salvar PDF" })).toBeDisabled();
  });
});

test.describe("F07 assinar e cancelar", () => {
  test("F07-E3 checkout e portal recusam sem login; cron sem segredo", async ({ request }) => {
    // modo demonstração: sem Supabase não há sessão, então nada passa
    expect((await request.post("/api/stripe/checkout", { data: { interval: "month" } })).status()).toBe(503);
    expect((await request.post("/api/stripe/portal")).status()).toBe(503);
    expect([401, 404]).toContain((await request.get("/api/cron/prune")).status());
    expect((await request.post("/api/stripe/webhook", { data: "{}" })).status()).toBe(400);
  });

  test("F07-H0 planos na demonstração não fingem cobrar @mobile", async ({ page }) => {
    await page.goto("/planos");
    await expect(page.getByRole("button", { name: /indisponível na demonstração/ })).toBeDisabled();
    await noHorizontalScroll(page);
    await a11y(page, "S17");
  });
});

test.describe("S01 S03 S16 e tema escuro", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`X-1/X-2 telas sem violações de acessibilidade (${scheme}) @mobile`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of ["/", "/entrar", "/calcular", "/planos", "/design"]) {
        await page.goto(path);
        await a11y(page, `${path} ${scheme}`);
        await noHorizontalScroll(page);
      }
      await signIn(page);
      for (const path of ["/projetos", "/comparar", "/config"]) {
        await page.goto(path);
        await a11y(page, `${path} ${scheme}`);
        await noHorizontalScroll(page);
      }
      const id = await saveFromCalculator(page, `Tema ${scheme}`);
      for (const s of ["terreno", "obra", "prazo", "financiamento", "venda", "impostos", "resultado", "fluxo", "cenarios", "relatorio"]) {
        await page.goto(`/projetos/${id}/${s}`);
        await expect(page.locator("main")).not.toBeEmpty();
        await a11y(page, `${s} ${scheme}`);
        await noHorizontalScroll(page);
      }
    });
  }

  test("X-6 datas no fuso do navegador", async ({ page }) => {
    await signIn(page);
    await page.goto("/projetos");
    const today = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    await expect(page.getByText(`Editado em ${today}`).first()).toBeVisible();
  });

  test("X-7 navegar pelas abas mantém o título da página", async ({ page }) => {
    await signIn(page);
    const id = await saveFromCalculator(page, "Título");
    for (const t of ["Terreno", "Obra", "Prazo", "Financiamento", "Venda", "Impostos", "Resultado", "Fluxo de caixa", "Cenários"]) {
      await tabs(page, t).click();
      await page.waitForURL(new RegExp(`/projetos/${id}/`));
      await expect.poll(() => page.title()).not.toBe("");
    }
  });
});
