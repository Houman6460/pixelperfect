import { Router, Request, Response } from "express";
import * as musicGallery from "../services/musicGalleryStorage";

const router = Router();

// ============== FOLDER ROUTES ==============

// Get all folders
router.get("/folders", (_req: Request, res: Response) => {
  try {
    const folders = musicGallery.getAllFolders();
    res.json({ success: true, folders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get folder by ID
router.get("/folders/:folderId", (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const folder = musicGallery.getFolder(folderId);
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.json({ success: true, folder });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get or create workflow folder
router.post("/folders/workflow", (req: Request, res: Response) => {
  try {
    const { workflowId, workflowName } = req.body;
    if (!workflowId || !workflowName) {
      return res.status(400).json({ error: "workflowId and workflowName are required" });
    }
    const folder = musicGallery.getOrCreateWorkflowFolder(workflowId, workflowName);
    res.json({ success: true, folder });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create folder
router.post("/folders", (req: Request, res: Response) => {
  try {
    const { name, workflowId } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Folder name is required" });
    }
    const folder = musicGallery.createFolder(name, workflowId || null);
    res.json({ success: true, folder });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Rename folder
router.patch("/folders/:folderId", (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "New name is required" });
    }
    const folder = musicGallery.renameFolder(folderId, name);
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.json({ success: true, folder });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete folder
router.delete("/folders/:folderId", (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const deleteContents = req.query.deleteContents === "true";
    const success = musicGallery.deleteFolder(folderId, deleteContents);
    if (!success) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============== TRACK ROUTES ==============

// Get all tracks
router.get("/tracks", (req: Request, res: Response) => {
  try {
    const workflowId = req.query.workflowId as string | undefined;
    const folderId = req.query.folderId as string | undefined;
    
    let tracks;
    if (workflowId) {
      tracks = musicGallery.getTracksByWorkflow(workflowId);
    } else if (folderId) {
      tracks = musicGallery.getTracksByFolder(folderId);
    } else if (req.query.uncategorized === "true") {
      tracks = musicGallery.getUncategorizedTracks();
    } else {
      tracks = musicGallery.getAllTracks();
    }
    
    // Add URLs to tracks
    const tracksWithUrls = tracks.map(track => ({
      ...track,
      url: musicGallery.getTrackUrl(track.id),
      coverUrl: track.coverFilename ? musicGallery.getCoverUrl(track.id) : track.imageUrl,
    }));
    
    res.json({ success: true, tracks: tracksWithUrls });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single track
router.get("/tracks/:trackId", (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;
    const track = musicGallery.getTrack(trackId);
    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }
    res.json({
      success: true,
      track: {
        ...track,
        url: musicGallery.getTrackUrl(track.id),
        coverUrl: track.coverFilename ? musicGallery.getCoverUrl(track.id) : track.imageUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get track audio file
router.get("/tracks/:trackId/file", (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;
    const track = musicGallery.getTrack(trackId);
    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }
    
    const buffer = musicGallery.getTrackBuffer(trackId);
    if (!buffer) {
      return res.status(404).json({ error: "Track file not found" });
    }
    
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `inline; filename="${track.originalName}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get track cover image
router.get("/tracks/:trackId/cover", (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;
    const buffer = musicGallery.getCoverBuffer(trackId);
    
    if (!buffer) {
      return res.status(404).json({ error: "Cover not found" });
    }
    
    res.setHeader("Content-Type", "image/jpeg");
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save track to gallery (from URL)
router.post("/tracks/save", async (req: Request, res: Response) => {
  try {
    const { audioUrl, title, workflowId, workflowName, source, metadata, imageUrl } = req.body;
    
    if (!audioUrl) {
      return res.status(400).json({ error: "audioUrl is required" });
    }
    
    const track = await musicGallery.saveTrack(
      audioUrl,
      title || "Untitled Track",
      workflowId || null,
      workflowName || null,
      source || "upload",
      metadata,
      imageUrl
    );
    
    res.json({
      success: true,
      track: {
        ...track,
        url: musicGallery.getTrackUrl(track.id),
        coverUrl: track.coverFilename ? musicGallery.getCoverUrl(track.id) : track.imageUrl,
      },
    });
  } catch (error: any) {
    console.error("[MUSIC GALLERY] Save track error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Save multiple Suno tracks
router.post("/tracks/save-suno", async (req: Request, res: Response) => {
  try {
    const { tracks, workflowId, workflowName, metadata } = req.body;
    
    if (!tracks || !Array.isArray(tracks)) {
      return res.status(400).json({ error: "tracks array is required" });
    }
    
    const savedTracks = await musicGallery.saveTracksFromSuno(
      tracks,
      workflowId || null,
      workflowName || null,
      metadata
    );
    
    const tracksWithUrls = savedTracks.map(track => ({
      ...track,
      url: musicGallery.getTrackUrl(track.id),
      coverUrl: track.coverFilename ? musicGallery.getCoverUrl(track.id) : track.imageUrl,
    }));
    
    res.json({ success: true, tracks: tracksWithUrls });
  } catch (error: any) {
    console.error("[MUSIC GALLERY] Save Suno tracks error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Rename track
router.patch("/tracks/:trackId", (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: "New title is required" });
    }
    const track = musicGallery.renameTrack(trackId, title);
    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }
    res.json({ success: true, track });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete single track
router.delete("/tracks/:trackId", (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;
    const success = musicGallery.deleteTrack(trackId);
    if (!success) {
      return res.status(404).json({ error: "Track not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete multiple tracks
router.post("/tracks/delete-batch", (req: Request, res: Response) => {
  try {
    const { trackIds } = req.body;
    if (!Array.isArray(trackIds)) {
      return res.status(400).json({ error: "trackIds must be an array" });
    }
    const deleted = musicGallery.deleteTracks(trackIds);
    res.json({ success: true, deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Move track to different workflow
router.post("/tracks/:trackId/move", (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;
    const { workflowId, workflowName } = req.body;
    
    const track = musicGallery.moveTrack(
      trackId,
      workflowId === "null" || workflowId === undefined ? null : workflowId,
      workflowName || null
    );
    
    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }
    res.json({ success: true, track });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============== STATS ==============

router.get("/stats", (_req: Request, res: Response) => {
  try {
    const stats = musicGallery.getGalleryStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
