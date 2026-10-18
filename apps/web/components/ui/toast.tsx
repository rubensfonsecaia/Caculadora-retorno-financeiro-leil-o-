"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: Tone;
  text: string;
}

const Ctx = createContext<(tone: Tone, text: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

const icon = {
  success: <CheckCircle2 aria-hidden className="h-5 w-5 text-success-on-inverse" />,
  error: <XCircle aria-hidden className="h-5 w-5 text-danger-on-inverse" />,
  info: <Info aria-hidden className="h-5 w-5 text-on-inverse-muted" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const close = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (tone: Tone, text: string) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, tone, text }]);
      if (tone !== "error") setTimeout(() => close(id), 5000);
    },
    [close],
  );
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--layout-mobile-tab-bar)+var(--layout-mobile-result-bar)+var(--space-3))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex max-w-full items-center gap-3 rounded-lg bg-surface-inverse px-4 py-3 text-sm text-on-inverse shadow-raised"
          >
            {icon[t.tone]}
            <span className="min-w-0">{t.text}</span>
            <button type="button" onClick={() => close(t.id)} className="rounded p-1 text-on-inverse-muted hover:text-on-inverse" aria-label="Fechar aviso">
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
