export const CAPTURE_ANGLES = [
  "front",
  "back",
  "left",
  "right",
  "top",
  "detail",
] as const;

export type CaptureAngle = (typeof CAPTURE_ANGLES)[number];

export const REQUIRED_ANGLES: CaptureAngle[] = ["front", "back", "left", "right"];

export const ANGLE_HINTS: Record<CaptureAngle, string> = {
  front: "face the object straight on, whole thing in frame",
  back: "turn it around, same distance",
  left: "step a quarter turn left, keep the object centred",
  right: "quarter turn the other way",
  top: "shoot down from above",
  detail: "close in on a label, texture, or damage",
};
