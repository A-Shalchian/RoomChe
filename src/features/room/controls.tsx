"use client";

import type { ReactNode } from "react";

const LABEL =
  "w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em]";

export function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <p className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed">
      <span className={LABEL} style={{ color: "var(--lv-ink-2)" }}>
        {label}
      </span>
      <span>{children}</span>
    </p>
  );
}

export function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className={LABEL} style={{ color: "var(--lv-ink-2)" }}>
        {label}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? Number(value.toFixed(3)) : 0}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="w-24 border-[2px] bg-transparent px-2 py-1 font-mono text-[10px] tracking-[0.12em] outline-none"
        style={{ borderColor: "var(--lv-ink)", color: "var(--lv-ink)" }}
      />
    </label>
  );
}

export function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className={LABEL} style={{ color: "var(--lv-ink-2)" }}>
        {label}
      </span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-12 cursor-pointer border-[2px] bg-transparent p-0.5"
        style={{ borderColor: "var(--lv-ink)" }}
      />
      <span
        className="font-mono text-[10px] uppercase tracking-[0.16em]"
        style={{ color: "var(--lv-ink-2)" }}
      >
        {value}
      </span>
    </label>
  );
}

export function Small({
  children,
  onClick,
  disabled,
  solid,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  solid?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-[2px] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] disabled:opacity-40"
      style={{
        borderColor: "var(--lv-ink)",
        background: solid ? "var(--lv-ink)" : "transparent",
        color: solid ? "var(--lv-bg)" : "var(--lv-ink)",
      }}
    >
      {children}
    </button>
  );
}
