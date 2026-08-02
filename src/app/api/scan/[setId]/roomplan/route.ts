import { readFile } from "node:fs/promises";
import { planPath } from "@/lib/scans";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/scan/[setId]/roomplan">,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });

  try {
    const { setId } = await ctx.params;
    const raw = await readFile(planPath(setId), "utf8");
    return Response.json({ plan: JSON.parse(raw) });
  } catch {
    return Response.json({ error: "no measured plan yet" }, { status: 404 });
  }
}
