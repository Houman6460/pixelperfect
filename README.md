# Tile-based Image Super-Resolution Web App

Full-stack web app that enhances image resolution using a tile → enhance → merge pipeline, with a pluggable Nano Banana image model client.

- Backend: Node.js, TypeScript, Express, Sharp
- Frontend: React, TypeScript, Vite, TailwindCSS

## 1. Project structure

```text
/Users/houman/CascadeProjects/tile-sr-app
  backend/
    src/
      index.ts
      routes/enhance.ts
      services/
        tiler.ts
        merger.ts
        nanoBananaClient.ts
    tsconfig.json
    package.json
  frontend/
    index.html
    vite.config.ts
    tsconfig.json
    tailwind.config.cjs
    postcss.config.cjs
    src/
      main.tsx
      App.tsx
      index.css
      types.ts
      components/
        ImageUploader.tsx
        SettingsForm.tsx
        ProgressBar.tsx
        ResultViewer.tsx
```

## 2. Backend setup

### Install & configure

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```bash
PORT=4000
NANOBANANA_API_KEY=your_api_key_here
NANOBANANA_API_URL=https://your-nano-banana-endpoint
```

If `NANOBANANA_API_KEY` or `NANOBANANA_API_URL` are missing, the app falls back to a local `sharp`-based resize to simulate upscaling.

### Run in development

```bash
cd backend
npm run dev
```

Backend listens on `http://localhost:4000` by default.

### Build & run for production

```bash
cd backend
npm run build
npm start
```

### API

- **Endpoint:** `POST /api/enhance`
- **Input:** `multipart/form-data`
  - `image`: image file (`jpg`, `jpeg`, `png`, `webp`), max 10MB
  - `tileSize`: integer (default `256`)
  - `overlap`: integer (default `64`)
  - `upscaleFactor`: float (e.g. `1.5`, `2`)
  - `prompt`: string
  - `finalPass`: boolean (`"true"` / `"false"`)
- **Response JSON:**
  - `imageBase64`: final enhanced image (PNG) as Base64
  - `width`: final width in pixels
  - `height`: final height in pixels

Validation & errors:
- 400 if image is missing, invalid, too large, or if `tileSize` / `overlap` / `upscaleFactor` are invalid
- 400 if tile count exceeds a safe threshold (currently 500 tiles)
- 500 for internal errors or upstream model errors (with a generic message)

### Tiling & merging pipeline (backend)

1. **Load image:** `sharp` reads the uploaded image and extracts dimensions.
2. **Tiling with overlap:**
   - Step size: `step = tileSize - overlap`.
   - Tiles are extracted in a grid over `(x, y)` coordinates.
   - Edge tiles are cropped if the image size is not a multiple of `tileSize`.
3. **Tile enhancement:**
   - Each tile is sent to `nanoBananaClient.enhanceTile(tileBuffer, prompt, upscale)`.
   - Tiles are processed in parallel with a concurrency limit.
   - `nanoBananaClient` retries failed requests up to 2 additional times.
4. **Merging & blending:**
   - Final canvas size:
     - `finalWidth = originalWidth * upscaleFactor`
     - `finalHeight = originalHeight * upscaleFactor`
   - Enhanced tiles are placed at `targetX = x * upscaleFactor`, `targetY = y * upscaleFactor`.
   - A floating-point accumulator with weights is used for all pixels.
   - Overlapping regions are **feather-blended** both horizontally and vertically so seams are minimized.
5. **Final pass (optional):**
   - If `finalPass` is `true`, the merged image is sent one more time through `enhanceTile` with a prompt that biases
     toward global consistency and seam cleanup.

## 3. Nano Banana client

`backend/src/services/nanoBananaClient.ts` exposes:

```ts
async function enhanceTile(
  tileBuffer: Buffer,
  prompt: string,
  upscale: number
): Promise<Buffer>;
```

Behavior:
- If `NANOBANANA_API_URL` and `NANOBANANA_API_KEY` are set, it:
  - Encodes the tile as Base64 JSON
  - Sends it to the Nano Banana API via HTTP POST
  - Returns the output bytes as an image buffer
  - Retries up to 2 times on failure
