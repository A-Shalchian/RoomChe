import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/features/items/dashboard/app-shell";
import { ColumnBrowser } from "@/features/items/dashboard/column-browser";
import { DashboardHeader } from "@/features/items/dashboard/dashboard-header";
import { Search } from "@/features/items/dashboard/search";
import { loadItems, loadLocations } from "@/features/items/dashboard/load-items";
import { recordItemView } from "@/features/items/view-action";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Room view",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ focus?: string }>;

export default async function RoomPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { focus } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [items, locations] = await Promise.all([loadItems(), loadLocations()]);

  if (items.length === 0) redirect("/app");

  const focused = focus ? items.find((i) => i.id === focus) : undefined;
  if (focused) await recordItemView(focused.id);

  return (
    <AppShell>
      <DashboardHeader email={user.email} />

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8 sm:px-10">
        <div className="mb-6 flex items-baseline justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.22em]">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 transition-colors hover:[color:var(--lv-accent)]"
          >
            <span aria-hidden>←</span> hub
          </Link>
          <span className="text-[color:var(--lv-ink-2)]">
            your room · {items.length} kept
          </span>
        </div>

        <div className="mb-6 max-w-md">
          <Search items={items} variant="compact" />
        </div>

        <ColumnBrowser
          items={items}
          focusId={focused?.id}
          locations={locations}
        />
      </div>

      <SiteFooter />
    </AppShell>
  );
}
