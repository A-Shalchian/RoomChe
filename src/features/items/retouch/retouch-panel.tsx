"use client";

import { useEffect, useRef, useState } from "react";
import { useRetouch, type ChatTurn } from "./use-retouch";

const SUGGESTIONS = [
  "cut the background off",
  "keep just the middle part",
  "crop in tight",
  "it is too dark",
];

export function RetouchPanel({
  itemId,
  sourceUrl,
  onClose,
  onSaved,
}: {
  itemId: string;
  sourceUrl: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const chat = useRetouch(itemId);
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const { open, dispose } = chat;

  useEffect(() => {
    void open(sourceUrl);
    return dispose;
  }, [open, dispose, sourceUrl]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [chat.turns, chat.busy]);

  async function submit(text: string) {
    setDraft("");
    await chat.send(text);
  }

  async function save() {
    if (await chat.save()) onSaved();
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex aspect-square w-full items-center justify-center overflow-hidden border-[2px]"
        style={{ borderColor: "var(--lv-rule)" }}
      >
        {chat.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chat.preview}
            alt="retouched"
            className="h-full w-full object-contain"
          />
        ) : (
          <Muted>opening the photo…</Muted>
        )}
      </div>

      <div
        ref={logRef}
        className="flex max-h-[150px] flex-col gap-1.5 overflow-y-auto"
      >
        {chat.turns.length === 0 && !chat.busy && (
          <Muted>tell it what to change, in your own words</Muted>
        )}
        {chat.turns.map((turn) => (
          <Line key={turn.id} turn={turn} />
        ))}
        {chat.busy && <Muted>looking at the photo…</Muted>}
      </div>

      {chat.turns.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => void submit(text)}
              disabled={chat.busy || !chat.preview}
              className="border-[2px] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] disabled:opacity-40"
              style={{ borderColor: "var(--lv-rule)" }}
            >
              {text}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(draft);
        }}
        className="flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={chat.busy || chat.saving || !chat.preview}
          placeholder="the middle part, remove the bg"
          className="min-w-0 flex-1 border-[2px] bg-transparent px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] outline-none placeholder:[color:var(--lv-ink-2)] disabled:opacity-40"
          style={{ borderColor: "var(--lv-ink)", color: "var(--lv-ink)" }}
        />
        <button
          type="submit"
          disabled={chat.busy || chat.saving || draft.trim().length < 2}
          className="shrink-0 border-[2px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] disabled:opacity-40"
          style={{
            borderColor: "var(--lv-ink)",
            background: "var(--lv-ink)",
            color: "var(--lv-bg)",
          }}
        >
          {chat.busy ? "…" : "go"}
        </button>
      </form>

      {chat.error && (
        <p
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: "var(--lv-accent)" }}
        >
          {chat.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Small onClick={() => void chat.undo()} disabled={!chat.canUndo || chat.busy}>
          undo
        </Small>
        <Small
          onClick={() => void save()}
          disabled={!chat.canUndo || chat.saving || chat.busy}
          solid
        >
          {chat.saving ? "saving…" : "use this photo"}
        </Small>
        <Small onClick={onClose} disabled={chat.saving}>
          done
        </Small>
      </div>
    </div>
  );
}

function Line({ turn }: { turn: ChatTurn }) {
  const mine = turn.role === "you";
  return (
    <p className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed">
      <span className="shrink-0" style={{ color: "var(--lv-ink-2)" }}>
        {mine ? "you" : "ai"}
      </span>
      <span style={{ color: mine ? "var(--lv-ink)" : "var(--lv-accent)" }}>
        {turn.text}
      </span>
    </p>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-mono text-[10px] uppercase tracking-[0.16em]"
      style={{ color: "var(--lv-ink-2)" }}
    >
      {children}
    </p>
  );
}

function Small({
  children,
  onClick,
  disabled,
  solid,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  solid?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-[2px] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] disabled:opacity-40"
      style={{
        borderColor: "var(--lv-ink)",
        background: solid ? "var(--lv-ink)" : "transparent",
        color: solid ? "var(--lv-bg)" : "var(--lv-ink)",
      }}
    >
      {children}
    </button>
  );
}
