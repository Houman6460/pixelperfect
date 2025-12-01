import sharp from "sharp";
import { EnhancedTile } from "./tiler";

/**
 * Compute Gaussian weight for smooth blending.
 * This creates much smoother transitions than linear blending.
 */
function gaussianWeight(distance: number, sigma: number): number {
  if (sigma <= 0) return 1;
  // Gaussian: exp(-(x^2) / (2 * sigma^2))
  const normalized = distance / sigma;
  return Math.exp(-0.5 * normalized * normalized);
}

/**
 * Compute smooth blending weight using cosine interpolation.
 * Provides smoother transitions than linear blending.
 */
function smoothStep(t: number): number {
  // Clamp to [0, 1]
  const clamped = Math.max(0, Math.min(1, t));
  // Smoothstep: 3t^2 - 2t^3 (Hermite interpolation)
  return clamped * clamped * (3 - 2 * clamped);
}

export async function mergeTiles(
  tiles: EnhancedTile[],
  originalWidth: number,
  originalHeight: number,
  tileSize: number,
  overlap: number,
  upscaleFactor: number
): Promise<Buffer> {
  const finalWidth = Math.round(originalWidth * upscaleFactor);
  const finalHeight = Math.round(originalHeight * upscaleFactor);

  const channels = 4;
  const pixelCount = finalWidth * finalHeight;
  const acc = new Float32Array(pixelCount * channels);
  const accWeight = new Float32Array(pixelCount);

  // Feather zone is the overlap region scaled
  const feather = Math.round(overlap * upscaleFactor);
  
  // Sigma for Gaussian blending (controls smoothness)
  const sigma = feather * 0.4;

  for (const tile of tiles) {
    const targetX = Math.round(tile.x * upscaleFactor);
    const targetY = Math.round(tile.y * upscaleFactor);

    const { data, info } = await sharp(tile.enhancedBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const tWidth = info.width;
    const tHeight = info.height;
    const src = data;

    // Determine if this tile has neighbors on each side
    const hasLeftNeighbor = tile.x > 0;
    const hasRightNeighbor = tile.x + tile.width < originalWidth;
    const hasTopNeighbor = tile.y > 0;
    const hasBottomNeighbor = tile.y + tile.height < originalHeight;

    for (let ty = 0; ty < tHeight; ty++) {
      const y = targetY + ty;
      if (y < 0 || y >= finalHeight) {
        continue;
      }
      
      for (let tx = 0; tx < tWidth; tx++) {
        const x = targetX + tx;
        if (x < 0 || x >= finalWidth) {
          continue;
        }

        let weightX = 1;
        let weightY = 1;

        if (feather > 0) {
          // Left edge blending
          if (hasLeftNeighbor && tx < feather) {
            const t = tx / feather;
            weightX = Math.min(weightX, smoothStep(t));
          }
          
          // Right edge blending
          if (hasRightNeighbor && tx >= tWidth - feather) {
            const distFromRight = tWidth - 1 - tx;
            const t = distFromRight / feather;
            weightX = Math.min(weightX, smoothStep(t));
          }

          // Top edge blending
          if (hasTopNeighbor && ty < feather) {
            const t = ty / feather;
            weightY = Math.min(weightY, smoothStep(t));
          }
          
          // Bottom edge blending
          if (hasBottomNeighbor && ty >= tHeight - feather) {
            const distFromBottom = tHeight - 1 - ty;
            const t = distFromBottom / feather;
            weightY = Math.min(weightY, smoothStep(t));
          }
        }

        // Combine weights (use product for smooth 2D blending)
        // Add small epsilon to avoid zero weights at corners
        const weight = Math.max(1e-4, weightX * weightY);

        const dstIndex = y * finalWidth + x;
        const srcIndex = (ty * tWidth + tx) * channels;

        acc[dstIndex * channels] += src[srcIndex] * weight;
        acc[dstIndex * channels + 1] += src[srcIndex + 1] * weight;
        acc[dstIndex * channels + 2] += src[srcIndex + 2] * weight;
        acc[dstIndex * channels + 3] += src[srcIndex + 3] * weight;
        accWeight[dstIndex] += weight;
      }
    }
  }

  const out = Buffer.alloc(pixelCount * channels);

  for (let i = 0; i < pixelCount; i++) {
    const w = accWeight[i] || 1;
    const base = i * channels;
    out[base] = Math.min(255, Math.max(0, Math.round(acc[base] / w)));
    out[base + 1] = Math.min(255, Math.max(0, Math.round(acc[base + 1] / w)));
    out[base + 2] = Math.min(255, Math.max(0, Math.round(acc[base + 2] / w)));
    out[base + 3] = Math.min(255, Math.max(0, Math.round(acc[base + 3] / w)));
  }

  const buffer = await sharp(out, {
    raw: {
      width: finalWidth,
      height: finalHeight,
      channels,
    },
  })
    .png()
    .toBuffer();

  return buffer;
}
