export const CAPTURE_ANGLES = [
  "front",
  "back",
  "left",
  "right",
  "top",
  "detail",
] as const;

export type CaptureAngle = (typeof CAPTURE_ANGLES)[number];
