"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EditModal } from "./edit-modal";
import { ItemCard } from "./item-card";
import type { DashboardItem } from "./types";

const UNCATEGORIZED = "uncategorized";
const UNLOCATED = "no location";

export function ColumnBrowser({
  items: allItems,
  focusId,
  locations,
  allTags,
}: {
  items: DashboardItem[];
  focusId?: string;
  locations: string[];
  allTags: string[];
}) {
  const [editing, setEditing] = useState<DashboardItem | null>(null);
  const [openContainer, setOpenContainer] = useState<DashboardItem | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const items = useMemo(
    () => (activeTag ? allItems.filter((i) => i.tags.includes(activeTag)) : allItems),
    [allItems, activeTag],
  );

  const focused = focusId ? items.find((i) => i.id === focusId) : undefined;
  const activeCategory =
    searchParams.get("category") ?? (focused ? categoryOf(focused) : null);
  const activeLocation =
    searchParams.get("location") ?? (focused ? locationOf(focused) : null);

  const containers = useMemo(
    () =>
      items
        .filter((i) => i.is_container)
        .map((i) => ({ id: i.id, name: i.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );

  const childrenByContainer = useMemo(() => {
    const out = new Map<string, DashboardItem[]>();
    for (const item of items) {
      if (!item.container_id) continue;
      const list = out.get(item.container_id);
      if (list) list.push(item);
      else out.set(item.container_id, [item]);
    }
    return out;
  }, [items]);

  const categoryBuckets = useMemo(() => groupBy(items, categoryOf), [items]);

  const locationBucketsByCategory = useMemo(() => {
    const out = new Map<string, Map<string, DashboardItem[]>>();
    for (const [cat, list] of categoryBuckets) {
      out.set(cat, groupBy(list, locationOf));
    }
    return out;
  }, [categoryBuckets]);

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
    <div className="flex flex-col gap-4">
      {allTags.length > 0 && (
        <TagFilter
          tags={allTags}
          active={activeTag}
          onPick={(t) => {
            setActiveTag(t);
            setOpenContainer(null);
          }}
        />
      )}
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
            >
              {loc}
            </ColumnRow>
          ))}
      </Column>

      <Column
        label={openContainer ? `inside ${openContainer.name}` : "items"}
        count={
          openContainer
            ? childrenByContainer.get(openContainer.id)?.length ?? 0
            : visibleItems?.length ?? 0
        }
        emptyHint={
          openContainer
            ? null
            : !activeCategory
              ? "pick a category"
              : !activeLocation
                ? "pick a location"
                : null
        }
        wide
      >
        {openContainer ? (
          <ContainerContents
            container={openContainer}
            items={childrenByContainer.get(openContainer.id) ?? []}
            onBack={() => setOpenContainer(null)}
            onEdit={setEditing}
          />
        ) : (
          visibleItems && (
            <PagedGrid
              key={`${activeCategory}:${activeLocation}:${activeTag}`}
              items={visibleItems}
              focusId={focusId}
              childCountOf={(id) => childrenByContainer.get(id)?.length ?? 0}
              onEdit={setEditing}
              onOpen={setOpenContainer}
            />
          )
        )}
      </Column>
      </div>
      <EditModal
        item={editing}
        locations={locations}
        containers={containers}
        allTags={allTags}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function TagFilter({
  tags,
  active,
  onPick,
}: {
  tags: string[];
  active: string | null;
  onPick: (tag: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
        tags
      </span>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onPick(active === tag ? null : tag)}
          data-active={active === tag || undefined}
          className="border-[2px] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)] data-[active]:[background:var(--lv-accent)] data-[active]:[border-color:var(--lv-accent)] data-[active]:[color:var(--lv-bg)]"
          style={{ borderColor: "var(--lv-ink)" }}
        >
          {tag}
        </button>
      ))}
      {active && (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--lv-ink-2)] transition-colors hover:[color:var(--lv-accent)]"
        >
          clear ✕
        </button>
      )}
    </div>
  );
}

const PAGE_SIZE = 24;

function PagedGrid({
  items,
  focusId,
  childCountOf,
  onEdit,
  onOpen,
}: {
  items: DashboardItem[];
  focusId?: string;
  childCountOf: (id: string) => number;
  onEdit: (item: DashboardItem) => void;
  onOpen: (item: DashboardItem) => void;
}) {
  const [shown, setShown] = useState(PAGE_SIZE);

  const focusIndex = focusId ? items.findIndex((i) => i.id === focusId) : -1;
  const need = focusIndex >= 0 ? focusIndex + 1 : 0;
  const visible = Math.max(shown, need);
  const page = items.slice(0, visible);
  const remaining = items.length - page.length;

  return (
    <div className="flex flex-col gap-6 px-5 py-5">
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
        {page.map((item, i) => (
          <ItemTile
            key={item.id}
            item={item}
            index={i}
            highlight={item.id === focusId}
            childCount={childCountOf(item.id)}
            onEdit={() => onEdit(item)}
            onOpen={() => onOpen(item)}
          />
        ))}
      </div>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShown((s) => s + PAGE_SIZE)}
          className="self-center border-[3px] px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)]"
          style={{ borderColor: "var(--lv-ink)" }}
        >
          show {Math.min(PAGE_SIZE, remaining)} more · {remaining} left
        </button>
      )}
    </div>
  );
}

function ItemTile({
  item,
  index,
  highlight,
  childCount,
  onEdit,
  onOpen,
}: {
  item: DashboardItem;
  index: number;
  highlight: boolean;
  childCount: number;
  onEdit: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" onClick={onEdit} className="text-left">
        <ItemCard item={item} index={index} highlight={highlight} />
      </button>
      {item.is_container && (
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center justify-between border-[2px] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)]"
          style={{ borderColor: "var(--lv-rule)", color: "var(--lv-ink-2)" }}
        >
          <span aria-hidden>▣ open</span>
          <span className="tabular-nums">
            {String(childCount).padStart(2, "0")} inside
          </span>
        </button>
      )}
    </div>
  );
}

function ContainerContents({
  container,
  items,
  onBack,
  onEdit,
}: {
  container: DashboardItem;
  items: DashboardItem[];
  onBack: () => void;
  onEdit: (item: DashboardItem) => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 border-b-[3px] px-5 py-3 text-left font-mono text-[10px] uppercase tracking-[0.18em] transition-colors [border-color:var(--lv-ink)] hover:[color:var(--lv-accent)]"
      >
        <span aria-hidden>◂</span>
        back to items
      </button>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--lv-ink-2)]">
            {container.name} is empty
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 px-5 py-5 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onEdit(item)}
              className="text-left"
            >
              <ItemCard item={item} index={i} />
            </button>
          ))}
        </div>
      )}
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
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        data-active={active || undefined}
        className="group/row flex w-full items-baseline justify-between gap-3 border-b-[3px] px-4 py-2.5 text-left text-[14px] uppercase tracking-[0.02em] transition-colors [border-color:var(--lv-rule)] [color:var(--lv-ink-2)] hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)] data-[active]:[background:var(--lv-ink)] data-[active]:[color:var(--lv-bg)]"
      >
        <span className="flex items-baseline gap-2 truncate">
          <span
            aria-hidden
            className="inline-block w-3 font-mono text-[11px] [color:inherit] group-data-[active]/row:[color:var(--lv-accent)]"
          >
            {active ? "▸" : ""}
          </span>
          <span className="truncate">{children}</span>
        </span>
        <span className="shrink-0 font-mono text-[10px] tabular-nums">
          {String(count).padStart(2, "0")}
        </span>
      </button>
    </li>
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
