"use server";

import { rm } from "node:fs/promises";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { OP_VOCABULARY, replySchema, type RetouchOp } from "./ops";
import {
  appendHistory,
  applyOps,
  asDataUrl,
  dropLatest,
  latestPath,
  readHistory,
  sessionDir,
  versions,
  writeOps,
  writeVersion,
  type Turn,
} from "./session";

export type RetouchResult =
  | { ok: true; reply: string; dataUrl: string; ops: RetouchOp[]; canUndo: boolean }
  | { ok: false; error: string };

export async function openRetouch(
  sessionId: string,
  dataUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return { ok: false, error: "bad image" };
  try {
    await rm(sessionDir(sessionId), { recursive: true, force: true });
    await writeVersion(sessionId, Buffer.from(base64, "base64"));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendRetouch(
  sessionId: string,
  instruction: string,
): Promise<RetouchResult> {
  const asked = instruction.trim().slice(0, 300);
  if (asked.length < 2) return { ok: false, error: "say what you want changed" };

  try {
    const current = await latestPath(sessionId);
    if (!current) return { ok: false, error: "open the photo again" };

    const history = await readHistory(sessionId);
    const text = await ask(prompt(current, history, asked));
    const json = extractJson(text);
    if (!json) throw new Error(`no JSON in response: ${text.slice(0, 160)}`);

    const parsed = replySchema.safeParse(JSON.parse(json));
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    const { reply, ops } = parsed.data;

    const turns: Turn[] = [
      { role: "you", text: asked },
      { role: "claude", text: reply },
    ];

    if (ops.length === 0) {
      await appendHistory(sessionId, turns);
      return {
        ok: true,
        reply,
        ops,
        dataUrl: await asDataUrl(current),
        canUndo: (await versions(sessionId)).length > 1,
      };
    }

    const opsFile = await writeOps(sessionId, ops);
    const next = path.join(
      sessionDir(sessionId),
      `${String((await versions(sessionId)).length).padStart(3, "0")}.png`,
    );
    await applyOps(current, next, opsFile);
    await appendHistory(sessionId, turns);

    return {
      ok: true,
      reply,
      ops,
      dataUrl: await asDataUrl(next),
      canUndo: true,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function undoRetouch(sessionId: string): Promise<RetouchResult> {
  try {
    await dropLatest(sessionId);
    const current = await latestPath(sessionId);
    if (!current) return { ok: false, error: "nothing to undo" };
    return {
      ok: true,
      reply: "stepped back",
      ops: [],
      dataUrl: await asDataUrl(current),
      canUndo: (await versions(sessionId)).length > 1,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function closeRetouch(sessionId: string): Promise<void> {
  await rm(sessionDir(sessionId), { recursive: true, force: true }).catch(
    () => undefined,
  );
}

function prompt(imagePath: string, history: Turn[], instruction: string) {
  const transcript = history.length
    ? ["So far:", ...history.map((t) => `${t.role}: ${t.text}`), ""]
    : [];

  return [
    `Read the image at: ${imagePath}`,
    "",
    "You are retouching one photo of a household object for a catalogue. The person tells you what they want in plain words and you turn it into edit operations. The image you just read is the CURRENT state, with every earlier edit already applied.",
    "",
    ...transcript,
    `They now say: "${instruction}"`,
    "",
    "Coordinates are fractions of the image, 0 to 1, origin at the top left. A box is [x1,y1,x2,y2]. Work them out by looking at the image, and be generous rather than tight, because a box that clips the object is worse than one with slack.",
    "",
    "Operations you can use:",
    ...OP_VOCABULARY.map((line) => `- ${line}`),
    "",
    "Pick the smallest set that does what they asked, usually one. Return an empty ops array if they are asking a question rather than requesting a change, or if what they want is not possible with the operations above, and say so in the reply.",
    "",
    "reply: one short lowercase sentence, present tense, saying what you did or why you did not. No punctuation at the end.",
    "",
    "Reply with ONLY this JSON on one line, no prose, no code fences:",
    '{"reply":"...","ops":[{"op":"..."}]}',
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
