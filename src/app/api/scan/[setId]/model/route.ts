import { readFile } from "node:fs/promises";
import { glbPath } from "@/lib/scans";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/scan/[setId]/model">,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });

  try {
    const { setId } = await ctx.params;
    const glb = await readFile(glbPath(setId));
    return new Response(new Uint8Array(glb), {
      headers: {
        "content-type": "model/gltf-binary",
        "cache-control": "private, max-age=60",
      },
    });
  } catch {
    return Response.json({ error: "no model yet" }, { status: 404 });
  }
}
