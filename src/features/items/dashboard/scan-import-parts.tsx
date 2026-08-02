"use client";

import type { ReactNode } from "react";

export function Note({
  label,
  children,
  accent,
}: {
  label: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <p className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed">
      <span className="shrink-0" style={{ color: "var(--lv-ink-2)" }}>
        {label}
      </span>
      <span style={{ color: accent ? "var(--lv-accent)" : "var(--lv-ink)" }}>
        {children}
      </span>
    </p>
  );
}

export function PillButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-[2px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] disabled:opacity-40"
      style={{
        borderColor: "var(--lv-ink)",
        background: active ? "var(--lv-ink)" : "transparent",
        color: active ? "var(--lv-bg)" : "var(--lv-ink)",
      }}
    >
      {children}
    </button>
  );
}

export function Action({
  children,
  onClick,
  solid,
}: {
  children: ReactNode;
  onClick: () => void;
  solid?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex items-center gap-2 overflow-hidden border-[3px] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em]"
      style={{
        borderColor: "var(--lv-ink)",
        background: solid ? "var(--lv-ink)" : "var(--lv-bg)",
        color: solid ? "var(--lv-bg)" : "var(--lv-ink)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
        style={{ background: "var(--lv-accent)" }}
      />
      <span className="relative">{children}</span>
    </button>
  );
}
