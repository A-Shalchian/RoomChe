"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_TAGS = 12;
const MAX_TAG_LEN = 24;

function normalize(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of raw) {
    const name = tag.trim().toLowerCase().slice(0, MAX_TAG_LEN);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export async function setItemTags(itemId: string, tagNames: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: owned } = await supabase
    .from("items")
    .select("id")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!owned) throw new Error("item not found");

  const names = normalize(tagNames);

  const tagIds: string[] = [];
  for (const name of names) {
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", name)
      .maybeSingle();
    if (existing) {
      tagIds.push(existing.id);
      continue;
    }
    const { data: created, error } = await supabase
      .from("tags")
      .insert({ user_id: user.id, name })
      .select("id")
      .single();
    if (error) throw new Error(`tag: ${error.message}`);
    tagIds.push(created.id);
  }

  await supabase.from("item_tags").delete().eq("item_id", itemId);

  if (tagIds.length > 0) {
    const rows = tagIds.map((tag_id) => ({ item_id: itemId, tag_id }));
    const { error } = await supabase.from("item_tags").insert(rows);
    if (error) throw new Error(`item_tags: ${error.message}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/room");
}
