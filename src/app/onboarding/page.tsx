import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrutalistShell, DisplayLine } from "@/features/auth/brutalist-shell";
import { SurveyForm } from "@/features/onboarding/survey-form";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
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
    <BrutalistShell eyebrow="the welcome" index="01 / 02">
      <div className="grid grid-cols-12 items-start gap-x-4 gap-y-12 sm:gap-x-6">
        <div className="col-span-12 lg:col-span-5">
          <h1 aria-label={`welcome${firstName ? `, ${firstName}` : ""}.`}>
            <DisplayLine>welcome</DisplayLine>
            {firstName && (
              <DisplayLine>
                <span style={{ color: "var(--lv-accent)" }}>{firstName}.</span>
              </DisplayLine>
            )}
          </h1>
          <p className="mt-6 max-w-sm text-[16px] leading-[1.5]">
            four quick questions, then the empty table is yours to fill.
          </p>
        </div>

        <SurveyForm />
      </div>
    </BrutalistShell>
  );
}
