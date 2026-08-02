"use client";

import { useState } from "react";
import { useCamera } from "@/features/items/capture/use-camera";
import {
  useGuidedShots,
  type GuidedShot,
} from "@/features/items/capture/use-guided-shots";
import { sendPhotos, startJob } from "@/features/items/scan3d/send-scan";
import { CaptureShell, FooterButton, ShutterButton } from "./capture-shell";
import type { CapturedShot } from "./camera-capture";

export function GuidedCapture({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (shots: CapturedShot[]) => void;
}) {
  const { videoRef, status, error, start, grab } = useCamera(open);
  const guide = useGuidedShots();
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  function close() {
    guide.reset();
    setSendError(null);
    onClose();
  }

  function shoot() {
    const frame = grab();
    if (frame) guide.capture(frame.canvas, frame.dataUrl);
  }

  function retake() {
    guide.discard();
    void start();
  }

  function keep() {
    guide.accept();
    void start();
  }

  async function finish() {
    const all = guide.pending ? [...guide.shots, guide.pending] : guide.shots;
    if (all.length === 0) return;

    setSending(true);
    setSendError(null);
    try {
      const setId = crypto.randomUUID();
      const blobs = await Promise.all(
        all.map(async (shot) => (await fetch(shot.dataUrl)).blob()),
      );
      await sendPhotos(setId, blobs);
      await startJob({
        setId,
        label: guide.direction?.subject ?? "scanned object",
        subject: "ground-oneside",
        source: "photos",
        route: "ai",
      });
      const captured = all.map(toCapturedShot);
      guide.reset();
      onCapture(captured);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  const count = guide.shots.length + (guide.pending ? 1 : 0);
  const done = guide.direction?.enough ?? false;

  return (
    <CaptureShell
      open={open}
      title={
        <>
          3d capture
          {count > 0 && (
            <span style={{ color: "var(--lv-accent)" }}>
              {count} shot{count === 1 ? "" : "s"}
            </span>
          )}
        </>
      }
      onClose={close}
      videoRef={videoRef}
      status={status}
      error={error}
      preview={guide.pending?.dataUrl ?? null}
      overlay={
        <Overlay
          headline={guide.blocked ?? guide.headline}
          why={guide.pending ? null : (guide.direction?.why ?? null)}
          thinking={guide.thinking}
          last={guide.pending ? null : (guide.shots.at(-1) ?? null)}
        />
      }
      body={
        <Status
          count={count}
          more={guide.direction?.more ?? null}
          done={done}
          error={sendError ?? guide.error}
        />
      }
      footer={
        guide.pending ? (
          <>
            <FooterButton onClick={retake} disabled={sending}>
              retake
            </FooterButton>
            <FooterButton onClick={keep} disabled={sending || guide.thinking}>
              keep
            </FooterButton>
            <FooterButton onClick={() => void finish()} disabled={sending} solid>
              {sending ? "sending…" : `build 3d (${count}) →`}
            </FooterButton>
          </>
        ) : status === "denied" ? (
          <FooterButton onClick={() => void start()} solid>
            retry
          </FooterButton>
        ) : (
          <>
            {count > 0 && <span aria-hidden className="w-20" />}
            <ShutterButton onClick={shoot} disabled={status !== "live"} />
            {count > 0 && (
              <FooterButton onClick={() => void finish()} disabled={sending} solid>
                {sending ? "sending…" : `build 3d (${count}) →`}
              </FooterButton>
            )}
          </>
        )
      }
    />
  );
}

function Overlay({
  headline,
  why,
  thinking,
  last,
}: {
  headline: string;
  why: string | null;
  thinking: boolean;
  last: GuidedShot | null;
}) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 px-4 pb-4 pt-10"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--lv-ink) 82%, transparent), transparent)",
        }}
      >
        <p
          className="text-[17px] font-semibold leading-tight tracking-tight"
          style={{ color: "var(--lv-bg)" }}
        >
          {headline}
        </p>
        {why && (
          <p
            className="font-mono text-[10px] uppercase tracking-[0.16em]"
            style={{ color: "var(--lv-accent)" }}
          >
            {why}
          </p>
        )}
        {thinking && (
          <p
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: "var(--lv-bg)", opacity: 0.7 }}
          >
            reading the set…
          </p>
        )}
      </div>

      {last && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={last.dataUrl}
          alt=""
          aria-hidden
          className="absolute right-3 top-3 h-16 w-16 border-[2px] object-cover opacity-70"
          style={{ borderColor: "var(--lv-bg)" }}
        />
      )}
    </>
  );
}

function Status({
  count,
  more,
  done,
  error,
}: {
  count: number;
  more: number | null;
  done: boolean;
  error: string | null;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 border-t-[3px] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em]"
      style={{ borderColor: "var(--lv-ink)" }}
    >
      <p className="flex gap-2">
        <span style={{ color: "var(--lv-ink-2)" }}>set</span>
        <span>
          {count} shot{count === 1 ? "" : "s"}
          {more !== null && more > 0 && ` · about ${more} more`}
          {done && " · enough to build"}
        </span>
      </p>
      {error && (
        <p className="flex gap-2">
          <span style={{ color: "var(--lv-ink-2)" }}>problem</span>
          <span style={{ color: "var(--lv-accent)" }}>{error}</span>
        </p>
      )}
    </div>
  );
}

function toCapturedShot(shot: GuidedShot): CapturedShot {
  return { dataUrl: shot.dataUrl, angle: shot.angle };
}
