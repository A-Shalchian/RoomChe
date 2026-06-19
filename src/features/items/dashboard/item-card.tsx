import type { DashboardItem } from "./types";

export function ItemCard({
  item,
  index,
  highlight,
}: {
  item: DashboardItem;
  index: number;
  highlight?: boolean;
}) {
  const slot = String(index + 1).padStart(3, "0");
  return (
    <article
      className="group relative flex flex-col scroll-mt-28"
      data-focus={highlight ? "true" : undefined}
    >
      <div
        className="relative aspect-square overflow-hidden border-[3px] transition-transform duration-300 ease-out group-hover:-translate-y-1"
        style={{
          borderColor: highlight ? "var(--lv-accent)" : "var(--lv-ink)",
          background: "var(--lv-bg)",
          boxShadow: highlight
            ? "0 0 0 3px color-mix(in srgb, var(--lv-accent) 40%, transparent)"
            : undefined,
        }}
      >
        <div className="absolute left-2.5 top-2.5 z-10 font-mono text-[10px] tracking-[0.18em] text-[color:var(--lv-ink-2)]">
          № {slot}
        </div>
        {item.would_discard && <DiscardSeal value={item.would_discard} />}
        <div className="absolute inset-x-4 top-9 bottom-4 flex items-center justify-center">
          {item.image_display_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_display_url}
              alt={item.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <PhotoPlaceholder name={item.name} />
          )}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="truncate text-[15px] uppercase tracking-[-0.01em]">
          {item.name}
        </h3>
        {item.locations?.name && (
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--lv-ink-2)]">
            {item.locations.name}
          </span>
        )}
      </div>
      {item.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="border-[1.5px] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[color:var(--lv-ink-2)]"
              style={{ borderColor: "var(--lv-rule)" }}
            >
              {tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="font-mono text-[8px] tracking-[0.14em] text-[color:var(--lv-ink-2)]">
              +{item.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function DiscardSeal({ value }: { value: "never" | "maybe" | "soon" }) {
  const label =
    value === "never" ? "kept" : value === "maybe" ? "uncertain" : "to part with";
  return (
    <div
      className="absolute right-2.5 top-2.5 z-10 border-[2px] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em]"
      style={{
        borderColor: value === "soon" ? "var(--lv-accent)" : "var(--lv-ink)",
        color: value === "soon" ? "var(--lv-accent)" : "var(--lv-ink-2)",
      }}
    >
      {label}
    </div>
  );
}

function PhotoPlaceholder({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toLowerCase() || "?";
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[color:var(--lv-ink-2)]">
      <span className="text-5xl uppercase">{initial}</span>
      <span className="font-mono text-[9px] uppercase tracking-[0.22em]">
        no image
      </span>
    </div>
  );
}
