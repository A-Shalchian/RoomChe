import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/features/items/dashboard/app-shell";
import { DashboardHeader } from "@/features/items/dashboard/dashboard-header";
import { Hub } from "@/features/items/dashboard/hub";
import { loadItems } from "@/features/items/dashboard/load-items";
import { DupeBanner } from "@/features/items/dupes/dupe-banner";
import { loadDismissedPairs } from "@/features/items/dupes/actions";
import { requestNow } from "@/lib/now";
import { SiteFooter } from "@/components/site-footer";

type SearchParams = Promise<{ error?: string }>;

export default async function AppHome({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [items, dismissed] = await Promise.all([
    loadItems(),
    loadDismissedPairs(),
  ]);

  return (
    <AppShell>
      <DashboardHeader email={user.email} />

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8 sm:px-10">
        {params.error && (
          <div
            className="mb-6 border-l-[3px] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ borderColor: "var(--lv-accent)", color: "var(--lv-accent)" }}
          >
            {params.error}
          </div>
        )}
        <DupeBanner items={items} dismissed={dismissed} />
        <Hub items={items} now={requestNow()} />
      </div>

      <SiteFooter />
    </AppShell>
  );
}
