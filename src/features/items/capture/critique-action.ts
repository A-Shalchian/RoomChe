"use server";

import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { CAPTURE_ANGLES, type CaptureAngle } from "./angles";

const critiqueSchema = z.object({
  subject: z.string().max(80),
  angle: z.enum([...CAPTURE_ANGLES, "unclear"]),
  cropped: z.boolean(),
  occluded: z.boolean(),
  cluttered: z.boolean(),
  surface: z.enum(["matte", "glossy", "transparent", "mixed"]),
  verdict: z.enum(["keep", "retake"]),
  problems: z.array(z.string().max(90)).max(3),
  fix: z.string().max(120).nullable(),
});

export type Critique = z.infer<typeof critiqueSchema>;

export type CritiqueResult =
  | { ok: true; critique: Critique }
  | { ok: false; error: string };

export async function critiqueShot(
  dataUrl: string,
  intendedAngle: CaptureAngle,
): Promise<CritiqueResult> {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return { ok: false, error: "bad image" };

  const work = path.join(tmpdir(), `roomche-critique-${randomUUID()}`);
  const shotPath = path.join(work, "shot.jpg");

  try {
    await mkdir(work, { recursive: true });
    await writeFile(shotPath, Buffer.from(base64, "base64"));

    const text = await ask(prompt(shotPath, intendedAngle));
    const json = extractJson(text);
    if (!json) throw new Error(`no JSON in response: ${text.slice(0, 200)}`);

    const parsed = critiqueSchema.safeParse(JSON.parse(json));
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);

    return { ok: true, critique: parsed.data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}

function prompt(imagePath: string, intendedAngle: CaptureAngle) {
  return [
    `Read the image at: ${imagePath}`,
    "",
    "You are grading one photo of a single household object. These photos will be fed to a multi-view 3d reconstruction model, so framing and coverage matter more than looking pretty.",
    `The person was aiming for the ${intendedAngle} view.`,
    "",
    "Judge, in order:",
    "1. which side of the object this actually shows",
    "2. whether any part of the object is cut off by the frame edge",
    "3. whether something covers the object (hand, bag, another object)",
    "4. whether the background is busy enough to confuse a segmentation model",
    "5. the surface: matte is easy to reconstruct, glossy and transparent are hard",
    "",
    "verdict is retake only when the shot is unusable as-is. Poor but usable is keep.",
    "problems: at most 3, each a short lowercase phrase, no punctuation at the end.",
    "fix: one short instruction for the retake, or null if verdict is keep.",
    "",
    "Reply with ONLY this JSON on one line, no prose, no code fences:",
    '{"subject":"<lowercase 2-4 words>","angle":"front|back|left|right|top|detail|unclear","cropped":true|false,"occluded":true|false,"cluttered":true|false,"surface":"matte|glossy|transparent|mixed","verdict":"keep|retake","problems":["..."],"fix":"..."|null}',
  ].join("\n");
}

async function ask(text: string) {
  let out = "";
  for await (const msg of query({
    prompt: text,
    options: { permissionMode: "bypassPermissions", allowedTools: ["Read"] },
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
