"use client";

import { useRef, useState } from "react";
import { sendPhotos, sendVideo, startJob } from "@/features/items/scan3d/send-scan";
import { guessPlanFromScan } from "./guess-action";
import type { GuessedPlan } from "./guess";
import { Small } from "./controls";

type Phase = "idle" | "uploading" | "extracting" | "reading" | "ready";

const SHOOT = [
  "stand near the middle and turn slowly through a full circle",
  "keep the floor line or the ceiling line in shot the whole way round",
  "sweep past every corner, they are what the guess is built from",
  "get the door in frame, it is the scale reference",
];

export function PlanGuess({
  name,
  onUse,
}: {
  name: string;
  onUse: (guess: GuessedPlan) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuessedPlan | null>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  async function run(kind: "video" | "photos", files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setResult(null);
    setPhase("uploading");

    try {
      const setId = crypto.randomUUID();

      if (kind === "video") {
        await sendVideo(setId, files[0]);
        setPhase("extracting");
        const jobId = await startJob({
          setId,
          label: `${name} sweep`,
          subject: "ground-large",
          source: "video",
          route: "frames",
          targetFrames: 40,
        });
        await waitForJob(jobId);
      } else {
        await sendPhotos(setId, [...files]);
      }

      setPhase("reading");
      const guess = await guessPlanFromScan(setId, name);
      if (!guess.ok) throw new Error(guess.error);
      setResult(guess.guess);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  }

  const busy = phase === "uploading" || phase === "extracting" || phase === "reading";

  return (
    <div
      className="flex flex-col gap-2.5 border-l-[3px] pl-3"
      style={{ borderColor: "var(--lv-rule)" }}
    >
      <span
        className="font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{ color: "var(--lv-accent)" }}
      >
        ● guess it from a sweep
      </span>

      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => void run("video", e.target.files)}
      />
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void run("photos", e.target.files)}
      />

      {phase === "idle" && !result && (
        <>
          <ol className="flex flex-col gap-1">
            {SHOOT.map((line, i) => (
              <li
                key={line}
                className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed"
              >
                <span className="shrink-0" style={{ color: "var(--lv-ink-2)" }}>
                  {i + 1}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Small onClick={() => videoRef.current?.click()} solid>
              pick a video
            </Small>
            <Small onClick={() => photoRef.current?.click()}>pick photos</Small>
          </div>
        </>
      )}

      {busy && (
        <p
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: "var(--lv-ink-2)" }}
        >
          {phase === "uploading"
            ? "sending it to the workstation…"
            : phase === "extracting"
              ? "pulling frames out of the clip…"
              : "reading the room…"}
        </p>
      )}

      {error && (
        <p
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: "var(--lv-accent)" }}
        >
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-1.5">
          <Line label="reads as">
            {result.plan.points.length} walls,{" "}
            {result.plan.openings.filter((o) => o.kind === "door").length} doors,{" "}
            {result.plan.openings.filter((o) => o.kind === "window").length} windows
          </Line>
          <Line label="it says">{result.note}</Line>
          <Line label="expect" accent>
            it tends to flatten alcoves into a rectangle and to guess lengths
            badly. count your own corners against it
          </Line>
          <div className="flex flex-wrap gap-2">
            <Small onClick={() => onUse(result)} solid>
              use as a rough sketch
            </Small>
            <Small onClick={() => setResult(null)}>discard</Small>
          </div>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed"
            style={{ color: "var(--lv-ink-2)" }}
          >
            treat every number as wrong. fix the corner count first, then
            measure one wall and type its length
          </p>
        </div>
      )}
    </div>
  );
}

function Line({
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
      <span className="w-24 shrink-0" style={{ color: "var(--lv-ink-2)" }}>
        {label}
      </span>
      <span style={{ color: accent ? "var(--lv-accent)" : "var(--lv-ink)" }}>
        {children}
      </span>
    </p>
  );
}

async function waitForJob(jobId: string): Promise<void> {
  for (let tries = 0; tries < 300; tries += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("lost track of the frame job");
    const { job } = (await res.json()) as {
      job: { state: string; error: string | null };
    };
    if (job.state === "done") return;
    if (job.state === "failed") throw new Error(job.error ?? "frames failed");
    if (job.state === "cancelled") throw new Error("frame job was stopped");
  }
  throw new Error("the frame job is taking too long");
}
