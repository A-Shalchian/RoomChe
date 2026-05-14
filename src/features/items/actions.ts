"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function seedDummyItem() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: location, error: locationError } = await supabase
    .from("locations")
    .insert({ user_id: user.id, name: "bedroom" })
    .select("id")
    .single();

  if (locationError) {
    redirect(`/app?error=${encodeURIComponent(locationError.message)}`);
  }

  const { error: itemError } = await supabase.from("items").insert({
    user_id: user.id,
    name: "stapler",
    category: "desk",
    location_id: location.id,
    why_kept: "i use it sometimes",
    would_discard: "maybe",
  });

  if (itemError) {
    redirect(`/app?error=${encodeURIComponent(itemError.message)}`);
  }

  revalidatePath("/app");
}
