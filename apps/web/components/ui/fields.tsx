"use client";

import { formatInput, parseBR } from "@calc/core";
import { Zap } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

const box =
  "flex h-[var(--layout-input-height)] items-center gap-2 rounded-lg border bg-surface px-3 " +
  "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus";

export function FieldShell({
  id,
  label,
  hint,
  error,
  children,
  className = "",
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1 block text-label uppercase tracking-[0.04em] text-text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1 text-xs font-bold text-danger">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-msg`} className="mt-1 text-xs text-text-muted">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export interface NumberFieldProps {
  label: ReactNode;
  value: number | null;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  digits?: number;
  min?: number;
  max?: number;
  hint?: ReactNode;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  auto?: boolean;
  className?: string;
  /** nome completo para leitores de tela, com a unidade por extenso */
  srUnit?: string;
}

/**
 * Campo numérico em pt-BR. Mostra formatado ("280.000,00") fora de foco e o
 * texto cru enquanto a pessoa digita. Só chama onChange com número válido.
 */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  digits = 2,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  hint,
  required,
  readOnly,
  disabled,
  auto,
  className,
  srUnit,
}: NumberFieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value == null ? "" : formatInput(value, digits));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!focused) setText(value == null ? "" : formatInput(value, digits));
  }, [value, digits, focused]);

  const empty = required && (value == null || value === 0) && !focused;
  // BUG-006: text-subtle sobre surface-muted dá 4,34:1; no campo somente leitura usa text-muted
  const affixColor = readOnly ? "text-text-muted" : "text-text-subtle";
  const shownError = error ?? (empty ? "Obrigatório para calcular." : null);

  return (
    <FieldShell id={id} label={label} hint={hint} error={shownError} className={className}>
      <div
        aria-disabled={disabled || undefined}
        className={`${box} ${shownError ? "border-danger" : "border-border-input"} ${readOnly ? "bg-surface-muted" : ""} ${disabled ? "opacity-50" : ""}`}
      >
        {prefix && (
          <span aria-hidden className={`text-sm font-medium ${affixColor}`}>
            {prefix}
          </span>
        )}
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base font-bold tabular-nums text-text outline-none"
          value={text}
          placeholder={formatInput(0, digits)}
          readOnly={readOnly}
          disabled={disabled}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={hint || shownError ? `${id}-msg` : undefined}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => {
            setFocused(false);
            setError(null);
          }}
          onChange={(e) => {
            setText(e.target.value);
            const n = parseBR(e.target.value);
            if (e.target.value.trim() === "") {
              setError(null);
              onChange(0);
            } else if (n == null) setError("Número inválido. Use vírgula para centavos.");
            else if (n < min) setError(`Mínimo: ${formatInput(min, digits)}.`);
            else if (n > max) setError(`Máximo: ${formatInput(max, digits)}.`);
            else {
              setError(null);
              onChange(n);
            }
          }}
        />
        {srUnit && <span className="sr-only">{srUnit}</span>}
        {suffix && (
          <span aria-hidden className={`whitespace-nowrap text-sm font-medium ${affixColor}`}>
            {suffix}
          </span>
        )}
        {auto && (
          <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2 text-xs font-bold text-accent">
            <Zap aria-hidden className="h-3 w-3" />
            auto
          </span>
        )}
      </div>
    </FieldShell>
  );
}

/** Centavos ↔ reais. */
export function MoneyField(p: Omit<NumberFieldProps, "value" | "onChange" | "prefix"> & { cents: number; onCents: (c: number) => void }) {
  const { cents, onCents, ...rest } = p;
  return <NumberField {...rest} prefix="R$" srUnit="reais" value={cents / 100} onChange={(v) => onCents(Math.round(v * 100))} />;
}

/** Basis points ↔ %. */
export function PercentField(p: Omit<NumberFieldProps, "value" | "onChange"> & { bps: number; onBps: (b: number) => void; unit?: string }) {
  const { bps, onBps, unit = "%", ...rest } = p;
  return (
    <NumberField {...rest} max={rest.max ?? 1000} suffix={unit} srUnit="por cento" value={bps / 100} onChange={(v) => onBps(Math.round(v * 100))} />
  );
}

export function IntField(p: Omit<NumberFieldProps, "digits" | "onChange"> & { onChange: (n: number) => void }) {
  return <NumberField {...p} digits={0} onChange={(v) => p.onChange(Math.round(v))} />;
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  maxLength = 120,
  className,
  type = "text",
  autoComplete,
  required,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  maxLength?: number;
  className?: string;
  type?: "text" | "email";
  autoComplete?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      <div className={`${box} border-border-input`}>
        <input
          id={id}
          type={type}
          required={required}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-base font-bold text-text outline-none"
          value={value}
          maxLength={maxLength}
          aria-describedby={hint ? `${id}-msg` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </FieldShell>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  className,
}: {
  label: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      <div className={`${box} border-border-input`}>
        <select
          id={id}
          className="min-w-0 flex-1 cursor-pointer bg-transparent text-base font-bold text-text outline-none"
          value={value}
          aria-describedby={hint ? `${id}-msg` : undefined}
          onChange={(e) => onChange(e.target.value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </FieldShell>
  );
}
