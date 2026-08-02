import { cancelRunning } from "@/lib/job-runner";
import { deleteJob, isOpen, patchJob, readJob } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/jobs/[jobId]">,
) {
  if (!(await requireUser())) {
    return Response.json({ error: "not signed in" }, { status: 401 });
  }
  const { jobId } = await ctx.params;
  const job = await readJob(jobId).catch(() => null);
  if (!job) return Response.json({ error: "no such job" }, { status: 404 });
  return Response.json({ job });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/jobs/[jobId]">,
) {
  if (!(await requireUser())) {
    return Response.json({ error: "not signed in" }, { status: 401 });
  }

  const { jobId } = await ctx.params;
  const job = await readJob(jobId).catch(() => null);
  if (!job) return Response.json({ error: "no such job" }, { status: 404 });

  if (isOpen(job)) {
    await patchJob(jobId, { cancelRequested: true, message: "stopping" });
    if (!cancelRunning(jobId)) {
      await patchJob(jobId, {
        state: "cancelled",
        message: "cancelled",
        endedAt: Date.now(),
      });
    }
    return Response.json({ ok: true, cancelled: true });
  }

  await deleteJob(jobId);
  return Response.json({ ok: true, removed: true });
}
