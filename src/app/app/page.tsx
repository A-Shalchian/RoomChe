import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";
import { seedDummyItem } from "@/features/items/actions";

type SearchParams = Promise<{ error?: string }>;

export default async function AppHome({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("items")
    .select("id, name, category, would_discard, locations(name)")
    .order("created_at", { ascending: false });

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-medium tracking-tight">your stuff</h1>
            <p className="text-sm text-foreground/60">
              signed in as {user.email}.
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-foreground/60 underline-offset-4 hover:underline"
            >
              sign out
            </button>
          </form>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {items && items.length > 0 ? (
          <ul className="divide-y divide-foreground/10 border-y border-foreground/10">
            {items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-foreground/50">
                    {item.category ?? "uncategorized"}
                    {item.locations?.name ? ` · ${item.locations.name}` : ""}
                  </p>
                </div>
                {item.would_discard && (
                  <span className="font-mono text-xs text-foreground/40">
                    {item.would_discard}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4 rounded-md border border-dashed border-foreground/15 p-6">
            <p className="text-sm text-foreground/60">
              no items yet. seed one to prove the stack works.
            </p>
            <form action={seedDummyItem}>
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                seed dummy item
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
