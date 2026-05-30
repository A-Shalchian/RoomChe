"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { enqueue } from "./process-queue";

type Input =
  | { kind: "file"; file: File }
  | { kind: "camera"; dataUrl: string };

export function ProcessModal({
  input,
  onClose,
  onContinue,
}: {
  input: Input | null;
  onClose: () => void;
  onContinue: (kind: "file" | "camera") => void;
}) {
  return (
    <AnimatePresence>
      {input && (
        <ModalBody
          key="open"
          input={input}
          onClose={onClose}
          onContinue={onContinue}
        />
      )}
    </AnimatePresence>
  );
}

function ModalBody({
  input,
  onClose,
  onContinue,
}: {
  input: Input;
  onClose: () => void;
  onContinue: (kind: "file" | "camera") => void;
}) {
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (input.kind === "file") {
      const url = URL.createObjectURL(input.file);
      const id = requestAnimationFrame(() => setRawUrl(url));
      return () => {
        cancelAnimationFrame(id);
        URL.revokeObjectURL(url);
      };
    }
    const url = input.dataUrl;
    const id = requestAnimationFrame(() => setRawUrl(url));
    return () => cancelAnimationFrame(id);
  }, [input]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  async function enqueueAndContinue() {
    setSubmitting(true);
    const blob =
      input.kind === "file"
        ? input.file
        : await (await fetch(input.dataUrl)).blob();
    await enqueue(blob);
    onContinue(input.kind);
  }

  async function enqueueAndClose() {
    setSubmitting(true);
    const blob =
      input.kind === "file"
        ? input.file
        : await (await fetch(input.dataUrl)).blob();
    await enqueue(blob);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{
        background: "color-mix(in srgb, var(--lv-ink) 60%, transparent)",
      }}
      onClick={() => !submitting && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.2, 0.65, 0.3, 1] }}
        className="relative w-full max-w-md border-[3px]"
        style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b-[3px] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ borderColor: "var(--lv-ink)" }}
        >
          <span className="flex items-center gap-2">
            <span style={{ color: "var(--lv-accent)" }}>●</span> preview
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="close"
            className="hover:[color:var(--lv-accent)] disabled:opacity-40"
          >
            close ✕
          </button>
        </div>

        <div
          className="flex aspect-square w-full items-center justify-center overflow-hidden border-b-[3px]"
          style={{ borderColor: "var(--lv-ink)", background: "var(--lv-ink)" }}
        >
          {rawUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rawUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row">
          <SolidButton
            onClick={enqueueAndContinue}
            disabled={submitting}
            label={submitting ? "queuing…" : "process & continue"}
          />
          <GhostButton
            onClick={enqueueAndClose}
            disabled={submitting}
            label="process & done"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function SolidButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden border-[3px] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] disabled:opacity-50"
      style={{
        borderColor: "var(--lv-ink)",
        background: "var(--lv-ink)",
        color: "var(--lv-bg)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100 group-disabled:scale-x-0"
        style={{ background: "var(--lv-accent)" }}
      />
      <span className="relative">{label}</span>
    </button>
  );
}

function GhostButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex flex-1 items-center justify-center border-[3px] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)] disabled:opacity-50"
      style={{ borderColor: "var(--lv-ink)" }}
    >
      {label}
    </button>
  );
}
