import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FolderPlus, FolderOpen, Folder, Trash2, Edit3, Move, Check, X,
  ChevronRight, Home, Image as ImageIcon, Upload, Download, Loader2,
  MoreVertical, CheckSquare, Square, Maximize2,
} from "lucide-react";
import { FullscreenViewer } from "./FullscreenViewer";

// Dynamic API base URL (without /api suffix - component adds /api/ prefix to routes)
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('pages.dev')) {
    return 'https://pixelperfect-api.houman-ghavamzadeh.workers.dev';
  }
  return 'http://localhost:4000';
};
const API_BASE = getApiBaseUrl();

// Get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

interface GalleryImage {
  id: string;
  filename: string;
  originalName: string;
  folderId: string | null;
  width: number;
  height: number;
  size: number;
  createdAt: string;
  source: string;
  url: string;
}

interface GalleryFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export function Gallery() {
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Gallery" }]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialogs
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  
  // Fullscreen
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const [foldersRes, imagesRes] = await Promise.all([
        axios.get(`${API_BASE}/api/gallery/folders`, { headers }),
        axios.get(`${API_BASE}/api/gallery/images?folderId=${currentFolder || "null"}`, { headers }),
      ]);
      setFolders(foldersRes.data.folders.filter((f: GalleryFolder) => f.parentId === currentFolder));
      setImages(imagesRes.data.images);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);

  useEffect(() => { loadData(); }, [loadData]);

  // Navigation
  const navigateToFolder = async (folderId: string | null, folderName?: string) => {
    setCurrentFolder(folderId);
    setSelectedImages(new Set());
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: "Gallery" }]);
    } else {
      const newCrumb = { id: folderId, name: folderName || "Folder" };
      const existingIdx = breadcrumbs.findIndex(b => b.id === folderId);
      if (existingIdx >= 0) {
        setBreadcrumbs(breadcrumbs.slice(0, existingIdx + 1));
      } else {
        setBreadcrumbs([...breadcrumbs, newCrumb]);
      }
    }
  };

  // Folder operations
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await axios.post(`${API_BASE}/api/gallery/folders`, { name: newFolderName, parentId: currentFolder }, { headers: getAuthHeaders() });
      setNewFolderName("");
      setShowNewFolder(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renameFolder = async (folderId: string) => {
    if (!editName.trim()) return;
    try {
      await axios.patch(`${API_BASE}/api/gallery/folders/${folderId}`, { name: editName }, { headers: getAuthHeaders() });
      setEditingFolder(null);
      setEditName("");
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder? Images will be moved to root.")) return;
    try {
      await axios.delete(`${API_BASE}/api/gallery/folders/${folderId}`, { headers: getAuthHeaders() });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Image operations
  const renameImage = async (imageId: string) => {
    if (!editName.trim()) return;
    try {
      await axios.patch(`${API_BASE}/api/gallery/images/${imageId}`, { name: editName }, { headers: getAuthHeaders() });
      setEditingImage(null);
      setEditName("");
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteImages = async (imageIds: string[]) => {
    if (!confirm(`Delete ${imageIds.length} image(s)?`)) return;
    try {
      await axios.post(`${API_BASE}/api/gallery/images/delete-batch`, { imageIds }, { headers: getAuthHeaders() });
      setSelectedImages(new Set());
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const moveImages = async (targetFolderId: string | null) => {
    const imageIds = Array.from(selectedImages);
    try {
      await axios.post(`${API_BASE}/api/gallery/images/move-batch`, { imageIds, targetFolderId }, { headers: getAuthHeaders() });
      setSelectedImages(new Set());
      setShowMoveDialog(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Selection
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedImages);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedImages(newSet);
  };

  const selectAll = () => {
    if (selectedImages.size === images.length) setSelectedImages(new Set());
    else setSelectedImages(new Set(images.map(i => i.id)));
  };

  // Fullscreen
  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setFullscreenOpen(true);
  };

  const fullscreenImages = images.map(img => ({
    src: `${API_BASE}${img.url}`,
    title: img.originalName,
    width: img.width,
    height: img.height,
  }));

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id || "root"}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-500" />}
              <button
                onClick={() => navigateToFolder(crumb.id, crumb.name)}
                className={`text-sm ${idx === breadcrumbs.length - 1 ? "text-white font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                {idx === 0 ? <Home className="w-4 h-4" /> : crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-sm hover:bg-slate-700">
            <FolderPlus className="w-4 h-4" /> New Folder
          </button>
        </div>
      </div>

      {/* Selection actions */}
      {selectedImages.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/30">
          <span className="text-sm text-emerald-400">{selectedImages.size} selected</span>
          <button onClick={() => setShowMoveDialog(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700 text-xs hover:bg-slate-600">
            <Move className="w-3 h-3" /> Move
          </button>
          <button onClick={() => deleteImages(Array.from(selectedImages))} className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
          <button onClick={() => setSelectedImages(new Set())} className="ml-auto text-xs text-slate-400 hover:text-white">
            Clear selection
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400">{error}</div>
        ) : (
          <div className="space-y-6">
            {/* Folders */}
            {folders.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 mb-3">FOLDERS</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {folders.map(folder => (
                    <div key={folder.id} className="group relative">
                      {editingFolder === folder.id ? (
                        <div className="p-3 rounded-lg bg-slate-800 border border-slate-600">
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-2 py-1 rounded bg-slate-700 text-sm"
                            autoFocus
                            onKeyDown={e => e.key === "Enter" && renameFolder(folder.id)}
                            placeholder="Folder name"
                            aria-label="Folder name"
                          />
                          <div className="flex gap-1 mt-2">
                            <button onClick={() => renameFolder(folder.id)} className="p-1 rounded bg-emerald-500/20 text-emerald-400" title="Save" aria-label="Save folder name"><Check className="w-3 h-3" /></button>
                            <button onClick={() => setEditingFolder(null)} className="p-1 rounded bg-slate-600" title="Cancel" aria-label="Cancel editing"><X className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => navigateToFolder(folder.id, folder.name)}
                          className="w-full p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 text-center"
                        >
                          <Folder className="w-10 h-10 mx-auto mb-2 text-yellow-500" />
                          <p className="text-xs truncate">{folder.name}</p>
                        </button>
                      )}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1">
                        <button onClick={() => { setEditingFolder(folder.id); setEditName(folder.name); }} className="p-1 rounded bg-slate-700/80 text-slate-300" title="Rename folder" aria-label="Rename folder"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => deleteFolder(folder.id)} className="p-1 rounded bg-red-500/20 text-red-400" title="Delete folder" aria-label="Delete folder"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Images */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-400">IMAGES ({images.length})</h3>
                {images.length > 0 && (
                  <button onClick={selectAll} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                    {selectedImages.size === images.length ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                    Select all
                  </button>
                )}
              </div>
              {images.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <ImageIcon className="w-16 h-16 mx-auto mb-3 text-slate-700" />
                  <p>No images in this folder</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {images.map((img, idx) => (
                    <div key={img.id} className={`group relative rounded-lg overflow-hidden border ${selectedImages.has(img.id) ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-slate-700"}`}>
                      <button onClick={() => openFullscreen(idx)} className="w-full aspect-square bg-slate-800">
                        <img src={`${API_BASE}${img.url}`} alt={img.originalName} className="w-full h-full object-cover" loading="lazy" />
                      </button>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition">
                        <p className="text-[10px] text-white truncate">{img.originalName}</p>
                        <p className="text-[9px] text-slate-400">{img.width}×{img.height}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); toggleSelect(img.id); }}
                        className={`absolute top-2 left-2 p-1 rounded ${selectedImages.has(img.id) ? "bg-emerald-500 text-white" : "bg-black/50 text-white opacity-0 group-hover:opacity-100"}`}
                        title={selectedImages.has(img.id) ? "Deselect image" : "Select image"}
                        aria-label={selectedImages.has(img.id) ? "Deselect image" : "Select image"}
                      >
                        {selectedImages.has(img.id) ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                        <button onClick={() => { setEditingImage(img.id); setEditName(img.originalName); }} className="p-1 rounded bg-black/50 text-white" title="Rename image" aria-label="Rename image"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => deleteImages([img.id])} className="p-1 rounded bg-red-500/50 text-white" title="Delete image" aria-label="Delete image"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl p-6 w-80 border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">New Folder</h3>
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 mb-4"
              autoFocus
              onKeyDown={e => e.key === "Enter" && createFolder()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewFolder(false)} className="px-4 py-2 rounded-lg bg-slate-700 text-sm">Cancel</button>
              <button onClick={createFolder} className="px-4 py-2 rounded-lg bg-emerald-500 text-sm font-semibold">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Move Dialog */}
      {showMoveDialog && (
        <MoveDialog
          folders={folders}
          currentFolder={currentFolder}
          onMove={(targetId) => moveImages(targetId)}
          onClose={() => setShowMoveDialog(false)}
        />
      )}

      {/* Rename Image Dialog */}
      {editingImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl p-6 w-80 border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Rename Image</h3>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 mb-4"
              autoFocus
              onKeyDown={e => e.key === "Enter" && renameImage(editingImage)}
              placeholder="Image name"
              aria-label="Image name"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingImage(null)} className="px-4 py-2 rounded-lg bg-slate-700 text-sm">Cancel</button>
              <button onClick={() => renameImage(editingImage)} className="px-4 py-2 rounded-lg bg-emerald-500 text-sm font-semibold">Rename</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Viewer */}
      <FullscreenViewer
        images={fullscreenImages}
        currentIndex={fullscreenIndex}
        isOpen={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        onNavigate={setFullscreenIndex}
      />
    </div>
  );
}

// Move Dialog Component
function MoveDialog({ folders, currentFolder, onMove, onClose }: {
  folders: GalleryFolder[];
  currentFolder: string | null;
  onMove: (targetId: string | null) => void;
  onClose: () => void;
}) {
  const [allFolders, setAllFolders] = useState<GalleryFolder[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/api/gallery/folders`, { headers: getAuthHeaders() }).then(res => setAllFolders(res.data.folders || []));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl p-6 w-96 max-h-[70vh] border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Move to Folder</h3>
        <div className="space-y-2 max-h-64 overflow-auto mb-4">
          <button
            onClick={() => setSelected(null)}
            className={`w-full p-3 rounded-lg text-left flex items-center gap-2 ${selected === null ? "bg-emerald-500/20 border border-emerald-500" : "bg-slate-800 border border-slate-700"}`}
          >
            <Home className="w-5 h-5" /> Root (Gallery)
          </button>
          {allFolders.filter(f => f.id !== currentFolder).map(folder => (
            <button
              key={folder.id}
              onClick={() => setSelected(folder.id)}
              className={`w-full p-3 rounded-lg text-left flex items-center gap-2 ${selected === folder.id ? "bg-emerald-500/20 border border-emerald-500" : "bg-slate-800 border border-slate-700"}`}
            >
              <Folder className="w-5 h-5 text-yellow-500" /> {folder.name}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 text-sm">Cancel</button>
          <button onClick={() => onMove(selected)} className="px-4 py-2 rounded-lg bg-emerald-500 text-sm font-semibold">Move Here</button>
        </div>
      </div>
    </div>
  );
}
