-- Gallery folders table
CREATE TABLE IF NOT EXISTS gallery_folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES gallery_folders(id) ON DELETE SET NULL
);

-- Add folder_id to gallery_items if it doesn't exist
-- Note: SQLite doesn't support IF NOT EXISTS for columns, so this might fail if column exists
-- That's okay - we just need the column to exist
ALTER TABLE gallery_items ADD COLUMN folder_id TEXT REFERENCES gallery_folders(id) ON DELETE SET NULL;

-- Indexes for gallery_folders
CREATE INDEX IF NOT EXISTS idx_gallery_folders_user_id ON gallery_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_folders_parent_id ON gallery_folders(parent_id);

-- Index for folder_id in gallery_items
CREATE INDEX IF NOT EXISTS idx_gallery_items_folder_id ON gallery_items(folder_id);
