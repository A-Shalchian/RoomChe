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
  is_container: boolean;
  container_id: string | null;
};

async function wouldCycle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  itemId: string,
  containerId: string,
): Promise<boolean> {
  let current: string | null = containerId;
  const seen = new Set<string>();
  while (current) {
    if (current === itemId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    const { data }: { data: { container_id: string | null } | null } =
      await supabase
        .from("items")
        .select("container_id")
        .eq("id", current)
        .eq("user_id", userId)
        .maybeSingle();
    current = data?.container_id ?? null;
  }
  return false;
}

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

  const containerId = payload.container_id;
  if (containerId) {
    if (containerId === payload.id) {
      throw new Error("an item cannot contain itself");
    }
    const { data: parent } = await supabase
      .from("items")
      .select("is_container")
      .eq("id", containerId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!parent) {
      throw new Error("container not found");
    }
    if (!parent.is_container) {
      throw new Error("target is not a container");
    }
    if (await wouldCycle(supabase, user.id, payload.id, containerId)) {
      throw new Error("that would nest a container inside itself");
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
      is_container: payload.is_container,
      container_id: containerId,
    })
    .eq("id", payload.id)
    .eq("user_id", user.id);

  if (error) throw new Error(`update: ${error.message}`);

  if (!payload.is_container) {
    await supabase
      .from("items")
      .update({ container_id: null })
      .eq("container_id", payload.id)
      .eq("user_id", user.id);
  }

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
