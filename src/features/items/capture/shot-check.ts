"use client";

const WORK_WIDTH = 320;
const MIN_SHARPNESS = 55;
const MIN_SOURCE_WIDTH = 900;
const DARK_LUMA = 52;
const BRIGHT_LUMA = 212;
const MAX_CLIPPED = 0.18;
const MIN_FILL = 0.22;
const MAX_FILL = 0.94;

export type ShotFlag =
  | "blurry"
  | "dark"
  | "bright"
  | "too-far"
  | "cut-off"
  | "low-res";

export type ShotCheck = {
  sharpness: number;
  luma: number;
  clipped: number;
  fill: number;
  flags: ShotFlag[];
};

export const FLAG_COPY: Record<ShotFlag, string> = {
  blurry: "out of focus, hold still and tap to refocus",
  dark: "too dark, add light or move to a window",
  bright: "blown out, kill the direct light or backlight",
  "too-far": "object too small in frame, step closer",
  "cut-off": "object fills the whole frame, back up so nothing is cropped",
  "low-res": "camera resolution is low for a 3d model",
};

export function checkShot(canvas: HTMLCanvasElement): ShotCheck | null {
  const gray = toGrayscale(canvas);
  if (!gray) return null;

  const { data, width, height } = gray;
  const sharpness = laplacianVariance(data, width, height);
  const { luma, clipped } = exposure(data);
  const fill = subjectFill(data, width, height);

  const flags: ShotFlag[] = [];
  if (sharpness < MIN_SHARPNESS) flags.push("blurry");
  if (luma < DARK_LUMA) flags.push("dark");
  else if (luma > BRIGHT_LUMA || clipped > MAX_CLIPPED) flags.push("bright");
  if (fill < MIN_FILL) flags.push("too-far");
  else if (fill > MAX_FILL) flags.push("cut-off");
  if (canvas.width < MIN_SOURCE_WIDTH) flags.push("low-res");

  return { sharpness, luma, clipped, fill, flags };
}

function toGrayscale(source: HTMLCanvasElement) {
  const scale = Math.min(1, WORK_WIDTH / source.width);
  const width = Math.max(2, Math.round(source.width * scale));
  const height = Math.max(2, Math.round(source.height * scale));

  const work = document.createElement("canvas");
  work.width = width;
  work.height = height;
  const ctx = work.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);

  const rgba = ctx.getImageData(0, 0, width, height).data;
  const data = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 1, p += 4) {
    data[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }
  return { data, width, height };
}

function laplacianVariance(data: Float32Array, width: number, height: number) {
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const value =
        data[i - width] +
        data[i + width] +
        data[i - 1] +
        data[i + 1] -
        4 * data[i];
      sum += value;
      sumSq += value * value;
      count += 1;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

function exposure(data: Float32Array) {
  let sum = 0;
  let clipped = 0;
  for (let i = 0; i < data.length; i += 1) {
    sum += data[i];
    if (data[i] < 8 || data[i] > 247) clipped += 1;
  }
  return { luma: sum / data.length, clipped: clipped / data.length };
}

function subjectFill(data: Float32Array, width: number, height: number) {
  const energy = new Float32Array(width * height);
  let sum = 0;
  let sumSq = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx = data[i + 1] - data[i - 1];
      const gy = data[i + width] - data[i - width];
      const value = Math.abs(gx) + Math.abs(gy);
      energy[i] = value;
      sum += value;
      sumSq += value * value;
    }
  }
  const count = (width - 2) * (height - 2);
  if (count <= 0) return 0;
  const mean = sum / count;
  const std = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
  const threshold = mean + std;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (energy[y * width + x] <= threshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return 0;
  return ((maxX - minX + 1) * (maxY - minY + 1)) / (width * height);
}
