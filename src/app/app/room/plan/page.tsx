import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/features/items/dashboard/app-shell";
import { DashboardHeader } from "@/features/items/dashboard/dashboard-header";
import { RoomBuilder } from "@/features/room/room-builder";
import { loadPlan } from "@/features/room/plan-action";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Room plan",
  robots: { index: false, follow: false },
};

export default async function RoomPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const plan = await loadPlan();

  return (
    <AppShell>
      <DashboardHeader email={user.email} />
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-6 py-8">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-mono text-[11px] uppercase tracking-[0.22em]">
            room plan
          </h1>
          <Link
            href="/app/room"
            className="font-mono text-[10px] uppercase tracking-[0.22em] transition-colors hover:[color:var(--lv-accent)]"
          >
            back to the room ←
          </Link>
        </div>

        <RoomBuilder initial={plan} />
      </main>
      <SiteFooter />
    </AppShell>
  );
}
