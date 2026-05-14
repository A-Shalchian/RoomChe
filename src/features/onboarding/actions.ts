"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/app");
}
