// petpet.ts
// Compatible rewrite of the original petpet GIF generator
// Uses correct skia-canvas API + gifenc (required for animated GIF)
// MIT License – based on https://github.com/tairasoul/petpet-bot/blob/main/src/utils.ts

import { Canvas, loadImage, type Image } from "skia-canvas";
import pkg from "gifenc";
const { GIFEncoder, quantize, applyPalette } = pkg as any;

const FRAME_COUNT = 10;
const SIZE = 128;

// Lazy-loaded & cached petpet hand frames (remote GIFs)
let frameCache: Image[] | null = null;
let loadAttempts = 0;

const getFrames = async (): Promise<Image[]> => {
  if (frameCache) return frameCache;

  if (loadAttempts >= 5) {
    throw new Error("Failed to load petpet frames after 5 attempts");
  }

  loadAttempts++;

  try {
    const urls = Array.from(
      { length: FRAME_COUNT },
      (_, i) =>
        `https://raw.githubusercontent.com/VenPlugs/petpet/main/frames/pet${i}.gif`,
    );

    frameCache = await Promise.all(urls.map((url) => loadImage(url)));
    return frameCache;
  } catch (err) {
    console.warn(`Frame load attempt ${loadAttempts} failed:`, err);
    frameCache = null;
    throw err;
  }
};

/**
 * Generates a petpet-style pat/squish animated GIF (128×128)
 * @param avatarUrl - URL to user avatar (PNG/JPG/WEBP/GIF supported)
 * @param delay - frame delay in ms (default 20 ≈ 50 fps)
 * @returns Buffer containing the animated GIF
 */
export async function createGif(
  avatarUrl: string,
  delay: number = 20,
): Promise<Buffer> {
  const petFrames = await getFrames();

  let avatar: Image;
  try {
    avatar = await loadImage(avatarUrl);
  } catch (err) {
    throw new Error(`Failed to load avatar from ${avatarUrl}: ${err}`);
  }

  // Create reusable canvas for frame composition
  const canvas = new Canvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  // Initialize GIF encoder
  const gif = new GIFEncoder(SIZE, SIZE);
  // gif.start(); // Important: start() must be called before frames
  // gif.setRepeat(0); // 0 = loop forever (matches common petpet bots)

  for (let i = 0; i < FRAME_COUNT; i++) {
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Squish animation logic (identical to original)
    const j = i < FRAME_COUNT / 2 ? i : FRAME_COUNT - i;
    const width = 0.8 + j * 0.02;
    const height = 0.8 - j * 0.05;

    const offsetX = (1 - width) * 0.5 + 0.1;
    const offsetY = 1 - height - 0.08;

    // Draw scaled & offset avatar
    ctx.drawImage(
      avatar,
      offsetX * SIZE,
      offsetY * SIZE,
      width * SIZE,
      height * SIZE,
    );

    // Overlay the petpet hand frame
    ctx.drawImage(petFrames[i], 0, 0, SIZE, SIZE);

    // Get raw RGBA pixel data
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

    // Quantize to 256 colors + generate indexed frame (keeps file size small)
    const palette = quantize(data, 256);
    const indexedPixels = applyPalette(data, palette);

    // Write frame with per-frame palette + transparency support
    gif.writeFrame(indexedPixels, SIZE, SIZE, {
      transparent: true,
      palette,
      delay, // in 1/100 seconds units internally
    });
  }

  gif.finish();

  return Buffer.from(gif.buffer);
}

// ────────────────────────────────────────────────
// Example usage (for testing in Node.js)
// ────────────────────────────────────────────────

/*
import fs from "node:fs/promises";

async function test() {
  try {
    const gifBuffer = await createPetpetGif(
      "https://example.com/avatar.png",  // ← replace with real avatar URL
      25                                 // slightly slower for visibility
    );
    await fs.writeFile("petpet-result.gif", gifBuffer);
    console.log("GIF saved → petpet-result.gif");
  } catch (err) {
    console.error("Failed:", err);
  }
}

test();
*/
