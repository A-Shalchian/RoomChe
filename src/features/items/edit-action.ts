"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EditPayload = {
  id: string;
  name: string;
  category: string;
  location: string | null;
  would_discard: "never" | "maybe" | "soon" | null;
  why_kept: string | null;
  notes: string | null;
};

export async function updateItem(payload: EditPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = payload.name.trim().slice(0, 80);
  if (!name) throw new Error("name is required");
  const category = payload.category.trim().slice(0, 40) || "other";
  const locationName = payload.location?.trim().slice(0, 40) || null;

  let locationId: string | null = null;
  if (locationName) {
    const { data: existing } = await supabase
      .from("locations")
      .select("id")
      .eq("name", locationName)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      locationId = existing.id;
    } else {
      const { data: created, error: locErr } = await supabase
        .from("locations")
        .insert({ user_id: user.id, name: locationName })
        .select("id")
        .single();
      if (locErr) throw new Error(`location: ${locErr.message}`);
      locationId = created.id;
    }
  }

  const { error } = await supabase
    .from("items")
    .update({
      name,
      category,
      location_id: locationId,
      would_discard: payload.would_discard,
      why_kept: payload.why_kept?.trim() || null,
      notes: payload.notes?.trim() || null,
    })
    .eq("id", payload.id)
    .eq("user_id", user.id);

  if (error) throw new Error(`update: ${error.message}`);

  revalidatePath("/app");
  revalidatePath("/app/room");
}

export async function deleteItem(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("items")
    .select("image_url, image_url_nobg")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(`delete: ${error.message}`);

  if (item) {
    const keys = new Set<string>();
    if (item.image_url && !item.image_url.startsWith("http"))
      keys.add(item.image_url);
    if (item.image_url_nobg && !item.image_url_nobg.startsWith("http"))
      keys.add(item.image_url_nobg);
    if (keys.size > 0) {
      await supabase.storage.from("item-images").remove(Array.from(keys));
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/room");
}
