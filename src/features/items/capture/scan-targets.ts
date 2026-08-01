export const SCAN_SUBJECTS = [
  "ground-rigid",
  "ground-complex",
  "ground-oneside",
  "ground-large",
  "flat-garment",
  "hung-garment",
] as const;

export type ScanSubject = (typeof SCAN_SUBJECTS)[number];

export type ScanRoute = "photogrammetry" | "multiview-ai";

export type ScanTarget = {
  label: string;
  example: string;
  min: number;
  ideal: number;
  protocol: string;
  backdrop: string;
  flip: boolean;
  masks: boolean;
  route: ScanRoute;
  caveat: string | null;
};

export const SCAN_TARGETS: Record<ScanSubject, ScanTarget> = {
  "ground-rigid": {
    label: "rigid, on the floor",
    example: "mug, book, shoe, tool",
    min: 55,
    ideal: 80,
    protocol:
      "3 rings around it at roughly 25°, 50°, 75°, 20 shots each, plus 5 straight down. Then turn it onto another face and repeat.",
    backdrop: "hard floor, textured mat or spread newspaper underneath",
    flip: true,
    masks: true,
    route: "photogrammetry",
    caveat: null,
  },
  "ground-complex": {
    label: "thin or fiddly, on the floor",
    example: "back scratcher, cable, jewellery",
    min: 80,
    ideal: 120,
    protocol:
      "3 rings at 20°, 45°, 70°, 30 shots each, plus close passes on the thin parts. Then flip and repeat.",
    backdrop: "hard floor, matte contrasting mat, no glare",
    flip: true,
    masks: true,
    route: "photogrammetry",
    caveat:
      "thin and shiny parts drop out no matter how many photos you take. if this comes out full of holes, send it down the ai route instead",
  },
  "ground-oneside": {
    label: "one side only, no flip",
    example: "anything you cannot turn over",
    min: 40,
    ideal: 60,
    protocol:
      "3 rings at 25°, 50°, 75°, 20 shots each, plus 5 straight down. Stay on the one side.",
    backdrop: "hard floor, textured mat, keep it in frame for tracking",
    flip: false,
    masks: false,
    route: "photogrammetry",
    caveat:
      "the underside is hidden in every frame, so it gets invented. fine if the item always sits on a shelf",
  },
  "ground-large": {
    label: "large, on the floor",
    example: "chair, suitcase, lamp",
    min: 70,
    ideal: 110,
    protocol:
      "3 rings at 20°, 45°, 70°, 30 shots each, walking a wide circle, plus close passes on any detail.",
    backdrop: "keep the room in frame, it helps the solve",
    flip: false,
    masks: false,
    route: "photogrammetry",
    caveat: null,
  },
  "flat-garment": {
    label: "garment laid flat",
    example: "shirt, cardigan, jeans",
    min: 24,
    ideal: 40,
    protocol:
      "smooth it out, 2 rings at 45° and 70°, 10 shots each, plus 2 straight down. Then flip it and repeat for the back.",
    backdrop: "hard floor, plain contrasting sheet, even light, no shadows",
    flip: true,
    masks: true,
    route: "multiview-ai",
    caveat:
      "a flat garment has no measurable volume, so this feeds the ai route for a wearable shape rather than colmap",
  },
  "hung-garment": {
    label: "garment on a hanger",
    example: "shirt, jacket, dress",
    min: 50,
    ideal: 72,
    protocol:
      "hang it clear of the wall, 3 rings at 20°, 45°, 70°, 24 shots each, full circle every time.",
    backdrop: "textured background, at least a metre behind it",
    flip: false,
    masks: false,
    route: "photogrammetry",
    caveat: "the only way to get real garment volume, worth the hassle",
  },
};

export const MIN_MEGAPIXELS = 8;

export function reconstructCommand(
  setId: string,
  subject: ScanSubject,
): string {
  const target = SCAN_TARGETS[subject];
  if (target.route === "multiview-ai") {
    return `front and back are ready in .scans/${setId}/raw, feed them to the multi-view model`;
  }
  return `python scripts/reconstruct.py .scans/${setId}${target.masks ? " --masks" : ""}`;
}
