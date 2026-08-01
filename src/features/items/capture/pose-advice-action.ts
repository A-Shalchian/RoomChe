"use server";

import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { SCAN_SUBJECTS } from "./scan-targets";

const adviceSchema = z.object({
  subject: z.enum(SCAN_SUBJECTS),
  pose: z.string().max(120),
  photos: z.number().int().min(20).max(200),
  steps: z.array(z.string().max(140)).min(2).max(4),
  watchFor: z.array(z.string().max(120)).max(3),
  secondScan: z.string().max(140).nullable(),
});

export type PoseAdvice = z.infer<typeof adviceSchema>;

export type AdviceResult =
  | { ok: true; advice: PoseAdvice }
  | { ok: false; error: string };

export async function adviseForObject(name: string): Promise<AdviceResult> {
  const cleaned = name.trim().slice(0, 60);
  if (cleaned.length < 2) return { ok: false, error: "name too short" };

  try {
    const text = await ask(prompt(cleaned));
    const json = extractJson(text);
    if (!json) throw new Error("no JSON in response");
    const parsed = adviceSchema.safeParse(JSON.parse(json));
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    return { ok: true, advice: parsed.data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function prompt(name: string) {
  return [
    `A person is photographing "${name}" on the floor to build a 3d model with photogrammetry.`,
    "",
    "Rules that decide your answer:",
    "- Photogrammetry captures ONE configuration. Anything with hinges, lids or moving parts must be shot in a single chosen pose. Choose the pose that reads as the object at rest, and put the other pose in secondScan.",
    "- Glossy black screens, mirrors, chrome and glass do not reconstruct. Powering a screen off does not help, it is still a glossy black panel. If a pose exists that hides the screen entirely, such as closing a lid, choose that pose and put the open pose in secondScan.",
    "- Deep concave shapes self occlude. Prefer a pose that opens the shape to the camera.",
    "- The underside is hidden in every frame unless the object is turned over.",
    "- Soft and deformable things change shape when moved, so they cannot be flipped and merged.",
    "",
    "Pick one preset key:",
    "ground-rigid = rigid, flippable, roughly hand sized to knee sized",
    "ground-complex = thin, spindly, or fiddly detail",
    "ground-oneside = cannot or should not be turned over",
    "ground-large = bigger than a chair",
    "flat-garment = soft clothing laid flat",
    "hung-garment = clothing on a hanger",
    "",
    "steps: 2 to 4 short imperative lines, lowercase, covering pose then rings then flip.",
    "watchFor: up to 3 pitfalls specific to THIS object, lowercase, no trailing punctuation.",
    "secondScan: what a second separate scan would capture, or null if one scan is enough.",
    "",
    "Reply with ONLY this JSON on one line, no prose, no code fences:",
    '{"subject":"<preset key>","pose":"<how to place it>","photos":<int>,"steps":["..."],"watchFor":["..."],"secondScan":"..."|null}',
  ].join("\n");
}

async function ask(text: string) {
  let out = "";
  for await (const msg of query({
    prompt: text,
    options: { permissionMode: "bypassPermissions", allowedTools: [] },
  })) {
    if (msg.type === "assistant") {
      for (const block of msg.message.content) {
        if (block.type === "text") out += block.text;
      }
    }
  }
  return out;
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}
