import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  SCAN_SUBJECTS,
  SCAN_TARGETS,
} from "@/features/items/capture/scan-targets";
import { ensureRunner } from "@/lib/job-runner";
import { createJob, listJobs, type Stage } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";

const body = z.object({
  setId: z.uuid(),
  label: z.string().min(1).max(80),
  subject: z.enum(SCAN_SUBJECTS),
  source: z.enum(["video", "photos"]),
  route: z.enum(["photogrammetry", "ai", "frames"]),
  maxDim: z.number().int().min(800).max(4000).optional(),
  targetFrames: z.number().int().min(20).max(400).optional(),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  if (!(await requireUser())) {
    return Response.json({ error: "not signed in" }, { status: 401 });
  }
  ensureRunner();
  return Response.json({ jobs: await listJobs() });
}

export async function POST(request: NextRequest) {
  if (!(await requireUser())) {
    return Response.json({ error: "not signed in" }, { status: 401 });
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { setId, label, subject, source, route, maxDim, targetFrames } = parsed.data;
  const target = SCAN_TARGETS[subject];

  if (route === "frames" && source !== "video") {
    return Response.json(
      { error: "frames only makes sense for a video" },
      { status: 400 },
    );
  }

  const stages: Stage[] =
    route === "frames"
      ? ["extract"]
      : [
          ...(source === "video" ? (["extract"] as Stage[]) : []),
          ...(route === "ai"
            ? (["aimesh"] as Stage[])
            : (["reconstruct", "bake"] as Stage[])),
        ];

  const job = await createJob({
    setId,
    label,
    route,
    stages,
    maxDim,
    targetFrames,
    masks: target.masks,
    sequential: source === "video",
  });

  ensureRunner();
  return Response.json({ job });
}
