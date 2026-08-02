"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, type ReactNode, type RefObject } from "react";
import type { CameraStatus } from "@/features/items/capture/use-camera";

export function CaptureShell({
  open,
  title,
  onClose,
  videoRef,
  status,
  error,
  preview,
  overlay,
  body,
  footer,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error: string | null;
  preview: string | null;
  overlay?: ReactNode;
  body?: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, var(--lv-ink) 60%, transparent)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 12 }}
            transition={{ duration: 0.28, ease: [0.2, 0.65, 0.3, 1] }}
            className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto border-[3px]"
            style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b-[3px] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em]"
              style={{ borderColor: "var(--lv-ink)" }}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: "var(--lv-accent)" }}
                />
                {title}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="close camera"
                className="transition-colors hover:[color:var(--lv-accent)]"
              >
                close ✕
              </button>
            </div>

            <div
              className="relative aspect-[4/3] w-full overflow-hidden"
              style={{ background: "var(--lv-ink)" }}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="captured"
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              )}

              {overlay}

              {!preview && (status === "requesting" || status === "denied") && (
                <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
                  <p
                    className="font-mono text-[11px] uppercase tracking-[0.18em]"
                    style={{ color: "var(--lv-bg)" }}
                  >
                    {status === "requesting"
                      ? "asking for the camera…"
                      : (error ?? "no camera")}
                  </p>
                </div>
              )}
            </div>

            {body}

            <div
              className="flex items-center justify-between gap-3 border-t-[3px] px-4 py-3"
              style={{ borderColor: "var(--lv-ink)" }}
            >
              {footer}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ShutterButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="take photo"
      className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[3px] transition-transform hover:scale-105 disabled:opacity-40"
      style={{ borderColor: "var(--lv-ink)" }}
    >
      <span
        className="block h-8 w-8 rounded-full"
        style={{ background: "var(--lv-accent)" }}
      />
    </button>
  );
}

export function FooterButton({
  children,
  onClick,
  disabled,
  solid,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  solid?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative inline-flex items-center gap-2 overflow-hidden border-[3px] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] disabled:opacity-40"
      style={{
        borderColor: "var(--lv-ink)",
        background: solid ? "var(--lv-ink)" : "var(--lv-bg)",
        color: solid ? "var(--lv-bg)" : "var(--lv-ink)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100 group-disabled:scale-x-0"
        style={{ background: "var(--lv-accent)" }}
      />
      <span className="relative">{children}</span>
    </button>
  );
}
