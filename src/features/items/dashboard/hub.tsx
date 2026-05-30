"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { font } from "@/features/theme/config";
import { CameraCapture } from "./camera-capture";
import { ProcessModal } from "@/features/items/dashboard/process-modal";
import { Boards } from "./boards";
import { Search } from "./search";
import { StatStrip } from "./stat-strip";
import type { DashboardItem } from "./types";

type PendingInput =
  | { kind: "file"; file: File }
  | { kind: "camera"; dataUrl: string }
  | null;

function nudge(count: number): string {
  if (count === 0) return "The catalogue is bare. Photograph something.";
  if (count <= 3)
    return `No shot you got ${count} item${count === 1 ? "" : "s"} in your room. Add more, don't be shy.`;
  if (count <= 10) return "Decent start. Keep feeding the table.";
  return "The room remembers everything now.";
}

export function Hub({ items, now }: { items: DashboardItem[]; now: number }) {
  const count = items.length;
  return (
    <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <LeftPane items={items} count={count} now={now} />
      {count > 0 && <Boards items={items} now={now} />}
    </div>
  );
}

function LeftPane({
  items,
  count,
  now,
}: {
  items: DashboardItem[];
  count: number;
  now: number;
}) {
  const [camera, setCamera] = useState(false);
  const [pendingInput, setPendingInput] = useState<PendingInput>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingInput({ kind: "file", file });
    if (inputRef.current) inputRef.current.value = "";
  }

  function onContinue(kind: "file" | "camera") {
    setPendingInput(null);
    if (kind === "camera") setCamera(true);
    else inputRef.current?.click();
  }

  return (
    <div className="flex flex-col pt-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFiles}
      />

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="font-mono text-[10px] uppercase tracking-[0.32em]"
        style={{ color: "var(--lv-accent)" }}
      >
        {count} item{count === 1 ? "" : "s"}
      </motion.p>

      <h2
        className="mt-3 uppercase leading-[0.9] tracking-[-0.03em]"
        style={{
          fontFamily: font.family,
          fontWeight: font.weight,
          fontSize: "clamp(2rem, 4.5vw, 3.4rem)",
        }}
      >
        <motion.span
          className="block"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.65, 0.3, 1] }}
        >
          begin with
        </motion.span>
        <motion.span
          className="block"
          style={{ color: "var(--lv-accent)" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.2, 0.65, 0.3, 1] }}
        >
          one thing.
        </motion.span>
      </h2>

      <p className="mt-3 text-[14px] leading-relaxed text-[color:var(--lv-ink-2)]">
        {nudge(count)}
      </p>

      <Search items={items} />

      <StatStrip items={items} now={now} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <AddMenu
          onUpload={() => inputRef.current?.click()}
          onCamera={() => setCamera(true)}
        />
        {count > 0 && (
          <LinkAction href="/app/room">
            check out room <span aria-hidden>→</span>
          </LinkAction>
        )}
      </div>

      <CameraCapture
        open={camera}
        onClose={() => setCamera(false)}
        onCapture={(dataUrl) => {
          setCamera(false);
          setPendingInput({ kind: "camera", dataUrl });
        }}
      />
      <ProcessModal
        input={pendingInput}
        onClose={() => setPendingInput(null)}
        onContinue={onContinue}
      />
    </div>
  );
}

function AddMenu({
  onUpload,
  onCamera,
}: {
  onUpload: () => void;
  onCamera: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={actionClass}
        style={{
          borderColor: "var(--lv-ink)",
          background: "var(--lv-ink)",
          color: "var(--lv-bg)",
        }}
      >
        <Wipe />
        <span className="relative flex items-center gap-2">
          <span aria-hidden>＋</span>
          add item
          <motion.span
            aria-hidden
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] leading-none"
          >
            ▾
          </motion.span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 top-full z-50 mt-2 w-56 border-[3px]"
            style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
          >
            <MenuItem
              onClick={() => {
                setOpen(false);
                onUpload();
              }}
            >
              <span aria-hidden>＋</span> upload images
            </MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                onCamera();
              }}
              last
            >
              <span aria-hidden>◉</span> take a photo
            </MenuItem>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  last,
}: {
  children: React.ReactNode;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.18em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)] ${last ? "" : "border-b-[1px]"}`}
      style={{ borderColor: "var(--lv-rule)" }}
    >
      {children}
    </button>
  );
}

const actionClass =
  "group relative inline-flex items-center gap-2 overflow-hidden border-[3px] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em]";

function LinkAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={actionClass}
      style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)", color: "var(--lv-ink)" }}
    >
      <Wipe />
      <span className="relative flex items-center gap-2">{children}</span>
    </Link>
  );
}

function Wipe() {
  return (
    <span
      aria-hidden
      className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
      style={{ background: "var(--lv-accent)" }}
    />
  );
}
