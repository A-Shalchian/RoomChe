import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/features/items/dashboard/app-shell";
import { DashboardHeader } from "@/features/items/dashboard/dashboard-header";
import { ModelViewer } from "@/features/items/scan3d/model-viewer";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "3d view",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ set?: string }>;

export default async function ModelPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { set } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <AppShell>
      <DashboardHeader email={user.email} />
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-6 py-8">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-mono text-[11px] uppercase tracking-[0.22em]">
            3d view
          </h1>
          <Link
            href="/app/room"
            className="font-mono text-[10px] uppercase tracking-[0.22em] transition-colors hover:[color:var(--lv-accent)]"
          >
            back to the room ←
          </Link>
        </div>

        {set ? (
          <ModelViewer setId={set} />
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
            pick a finished scan from the queue
          </p>
        )}
      </main>
      <SiteFooter />
    </AppShell>
  );
}
