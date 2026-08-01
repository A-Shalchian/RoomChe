import { mkdir, writeFile } from "node:fs/promises";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { framePath, rawDir } from "@/lib/scans";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 64 * 1024 * 1024;

const payload = z.object({
  index: z.coerce.number().int().min(0).max(9999),
});

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/scan/[setId]/photo">,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });

  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return Response.json({ error: "no photo" }, { status: 400 });
  }
  if (photo.size > MAX_BYTES) {
    return Response.json({ error: "photo too large" }, { status: 413 });
  }

  const parsed = payload.safeParse({ index: form.get("index") });
  if (!parsed.success) {
    return Response.json({ error: "bad index" }, { status: 400 });
  }

  try {
    const { setId } = await ctx.params;
    await mkdir(rawDir(setId), { recursive: true });
    const target = framePath(setId, parsed.data.index);
    await writeFile(target, Buffer.from(await photo.arrayBuffer()));
    return Response.json({ ok: true, bytes: photo.size });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}
