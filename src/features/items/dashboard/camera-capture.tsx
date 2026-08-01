"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect } from "react";
import type { CaptureAngle } from "@/features/items/capture/angles";
import { resolveAngle } from "@/features/items/capture/coverage";
import { useCamera } from "@/features/items/capture/use-camera";
import { useShotReview } from "@/features/items/capture/use-shot-review";
import { CaptureCoach } from "./capture-coach";

export type CapturedShot = { dataUrl: string; angle: CaptureAngle };

export function CameraCapture({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (shots: CapturedShot[]) => void;
}) {
  const { videoRef, status, error, start, grab } = useCamera(open);
  const review = useShotReview();
  const { pending, all, coverage, nextAngle, reset } = review;

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function shoot() {
    const frame = grab();
    if (frame) review.capture(frame.canvas, frame.dataUrl, nextAngle);
  }

  function retake() {
    review.discard();
    void start();
  }

  function keepGoing() {
    review.accept();
    void start();
  }

  function finish() {
    if (all.length === 0) return;
    onCapture(
      all.map((shot) => ({ dataUrl: shot.dataUrl, angle: resolveAngle(shot) })),
    );
  }

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
                capture · {nextAngle}
                {all.length > 0 && (
                  <span style={{ color: "var(--lv-accent)" }}>
                    {all.length} shot{all.length === 1 ? "" : "s"}
                  </span>
                )}
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
              {pending ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pending.dataUrl}
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

              {!pending && (status === "requesting" || status === "denied") && (
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

            <CaptureCoach
              coverage={coverage}
              pending={pending}
              nextAngle={nextAngle}
            />

            <div
              className="flex items-center justify-between gap-3 border-t-[3px] px-4 py-3"
              style={{ borderColor: "var(--lv-ink)" }}
            >
              {pending ? (
                <>
                  <FooterButton onClick={retake}>retake</FooterButton>
                  <FooterButton onClick={keepGoing}>keep · next angle</FooterButton>
                  <FooterButton onClick={finish} solid>
                    done ({all.length}) →
                  </FooterButton>
                </>
              ) : status === "denied" ? (
                <FooterButton onClick={() => void start()} solid>
                  retry
                </FooterButton>
              ) : (
                <>
                  {all.length > 0 && <span aria-hidden className="w-20" />}
                  <button
                    type="button"
                    onClick={shoot}
                    disabled={status !== "live"}
                    aria-label="take photo"
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[3px] transition-transform hover:scale-105 disabled:opacity-40"
                    style={{ borderColor: "var(--lv-ink)" }}
                  >
                    <span
                      className="block h-8 w-8 rounded-full"
                      style={{ background: "var(--lv-accent)" }}
                    />
                  </button>
                  {all.length > 0 && (
                    <FooterButton onClick={finish} solid>
                      done ({all.length}) →
                    </FooterButton>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FooterButton({
  children,
  onClick,
  solid,
}: {
  children: React.ReactNode;
  onClick: () => void;
  solid?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex items-center gap-2 overflow-hidden border-[3px] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em]"
      style={{
        borderColor: "var(--lv-ink)",
        background: solid ? "var(--lv-ink)" : "var(--lv-bg)",
        color: solid ? "var(--lv-bg)" : "var(--lv-ink)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
        style={{ background: "var(--lv-accent)" }}
      />
      <span className="relative">{children}</span>
    </button>
  );
}
