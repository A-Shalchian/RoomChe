"use client";

import { useRef, useState } from "react";
import {
  SCAN_SUBJECTS,
  SCAN_TARGETS,
  type ScanSubject,
} from "@/features/items/capture/scan-targets";
import { useScanSet } from "@/features/items/capture/use-scan-set";
import type { JobRoute } from "@/features/items/scan3d/send-scan";
import { ScanAdvice } from "./scan-advice";
import { ScanReportPanel } from "./scan-report-panel";
import { Note, PillButton, Action } from "./scan-import-parts";

const VIDEO_RULES = [
  "4k 60fps, 1x lens, highest bitrate your phone offers",
  "lock focus and exposure before you press record",
  "three slow orbits at three heights, about twenty seconds each",
  "move your body, leave the object where it is",
];

export function ScanImport() {
  const [subject, setSubject] = useState<ScanSubject>("ground-rigid");
  const [label, setLabel] = useState("");
  const [route, setRoute] = useState<JobRoute>("photogrammetry");
  const [targetFrames, setTargetFrames] = useState(120);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const scan = useScanSet(subject, label);
  const target = SCAN_TARGETS[subject];
  const busy = scan.phase === "reading" || scan.phase === "uploading";

  return (
    <section
      className="flex flex-col gap-4 border-[3px] p-4"
      style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
    >
      <header className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
        <span aria-hidden style={{ color: "var(--lv-accent)" }}>
          ●
        </span>
        full scan · workstation queue
      </header>

      <ScanAdvice onSubject={setSubject} onName={setLabel} disabled={busy} />

      <div className="flex flex-wrap gap-1.5">
        {SCAN_SUBJECTS.map((option) => (
          <PillButton
            key={option}
            active={option === subject}
            disabled={busy}
            onClick={() => setSubject(option)}
          >
            {SCAN_TARGETS[option].label}
          </PillButton>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <PillButton
          active={route === "photogrammetry"}
          disabled={busy}
          onClick={() => setRoute("photogrammetry")}
        >
          measured · colmap
        </PillButton>
        <PillButton
          active={route === "ai"}
          disabled={busy}
          onClick={() => setRoute("ai")}
        >
          fast · ai mesh
        </PillButton>
      </div>

      <div className="flex flex-col gap-1.5">
        <Note label="shoot">{target.protocol}</Note>
        <Note label="under it">{target.backdrop}</Note>
        {target.caveat && (
          <Note label="know" accent>
            {target.caveat}
          </Note>
        )}
        {route === "ai" && (
          <Note label="route" accent>
            four views go to the multi-view model, minutes not hours, the unseen
            parts get invented
          </Note>
        )}
      </div>

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void scan.loadPhotos(e.target.files)}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => scan.loadVideo(e.target.files)}
      />

      {scan.phase === "idle" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Action onClick={() => videoRef.current?.click()} solid>
              pick a video
            </Action>
            <Action onClick={() => photoRef.current?.click()}>pick photos</Action>
          </div>
          <div className="flex flex-col gap-1">
            {VIDEO_RULES.map((rule) => (
              <Note key={rule} label="video">
                {rule}
              </Note>
            ))}
          </div>
        </div>
      )}

      {busy && (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
            {scan.phase === "reading" ? "checking photos" : "uploading"} ·{" "}
            {Math.round(scan.progress * 100)}%
          </span>
          <div
            className="h-2 w-full border-[2px]"
            style={{ borderColor: "var(--lv-ink)" }}
          >
            <div
              className="h-full"
              style={{
                width: `${scan.progress * 100}%`,
                background: "var(--lv-accent)",
              }}
            />
          </div>
        </div>
      )}

      {scan.report && !busy && <ScanReportPanel report={scan.report} />}

      {scan.unreadable.length > 0 && (
        <Note label="skipped" accent>
          {scan.unreadable.length} files could not be read by this browser
        </Note>
      )}

      {scan.error && (
        <Note label="error" accent>
          {scan.error}
        </Note>
      )}

      {scan.phase === "ready" && (
        <div className="flex flex-col gap-3">
          {scan.source === "video" && route === "photogrammetry" && (
            <label className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
              <span style={{ color: "var(--lv-ink-2)" }}>frames to keep</span>
              <input
                type="range"
                min={40}
                max={240}
                step={10}
                value={targetFrames}
                onChange={(e) => setTargetFrames(Number(e.target.value))}
                className="flex-1 accent-[color:var(--lv-accent)]"
              />
              <span style={{ color: "var(--lv-accent)" }}>{targetFrames}</span>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Action onClick={() => void scan.send(route, targetFrames)} solid>
              {scan.source === "video"
                ? `send ${scan.clip?.name ?? "the clip"} →`
                : `send ${scan.files.length} photos →`}
            </Action>
            <Action onClick={scan.clear}>start over</Action>
          </div>
        </div>
      )}

      {scan.phase === "done" && (
        <div className="flex flex-col gap-2">
          <Note label="queued" accent>
            the workstation has it, watch the queue below
          </Note>
          <Action onClick={scan.clear}>scan another object</Action>
        </div>
      )}
    </section>
  );
}
