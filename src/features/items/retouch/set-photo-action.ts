"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setItemPhoto(
  itemId: string,
  key: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!key.startsWith(`${user.id}/`)) {
    return { ok: false, error: "that image is not yours" };
  }

  const { data: item } = await supabase
    .from("items")
    .select("image_url, image_url_nobg")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!item) return { ok: false, error: "no such item" };

  const { error } = await supabase
    .from("items")
    .update({ image_url_nobg: key })
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  const stale = item.image_url_nobg;
  if (stale && stale !== key && stale !== item.image_url) {
    await supabase.storage.from("item-images").remove([stale]);
  }

  revalidatePath("/app");
  revalidatePath("/app/room");
  return { ok: true };
}
