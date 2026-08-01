"use client";

import { useState } from "react";
import {
  adviseForObject,
  type PoseAdvice,
} from "@/features/items/capture/pose-advice-action";
import type { ScanSubject } from "@/features/items/capture/scan-targets";

export function ScanAdvice({
  onSubject,
  disabled,
}: {
  onSubject: (subject: ScanSubject) => void;
  disabled?: boolean;
}) {
  const [name, setName] = useState("");
  const [advice, setAdvice] = useState<PoseAdvice | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (name.trim().length < 2 || asking) return;
    setAsking(true);
    setError(null);
    setAdvice(null);
    const result = await adviseForObject(name);
    if (result.ok) {
      setAdvice(result.advice);
      onSubject(result.advice.subject);
    } else {
      setError(result.error);
    }
    setAsking(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void ask();
          }}
          disabled={disabled || asking}
          placeholder="what is it? e.g. laptop"
          className="min-w-0 flex-1 border-[2px] bg-transparent px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] outline-none placeholder:[color:var(--lv-ink-2)] disabled:opacity-40"
          style={{ borderColor: "var(--lv-ink)", color: "var(--lv-ink)" }}
        />
        <button
          type="button"
          onClick={() => void ask()}
          disabled={disabled || asking || name.trim().length < 2}
          className="shrink-0 border-[2px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] disabled:opacity-40"
          style={{
            borderColor: "var(--lv-ink)",
            background: "var(--lv-ink)",
            color: "var(--lv-bg)",
          }}
        >
          {asking ? "thinking…" : "how?"}
        </button>
      </div>

      {error && (
        <p
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: "var(--lv-accent)" }}
        >
          {error}
        </p>
      )}

      {advice && (
        <div
          className="flex flex-col gap-1.5 border-l-[3px] pl-3"
          style={{ borderColor: "var(--lv-accent)" }}
        >
          <Row label="pose" accent>
            {advice.pose}
          </Row>
          <Row label="shots">{advice.photos} photos</Row>
          <ol className="flex flex-col gap-1">
            {advice.steps.map((step, i) => (
              <li
                key={step}
                className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed"
              >
                <span style={{ color: "var(--lv-ink-2)" }}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {advice.watchFor.map((w) => (
            <Row key={w} label="watch" accent>
              {w}
            </Row>
          ))}
          {advice.secondScan && (
            <Row label="2nd scan">{advice.secondScan}</Row>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  children,
  accent,
}: {
  label: string;
  children: React.ReactNode;
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
