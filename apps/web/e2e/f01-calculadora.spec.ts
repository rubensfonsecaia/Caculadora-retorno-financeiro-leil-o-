import { a11y, expect, field, noHorizontalScroll, test } from "./fixtures";

const result = (page: import("@playwright/test").Page) => page.getByRole("complementary", { name: "Resultado" });

test.describe("F01 estudo rápido sem conta", () => {
  test("F01-H1 resultado muda ao digitar, sem botão de calcular @mobile", async ({ page }) => {
    await page.goto("/calcular");
    await expect(result(page).getByText("Viável")).toBeVisible();
    const before = await result(page).locator("section").first().innerText();
    await field(page, "Preço de venda").fill("900.000");
    await expect(result(page).getByText("Marginal")).toBeVisible();
    expect(await result(page).locator("section").first().innerText()).not.toEqual(before);
    await noHorizontalScroll(page);
    await a11y(page, "S02");
  });

  test("F01-H2 rascunho sobrevive ao recarregar", async ({ page }) => {
    await page.goto("/calcular");
    await field(page, "Preço de venda").fill("1.350.000");
    await field(page, "Área construída").click(); // tira o foco: campo volta formatado
    await page.reload();
    await expect(field(page, "Preço de venda")).toHaveValue("1.350.000,00");
  });

  test("F01-E1 preço vazio pede o dado em vez de mostrar zero", async ({ page }) => {
    await page.goto("/calcular");
    await field(page, "Preço de venda").fill("");
    await field(page, "Área construída").click();
    await expect(result(page).getByText("Preencha o preço de venda para ver o resultado.")).toBeVisible();
    await expect(page.getByText("Obrigatório para calcular.").first()).toBeVisible();
    await expect(field(page, "Preço de venda")).toHaveAttribute("aria-invalid", "true");
  });

  test("F01-E2 prejuízo aparece com sinal de menos", async ({ page }) => {
    await page.goto("/calcular");
    await field(page, "Preço de venda").fill("500.000");
    await expect(result(page).getByText("Inviável")).toBeVisible();
    await expect(result(page).getByText(/^−R\$ /).first()).toBeVisible();
  });

  test("F01-E3 texto inválido mostra erro e mantém o último valor", async ({ page }) => {
    await page.goto("/calcular");
    await field(page, "Preço de venda").fill("abc");
    await expect(page.getByText("Número inválido. Use vírgula para centavos.")).toBeVisible();
    await expect(result(page).getByText("Viável")).toBeVisible(); // continua com 1.200.000
  });

  test("F01-E4 formatos brasileiros", async ({ page }) => {
    await page.goto("/calcular");
    for (const [typed, shown] of [
      ["1.234.567", "1.234.567,00"],
      ["1234567,89", "1.234.567,89"],
      ["R$ 900.000", "900.000,00"],
    ]) {
      await field(page, "Preço de venda").fill(typed);
      await field(page, "Área construída").click();
      await expect(field(page, "Preço de venda")).toHaveValue(shown);
    }
  });

  test("F01-E5 valores absurdos não viram NaN nem Infinity", async ({ page }) => {
    await page.goto("/calcular");
    await field(page, "Área construída").fill("0");
    await expect(result(page).getByText(/Preencha a área construída/)).toBeVisible();
    await field(page, "Área construída").fill("140");
    await field(page, "Sua TMA").fill("500");
    await expect(page.locator("body")).not.toContainText(/NaN|Infinity/);
  });

  test("F01-E7 barra de resultado no celular leva ao resultado @mobile-only", async ({ page }) => {
    await page.goto("/calcular");
    const bar = page.getByRole("link", { name: /Viável, lucro .* Ver detalhes/ });
    await expect(bar).toBeVisible();
    await bar.click();
    await expect(result(page)).toBeInViewport();
  });

  test("F01-E8 só teclado chega ao botão salvar", async ({ page }) => {
    await page.goto("/calcular");
    let reached = false;
    for (let i = 0; i < 40 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = (await page.evaluate(() => document.activeElement?.textContent)) === "Salvar projeto";
    }
    expect(reached).toBe(true);
  });

  test("F01-E9 funciona com o armazenamento bloqueado", async ({ page }) => {
    await page.addInitScript(() => {
      const deny = () => {
        throw new DOMException("bloqueado", "SecurityError");
      };
      Storage.prototype.getItem = deny;
      Storage.prototype.setItem = deny;
      Storage.prototype.removeItem = deny;
    });
    await page.goto("/calcular");
    await expect(result(page).getByText("Viável")).toBeVisible();
    await field(page, "Preço de venda").fill("900.000");
    await expect(result(page).getByText("Marginal")).toBeVisible();
  });

  test("F01-N1 rascunho corrompido volta aos valores de exemplo", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("cc:draft:v1", "{não é json"));
    await page.goto("/calcular");
    await expect(field(page, "Preço de venda")).toHaveValue("1.200.000,00");
    await expect(result(page).getByText("Viável")).toBeVisible();
  });
});

test.describe("F03 quanto posso pagar no terreno", () => {
  test("F03-H1 tetos em ordem: TMA ≤ Selic ≤ sem prejuízo", async ({ page }) => {
    await page.goto("/calcular");
    await field(page, "Sua TMA").fill("1,5"); // TMA acima da Selic
    const card = page.getByText("Quanto dá para pagar no terreno").locator("..");
    const value = async (label: RegExp) => {
      const t = await card.locator("li", { hasText: label }).locator("b").innerText();
      return Number(t.replace(/[^\d,]/g, "").replace(",", "."));
    };
    const tma = await value(/sua TMA/);
    const selic = await value(/Selic/);
    const zero = await value(/não ter prejuízo/);
    expect(tma).toBeLessThanOrEqual(selic);
    expect(selic).toBeLessThanOrEqual(zero);
  });

  test("F03-E1 nem de graça", async ({ page }) => {
    await page.goto("/calcular");
    await field(page, "Preço de venda").fill("300.000");
    await expect(page.getByText("nem de graça").first()).toBeVisible();
  });
});