- If env vars are missing, falls back to `sharp` resize as a local approximation.

To adapt to the real Nano Banana API, adjust only this file (payload shape, headers, and response parsing).

## 4. Frontend setup

### Install

```bash
cd frontend
npm install
```

### Run in development

```bash
cd frontend
npm run dev
```

- Vite dev server runs on `http://localhost:5173`.
- `vite.config.ts` proxies `/api` to `http://localhost:4000` for local development.

### Build for production

```bash
cd frontend
npm run build
```

The built static assets are in `frontend/dist/`.

### API base URL for deployment

The frontend uses:

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
axios.post(`${API_BASE}/api/enhance`, ...)
```

For local dev you dont need to set this because Vite dev proxy handles `/api`.
For production deployments where the backend is on a separate domain, set:

```bash
VITE_API_BASE_URL=https://your-backend-domain
```

## 5. Frontend UI

Main screen elements:

- **Image upload** (`ImageUploader`)
  - Drag & drop or file picker
  - Accepts JPG / PNG / WEBP up to 10MB
  - Shows a preview of the uploaded image
- **Settings panel** (`SettingsForm`)
  - Tile size (default 256 px)
  - Overlap (default 64 px)
  - Upscale factor (1.0×, 1.5×, 2.0×, 3.0×)
  - Text prompt
  - Final pass checkbox
- **Progress bar** (`ProgressBar`)
  - Displays labeled steps:
    - Upload
    - Tiling
    - Sending Tiles
    - Merging & Blending
    - Final Pass
  - Steps update during the enhancement request lifecycle.
- **Result viewer** (`ResultViewer`)
  - Shows original vs enhanced dimensions
  - Before/after slider overlay for visual comparison
  - Download button for the enhanced PNG
- **Help section**
  - Short explanations of tile size, overlap, upscale factor, and final pass.

## 6. How tile size and overlap affect quality

- **Tile size**
  - Smaller tiles (e.g. 128–256 px):
    - Pros: better local detail, more responsive to small textures
    - Cons: more tiles → more model calls → higher latency and cost
  - Larger tiles (e.g. 512–1024 px):
    - Pros: fewer calls, better global consistency per tile
    - Cons: may miss very fine details, more visible seams if overlap is too small

- **Overlap**
  - Overlap is the shared region between neighboring tiles.
  - Recommended: ~20–30% of `tileSize` (e.g. 64 px when `tileSize = 256`).
  - Higher overlap:
    - Smoother blending
    - Better continuity of lines and edges across tile borders
    - More pixels processed multiple times → slightly higher cost
  - Lower overlap:
    - Faster, fewer pixels processed multiple times
    - May introduce visible seams or small discontinuities at tile borders

## 7. Deployment notes

You can deploy backend and frontend separately:

- **Backend**
  - Any Node host (Render, Railway, Fly.io, plain VPS, etc.)
  - Run `npm run build` then `npm start`
  - Expose port defined by `PORT`
- **Frontend**
  - Any static hosting (Netlify, Vercel, GitHub Pages, S3+CloudFront, etc.)
  - Build with `npm run build` and deploy `dist/`
  - Set `VITE_API_BASE_URL` pointing to your backend URL.

Alternatively, serve the built `dist/` from Express by copying it into the backend and adding a static file handler that falls back to `index.html`.

## 8. Acceptance criteria checklist

- [x] User can upload an image and see a preview.
- [x] User can set tile size, overlap, upscale factor, prompt, and final pass.
- [x] Backend performs tiling with overlap, enhancement, merging with blending, and optional final pass.
- [x] Tiles are enhanced via a dedicated `nanoBananaClient` module with env-based configuration and retries.
- [x] Overlapping regions are feather-blended horizontally and vertically to reduce seams.
- [x] Final image is displayed with original vs final dimensions.
- [x] User can download the enhanced image as PNG.
- [x] API validates inputs, limits file size, and returns clear error messages.
- [x] README and UI help explain how tile size and overlap affect quality.
