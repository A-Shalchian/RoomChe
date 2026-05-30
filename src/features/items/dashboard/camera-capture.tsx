"use client";

import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "requesting" | "live" | "shot" | "denied";

export function CameraCapture({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [shot, setShot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setShot(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("live");
    } catch {
      setStatus("denied");
      setError("camera access blocked. allow it in your browser, then retry.");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => start());
    return () => {
      cancelAnimationFrame(id);
      stop();
    };
  }, [open, start, stop]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setShot(canvas.toDataURL("image/jpeg", 0.92));
    setStatus("shot");
    stop();
  }

  function keep() {
    if (!shot) return;
    onCapture(shot);
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
            className="relative w-full max-w-xl border-[3px]"
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
                capture
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
              {shot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shot} alt="captured" className="h-full w-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              )}

              {(status === "requesting" || status === "denied") && (
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

            <div
              className="flex items-center justify-between gap-3 border-t-[3px] px-4 py-3"
              style={{ borderColor: "var(--lv-ink)" }}
            >
              {status === "shot" ? (
                <>
                  <FooterButton onClick={start}>retake</FooterButton>
                  <FooterButton onClick={keep} solid>
                    use this →
                  </FooterButton>
                </>
              ) : status === "denied" ? (
                <FooterButton onClick={start} solid>
                  retry
                </FooterButton>
              ) : (
                <button
                  type="button"
                  onClick={capture}
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
