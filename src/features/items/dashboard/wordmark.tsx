"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { font } from "@/features/theme/config";

export function Wordmark() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <h1
      className="flex items-center leading-none tracking-[-0.03em]"
      style={{
        fontFamily: font.family,
        fontWeight: font.weight,
        fontSize: "clamp(1.4rem, 2.6vw, 2.1rem)",
      }}
    >
      <Link href="/" aria-label="roomche home">
        Room
      </Link>
      <span
        ref={wrapRef}
        className="relative inline-block"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-describedby="wordmark-gloss"
          className="cursor-help underline-offset-[6px] decoration-dotted hover:underline focus:outline-none focus-visible:underline"
          style={{
            color: "var(--lv-accent)",
            textDecorationColor: "color-mix(in srgb, var(--lv-accent) 50%, transparent)",
          }}
        >
          Che
        </button>

        <span
          id="wordmark-gloss"
          role="tooltip"
          aria-hidden={!open}
          className={`pointer-events-none absolute left-0 top-full z-50 mt-3 w-[280px] origin-top-left transition duration-150 ease-out ${
            open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
          }`}
        >
          <span
            aria-hidden
            className="absolute -top-1.5 left-6 block h-3 w-3 rotate-45 border-l-[3px] border-t-[3px]"
            style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
          />
          <span
            className="relative block border-[3px] px-4 py-3 text-left"
            style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
          >
            <span className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
              <span>che</span>
              <span>/tʃɛ/</span>
              <span className="ml-auto">fa.</span>
            </span>
            <span className="mt-1.5 block text-[15px] leading-snug">
              <span className="italic text-[color:var(--lv-ink-2)]">adj.</span>{" "}
              small; cozy; intimate.
            </span>
            <span className="mt-1.5 block text-[13px] italic leading-snug text-[color:var(--lv-ink-2)]">
              &ldquo;the small room one keeps for oneself.&rdquo;
            </span>
          </span>
        </span>
      </span>
    </h1>
  );
}
