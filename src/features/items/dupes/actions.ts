"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loadDismissedPairs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dupe_dismissals")
    .select("item_id_a, item_id_b");
  return (data ?? []).map((r) => `${r.item_id_a}:${r.item_id_b}`);
}

export async function dismissDupe(idA: string, idB: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [a, b] = idA < idB ? [idA, idB] : [idB, idA];

  const { error } = await supabase
    .from("dupe_dismissals")
    .upsert(
      { user_id: user.id, item_id_a: a, item_id_b: b },
      { onConflict: "item_id_a,item_id_b" },
    );
  if (error) throw new Error(`dismiss: ${error.message}`);

  revalidatePath("/app");
}
