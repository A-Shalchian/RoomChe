"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";
import type { DashboardItem } from "./types";

type Field = "name" | "category" | "location" | "notes";

type Match = { item: DashboardItem; rank: number; field: Field };

function fieldText(item: DashboardItem): Record<Field, string> {
  return {
    name: item.name.toLowerCase(),
    category: (item.category ?? "").toLowerCase(),
    location: (item.locations?.name ?? "").toLowerCase(),
    notes: `${item.why_kept ?? ""} ${item.notes ?? ""}`.toLowerCase(),
  };
}

function isSubsequence(q: string, hay: string): boolean {
  let i = 0;
  for (const ch of hay) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return i === q.length;
}

function matchOf(item: DashboardItem, q: string): Match | null {
  const text = fieldText(item);

  if (text.name.startsWith(q)) return { item, rank: 0, field: "name" };
  if (text.name.includes(q)) return { item, rank: 1, field: "name" };
  if (text.category.includes(q)) return { item, rank: 2, field: "category" };
  if (text.location.includes(q)) return { item, rank: 3, field: "location" };
  if (text.notes.includes(q)) return { item, rank: 4, field: "notes" };

  if (q.length >= 3 && isSubsequence(q, text.name)) {
    return { item, rank: 5, field: "name" };
  }
  return null;
}

export function searchItems(items: DashboardItem[], raw: string): Match[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  return items
    .map((it) => matchOf(it, q))
    .filter((m): m is Match => m !== null)
    .sort((a, b) => a.rank - b.rank);
}

const FIELD_HINT: Record<Field, string> = {
  name: "",
  category: "in category",
  location: "in location",
  notes: "in notes",
};

export function Search({
  items,
  variant = "full",
}: {
  items: DashboardItem[];
  variant?: "full" | "compact";
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const query = q.trim();

  const results = useMemo(() => searchItems(items, q).slice(0, 6), [items, q]);

  function open(id: string) {
    router.push(`/app/room?focus=${id}`);
  }

  const compact = variant === "compact";

  return (
    <div className={compact ? "relative w-full" : "relative mt-7 w-full"}>
      <div
        className={`flex items-center gap-3 border-[3px] ${compact ? "px-3 py-2" : "px-4 py-3"}`}
        style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
      >
        <span aria-hidden style={{ color: "var(--lv-accent)" }}>
          ⌕
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) open(results[0].item.id);
            if (e.key === "Escape") setQ("");
          }}
          placeholder={compact ? "search items" : "search for your items here"}
          className={`w-full bg-transparent font-mono uppercase tracking-[0.06em] outline-none placeholder:text-[color:var(--lv-ink-2)] ${compact ? "text-[12px]" : "text-[13px]"}`}
        />
      </div>

      <AnimatePresence>
        {query && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className={`border-[3px] ${compact ? "absolute left-0 right-0 top-full z-50 mt-1" : "mt-2"}`}
            style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
          >
            {results.length === 0 ? (
              <p className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--lv-ink-2)]">
                no match.
              </p>
            ) : (
              results.map((m, i) => (
                <button
                  key={m.item.id}
                  type="button"
                  onClick={() => open(m.item.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)] ${i === results.length - 1 ? "" : "border-b-[1px]"}`}
                  style={{ borderColor: "var(--lv-rule)" }}
                >
                  <Thumb item={m.item} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] uppercase tracking-[0.02em]">
                      {m.item.name}
                    </span>
                    {FIELD_HINT[m.field] && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--lv-ink-2)]">
                        {FIELD_HINT[m.field]}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] opacity-60">
                    {m.item.category ?? "uncategorized"}
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
