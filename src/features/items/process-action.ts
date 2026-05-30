"use server";

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";

export type ProcessResult = {
  ok: true;
  nobgDataUrl: string;
  name: string;
  category: string;
  location: string | null;
} | {
  ok: false;
  error: string;
};

export async function processItem(formData: FormData): Promise<ProcessResult> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "no file" };
  }

  const work = path.join(tmpdir(), `roomche-${randomUUID()}`);
  await mkdir(work, { recursive: true });
  const srcPath = path.join(work, "src.png");
  const dstPath = path.join(work, "nobg.png");

  try {
    await writeFile(srcPath, Buffer.from(await file.arrayBuffer()));

    await runPython(srcPath, dstPath);

    const nobg = await readFile(dstPath);
    const nobgDataUrl = `data:image/png;base64,${nobg.toString("base64")}`;

    const { name, category, location } = await classify(dstPath);

    return { ok: true, nobgDataUrl, name, category, location };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}

function runPython(src: string, dst: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), "scripts", "bg-remove.py");
    const child = spawn("python", [script, `${src}::${dst}`], { stdio: "pipe" });
    let stderr = "";
    child.stderr.on("data", (b: Buffer) => (stderr += b.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`bg-remove exited ${code}: ${stderr.slice(0, 400)}`));
    });
  });
}

async function classify(imagePath: string): Promise<{
  name: string;
  category: string;
  location: string | null;
}> {
  const prompt = [
    `Look at the image at: ${imagePath}`,
    "",
    "Identify the single object in the image. Reply with ONLY a JSON object on one line, no prose, no code fences:",
    `{"name": "<lowercase short name, 2-4 words>", "category": "<one lowercase word: clothing, jewelry, books, kitchen, electronics, tools, desk, decor, sports, other>", "location": "<one likely room: bedroom, closet, kitchen, office, living room, bathroom, or null if unsure>"}`,
  ].join("\n");

  let text = "";
  for await (const msg of query({
    prompt,
    options: {
      permissionMode: "bypassPermissions",
      allowedTools: ["Read"],
    },
  })) {
    if (msg.type === "assistant") {
      for (const block of msg.message.content) {
        if (block.type === "text") text += block.text;
      }
    }
  }

  const match = text.match(/\{[^{}]*"name"[^{}]*\}/);
  if (!match) throw new Error(`no JSON in response: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(match[0]) as {
    name?: string;
    category?: string;
    location?: string | null;
  };

  return {
    name: (parsed.name ?? "untitled").toLowerCase().slice(0, 80),
    category: (parsed.category ?? "other").toLowerCase().slice(0, 40),
    location:
      parsed.location && parsed.location !== "null"
        ? parsed.location.toLowerCase().slice(0, 40)
        : null,
  };
}
