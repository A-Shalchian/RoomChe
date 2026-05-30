"use server";

import { createClient } from "@/lib/supabase/server";

export async function recordItemView(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("increment_item_views", { item: id });
}
