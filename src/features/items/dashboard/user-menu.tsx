"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/features/auth/actions";
import { useTheme } from "@/features/theme/use-theme";
import { CameraCapture } from "./camera-capture";
import { ProcessModal } from "./process-modal";

type PendingInput =
  | { kind: "file"; file: File }
  | { kind: "camera"; dataUrl: string }
  | null;

export function UserMenu({ email }: { email: string | undefined }) {
  const { mode, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [camera, setCamera] = useState(false);
  const [pendingInput, setPendingInput] = useState<PendingInput>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isDark = mode === "dark";
  const initial = (email?.trim().charAt(0) || "?").toUpperCase();

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

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOpen(false);
    setPendingInput({ kind: "file", file });
    if (inputRef.current) inputRef.current.value = "";
  }

  function onContinue(kind: "file" | "camera") {
    setPendingInput(null);
    if (kind === "camera") setCamera(true);
    else inputRef.current?.click();
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFiles}
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="account menu"
        className="group flex items-center gap-2 border-[3px] py-1.5 pl-1.5 pr-2 transition-colors"
        style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
      >
        <span
          className="flex h-8 w-8 items-center justify-center font-mono text-[14px] uppercase"
          style={{ background: "var(--lv-ink)", color: "var(--lv-bg)" }}
        >
          {initial}
        </span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[10px] leading-none"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.2, 0.65, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-60 border-[3px]"
            style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
          >
            {email && (
              <div
                className="border-b-[3px] px-4 py-3"
                style={{ borderColor: "var(--lv-ink)" }}
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--lv-ink-2)]">
                  keeper
                </p>
                <p className="truncate font-mono text-[11px] tracking-[0.04em]">
                  {email}
                </p>
              </div>
            )}

            <MenuItem
              onClick={() => {
                setOpen(false);
                inputRef.current?.click();
              }}
            >
              <span aria-hidden>＋</span> upload photos
            </MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                setCamera(true);
              }}
            >
              <span aria-hidden>◉</span> take a photo
            </MenuItem>
            <MenuItem onClick={toggle}>
              <span aria-hidden>{isDark ? "☀" : "☾"}</span>
              {isDark ? "light mode" : "dark mode"}
            </MenuItem>

            <form
              action={signOut}
              className="border-t-[3px]"
              style={{ borderColor: "var(--lv-ink)" }}
            >
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.18em] transition-colors hover:[background:var(--lv-accent)] hover:[color:var(--lv-bg)]"
              >
                <span aria-hidden>⏻</span> sign out
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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

function MenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 border-b-[1px] px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.18em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)]"
      style={{ borderColor: "var(--lv-rule)" }}
    >
      {children}
    </button>
  );
}
