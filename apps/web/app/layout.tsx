import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BottomNav, TopNav } from "@/components/ui/nav";
import { ToastProvider } from "@/components/ui/toast";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "700", "800", "900"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen [--font-sans:var(--font-inter),system-ui,sans-serif]">
        <ToastProvider>
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-raised"
          >
            Pular para o conteúdo
          </a>
          <TopNav />
          <main id="conteudo" className="mx-auto max-w-content px-4 pb-[calc(var(--layout-mobile-tab-bar)+var(--layout-mobile-result-bar)+var(--space-6))] pt-6 md:px-6 md:pb-9 print:p-0">
            {children}
          </main>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
