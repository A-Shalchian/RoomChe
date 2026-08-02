import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sourceDir, videoPath } from "@/lib/scans";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 600;

const MAX_BYTES = 2 * 1024 * 1024 * 1024;

const query = z.object({
  ext: z.string().regex(/^[a-z0-9]{2,5}$/i),
});

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/scan/[setId]/video">,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });

  const parsed = query.safeParse({
    ext: request.nextUrl.searchParams.get("ext") ?? "",
  });
  if (!parsed.success) {
    return Response.json({ error: "bad file extension" }, { status: 400 });
  }

  if (!request.body) {
    return Response.json({ error: "no video" }, { status: 400 });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) {
    return Response.json({ error: "video too large" }, { status: 413 });
  }

  try {
    const { setId } = await ctx.params;
    await mkdir(sourceDir(setId), { recursive: true });
    const target = videoPath(setId, parsed.data.ext);

    let bytes = 0;
    const source = Readable.fromWeb(
      request.body as import("node:stream/web").ReadableStream,
    );
    source.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) source.destroy(new Error("video too large"));
    });

    await pipeline(source, createWriteStream(target));
    return Response.json({ ok: true, bytes });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}
