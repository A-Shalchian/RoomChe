import { z } from "zod";

export const GRID = 0.25;
export const MIN_WALL = 0.5;

export const pointSchema = z.object({
  x: z.number().min(-60).max(60),
  z: z.number().min(-60).max(60),
});

export const wallSchema = z.object({
  colour: z.string().regex(/^#[0-9a-f]{6}$/i),
});

export const openingSchema = z.object({
  id: z.string(),
  wall: z.number().int().min(0).max(63),
  kind: z.enum(["door", "window"]),
  offset: z.number().min(0).max(60),
  width: z.number().min(0.2).max(10),
  height: z.number().min(0.2).max(5),
  sill: z.number().min(0).max(5),
});

export const planSchema = z.object({
  id: z.string().nullable(),
  name: z.string().min(1).max(60),
  wallHeight: z.number().min(1.5).max(5),
  floorColour: z.string().regex(/^#[0-9a-f]{6}$/i),
  points: z.array(pointSchema).max(64),
  walls: z.array(wallSchema).max(64),
  openings: z.array(openingSchema).max(64),
});

export type Point = z.infer<typeof pointSchema>;
export type Wall = z.infer<typeof wallSchema>;
export type Opening = z.infer<typeof openingSchema>;
export type RoomPlan = z.infer<typeof planSchema>;

export const DEFAULT_WALL_COLOUR = "#e8e4dc";

export function emptyPlan(): RoomPlan {
  return {
    id: null,
    name: "my room",
    wallHeight: 2.4,
    floorColour: "#b9a48a",
    points: [],
    walls: [],
    openings: [],
  };
}

export function starterPlan(): RoomPlan {
  const points: Point[] = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 3 },
    { x: 0, z: 3 },
  ];
  return {
    ...emptyPlan(),
    points,
    walls: points.map(() => ({ colour: DEFAULT_WALL_COLOUR })),
  };
}

export type Segment = {
  index: number;
  a: Point;
  b: Point;
  length: number;
  angle: number;
  mid: Point;
};

export function segments(points: Point[]): Segment[] {
  if (points.length < 2) return [];
  return points.map((a, index) => {
    const b = points[(index + 1) % points.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    return {
      index,
      a,
      b,
      length: Math.hypot(dx, dz),
      angle: Math.atan2(-dz, dx),
      mid: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
    };
  });
}

export function openingsOn(plan: RoomPlan, wall: number): Opening[] {
  return plan.openings
    .filter((o) => o.wall === wall)
    .sort((a, b) => a.offset - b.offset);
}

export function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

export function bounds(points: Point[]) {
  if (points.length === 0) {
    return { minX: 0, minZ: 0, maxX: 4, maxZ: 3 };
  }
  return points.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      minZ: Math.min(acc.minZ, p.z),
      maxX: Math.max(acc.maxX, p.x),
      maxZ: Math.max(acc.maxZ, p.z),
    }),
    { minX: Infinity, minZ: Infinity, maxX: -Infinity, maxZ: -Infinity },
  );
}

export function area(points: Point[]): number {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    total += a.x * b.z - b.x * a.z;
  }
  return Math.abs(total) / 2;
}

export function perimeter(points: Point[]): number {
  return segments(points).reduce((sum, s) => sum + s.length, 0);
}

export function fitOpening(opening: Opening, wallLength: number): Opening {
  const width = Math.min(opening.width, Math.max(0.2, wallLength - 0.2));
  const offset = Math.min(
    Math.max(0, opening.offset),
    Math.max(0, wallLength - width),
  );
  return { ...opening, width, offset };
}

export function newOpening(
  kind: Opening["kind"],
  wall: number,
  wallLength: number,
): Opening {
  const width = kind === "door" ? 0.9 : 1.2;
  return fitOpening(
    {
      id: crypto.randomUUID(),
      wall,
      kind,
      offset: Math.max(0, wallLength / 2 - width / 2),
      width,
      height: kind === "door" ? 2.05 : 1.2,
      sill: kind === "door" ? 0 : 0.9,
    },
    wallLength,
  );
}
