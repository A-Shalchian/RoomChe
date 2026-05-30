"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EditModal } from "./edit-modal";
import { ItemCard } from "./item-card";
import type { DashboardItem } from "./types";

const UNCATEGORIZED = "uncategorized";
const UNLOCATED = "no location";

type LocationPreview = { name: string; count: number; thumb: string | null };
type ItemPreview = { id: string; name: string; thumb: string | null };

export function ColumnBrowser({
  items,
  focusId,
  locations,
}: {
  items: DashboardItem[];
  focusId?: string;
  locations: string[];
}) {
  const [editing, setEditing] = useState<DashboardItem | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const focused = focusId ? items.find((i) => i.id === focusId) : undefined;
  const activeCategory =
    searchParams.get("category") ?? (focused ? categoryOf(focused) : null);
  const activeLocation =
    searchParams.get("location") ?? (focused ? locationOf(focused) : null);

  const categoryBuckets = useMemo(() => groupBy(items, categoryOf), [items]);

  const locationBucketsByCategory = useMemo(() => {
    const out = new Map<string, Map<string, DashboardItem[]>>();
    for (const [cat, list] of categoryBuckets) {
      out.set(cat, groupBy(list, locationOf));
    }
    return out;
  }, [categoryBuckets]);

  const locationPreviewsByCategory = useMemo(() => {
    const out = new Map<string, LocationPreview[]>();
    for (const [cat, locMap] of locationBucketsByCategory) {
      const previews: LocationPreview[] = sortedKeys(locMap).map((loc) => {
        const itemsHere = locMap.get(loc)!;
        return {
          name: loc,
          count: itemsHere.length,
          thumb: itemsHere.find((i) => i.image_display_url)?.image_display_url ?? null,
        };
      });
      out.set(cat, previews);
    }
    return out;
  }, [locationBucketsByCategory]);

  const visibleLocationBuckets = activeCategory
    ? locationBucketsByCategory.get(activeCategory)
    : null;

  const visibleItems = useMemo(() => {
    if (!activeCategory || !activeLocation) return null;
    const locMap = locationBucketsByCategory.get(activeCategory);
    if (!locMap) return null;
    return locMap.get(activeLocation) ?? [];
  }, [activeCategory, activeLocation, locationBucketsByCategory]);

  const setParams = useCallback(
    (next: { category?: string | null; location?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if ("category" in next) {
        if (next.category === null) params.delete("category");
        else if (next.category !== undefined) params.set("category", next.category);
      }
      if ("location" in next) {
        if (next.location === null) params.delete("location");
        else if (next.location !== undefined) params.set("location", next.location);
      }
      params.delete("focus");
      const qs = params.toString();
      router.replace(qs ? `/app/room?${qs}` : "/app/room", { scroll: false });
    },
    [router, searchParams],
  );

  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<{
    category: string;
    location: string;
  } | null>(null);

  useEffect(() => {
    if (!focusId) return;
    const id = requestAnimationFrame(() => {
      document
        .querySelector('[data-focus="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [focusId]);

  return (
    <div
      className="grid min-h-[60vh] grid-cols-1 gap-[3px] overflow-visible border-[3px] md:grid-cols-[18rem_18rem_minmax(0,1fr)]"
      style={{ borderColor: "var(--lv-ink)", background: "var(--lv-ink)" }}
    >
      <Column label="categories" count={categoryBuckets.size}>
        {sortedKeys(categoryBuckets).map((cat) => (
          <ColumnRow
            key={cat}
            active={cat === activeCategory}
            count={categoryBuckets.get(cat)!.length}
            onClick={() =>
              setParams({
                category: cat === activeCategory ? null : cat,
                location: null,
              })
            }
            onHoverChange={(hovered) =>
              setHoveredCategory(hovered ? cat : null)
            }
            popover={
              hoveredCategory === cat ? (
                <LocationsPopover
                  previews={locationPreviewsByCategory.get(cat) ?? []}
                />
              ) : null
            }
          >
            {cat}
          </ColumnRow>
        ))}
      </Column>

      <Column
        label="locations"
        count={visibleLocationBuckets?.size ?? 0}
        emptyHint={activeCategory ? null : "pick a category"}
      >
        {visibleLocationBuckets &&
          sortedKeys(visibleLocationBuckets).map((loc) => (
            <ColumnRow
              key={loc}
              active={loc === activeLocation}
              count={visibleLocationBuckets.get(loc)!.length}
              onClick={() =>
                setParams({
                  location: loc === activeLocation ? null : loc,
                })
              }
              onHoverChange={(hovered) =>
                setHoveredLocation(
                  hovered ? { category: activeCategory!, location: loc } : null,
                )
              }
              popover={
                hoveredLocation?.category === activeCategory &&
                hoveredLocation?.location === loc ? (
                  <ItemsPopover
                    items={
                      visibleLocationBuckets.get(loc)!.map((i) => ({
                        id: i.id,
                        name: i.name,
                        thumb: i.image_display_url,
                      }))
                    }
                  />
                ) : null
              }
            >
              {loc}
            </ColumnRow>
          ))}
      </Column>

      <Column
        label="items"
        count={visibleItems?.length ?? 0}
        emptyHint={
          !activeCategory
            ? "pick a category"
            : !activeLocation
              ? "pick a location"
              : null
        }
        wide
      >
        {visibleItems && (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 px-5 py-5 sm:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setEditing(item)}
                className="text-left"
              >
                <ItemCard
                  item={item}
                  index={i}
                  highlight={item.id === focusId}
                />
              </button>
            ))}
          </div>
        )}
      </Column>
      <EditModal
        item={editing}
        locations={locations}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function Column({
  label,
  count,
  emptyHint,
  wide,
  children,
}: {
  label: string;
  count: number;
  emptyHint?: string | null;
  wide?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-[60vh] flex-col"
      style={{ background: "var(--lv-bg)" }}
    >
      <div
        className="flex items-baseline justify-between border-b-[3px] px-4 py-3"
        style={{ borderColor: "var(--lv-ink)" }}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
          {label}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-[color:var(--lv-ink-2)]">
          {String(count).padStart(2, "0")}
        </span>
      </div>
      {emptyHint ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--lv-ink-2)]">
            {emptyHint}
          </p>
        </div>
      ) : wide ? (
        <div className="flex-1 overflow-y-auto">{children}</div>
      ) : (
        <ul className="flex-1 overflow-visible">{children}</ul>
      )}
    </div>
  );
}

function ColumnRow({
  active,
  count,
  onClick,
  onHoverChange,
  popover,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  onHoverChange?: (hovered: boolean) => void;
  popover?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li
      className="relative"
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-baseline justify-between gap-3 border-b-[3px] px-4 py-2.5 text-left text-[14px] uppercase tracking-[0.02em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)]"
        style={{
          borderColor: "var(--lv-rule)",
          background: active ? "var(--lv-ink)" : undefined,
          color: active ? "var(--lv-bg)" : "var(--lv-ink-2)",
        }}
      >
        <span className="flex items-baseline gap-2 truncate">
          <span
            aria-hidden
            className="inline-block w-3 font-mono text-[11px]"
            style={{ color: active ? "var(--lv-accent)" : "inherit" }}
          >
            {active ? "▸" : ""}
          </span>
          <span className="truncate">{children}</span>
        </span>
        <span className="shrink-0 font-mono text-[10px] tabular-nums">
          {String(count).padStart(2, "0")}
        </span>
      </button>
      {popover}
    </li>
  );
}

