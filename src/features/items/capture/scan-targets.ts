export const SCAN_SUBJECTS = [
  "small-simple",
  "small-complex",
  "garment-hung",
  "garment-flat",
  "large",
] as const;

export type ScanSubject = (typeof SCAN_SUBJECTS)[number];

export type ScanTarget = {
  label: string;
  example: string;
  min: number;
  ideal: number;
  rings: string;
};

export const SCAN_TARGETS: Record<ScanSubject, ScanTarget> = {
  "small-simple": {
    label: "small, simple",
    example: "mug, box, book",
    min: 40,
    ideal: 55,
    rings: "2 rings at 30° and 60°, 20 each, then 15 of the underside",
  },
  "small-complex": {
    label: "small, fiddly",
    example: "back scratcher, pendant, anything thin",
    min: 70,
    ideal: 105,
    rings: "3 rings at 15°, 45°, 70°, 28 each, then 20 of the underside",
  },
  "garment-hung": {
    label: "garment on a hanger",
    example: "shirt, jacket, dress",
    min: 50,
    ideal: 72,
    rings: "3 rings, 24 each, walking a full circle every time",
  },
  "garment-flat": {
    label: "garment laid flat",
    example: "folded knitwear",
    min: 30,
    ideal: 45,
    rings: "1 ring of 20 plus overheads, then flip it and repeat",
  },
  large: {
    label: "large object",
    example: "chair, lamp, suitcase",
    min: 70,
    ideal: 110,
    rings: "3 rings, 30 each, plus close passes on any detail",
  },
};

export const MIN_MEGAPIXELS = 8;
