import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/features/onboarding/actions";
import { BrutalistShell, DisplayLine } from "@/features/auth/brutalist-shell";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

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

  const firstName = profile?.display_name?.split(" ")[0];

  return (
    <BrutalistShell eyebrow="the welcome" index="01 / 01">
      <div className="grid grid-cols-12 items-end gap-x-4 gap-y-12 sm:gap-x-6">
        <div className="col-span-12 lg:col-span-7">
          <h1 aria-label={`welcome${firstName ? `, ${firstName}` : ""}.`}>
            <DisplayLine>welcome</DisplayLine>
            {firstName && (
              <DisplayLine>
                <span style={{ color: "var(--lv-accent)" }}>{firstName}.</span>
              </DisplayLine>
            )}
          </h1>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <p className="mb-6 max-w-sm text-[16px] leading-[1.5]">
            the survey lands here later. for now, step through the door and the
            empty table is yours to fill.
          </p>

          <form action={completeOnboarding}>
            <button
              type="submit"
              className="group relative inline-flex items-center gap-3 overflow-hidden border-[3px] px-6 py-4 font-mono text-[12px] uppercase tracking-[0.22em]"
              style={{
                borderColor: "var(--lv-ink)",
                background: "var(--lv-ink)",
                color: "var(--lv-bg)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
                style={{ background: "var(--lv-accent)" }}
              />
              <span className="relative">i&apos;m in</span>
              <span
                aria-hidden
                className="relative inline-block transition-transform duration-300 ease-out group-hover:translate-x-1"
              >
                →
              </span>
            </button>
          </form>

          {error && (
            <p
              className="mt-4 border-l-[3px] pl-3 font-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ borderColor: "var(--lv-accent)", color: "var(--lv-accent)" }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </BrutalistShell>
  );
}