function LocationsPopover({ previews }: { previews: LocationPreview[] }) {
  if (previews.length === 0) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute left-full top-0 z-50 ml-2 w-64 border-[3px]"
      style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
    >
      <div
        className="border-b-[3px] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]"
        style={{ borderColor: "var(--lv-ink)" }}
      >
        locations
      </div>
      <ul className="max-h-80 overflow-hidden">
        {previews.slice(0, 6).map((p) => (
          <li
            key={p.name}
            className="flex items-center gap-3 border-b-[1px] px-3 py-2 last:border-b-0"
            style={{ borderColor: "var(--lv-rule)" }}
          >
            <Thumb src={p.thumb} alt={p.name} />
            <span className="flex-1 truncate text-[14px] uppercase tracking-[0.02em]">
              {p.name}
            </span>
            <span className="font-mono text-[9px] tabular-nums text-[color:var(--lv-ink-2)]">
              {String(p.count).padStart(2, "0")}
            </span>
          </li>
        ))}
        {previews.length > 6 && (
          <li className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--lv-ink-2)]">
            +{previews.length - 6} more
          </li>
        )}
      </ul>
    </div>
  );
}

function ItemsPopover({ items }: { items: ItemPreview[] }) {
  if (items.length === 0) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute left-full top-0 z-50 ml-2 w-64 border-[3px]"
      style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
    >
      <div
        className="border-b-[3px] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]"
        style={{ borderColor: "var(--lv-ink)" }}
      >
        items
      </div>
      <ul className="max-h-80 overflow-hidden">
        {items.slice(0, 6).map((i) => (
          <li
            key={i.id}
            className="flex items-center gap-3 border-b-[1px] px-3 py-2 last:border-b-0"
            style={{ borderColor: "var(--lv-rule)" }}
          >
            <Thumb src={i.thumb} alt={i.name} />
            <span className="flex-1 truncate text-[14px] uppercase tracking-[0.02em]">
              {i.name}
            </span>
          </li>
        ))}
        {items.length > 6 && (
          <li className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--lv-ink-2)]">
            +{items.length - 6} more
          </li>
        )}
      </ul>
    </div>
  );
}

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center border-[1px] text-xs uppercase text-[color:var(--lv-ink-2)]"
        style={{ borderColor: "var(--lv-rule)" }}
      >
        {alt.trim().charAt(0).toLowerCase() || "?"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-9 w-9 shrink-0 border-[1px] object-cover"
      style={{ borderColor: "var(--lv-rule)" }}
    />
  );
}

function categoryOf(item: DashboardItem): string {
  return item.category?.trim() || UNCATEGORIZED;
}

function locationOf(item: DashboardItem): string {
  return item.locations?.name?.trim() || UNLOCATED;
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function sortedKeys(map: Map<string, unknown>): string[] {
  return Array.from(map.keys()).sort((a, b) => {
    if (a === UNCATEGORIZED || a === UNLOCATED) return 1;
    if (b === UNCATEGORIZED || b === UNLOCATED) return -1;
    return a.localeCompare(b);
  });
}
