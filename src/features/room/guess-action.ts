"use server";

import { readdir } from "node:fs/promises";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { redirect } from "next/navigation";
import { rawDir } from "@/lib/scans";
import { createClient } from "@/lib/supabase/server";
import { GUESS_RULES, guessSchema, planFromGuess, type GuessedPlan } from "./guess";

const MAX_FRAMES = 8;

export type GuessResult =
  | { ok: true; guess: GuessedPlan }
  | { ok: false; error: string };

export async function guessPlanFromScan(
  setId: string,
  name: string,
): Promise<GuessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try {
    const dir = rawDir(setId);
    const files = (await readdir(dir))
      .filter((f) => /\.(jpe?g|png)$/i.test(f))
      .sort();
    if (files.length === 0) {
      return { ok: false, error: "no frames landed on the workstation" };
    }

    const picked = spread(files, MAX_FRAMES).map((f) => path.join(dir, f));
    const text = await ask(prompt(picked));
    const json = extractJson(text);
    if (!json) throw new Error(`no JSON in response: ${text.slice(0, 160)}`);

    const parsed = guessSchema.safeParse(JSON.parse(json));
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);

    return { ok: true, guess: planFromGuess(parsed.data, name) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function spread<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]);
}

function prompt(frames: string[]) {
  return [
    "Read every image below. They are frames from one continuous sweep around a single room, in order.",
    "",
    ...frames.map((f, i) => `${i + 1}. ${f}`),
    "",
    "Work out the floor plan of that room and describe it as a walk around the walls.",
    "",
    ...GUESS_RULES.map((rule) => `- ${rule}`),
    "",
    "Count the corners before you start writing. A plain rectangular room has four walls and four turns of 90. Do not invent an alcove that is not there, and do not flatten one that is.",
    "note: one short lowercase sentence on what you were unsure about, or what the sweep did not show.",
    "",
    "Reply with ONLY this JSON on one line, no prose, no code fences:",
    '{"wallHeight":2.4,"floorColour":"#b9a48a","confidence":"rough|fair|good","note":"...","walls":[{"length":3.6,"turn":90,"colour":"#e8e4dc","openings":[{"kind":"door","offset":1.2,"width":0.8,"height":2.03,"sill":0}]}]}',
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
