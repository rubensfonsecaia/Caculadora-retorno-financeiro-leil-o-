"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { FieldShell } from "@/components/ui/fields";

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  hint?: string;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <FieldShell id={id} label={label} hint={hint}>
      <div className="flex h-[var(--layout-input-height)] items-center gap-2 rounded-lg border border-border-input bg-surface pl-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          minLength={8}
          maxLength={72}
          aria-describedby={hint ? `${id}-msg` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base font-bold text-text outline-none"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? "Esconder senha" : "Mostrar senha"}
          className="inline-flex h-full w-[var(--layout-touch-target-min)] items-center justify-center rounded-r-lg text-text-subtle hover:text-text"
        >
          {show ? <EyeOff aria-hidden className="h-5 w-5" /> : <Eye aria-hidden className="h-5 w-5" />}
        </button>
      </div>
    </FieldShell>
  );
}
