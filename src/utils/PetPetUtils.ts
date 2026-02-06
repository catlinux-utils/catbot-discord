// source: https://github.com/tairasoul/petpet-bot/blob/main/src/utils.ts - MIT Licence

import { createCanvas, loadImage } from "canvas";

import pkg from "gifenc";
const { GIFEncoder, quantize, applyPalette } = pkg as any;

const getFrames = (() => {
  let tries = 0;
  let cache: any;
  return async () => {
    if (!cache && tries++ < 5) {
      cache = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          loadImage(
            `https://raw.githubusercontent.com/VenPlugs/petpet/main/frames/pet${i}.gif`,
          ),
        ),
      );
      if (!cache && tries === 5)
        console.error("Lazy factory failed:", getFrames);
    }
    return cache;
  };
})();

export const createGif = async (profileImage: string, delay:number = 20) => {
  const frames = await getFrames();
  const gif = new GIFEncoder(128, 128);

  const canv = createCanvas(128, 128);
  const ctx = canv.getContext("2d");

  const image = await loadImage(profileImage);

  for (let i = 0; i < 10; i++) {
    ctx.clearRect(0, 0, canv.width, canv.height);

    const j = i < 10 / 2 ? i : 10 - i;
    const width = 0.8 + j * 0.02;
    const height = 0.8 - j * 0.05;
    const offsetX = (1 - width) * 0.5 + 0.1;
    const offsetY = 1 - height - 0.08;

    ctx.drawImage(
      image,
      offsetX * 128,
      offsetY * 128,
      width * 128,
      height * 128,
    );
    ctx.drawImage(frames[i], 0, 0, 128, 128);

    const { data } = ctx.getImageData(0, 0, 128, 128);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);

    gif.writeFrame(index, 128, 128, {
      transparent: true,
      palette,
      delay,
    });
  }

  gif.finish();

  const fileBuffer = Buffer.from(gif.buffer);

  return fileBuffer;
};
