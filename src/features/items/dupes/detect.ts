import type { DashboardItem } from "@/features/items/dashboard/types";

export type DupePair = {
  key: string;
  a: DashboardItem;
  b: DashboardItem;
  reason: string;
};

const STOP = new Set(["the", "a", "an", "my", "of", "with", "and"]);

export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(name: string): string[] {
  return normalizeName(name)
    .split(" ")
    .map((t) => t.replace(/s$/, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function tokenOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let shared = 0;
  for (const t of a) if (setB.has(t)) shared += 1;
  return shared / Math.min(a.length, b.length);
}

function similar(a: DashboardItem, b: DashboardItem): string | null {
  const na = normalizeName(a.name);
  const nb = normalizeName(b.name);
  if (!na || !nb) return null;

  if (na === nb) return "same name";

  const dist = levenshtein(na, nb);
  if (dist <= 2 && Math.max(na.length, nb.length) >= 4) {
    return "near-identical name";
  }

  const overlap = tokenOverlap(tokens(a.name), tokens(b.name));
  if (overlap >= 0.6) return "overlapping words";

  return null;
}

function sameBucket(a: DashboardItem, b: DashboardItem): boolean {
  const catA = (a.category ?? "").trim().toLowerCase();
  const catB = (b.category ?? "").trim().toLowerCase();
  if (catA && catB && catA !== catB) return false;

  const locA = a.locations?.name?.trim().toLowerCase() ?? "";
  const locB = b.locations?.name?.trim().toLowerCase() ?? "";
  if (locA && locB && locA !== locB) return false;

  return true;
}

function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

export function findDupes(
  items: DashboardItem[],
  dismissed: Set<string>,
): DupePair[] {
  const pairs: DupePair[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (!sameBucket(a, b)) continue;
      const reason = similar(a, b);
      if (!reason) continue;
      const key = pairKey(a.id, b.id);
      if (dismissed.has(key)) continue;
      pairs.push({ key, a, b, reason });
    }
  }
  return pairs;
}
