"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  emptyPlan,
  planSchema,
  pointSchema,
  openingSchema,
  wallSchema,
  type RoomPlan,
} from "./plan";
import { z } from "zod";

const rowSchema = z.object({
  id: z.string(),
  name: z.string(),
  wall_height: z.coerce.number(),
  floor_colour: z.string(),
  points: z.array(pointSchema),
  walls: z.array(wallSchema),
  openings: z.array(openingSchema),
});

export async function loadPlan(): Promise<RoomPlan> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("room_plans")
    .select("id, name, wall_height, floor_colour, points, walls, openings")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const parsed = rowSchema.safeParse(data);
  if (!parsed.success) return emptyPlan();

  const row = parsed.data;
  return {
    id: row.id,
    name: row.name,
    wallHeight: row.wall_height,
    floorColour: row.floor_colour,
    points: row.points,
    walls: row.walls,
    openings: row.openings,
  };
}

export async function savePlan(
  input: RoomPlan,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = planSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const plan = parsed.data;

  if (plan.walls.length !== plan.points.length) {
    return { ok: false, error: "every wall needs a corner" };
  }
  if (plan.openings.some((o) => o.wall >= plan.points.length)) {
    return { ok: false, error: "an opening points at a wall that is gone" };
  }

  const row = {
    user_id: user.id,
    name: plan.name,
    wall_height: plan.wallHeight,
    floor_colour: plan.floorColour,
    points: plan.points,
    walls: plan.walls,
    openings: plan.openings,
    updated_at: new Date().toISOString(),
  };

  const query = plan.id
    ? supabase.from("room_plans").update(row).eq("id", plan.id).eq("user_id", user.id)
    : supabase.from("room_plans").insert(row);

  const { data, error } = await query.select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "the plan did not save" };

  revalidatePath("/app/room/plan");
  return { ok: true, id: data.id };
}
