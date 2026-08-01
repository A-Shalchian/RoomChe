"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EXTRA_ANGLES = ["front", "back", "left", "right", "top", "detail"] as const;

export type SavePayload = {
  nobgDataUrl: string;
  name: string;
  category: string;
  location: string | null;
  extraImages?: { key: string; angle: string }[];
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

  const { data: item, error: insErr } = await supabase
    .from("items")
    .insert({
      user_id: user.id,
      name,
      category,
      location_id: locationId,
      image_url: key,
      image_url_nobg: key,
    })
    .select("id")
    .single();
  if (insErr || !item) {
    await supabase.storage.from("item-images").remove([key]);
    throw new Error(`insert: ${insErr?.message ?? "no row"}`);
  }

  const extras = (payload.extraImages ?? []).filter(
    (e): e is { key: string; angle: (typeof EXTRA_ANGLES)[number] } =>
      e.key.startsWith(`${user.id}/`) &&
      (EXTRA_ANGLES as readonly string[]).includes(e.angle),
  );
  if (extras.length > 0) {
    const { error: imgErr } = await supabase.from("item_images").insert(
      extras.map((e, i) => ({
        user_id: user.id,
        item_id: item.id,
        angle: e.angle,
        image_url: e.key,
        position: i + 1,
      })),
    );
    if (imgErr) {
      await supabase.from("items").delete().eq("id", item.id);
      await supabase.storage
        .from("item-images")
        .remove([key, ...extras.map((e) => e.key)]);
      throw new Error(`angles: ${imgErr.message}`);
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/room");
}
