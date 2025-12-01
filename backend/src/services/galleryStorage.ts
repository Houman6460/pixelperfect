import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Gallery storage paths
const GALLERY_ROOT = path.join(process.cwd(), "gallery");
const GALLERY_DB = path.join(GALLERY_ROOT, "gallery.json");

// Ensure gallery directory exists
if (!fs.existsSync(GALLERY_ROOT)) {
  fs.mkdirSync(GALLERY_ROOT, { recursive: true });
}

// Types
export interface GalleryImage {
  id: string;
  filename: string;
  originalName: string;
  folderId: string | null;
  width: number;
  height: number;
  size: number;
  createdAt: string;
  updatedAt: string;
  source: "generate" | "upscale" | "upload";
  metadata?: {
    prompt?: string;
    style?: string;
    upscaleFactor?: number;
  };
}

export interface GalleryFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GalleryData {
  folders: GalleryFolder[];
  images: GalleryImage[];
}

// Load gallery data
function loadGalleryData(): GalleryData {
  if (!fs.existsSync(GALLERY_DB)) {
    const initial: GalleryData = { folders: [], images: [] };
    fs.writeFileSync(GALLERY_DB, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const data = fs.readFileSync(GALLERY_DB, "utf-8");
    return JSON.parse(data);
  } catch {
    return { folders: [], images: [] };
  }
}

// Save gallery data
function saveGalleryData(data: GalleryData): void {
  fs.writeFileSync(GALLERY_DB, JSON.stringify(data, null, 2));
}

// ============== FOLDER OPERATIONS ==============

export function createFolder(name: string, parentId: string | null = null): GalleryFolder {
  const data = loadGalleryData();
  
  const folder: GalleryFolder = {
    id: uuidv4(),
    name,
    parentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

export function renameFolder(folderId: string, newName: string): GalleryFolder | null {
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
  
  // Get all images in this folder
  const folderImages = data.images.filter(img => img.folderId === folderId);
  
  if (deleteContents) {
    // Delete all images in the folder
    for (const img of folderImages) {
      const imgPath = getImagePath(img.filename);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }
    data.images = data.images.filter(img => img.folderId !== folderId);
  } else {
    // Move images to root
    for (const img of folderImages) {
      img.folderId = null;
      img.updatedAt = new Date().toISOString();
    }
  }
  
  // Delete subfolders recursively
  const subfolders = data.folders.filter(f => f.parentId === folderId);
  for (const subfolder of subfolders) {
    deleteFolder(subfolder.id, deleteContents);
  }
  
  // Remove folder from data
  data.folders.splice(folderIndex, 1);
  
  // Delete folder from disk
  const folderPath = getFolderPath(folderId);
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }
  
  saveGalleryData(data);
  return true;
}

export function getFolders(parentId: string | null = null): GalleryFolder[] {
  const data = loadGalleryData();
  return data.folders.filter(f => f.parentId === parentId);
}

export function getAllFolders(): GalleryFolder[] {
  const data = loadGalleryData();
  return data.folders;
}

// ============== IMAGE OPERATIONS ==============

export function saveImage(
  imageBuffer: Buffer,
  originalName: string,
  folderId: string | null,
  source: GalleryImage["source"],
  width: number,
  height: number,
  metadata?: GalleryImage["metadata"]
): GalleryImage {
  const data = loadGalleryData();
  
  const id = uuidv4();
  const ext = path.extname(originalName) || ".png";
  const filename = `${id}${ext}`;
  
  // Save image file
  const imagePath = getImagePath(filename);
  fs.writeFileSync(imagePath, imageBuffer);
  
  const stats = fs.statSync(imagePath);
  
  const image: GalleryImage = {
    id,
    filename,
    originalName,
    folderId,
    width,
    height,
    size: stats.size,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source,
    metadata,
  };
  
  data.images.push(image);
  saveGalleryData(data);
  
  return image;
}

export function renameImage(imageId: string, newName: string): GalleryImage | null {
  const data = loadGalleryData();
  const image = data.images.find(img => img.id === imageId);
  
  if (!image) return null;
  
  image.originalName = newName;
  image.updatedAt = new Date().toISOString();
  saveGalleryData(data);
  
  return image;
}

export function deleteImage(imageId: string): boolean {
  const data = loadGalleryData();
  const imageIndex = data.images.findIndex(img => img.id === imageId);
  
  if (imageIndex === -1) return false;
  
  const image = data.images[imageIndex];
  
  // Delete file
  const imagePath = getImagePath(image.filename);
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
  
  data.images.splice(imageIndex, 1);
  saveGalleryData(data);
  
  return true;
}

export function deleteImages(imageIds: string[]): number {
  let deleted = 0;
  for (const id of imageIds) {
    if (deleteImage(id)) deleted++;
  }
  return deleted;
}

export function moveImage(imageId: string, targetFolderId: string | null): GalleryImage | null {
  const data = loadGalleryData();
  const image = data.images.find(img => img.id === imageId);
  
  if (!image) return null;
  
  // Verify target folder exists (if not null)
  if (targetFolderId !== null) {
    const targetFolder = data.folders.find(f => f.id === targetFolderId);
    if (!targetFolder) return null;
  }
  
  image.folderId = targetFolderId;
  image.updatedAt = new Date().toISOString();
  saveGalleryData(data);
  
  return image;
}

export function moveImages(imageIds: string[], targetFolderId: string | null): number {
  let moved = 0;
  for (const id of imageIds) {
    if (moveImage(id, targetFolderId)) moved++;
  }
  return moved;
}

export function getImages(folderId: string | null = null): GalleryImage[] {
  const data = loadGalleryData();
  return data.images
    .filter(img => img.folderId === folderId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAllImages(): GalleryImage[] {
  const data = loadGalleryData();
  return data.images.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getImage(imageId: string): GalleryImage | null {
  const data = loadGalleryData();
  return data.images.find(img => img.id === imageId) || null;
}

export function getImageBuffer(imageId: string): Buffer | null {
  const data = loadGalleryData();
  const image = data.images.find(img => img.id === imageId);
  
  if (!image) return null;
  
  const imagePath = getImagePath(image.filename);
  if (!fs.existsSync(imagePath)) return null;
  
  return fs.readFileSync(imagePath);
}

// ============== HELPER FUNCTIONS ==============

function getFolderPath(folderId: string): string {
  return path.join(GALLERY_ROOT, "folders", folderId);
}

function getImagePath(filename: string): string {
  const imagesDir = path.join(GALLERY_ROOT, "images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  return path.join(imagesDir, filename);
}

export function getImageUrl(imageId: string): string {
  return `/api/gallery/images/${imageId}/file`;
}

// ============== STATS ==============

export function getGalleryStats() {
  const data = loadGalleryData();
  const totalSize = data.images.reduce((sum, img) => sum + img.size, 0);
  
  return {
    totalImages: data.images.length,
    totalFolders: data.folders.length,
    totalSize,
    bySource: {
      generate: data.images.filter(img => img.source === "generate").length,
      upscale: data.images.filter(img => img.source === "upscale").length,
      upload: data.images.filter(img => img.source === "upload").length,
    },
  };
}
