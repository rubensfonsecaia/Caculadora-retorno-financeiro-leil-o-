import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

// Todo teste: falha com erro no console, erro de página ou resposta 5xx.
// `a11y()` roda o axe (WCAG 2.2 AA) na tela atual.

export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
      page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
      page.on("response", (r) => r.status() >= 500 && problems.push(`${r.status()} ${r.url()}`));
      await use(problems);
      expect(problems, "erros no console ou respostas 5xx").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export async function a11y(page: Page, label = "") {
  await page.waitForLoadState("networkidle");
  // componentes inativos são isentos de contraste (WCAG 1.4.3)
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude("[aria-disabled='true']").analyze();
  const found = r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
  expect(found, `acessibilidade ${label}`).toEqual([]);
}

export async function noHorizontalScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, "rolagem horizontal").toBeLessThanOrEqual(0);
}

/** Login da demonstração (sem senha): cada e-mail é uma conta nova com 2 projetos de exemplo. */
export async function signIn(page: Page, email = `pessoa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@exemplo.invalid`) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/projetos/);
  return email;
}

/** Salva um estudo a partir da calculadora e devolve o id do projeto. */
export async function saveFromCalculator(page: Page, name: string) {
  await page.goto("/calcular");
  await expect(page.getByText(/lucro líquido/)).toBeVisible();
  await page.getByRole("button", { name: "Salvar projeto" }).click();
  await page.getByLabel("Nome do projeto").fill(name);
  await page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }).click();
  await page.waitForURL(/\/projetos\/[^/]+\/resultado/);
  return page.url().split("/")[4]!;
}

/** Valor do campo pelo rótulo, como número (pt-BR). */
export const field = (page: Page, label: string | RegExp) => page.getByLabel(label, { exact: typeof label === "string" });
