"use server";

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { CAPTURE_ANGLES } from "./angles";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const directionSchema = z.object({
  subject: z.string().max(80),
  angle: z.enum([...CAPTURE_ANGLES, "unclear"]),
  retake: z.string().max(120).nullable(),
  instruction: z.string().max(140),
  why: z.string().max(120).nullable(),
  more: z.number().int().min(0).max(30),
  enough: z.boolean(),
});

export type Direction = z.infer<typeof directionSchema>;

export type DirectionResult =
  | { ok: true; direction: Direction }
  | { ok: false; error: string };

function sessionDir(sessionId: string): string {
  if (!UUID.test(sessionId)) throw new Error("bad session id");
  return path.join(tmpdir(), `roomche-guided-${sessionId}`);
}

export async function directNextShot(
  sessionId: string,
  dataUrl: string,
): Promise<DirectionResult> {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return { ok: false, error: "bad image" };

  try {
    const dir = sessionDir(sessionId);
    await mkdir(dir, { recursive: true });

    const existing = (await readdir(dir)).filter((n) => n.endsWith(".jpg")).sort();
    const name = `${String(existing.length).padStart(3, "0")}.jpg`;
    await writeFile(path.join(dir, name), Buffer.from(base64, "base64"));

    const shots = [...existing, name].map((n) => path.join(dir, n));
    const text = await ask(prompt(shots));
    const json = extractJson(text);
    if (!json) throw new Error(`no JSON in response: ${text.slice(0, 200)}`);

    const parsed = directionSchema.safeParse(JSON.parse(json));
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);

    return { ok: true, direction: parsed.data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function endGuidedSession(sessionId: string): Promise<void> {
  await rm(sessionDir(sessionId), { recursive: true, force: true }).catch(
    () => undefined,
  );
}

function prompt(shots: string[]) {
  const list = shots.map((p, i) => `${i + 1}. ${p}`).join("\n");
  return [
    "Read every image below. They are photos of one household object, in the order they were taken.",
    "",
    list,
    "",
    "These feed a 3d reconstruction model. Your job is to direct the next photo, like a photographer standing next to the person.",
    "",
    "Work out, from the images themselves:",
    "- what the object is",
    "- which surfaces you have already seen across the whole set",
    "- which surface is still completely unseen, or seen only at a glancing angle",
    "- whether the newest photo is unusable (blurry, cut off, blocked, far too dark or blown out)",
    "",
    "instruction: one short lowercase sentence telling the person where to move and what to point at. Say it as a physical action, not a label. Good: \"step round to the left until the handle points away from you\". Bad: \"take the left view\".",
    "why: what that shot gets you that the set does not already have, or null.",
    "retake: if the newest photo is unusable, one short lowercase sentence on how to redo it. Otherwise null.",
    "more: how many further photos this object still needs after the one you are asking for. 0 when the set is complete.",
    "enough: true when the existing set already covers the object well enough to reconstruct.",
    "angle: which side the newest photo actually shows.",
    "",
    "A flat object needs two faces. A rigid object needs a ring around it plus the top. A large object needs a wider circle. Do not ask for photos an object does not need, and do not stop early on a shape with hidden concavities.",
    "",
    "Reply with ONLY this JSON on one line, no prose, no code fences:",
    '{"subject":"<lowercase 2-4 words>","angle":"front|back|left|right|top|detail|unclear","retake":"..."|null,"instruction":"...","why":"..."|null,"more":<int>,"enough":true|false}',
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
