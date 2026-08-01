"use client";

import { measure } from "./shot-check";

export type ScanFrame = {
  name: string;
  width: number;
  height: number;
  megapixels: number;
  sharpness: number;
  luma: number;
  clipped: number;
  hash: Uint8Array;
};

const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;

const POPCOUNT = Uint8Array.from({ length: 256 }, (_, i) => {
  let bits = 0;
  for (let b = i; b > 0; b >>= 1) bits += b & 1;
  return bits;
});

export async function analyzeFile(file: File): Promise<ScanFrame | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    const metrics = measure(bitmap);
    if (!metrics) return null;
    return {
      name: file.name,
      width: bitmap.width,
      height: bitmap.height,
      megapixels: (bitmap.width * bitmap.height) / 1_000_000,
      sharpness: metrics.sharpness,
      luma: metrics.luma,
      clipped: metrics.clipped,
      hash: differenceHash(bitmap),
    };
  } finally {
    bitmap.close();
  }
}

export function hammingDistance(a: Uint8Array, b: Uint8Array): number {
  let bits = 0;
  for (let i = 0; i < a.length; i += 1) bits += POPCOUNT[a[i] ^ b[i]];
  return bits;
}

function differenceHash(bitmap: ImageBitmap): Uint8Array {
  const hash = new Uint8Array(8);
  const canvas = document.createElement("canvas");
  canvas.width = HASH_WIDTH;
  canvas.height = HASH_HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return hash;
  ctx.drawImage(bitmap, 0, 0, HASH_WIDTH, HASH_HEIGHT);

  const rgba = ctx.getImageData(0, 0, HASH_WIDTH, HASH_HEIGHT).data;
  for (let y = 0; y < HASH_HEIGHT; y += 1) {
    let row = 0;
    for (let x = 0; x < HASH_WIDTH - 1; x += 1) {
      const left = luma(rgba, y * HASH_WIDTH + x);
      const right = luma(rgba, y * HASH_WIDTH + x + 1);
      row = (row << 1) | (left > right ? 1 : 0);
    }
    hash[y] = row;
  }
  return hash;
}

function luma(rgba: Uint8ClampedArray, index: number): number {
  const p = index * 4;
  return 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
}
