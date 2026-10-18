"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

/** Setas movem a seleção dentro de um radiogroup (padrão WAI-ARIA). */
function useRovingKeys<T>(options: T[], value: T, onChange: (v: T) => void) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent) => {
    const i = options.indexOf(value);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % options.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + options.length) % options.length;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next]!);
    refs.current[next]?.focus();
  };
  return { refs, onKeyDown };
}

const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/** Alternância segmentada (ex.: Estimar / Manual). */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode; disabled?: boolean }[];
}) {
  const { refs, onKeyDown } = useRovingKeys(
    options.filter((o) => !o.disabled).map((o) => o.value),
    value,
    onChange,
  );
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1 rounded-lg bg-surface-muted p-1" onKeyDown={onKeyDown}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={o.disabled}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={`inline-flex h-[var(--space-8)] items-center gap-2 rounded px-3 text-sm font-bold ${ring} disabled:opacity-45 ${
            o.value === value ? "bg-surface text-text shadow-card" : "text-text-muted"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Cartões de escolha única (ex.: regime fiscal). */
export function RadioCards<T extends string>({
  label,
  value,
  onChange,
  options,
  describedBy,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; title: string; text: string }[];
  describedBy?: string;
}) {
  const { refs, onKeyDown } = useRovingKeys(
    options.map((o) => o.value),
    value,
    onChange,
  );
  return (
    <div role="radiogroup" aria-label={label} aria-describedby={describedBy} className="grid grid-cols-1 gap-3 md:grid-cols-2" onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <div
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), onChange(o.value))}
            className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 ${ring} ${
              on ? "border-2 border-accent bg-accent-soft p-[calc(var(--space-3)-1px)]" : "border border-border bg-surface"
            }`}
          >
            <span aria-hidden className={`h-5 w-5 flex-none rounded-pill ${on ? "border-[length:var(--space-2)] border-accent" : "border-2 border-border-input"}`} />
            <span>
              <b className="block text-sm">{o.title}</b>
              <span className="text-xs text-text-muted">{o.text}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Atalhos de % (10%…100%), botões alternáveis. */
export function QuickPercent({ label, value, onChange, steps }: { label: string; value: number; onChange: (bps: number) => void; steps: number[] }) {
  const id = useId();
  return (
    <div>
      <span id={id} className="mb-1 block text-label uppercase tracking-[0.04em] text-text-muted">
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={value === s}
            onClick={() => onChange(s)}
            className={`h-[var(--space-7)] min-w-[var(--layout-touch-target-min)] rounded-pill px-2 text-xs font-bold ${ring} ${
              value === s ? "bg-accent text-on-accent" : "bg-surface-muted text-text-muted"
            }`}
          >
            {s / 100}%
          </button>
        ))}
      </div>
    </div>
  );
}

/** Slider nativo ligado a um valor, com texto lido por leitor de tela. */
export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  valueText,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  valueText: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label uppercase tracking-[0.04em] text-text-muted">
          {label}
        </label>
        <span className="text-sm font-bold tabular-nums">{valueText}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-[var(--space-6)] w-full cursor-pointer accent-accent"
      />
    </div>
  );
}
