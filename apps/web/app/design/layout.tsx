import type { Metadata } from "next";

// Título da página (WCAG 2.4.2): a tela é um componente de cliente e não pode exportar metadata.
export const metadata: Metadata = { title: "Design system" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
