"use client";

import type { ScanReport } from "@/features/items/capture/scan-report";

export function ScanReportPanel({ report }: { report: ScanReport }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
          {report.count} photos · need {report.min} · ideal {report.ideal}
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color: report.ready ? "var(--lv-accent)" : "var(--lv-ink)" }}
        >
          {report.ready ? "ready" : "not ready"} {report.score}%
        </span>
      </div>

      <div
        className="h-2 w-full border-[2px]"
        style={{ borderColor: "var(--lv-ink)" }}
      >
        <div
          className="h-full transition-[width] duration-500"
          style={{
            width: `${report.score}%`,
            background: report.ready ? "var(--lv-accent)" : "var(--lv-ink)",
          }}
        />
      </div>

      <ul className="flex flex-col gap-1">
        {report.notes.map((note) => (
          <li
            key={note}
            className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed"
          >
            <span style={{ color: "var(--lv-accent)" }}>›</span>
            <span>{note}</span>
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <Stat label="gaps" value={String(report.gaps)} bad={report.gaps > 0} />
        <Stat label="soft" value={String(report.soft.length)} bad={report.soft.length > 0} />
        <Stat label="dupes" value={String(report.duplicates)} />
        <Stat label="min mp" value={report.smallest.toFixed(1)} bad={report.smallest < 8} />
      </dl>
    </div>
  );
}

function Stat({
  label,
  value,
  bad,
}: {
  label: string;
  value: string;
  bad?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.16em]">
      <dt style={{ color: "color-mix(in srgb, var(--lv-ink) 50%, transparent)" }}>
        {label}
      </dt>
      <dd style={{ color: bad ? "var(--lv-accent)" : "var(--lv-ink)" }}>{value}</dd>
    </div>
  );
}
