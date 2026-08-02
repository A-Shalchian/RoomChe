"use client";

import { useState } from "react";
import type { CaptureAngle } from "@/features/items/capture/angles";
import { useCamera } from "@/features/items/capture/use-camera";
import { CaptureShell, FooterButton, ShutterButton } from "./capture-shell";

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
  const [preview, setPreview] = useState<string | null>(null);

  function shoot() {
    const frame = grab();
    if (frame) setPreview(frame.dataUrl);
  }

  function retake() {
    setPreview(null);
    void start();
  }

  function close() {
    setPreview(null);
    onClose();
  }

  function use(dataUrl: string) {
    setPreview(null);
    onCapture([{ dataUrl, angle: "front" }]);
  }

  return (
    <CaptureShell
      open={open}
      title="photo"
      onClose={close}
      videoRef={videoRef}
      status={status}
      error={error}
      preview={preview}
      footer={
        preview ? (
          <>
            <FooterButton onClick={retake}>retake</FooterButton>
            <FooterButton onClick={() => use(preview)} solid>
              use it →
            </FooterButton>
          </>
        ) : status === "denied" ? (
          <FooterButton onClick={() => void start()} solid>
            retry
          </FooterButton>
        ) : (
          <ShutterButton onClick={shoot} disabled={status !== "live"} />
        )
      }
    />
  );
}
