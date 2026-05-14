import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/features/onboarding/actions";

type SearchParams = Promise<{ error?: string }>;

export default async function OnboardingPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.onboarded_at) redirect("/app");

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-medium tracking-tight">
            welcome{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-sm text-foreground/60">
            survey questions land here. for now, just confirm you&apos;re in.
          </p>
        </div>

        <form action={completeOnboarding}>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            i&apos;m in
          </button>
        </form>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </main>
  );
}
