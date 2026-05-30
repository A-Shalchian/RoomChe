"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { ageInDays, computeStats } from "./stats";
import type { DashboardItem } from "./types";

type Tab = "recent" | "limbo" | "untouched";

const TABS: { key: Tab; label: string }[] = [
  { key: "recent", label: "recent" },
  { key: "limbo", label: "limbo" },
  { key: "untouched", label: "untouched" },
];

const VERDICT_LABEL: Record<string, string> = {
  soon: "let go",
  maybe: "maybe",
  never: "keep",
};

export function Boards({ items, now }: { items: DashboardItem[]; now: number }) {
  const [tab, setTab] = useState<Tab>("recent");
  const router = useRouter();
  const stats = useMemo(() => computeStats(items, now), [items, now]);

  const recent = useMemo(
    () =>
      [...items]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 10),
    [items],
  );

  const rows: DashboardItem[] =
    tab === "recent"
      ? recent
      : tab === "limbo"
        ? stats.letGo.slice(0, 10)
        : stats.untouched.slice(0, 10);

  function open(id: string) {
    router.push(`/app/room?focus=${id}`);
  }

  function meta(item: DashboardItem): string {
    if (tab === "recent") return String(item.views);
    if (tab === "limbo") return `${ageInDays(item.created_at, now)}d`;
    return `${ageInDays(item.created_at, now)}d`;
  }

  const metaLabel =
    tab === "recent" ? "views" : tab === "limbo" ? "waiting" : "ignored";

  const emptyHint =
    tab === "limbo"
      ? "nothing flagged to let go. clean."
      : tab === "untouched"
        ? "you have looked at everything."
        : "no items yet.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="flex flex-col border-[3px] lg:sticky lg:top-8 lg:max-h-[70vh]"
      style={{ borderColor: "var(--lv-ink)" }}
    >
      <div
        className="flex shrink-0 border-b-[3px]"
        style={{ borderColor: "var(--lv-ink)" }}
      >
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${i === TABS.length - 1 ? "" : "border-r-[3px]"}`}
            style={{
              borderColor: "var(--lv-ink)",
              background: tab === t.key ? "var(--lv-ink)" : "transparent",
              color: tab === t.key ? "var(--lv-bg)" : "var(--lv-ink-2)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--lv-ink-2)]">
            {emptyHint}
          </p>
        </div>
      ) : (
        <>
          <div
            className="flex shrink-0 items-baseline justify-between px-4 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]"
            style={{ background: "var(--lv-bg)" }}
          >
            <span>{tab === "limbo" ? "longest unresolved first" : " "}</span>
            <span>{metaLabel}</span>
          </div>
          <ul className="overflow-y-auto">
            {rows.map((it, i) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => open(it.id)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)] ${i === rows.length - 1 ? "" : "border-b-[1px]"}`}
                  style={{ borderColor: "var(--lv-rule)" }}
                >
                  <span className="w-6 shrink-0 font-mono text-[11px] tabular-nums text-[color:var(--lv-ink-2)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Thumb item={it} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] uppercase tracking-[0.02em]">
                      {it.name}
                    </span>
                    {tab === "limbo" && it.would_discard && (
                      <span
                        className="font-mono text-[9px] uppercase tracking-[0.18em]"
                        style={{ color: "var(--lv-accent)" }}
                      >
                        {VERDICT_LABEL[it.would_discard]}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums">
                    {meta(it)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </motion.div>
  );
}

function Thumb({ item }: { item: DashboardItem }) {
  if (!item.image_display_url) {
    return (
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center border-[1px] text-xs uppercase text-[color:var(--lv-ink-2)]"
        style={{ borderColor: "var(--lv-rule)" }}
      >
        {item.name.trim().charAt(0).toLowerCase() || "?"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.image_display_url}
      alt=""
      className="h-9 w-9 shrink-0 border-[1px] object-cover"
      style={{ borderColor: "var(--lv-rule)" }}
    />
  );
}
