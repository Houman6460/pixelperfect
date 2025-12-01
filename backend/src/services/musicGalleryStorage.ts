import fs from "fs";
import path from "path";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// Music Gallery storage paths
const MUSIC_GALLERY_ROOT = path.join(process.cwd(), "music-gallery");
const MUSIC_GALLERY_DB = path.join(MUSIC_GALLERY_ROOT, "music-gallery.json");

// Ensure music gallery directory exists
if (!fs.existsSync(MUSIC_GALLERY_ROOT)) {
  fs.mkdirSync(MUSIC_GALLERY_ROOT, { recursive: true });
}

// Types
export interface MusicTrack {
  id: string;
  filename: string;
  originalName: string;
  title: string;
  workflowId: string | null;
  workflowName: string | null;
  duration: number; // in seconds
  size: number; // in bytes
  createdAt: string;
  updatedAt: string;
  source: "suno" | "musicgen" | "minimax" | "stable-audio" | "upload";
  audioUrl?: string; // Original URL if from API
  imageUrl?: string; // Cover art URL
  coverFilename?: string; // Local cover art file
  metadata?: {
    prompt?: string;
    lyrics?: string;
    style?: string;
    model?: string;
    taskId?: string;
    audioId?: string;
    tags?: string[];
  };
}

export interface MusicFolder {
  id: string;
  name: string;
  workflowId: string | null; // Link to workflow
  createdAt: string;
  updatedAt: string;
  trackCount: number;
}

interface MusicGalleryData {
  folders: MusicFolder[];
  tracks: MusicTrack[];
}

// Load gallery data
function loadGalleryData(): MusicGalleryData {
  if (!fs.existsSync(MUSIC_GALLERY_DB)) {
    const initial: MusicGalleryData = { folders: [], tracks: [] };
    fs.writeFileSync(MUSIC_GALLERY_DB, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const data = fs.readFileSync(MUSIC_GALLERY_DB, "utf-8");
    return JSON.parse(data);
  } catch {
    return { folders: [], tracks: [] };
  }
}

// Save gallery data
function saveGalleryData(data: MusicGalleryData): void {
  fs.writeFileSync(MUSIC_GALLERY_DB, JSON.stringify(data, null, 2));
}

// Get folder path on disk
function getFolderPath(folderId: string): string {
  return path.join(MUSIC_GALLERY_ROOT, "folders", folderId);
}

// Get track path
function getTrackPath(trackId: string, ext: string = ".mp3"): string {
  return path.join(MUSIC_GALLERY_ROOT, "tracks", `${trackId}${ext}`);
}

// Get cover path
function getCoverPath(trackId: string): string {
  return path.join(MUSIC_GALLERY_ROOT, "covers", `${trackId}.jpg`);
}

// ============== FOLDER OPERATIONS ==============

export function createFolder(name: string, workflowId: string | null = null): MusicFolder {
  const data = loadGalleryData();
  
  // Check if folder for this workflow already exists
  if (workflowId) {
    const existing = data.folders.find(f => f.workflowId === workflowId);
    if (existing) {
      return existing;
    }
  }
  
  const folder: MusicFolder = {
    id: uuidv4(),
    name,
    workflowId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    trackCount: 0,
  };
  
  // Create folder on disk
  const folderPath = getFolderPath(folder.id);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  data.folders.push(folder);
  saveGalleryData(data);
  
  return folder;
}

export function getOrCreateWorkflowFolder(workflowId: string, workflowName: string): MusicFolder {
  const data = loadGalleryData();
  
  // Check if folder for this workflow already exists
  const existing = data.folders.find(f => f.workflowId === workflowId);
  if (existing) {
    // Update name if changed
    if (existing.name !== workflowName) {
      existing.name = workflowName;
      existing.updatedAt = new Date().toISOString();
      saveGalleryData(data);
    }
    return existing;
  }
  
  // Create new folder for workflow
  return createFolder(workflowName, workflowId);
}

export function getAllFolders(): MusicFolder[] {
  const data = loadGalleryData();
  return data.folders;
}

export function getFolder(folderId: string): MusicFolder | undefined {
  const data = loadGalleryData();
  return data.folders.find(f => f.id === folderId);
}

export function getFolderByWorkflow(workflowId: string): MusicFolder | undefined {
  const data = loadGalleryData();
  return data.folders.find(f => f.workflowId === workflowId);
}

export function renameFolder(folderId: string, newName: string): MusicFolder | null {
  const data = loadGalleryData();
  const folder = data.folders.find(f => f.id === folderId);
  if (!folder) return null;
  
  folder.name = newName;
  folder.updatedAt = new Date().toISOString();
  saveGalleryData(data);
  
  return folder;
}

export function deleteFolder(folderId: string, deleteContents: boolean = false): boolean {
  const data = loadGalleryData();
  const folderIndex = data.folders.findIndex(f => f.id === folderId);
  if (folderIndex === -1) return false;
  
  if (deleteContents) {
    // Delete all tracks in the folder
    const tracksToDelete = data.tracks.filter(t => t.workflowId === data.folders[folderIndex].workflowId);
    tracksToDelete.forEach(track => {
      const trackPath = getTrackPath(track.id, path.extname(track.filename));
      if (fs.existsSync(trackPath)) {
        fs.unlinkSync(trackPath);
      }
      const coverPath = getCoverPath(track.id);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    });
    data.tracks = data.tracks.filter(t => t.workflowId !== data.folders[folderIndex].workflowId);
  }
  
  // Delete folder from disk
  const folderPath = getFolderPath(folderId);
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true });
  }
  
  data.folders.splice(folderIndex, 1);
  saveGalleryData(data);
  
  return true;
}

