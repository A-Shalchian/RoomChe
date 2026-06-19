import { createClient } from "@/lib/supabase/server";
import type { DashboardItem } from "./types";

export async function loadItems(): Promise<DashboardItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("items")
    .select(
      "id, name, category, image_url, image_url_nobg, would_discard, views, created_at, why_kept, notes, is_container, container_id, locations(name), item_tags(tags(name))",
    )
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const isStorageKey = (k: string | null): k is string =>
    !!k && !k.startsWith("http");

  const rawKeys = Array.from(
    new Set(rows.flatMap((r) => [r.image_url_nobg, r.image_url]).filter(isStorageKey)),
  );

  const signedMap = new Map<string, string>();
  if (rawKeys.length > 0) {
    const { data: signed } = await supabase.storage
      .from("item-images")
      .createSignedUrls(rawKeys, 60 * 60);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
    }
  }

  const resolve = (k: string | null): string | null => {
    if (!k) return null;
    if (k.startsWith("http")) return k;
    return signedMap.get(k) ?? null;
  };

  return rows.map((r) => {
    const { item_tags, ...rest } = r;
    const tags = (item_tags ?? [])
      .map((link) => link.tags?.name)
      .filter((n): n is string => !!n)
      .sort((a, b) => a.localeCompare(b));
    return {
      ...rest,
      tags,
      image_display_url: resolve(r.image_url_nobg) ?? resolve(r.image_url),
    };
  }) as DashboardItem[];
}

export async function loadLocations(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("locations")
    .select("name")
    .order("name");
  return (data ?? []).map((r) => r.name);
}

export async function loadTagNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("name").order("name");
  return (data ?? []).map((r) => r.name);
}
