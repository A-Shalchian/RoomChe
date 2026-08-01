"use client";

import type { CaptureAngle } from "@/features/items/capture/angles";
import { createClient } from "@/lib/supabase/client";

export type ExtraImage = {
  key: string;
  angle: CaptureAngle;
};

export async function uploadExtraAngles(
  extras: { blob: Blob; angle: CaptureAngle }[],
): Promise<ExtraImage[]> {
  if (extras.length === 0) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const uploaded: ExtraImage[] = [];
  try {
    for (const { blob, angle } of extras) {
      const key = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("item-images")
        .upload(key, blob, {
          contentType: blob.type || "image/jpeg",
          upsert: false,
        });
      if (error) throw new Error(`angle upload: ${error.message}`);
      uploaded.push({ key, angle });
    }
  } catch (err) {
    await removeAngles(uploaded.map((u) => u.key));
    throw err;
  }
  return uploaded;
}

export async function removeAngles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const supabase = createClient();
  await supabase.storage.from("item-images").remove(keys);
}
