import { z } from "zod";
import {
  DEFAULT_WALL_COLOUR,
  fitOpening,
  snap,
  type Opening,
  type Point,
  type RoomPlan,
} from "./plan";

export const guessSchema = z.object({
  wallHeight: z.number().min(1.8).max(4),
  floorColour: z.string().regex(/^#[0-9a-f]{6}$/i),
  confidence: z.enum(["rough", "fair", "good"]),
  note: z.string().max(160),
  walls: z
    .array(
      z.object({
        length: z.number().min(0.4).max(30),
        turn: z.number().min(-170).max(170),
        colour: z.string().regex(/^#[0-9a-f]{6}$/i),
        openings: z
          .array(
            z.object({
              kind: z.enum(["door", "window"]),
              offset: z.number().min(0).max(30),
              width: z.number().min(0.3).max(8),
              height: z.number().min(0.3).max(3.5),
              sill: z.number().min(0).max(2.5),
            }),
          )
          .max(4),
      }),
    )
    .min(3)
    .max(16),
});

export type Guess = z.infer<typeof guessSchema>;

export type GuessedPlan = {
  plan: RoomPlan;
  closureError: number;
  confidence: Guess["confidence"];
  note: string;
};

export function planFromGuess(guess: Guess, name: string): GuessedPlan {
  const points: Point[] = [];
  const openings: Opening[] = [];

  let x = 0;
  let z = 0;
  let heading = 0;

  guess.walls.forEach((wall, index) => {
    points.push({ x: snap(x), z: snap(z) });
    x += Math.cos(heading) * wall.length;
    z += Math.sin(heading) * wall.length;
    heading += (wall.turn * Math.PI) / 180;

    for (const o of wall.openings) {
      openings.push(
        fitOpening(
          {
            id: crypto.randomUUID(),
            wall: index,
            kind: o.kind,
            offset: o.offset,
            width: o.width,
            height: o.height,
            sill: o.kind === "door" ? 0 : o.sill,
          },
          wall.length,
        ),
      );
    }
  });

  return {
    plan: {
      id: null,
      name,
      wallHeight: guess.wallHeight,
      floorColour: guess.floorColour,
      points,
      walls: guess.walls.map((w) => ({ colour: w.colour || DEFAULT_WALL_COLOUR })),
      openings,
    },
    closureError: Math.hypot(x, z),
    confidence: guess.confidence,
    note: guess.note,
  };
}

export const GUESS_RULES = [
  "Start with the wall holding the main door. That is wall 1.",
  "Work clockwise as seen from above, standing inside the room.",
  "length is that wall in metres, corner to corner.",
  "turn is how many degrees you rotate at the END of that wall to face along the next one. Clockwise is positive. A normal square corner is 90. Sum every turn and it must come to 360.",
  "offset is metres from the START corner of that wall to the near edge of the opening.",
  "sill is metres from the floor to the bottom of a window. Doors sit on the floor, so their sill is 0.",
  "colour is the paint you can see on that wall, as a hex string. Use the same colour for every wall unless one is clearly different.",
  "Judge sizes against things you can recognise. An interior door is about 2.03m tall and 0.8m wide. A light switch sits about 1.1m up. A skirting board is about 0.1m.",
  "confidence: good only when you saw every corner, fair when you inferred one, rough when the video missed a chunk of the room.",
];
