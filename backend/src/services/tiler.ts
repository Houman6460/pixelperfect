import sharp from "sharp";
import { enhanceTile, getTilePosition, TileContext } from "./nanoBananaClient";

export interface Tile {
  x: number;
  y: number;
  width: number;
  height: number;
  buffer: Buffer;
}

export interface EnhancedTile extends Tile {
  enhancedBuffer: Buffer;
}

export interface ImageAnalysis {
  description: string;
  textures: string[];
  subjects: string[];
}

export async function createTiles(
  imageBuffer: Buffer,
  tileSize: number,
  overlap: number
): Promise<{ tiles: Tile[]; imageWidth: number; imageHeight: number }> {
  const image = sharp(imageBuffer);
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  if (!width || !height) {
    throw new Error("Unable to determine image dimensions");
  }

  const step = tileSize - overlap;
  const tiles: Tile[] = [];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const w = Math.min(tileSize, width - x);
      const h = Math.min(tileSize, height - y);

      const buffer = await image
        .clone()
        .extract({ left: x, top: y, width: w, height: h })
        .toBuffer();

      tiles.push({ x, y, width: w, height: h, buffer });
    }
  }

  return { tiles, imageWidth: width, imageHeight: height };
}

export async function enhanceTiles(
  tiles: Tile[],
  prompt: string,
  upscaleFactor: number,
  imageAnalysis?: ImageAnalysis,
  imageWidth?: number,
  imageHeight?: number,
  concurrency = 5 // Reduced for API rate limits
): Promise<EnhancedTile[]> {
  const results: EnhancedTile[] = new Array(tiles.length);
  let index = 0;
  let completed = 0;

  console.log(`Enhancing ${tiles.length} tiles with context-aware processing...`);
  if (imageAnalysis) {
    console.log(`Image analysis: ${imageAnalysis.description}`);
    console.log(`Detected textures: ${imageAnalysis.textures.join(", ")}`);
    console.log(`Detected subjects: ${imageAnalysis.subjects.join(", ")}`);
  }

  async function worker() {
    for (;;) {
      const current = index++;
      if (current >= tiles.length) {
        break;
      }
      const tile = tiles[current];
      
      // Build context for this tile
      let context: TileContext | undefined;
      if (imageAnalysis && imageWidth && imageHeight) {
        const position = getTilePosition(
          tile.x,
          tile.y,
          tile.width,
          tile.height,
          imageWidth,
          imageHeight
        );
        
        context = {
          position,
          imageDescription: imageAnalysis.description,
          textures: imageAnalysis.textures,
          subjects: imageAnalysis.subjects,
        };
      }
      
      const enhancedBuffer = await enhanceTile(tile.buffer, prompt, upscaleFactor, context);
      results[current] = { ...tile, enhancedBuffer };
      
      completed++;
      if (completed % 5 === 0 || completed === tiles.length) {
        console.log(`Progress: ${completed}/${tiles.length} tiles enhanced`);
      }
    }
  }

  const workers: Promise<void>[] = [];
  const workerCount = Math.min(concurrency, tiles.length || 1);

  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  return results;
}
