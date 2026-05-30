"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SavePayload = {
  nobgDataUrl: string;
  name: string;
  category: string;
  location: string | null;
};

export async function saveProcessedItem(payload: SavePayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = payload.name.trim().slice(0, 80) || "untitled";
  const category = payload.category.trim().slice(0, 40) || "other";
  const locationName = payload.location?.trim().slice(0, 40) || null;

  const m = payload.nobgDataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!m) throw new Error("invalid nobg image");
  const bytes = Buffer.from(m[1], "base64");

  const key = `${user.id}/${crypto.randomUUID()}.png`;
  const { error: upErr } = await supabase.storage
    .from("item-images")
    .upload(key, bytes, { contentType: "image/png", upsert: false });
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  let locationId: string | null = null;
  if (locationName) {
    const { data: existing } = await supabase
      .from("locations")
      .select("id")
      .eq("name", locationName)
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

  const { error: insErr } = await supabase.from("items").insert({
    user_id: user.id,
    name,
    category,
    location_id: locationId,
    image_url: key,
    image_url_nobg: key,
  });
  if (insErr) {
    await supabase.storage.from("item-images").remove([key]);
    throw new Error(`insert: ${insErr.message}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/room");
}
