"use client";

import { useRef, useState } from "react";
import {
  reconstructCommand,
  SCAN_SUBJECTS,
  SCAN_TARGETS,
  type ScanSubject,
} from "@/features/items/capture/scan-targets";
import { useScanSet } from "@/features/items/capture/use-scan-set";
import { ScanReportPanel } from "./scan-report-panel";

export function ScanImport() {
  const [subject, setSubject] = useState<ScanSubject>("ground-rigid");
  const inputRef = useRef<HTMLInputElement>(null);
  const scan = useScanSet(subject);
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
        photo scan · full resolution
      </header>

      <div className="flex flex-wrap gap-1.5">
        {SCAN_SUBJECTS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSubject(option)}
            disabled={busy}
            className="border-[2px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] disabled:opacity-40"
            style={{
              borderColor: "var(--lv-ink)",
              background: option === subject ? "var(--lv-ink)" : "transparent",
              color: option === subject ? "var(--lv-bg)" : "var(--lv-ink)",
            }}
          >
            {SCAN_TARGETS[option].label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <Note label="shoot">{target.protocol}</Note>
        <Note label="under it">{target.backdrop}</Note>
        {target.caveat && (
          <Note label="know" accent>
            {target.caveat}
          </Note>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void scan.load(e.target.files)}
      />

      {scan.phase === "idle" && (
        <Action onClick={() => inputRef.current?.click()} solid>
          pick photos from your camera roll
        </Action>
      )}

      {busy && (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
            {scan.phase === "reading" ? "checking photos" : "uploading"} ·{" "}
            {Math.round(scan.progress * 100)}%
          </span>
          <div className="h-2 w-full border-[2px]" style={{ borderColor: "var(--lv-ink)" }}>
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
        <p
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: "var(--lv-accent)" }}
        >
          {scan.unreadable.length} files could not be read by this browser
        </p>
      )}

      {scan.error && (
        <p
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: "var(--lv-accent)" }}
        >
          {scan.error}
        </p>
      )}

      {scan.phase === "ready" && (
        <div className="flex flex-wrap gap-2">
          <Action onClick={() => void scan.upload()} solid>
            send {scan.files.length} to the workstation →
          </Action>
          <Action onClick={scan.clear}>start over</Action>
        </div>
      )}

      {scan.phase === "done" && scan.setId && (
        <div className="flex flex-col gap-2">
          <Note label="next">run this on the workstation</Note>
          <code
            className="select-all border-[2px] px-3 py-2 font-mono text-[10px] leading-relaxed"
            style={{ borderColor: "var(--lv-ink)" }}
          >
            {reconstructCommand(scan.setId, subject)}
          </code>
          <Action onClick={scan.clear}>scan another object</Action>
        </div>
      )}
    </section>
  );
}

function Note({
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

function Action({
  children,
  onClick,
  solid,
}: {
  children: React.ReactNode;
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
