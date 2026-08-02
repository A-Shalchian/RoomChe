import { z } from "zod";

const unit = z.number().min(0).max(1);
const box = z.tuple([unit, unit, unit, unit]);
const point = z.tuple([unit, unit]);

export const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("cutout") }),
  z.object({
    op: z.literal("cutout_region"),
    boxes: z.array(box).max(4).optional(),
    points: z.array(point).max(8).optional(),
    precise: z.boolean().optional(),
  }),
  z.object({ op: z.literal("erase"), boxes: z.array(box).min(1).max(6) }),
  z.object({ op: z.literal("crop"), box }),
  z.object({ op: z.literal("trim") }),
  z.object({ op: z.literal("rotate"), degrees: z.number().min(-180).max(180) }),
  z.object({ op: z.literal("flip"), axis: z.enum(["horizontal", "vertical"]) }),
  z.object({
    op: z.literal("exposure"),
    brightness: z.number().min(0.2).max(3).optional(),
    contrast: z.number().min(0.2).max(3).optional(),
    saturation: z.number().min(0).max(3).optional(),
  }),
  z.object({ op: z.literal("white_balance") }),
  z.object({ op: z.literal("sharpen"), amount: z.number().min(0.1).max(3) }),
  z.object({
    op: z.literal("background"),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
  }),
]);

export type RetouchOp = z.infer<typeof opSchema>;

export const replySchema = z.object({
  reply: z.string().max(200),
  ops: z.array(opSchema).max(6),
});

export type RetouchReply = z.infer<typeof replySchema>;

export const OP_VOCABULARY = [
  '{"op":"cutout"} cut the background off the whole photo',
  '{"op":"cutout_region","boxes":[[x1,y1,x2,y2]]} keep the main object inside that box and cut everything else away. Use this when they name a part of the photo rather than the whole thing. Takes a second',
  '{"op":"cutout_region","boxes":[[x1,y1,x2,y2]],"points":[[x,y]],"precise":true} the same, but segmented exactly from the boxes and points rather than by picking the obvious object. Takes about a minute, so only use it when the box alone will not do, for instance one part of a cluttered group, and say in the reply that it is slow',
  '{"op":"erase","boxes":[[x1,y1,x2,y2]]} make those rectangles transparent, for removing something rather than keeping it',
  '{"op":"crop","box":[x1,y1,x2,y2]} crop to that rectangle',
  '{"op":"trim"} crop in to whatever is still opaque, with a small margin',
  '{"op":"rotate","degrees":n} positive turns clockwise',
  '{"op":"flip","axis":"horizontal|vertical"}',
  '{"op":"exposure","brightness":1.2,"contrast":1.1,"saturation":0.9} 1 leaves it alone',
  '{"op":"white_balance"} neutralise a colour cast',
  '{"op":"sharpen","amount":1}',
  '{"op":"background","color":"#ffffff"} flatten what is left onto a solid colour',
];
