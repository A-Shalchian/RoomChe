import type { DashboardItem } from "./types";

export type Verdict = "never" | "maybe" | "soon";

export type RoomStats = {
  total: number;
  verdictSplit: Record<Verdict, number>;
  unjudged: number;
  letGo: DashboardItem[];
  untouched: DashboardItem[];
  oldestLetGoDays: number | null;
  topCategory: { name: string; count: number } | null;
  topLocation: { name: string; count: number } | null;
};

const DAY_MS = 1000 * 60 * 60 * 24;

export function ageInDays(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY_MS));
}

function topOf(
  items: DashboardItem[],
  key: (item: DashboardItem) => string | null,
): { name: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item)?.trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) {
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

export function computeStats(items: DashboardItem[], now: number): RoomStats {
  const verdictSplit: Record<Verdict, number> = { never: 0, maybe: 0, soon: 0 };
  let unjudged = 0;

  for (const item of items) {
    if (item.would_discard) verdictSplit[item.would_discard] += 1;
    else unjudged += 1;
  }

  const letGo = items
    .filter((i) => i.would_discard === "soon" || i.would_discard === "maybe")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  const untouched = items
    .filter((i) => i.views === 0)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  const oldestLetGoDays =
    letGo.length > 0 ? ageInDays(letGo[0].created_at, now) : null;

  return {
    total: items.length,
    verdictSplit,
    unjudged,
    letGo,
    untouched,
    oldestLetGoDays,
    topCategory: topOf(items, (i) => i.category),
    topLocation: topOf(items, (i) => i.locations?.name ?? null),
  };
}
