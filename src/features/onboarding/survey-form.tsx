"use client";

import { useState, useTransition } from "react";
import { completeOnboarding, type SurveyAnswers } from "./actions";

type Step = {
  key: "reason" | "volume" | "hardest";
  prompt: string;
  options: { value: string; label: string }[];
};

const STEPS: Step[] = [
  {
    key: "reason",
    prompt: "what pulled you here",
    options: [
      { value: "declutter", label: "i want to declutter" },
      { value: "catalogue", label: "catalogue everything i own" },
      { value: "valuables", label: "keep track of valuables" },
      { value: "moving", label: "i'm moving soon" },
    ],
  },
  {
    key: "volume",
    prompt: "how much stuff are we talking",
    options: [
      { value: "little", label: "a little" },
      { value: "room", label: "a room's worth" },
      { value: "home", label: "a whole home" },
      { value: "lots", label: "more than i'd admit" },
    ],
  },
  {
    key: "hardest",
    prompt: "the hardest part of letting go",
    options: [
      { value: "sentimental", label: "it's sentimental" },
      { value: "mightneed", label: "i might need it" },
      { value: "cost", label: "it cost money" },
      { value: "notime", label: "i never make the time" },
    ],
  },
];

export function SurveyForm() {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [goal, setGoal] = useState("");
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onLast = step === STEPS.length;
  const current = STEPS[step];

  function pick(value: string) {
    if (!current) return;
    setPicks((p) => ({ ...p, [current.key]: value }));
    setStep((s) => s + 1);
  }

  function finish() {
    setError(null);
    startSubmit(async () => {
      try {
        await completeOnboarding({
          reason: picks.reason,
          volume: picks.volume,
          hardest: picks.hardest,
          goal: goal.trim() || undefined,
        } as SurveyAnswers);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="col-span-12 lg:col-span-7">
      <div className="mb-8 flex gap-2">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className="h-1 flex-1"
            style={{
              background:
                i < step || onLast ? "var(--lv-accent)" : "var(--lv-rule)",
            }}
          />
        ))}
      </div>

      {!onLast && current ? (
        <div>
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
            {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")} · {current.prompt}
          </p>
          <div className="flex flex-col gap-3">
            {current.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => pick(opt.value)}
                className="group flex items-center justify-between border-[3px] px-5 py-4 text-left text-[16px] uppercase tracking-[-0.01em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)]"
                style={{ borderColor: "var(--lv-ink)" }}
              >
                {opt.label}
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </button>
            ))}
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--lv-ink-2)] transition-colors hover:[color:var(--lv-accent)]"
            >
              ← back
            </button>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
            last one · where do you want to be in three months
          </p>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="optional. one sentence is plenty."
            rows={3}
            maxLength={280}
            disabled={submitting}
            className="w-full resize-none border-[3px] bg-transparent px-4 py-3 text-[16px] outline-none focus:[border-color:var(--lv-accent)] disabled:opacity-50"
            style={{ borderColor: "var(--lv-ink)" }}
          />
          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--lv-ink-2)] transition-colors hover:[color:var(--lv-accent)] disabled:opacity-50"
            >
              ← back
            </button>
            <button
              type="button"
              onClick={finish}
              disabled={submitting}
              className="group relative inline-flex items-center gap-3 overflow-hidden border-[3px] px-6 py-4 font-mono text-[12px] uppercase tracking-[0.22em] disabled:opacity-60"
              style={{
                borderColor: "var(--lv-ink)",
                background: "var(--lv-ink)",
                color: "var(--lv-bg)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
                style={{ background: "var(--lv-accent)" }}
              />
              <span className="relative">
                {submitting ? "opening…" : "into the room"}
              </span>
              <span
                aria-hidden
                className="relative inline-block transition-transform duration-300 ease-out group-hover:translate-x-1"
              >
                →
              </span>
            </button>
          </div>
          {error && (
            <p
              className="mt-4 border-l-[3px] pl-3 font-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ borderColor: "var(--lv-accent)", color: "var(--lv-accent)" }}
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
