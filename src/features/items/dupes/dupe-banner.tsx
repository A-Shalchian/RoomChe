"use client";

import { motion, AnimatePresence } from "motion/react";
import { useMemo, useState, useTransition } from "react";
import { deleteItem } from "@/features/items/edit-action";
import type { DashboardItem } from "@/features/items/dashboard/types";
import { dismissDupe } from "./actions";
import { findDupes } from "./detect";

export function DupeBanner({
  items,
  dismissed,
}: {
  items: DashboardItem[];
  dismissed: string[];
}) {
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dismissedSet = useMemo(
    () => new Set([...dismissed, ...resolved]),
    [dismissed, resolved],
  );

  const pairs = useMemo(
    () => findDupes(items, dismissedSet),
    [items, dismissedSet],
  );

  if (pairs.length === 0) return null;

  const pair = pairs[0];

  function resolveLocally(key: string) {
    setResolved((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  function keepBoth() {
    setError(null);
    resolveLocally(pair.key);
    startTransition(async () => {
      try {
        await dismissDupe(pair.a.id, pair.b.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  function remove(id: string) {
    setError(null);
    resolveLocally(pair.key);
    startTransition(async () => {
      try {
        await deleteItem(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pair.key}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="mb-6 border-[3px]"
        style={{ borderColor: "var(--lv-accent)", background: "var(--lv-bg)" }}
      >
        <div
          className="flex items-center justify-between border-b-[3px] px-4 py-2.5"
          style={{ borderColor: "var(--lv-accent)" }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: "var(--lv-accent)" }}
          >
            ● possible duplicate · {pair.reason}
          </span>
          {pairs.length > 1 && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--lv-ink-2)]">
              {pairs.length} flagged
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[3px] sm:grid-cols-2">
          <Side
            item={pair.a}
            disabled={pending}
            onDelete={() => remove(pair.a.id)}
          />
          <Side
            item={pair.b}
            disabled={pending}
            onDelete={() => remove(pair.b.id)}
          />
        </div>

        {error && (
          <p
            className="border-t-[3px] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ borderColor: "var(--lv-accent)", color: "var(--lv-accent)" }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={keepBoth}
          disabled={pending}
          className="w-full border-t-[3px] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)] disabled:opacity-50"
          style={{ borderColor: "var(--lv-accent)" }}
        >
          keep both, not a dupe
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

function Side({
  item,
  disabled,
  onDelete,
}: {
  item: DashboardItem;
  disabled: boolean;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ background: "var(--lv-bg)" }}
    >
      {item.image_display_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_display_url}
          alt=""
          className="h-12 w-12 shrink-0 border-[1px] object-cover"
          style={{ borderColor: "var(--lv-rule)" }}
        />
      ) : (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center border-[1px] text-sm uppercase text-[color:var(--lv-ink-2)]"
          style={{ borderColor: "var(--lv-rule)" }}
        >
          {item.name.trim().charAt(0).toLowerCase() || "?"}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] uppercase tracking-[0.02em]">
          {item.name}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--lv-ink-2)]">
          {item.locations?.name ?? "no location"}
        </span>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="shrink-0 border-[2px] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] transition-colors disabled:opacity-50"
        style={{ borderColor: "var(--lv-accent)", color: "var(--lv-accent)" }}
      >
        delete this
      </button>
    </div>
  );
}