// ============== TRACK OPERATIONS ==============

export async function saveTrack(
  audioUrl: string,
  title: string,
  workflowId: string | null,
  workflowName: string | null,
  source: MusicTrack["source"],
  metadata?: MusicTrack["metadata"],
  imageUrl?: string
): Promise<MusicTrack> {
  const data = loadGalleryData();
  
  const trackId = uuidv4();
  const ext = ".mp3";
  const filename = `${trackId}${ext}`;
  const trackPath = getTrackPath(trackId, ext);
  
  // Ensure tracks directory exists
  const tracksDir = path.dirname(trackPath);
  if (!fs.existsSync(tracksDir)) {
    fs.mkdirSync(tracksDir, { recursive: true });
  }
  
  // Download audio file
  let size = 0;
  try {
    const response = await axios.get(audioUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(trackPath, Buffer.from(response.data));
    size = response.data.byteLength;
  } catch (error) {
    console.error("[MUSIC GALLERY] Failed to download audio:", error);
    throw new Error("Failed to download audio file");
  }
  
  // Download cover image if available
  let coverFilename: string | undefined;
  if (imageUrl) {
    try {
      const coversDir = path.join(MUSIC_GALLERY_ROOT, "covers");
      if (!fs.existsSync(coversDir)) {
        fs.mkdirSync(coversDir, { recursive: true });
      }
      
      const coverResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const coverPath = getCoverPath(trackId);
      fs.writeFileSync(coverPath, Buffer.from(coverResponse.data));
      coverFilename = `${trackId}.jpg`;
    } catch (error) {
      console.error("[MUSIC GALLERY] Failed to download cover:", error);
      // Continue without cover
    }
  }
  
  const track: MusicTrack = {
    id: trackId,
    filename,
    originalName: `${title}${ext}`,
    title,
    workflowId,
    workflowName,
    duration: 0, // Will be calculated later or from API
    size,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source,
    audioUrl,
    imageUrl,
    coverFilename,
    metadata,
  };
  
  data.tracks.push(track);
  
  // Update folder track count
  if (workflowId) {
    const folder = data.folders.find(f => f.workflowId === workflowId);
    if (folder) {
      folder.trackCount = data.tracks.filter(t => t.workflowId === workflowId).length;
      folder.updatedAt = new Date().toISOString();
    }
  }
  
  saveGalleryData(data);
  
  return track;
}

export async function saveTracksFromSuno(
  tracks: Array<{
    url: string;
    title?: string;
    id?: string;
    imageUrl?: string;
  }>,
  workflowId: string | null,
  workflowName: string | null,
  metadata?: MusicTrack["metadata"]
): Promise<MusicTrack[]> {
  const savedTracks: MusicTrack[] = [];
  
  for (const track of tracks) {
    if (!track.url) continue;
    
    try {
      const savedTrack = await saveTrack(
        track.url,
        track.title || "Untitled Track",
        workflowId,
        workflowName,
        "suno",
        {
          ...metadata,
          audioId: track.id,
        },
        track.imageUrl
      );
      savedTracks.push(savedTrack);
    } catch (error) {
      console.error("[MUSIC GALLERY] Failed to save track:", error);
    }
  }
  
  return savedTracks;
}

export function getAllTracks(): MusicTrack[] {
  const data = loadGalleryData();
  return data.tracks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTracksByWorkflow(workflowId: string): MusicTrack[] {
  const data = loadGalleryData();
  return data.tracks
    .filter(t => t.workflowId === workflowId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTracksByFolder(folderId: string): MusicTrack[] {
  const data = loadGalleryData();
  const folder = data.folders.find(f => f.id === folderId);
  if (!folder) return [];
  
  return data.tracks
    .filter(t => t.workflowId === folder.workflowId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUncategorizedTracks(): MusicTrack[] {
  const data = loadGalleryData();
  return data.tracks
    .filter(t => !t.workflowId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTrack(trackId: string): MusicTrack | undefined {
  const data = loadGalleryData();
  return data.tracks.find(t => t.id === trackId);
}

export function getTrackUrl(trackId: string): string {
  return `/api/music-gallery/tracks/${trackId}/file`;
}

export function getCoverUrl(trackId: string): string {
  return `/api/music-gallery/tracks/${trackId}/cover`;
}

export function getTrackBuffer(trackId: string): Buffer | null {
  const track = getTrack(trackId);
  if (!track) return null;
  
  const trackPath = getTrackPath(trackId, path.extname(track.filename));
  if (!fs.existsSync(trackPath)) return null;
  
  return fs.readFileSync(trackPath);
}

export function getCoverBuffer(trackId: string): Buffer | null {
  const coverPath = getCoverPath(trackId);
  if (!fs.existsSync(coverPath)) return null;
  
  return fs.readFileSync(coverPath);
}

export function renameTrack(trackId: string, newTitle: string): MusicTrack | null {
  const data = loadGalleryData();
  const track = data.tracks.find(t => t.id === trackId);
  if (!track) return null;
  
  track.title = newTitle;
  track.originalName = `${newTitle}${path.extname(track.filename)}`;
  track.updatedAt = new Date().toISOString();
  saveGalleryData(data);
  
  return track;
}

export function deleteTrack(trackId: string): boolean {
  const data = loadGalleryData();
  const trackIndex = data.tracks.findIndex(t => t.id === trackId);
  if (trackIndex === -1) return false;
  
  const track = data.tracks[trackIndex];
  
  // Delete audio file
  const trackPath = getTrackPath(trackId, path.extname(track.filename));
  if (fs.existsSync(trackPath)) {
    fs.unlinkSync(trackPath);
  }
  
  // Delete cover
  const coverPath = getCoverPath(trackId);
  if (fs.existsSync(coverPath)) {
    fs.unlinkSync(coverPath);
  }
  
  // Update folder track count
  if (track.workflowId) {
    const folder = data.folders.find(f => f.workflowId === track.workflowId);
    if (folder) {
      folder.trackCount = Math.max(0, folder.trackCount - 1);
      folder.updatedAt = new Date().toISOString();
    }
  }
  
  data.tracks.splice(trackIndex, 1);
  saveGalleryData(data);
  
  return true;
}

export function deleteTracks(trackIds: string[]): number {
  let deleted = 0;
  for (const id of trackIds) {
    if (deleteTrack(id)) deleted++;
  }
  return deleted;
}

export function moveTrack(trackId: string, workflowId: string | null, workflowName: string | null): MusicTrack | null {
  const data = loadGalleryData();
  const track = data.tracks.find(t => t.id === trackId);
  if (!track) return null;
  
  const oldWorkflowId = track.workflowId;
  
  track.workflowId = workflowId;
  track.workflowName = workflowName;
  track.updatedAt = new Date().toISOString();
  
  // Update old folder track count
  if (oldWorkflowId) {
    const oldFolder = data.folders.find(f => f.workflowId === oldWorkflowId);
    if (oldFolder) {
      oldFolder.trackCount = Math.max(0, oldFolder.trackCount - 1);
    }
  }
  
  // Update new folder track count
  if (workflowId) {
    const newFolder = data.folders.find(f => f.workflowId === workflowId);
    if (newFolder) {
      newFolder.trackCount++;
    }
  }
  
  saveGalleryData(data);
  
  return track;
}

// ============== STATS ==============

export function getGalleryStats(): {
  totalTracks: number;
  totalFolders: number;
  totalSize: number;
  bySource: Record<string, number>;
  recentTracks: MusicTrack[];
} {
  const data = loadGalleryData();
  
  const bySource: Record<string, number> = {};
  let totalSize = 0;
  
  for (const track of data.tracks) {
    bySource[track.source] = (bySource[track.source] || 0) + 1;
    totalSize += track.size;
  }
  
  const recentTracks = data.tracks
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  
  return {
    totalTracks: data.tracks.length,
    totalFolders: data.folders.length,
    totalSize,
    bySource,
    recentTracks,
  };
}
