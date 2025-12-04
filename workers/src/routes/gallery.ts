import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User, GalleryItem } from '../types';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

type Variables = {
  user: User;
  userId: string;
};

export const galleryRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get gallery folders
galleryRoutes.get('/folders', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    // Get all folders for this user
    const folders = await c.env.DB.prepare(
      'SELECT * FROM gallery_folders WHERE user_id = ? ORDER BY name ASC'
    ).bind(user.id).all();
    
    return c.json({
      success: true,
      folders: folders.results || [],
    });
  } catch (error) {
    console.error('Get folders error:', error);
    return c.json({ success: false, error: 'Failed to get folders' }, 500);
  }
});

// Get gallery images (for frontend compatibility)
galleryRoutes.get('/images', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { folderId, limit = 50, offset = 0 } = c.req.query();
    
    let query = 'SELECT * FROM gallery_items WHERE user_id = ? AND type = ?';
    const params: (string | number)[] = [user.id, 'image'];
    
    if (folderId && folderId !== 'null') {
      query += ' AND folder_id = ?';
      params.push(folderId);
    } else {
      query += ' AND (folder_id IS NULL OR folder_id = "")';
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    
    const items = await c.env.DB.prepare(query).bind(...params).all<GalleryItem>();
    
    // Generate URLs for each item
    const images = await Promise.all(
      (items.results || []).map(async (item) => ({
        id: item.id,
        filename: item.file_key.split('/').pop() || '',
        originalName: item.title || item.file_key.split('/').pop() || '',
        folderId: null,
        width: item.width || 0,
        height: item.height || 0,
        size: item.file_size || 0,
        createdAt: item.created_at,
        source: 'upload',
        url: await getSignedUrl(c.env.MEDIA_BUCKET, item.file_key),
      }))
    );
    
    return c.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error('Get images error:', error);
    return c.json({ success: false, error: 'Failed to get images' }, 500);
  }
});

// Create folder
galleryRoutes.post('/folders', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { name, parentId } = await c.req.json();
    
    if (!name) {
      return c.json({ success: false, error: 'Folder name is required' }, 400);
    }
    
    const folderId = `folder_${nanoid(16)}`;
    
    await c.env.DB.prepare(`
      INSERT INTO gallery_folders (id, user_id, name, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(folderId, user.id, name, parentId || null).run();
    
    return c.json({
      success: true,
      folder: { id: folderId, name, parentId: parentId || null, createdAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Create folder error:', error);
    return c.json({ success: false, error: 'Failed to create folder' }, 500);
  }
});

// Update folder
galleryRoutes.patch('/folders/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const folderId = c.req.param('id');
    const { name } = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE gallery_folders SET name = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(name, folderId, user.id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update folder error:', error);
    return c.json({ success: false, error: 'Failed to update folder' }, 500);
  }
});

// Delete folder
galleryRoutes.delete('/folders/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const folderId = c.req.param('id');
    
    // Move images in this folder to root (no folder)
    await c.env.DB.prepare(`
      UPDATE gallery_items SET folder_id = NULL WHERE folder_id = ? AND user_id = ?
    `).bind(folderId, user.id).run();
    
    // Delete the folder
    await c.env.DB.prepare(`
      DELETE FROM gallery_folders WHERE id = ? AND user_id = ?
    `).bind(folderId, user.id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    return c.json({ success: false, error: 'Failed to delete folder' }, 500);
  }
});

// Update image
galleryRoutes.patch('/images/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const imageId = c.req.param('id');
    const { name, folderId } = await c.req.json();
    
    const updates: string[] = ['updated_at = datetime("now")'];
    const params: (string | null)[] = [];
    
    if (name !== undefined) {
      updates.push('title = ?');
      params.push(name);
    }
    if (folderId !== undefined) {
      updates.push('folder_id = ?');
      params.push(folderId || null);
    }
    
    params.push(imageId, user.id);
    
    await c.env.DB.prepare(`
      UPDATE gallery_items SET ${updates.join(', ')} WHERE id = ? AND user_id = ?
    `).bind(...params).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update image error:', error);
    return c.json({ success: false, error: 'Failed to update image' }, 500);
  }
});

// Delete images batch
galleryRoutes.post('/images/delete-batch', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { imageIds } = await c.req.json();
    
    if (!imageIds || !Array.isArray(imageIds)) {
      return c.json({ success: false, error: 'Invalid image IDs' }, 400);
    }
    
    for (const id of imageIds) {
      const item = await c.env.DB.prepare(
        'SELECT * FROM gallery_items WHERE id = ? AND user_id = ?'
      ).bind(id, user.id).first<GalleryItem>();
      
      if (item) {
        await c.env.MEDIA_BUCKET.delete(item.file_key);
        await c.env.DB.prepare('DELETE FROM gallery_items WHERE id = ?').bind(id).run();
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete batch error:', error);
    return c.json({ success: false, error: 'Failed to delete images' }, 500);
  }
});

// Move images batch
galleryRoutes.post('/images/move-batch', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { imageIds, targetFolderId } = await c.req.json();
    
    if (!imageIds || !Array.isArray(imageIds)) {
      return c.json({ success: false, error: 'Invalid image IDs' }, 400);
    }
    
    for (const id of imageIds) {
      await c.env.DB.prepare(`
        UPDATE gallery_items SET folder_id = ?, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).bind(targetFolderId || null, id, user.id).run();
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Move batch error:', error);
    return c.json({ success: false, error: 'Failed to move images' }, 500);
  }
});

// Get user's gallery
galleryRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { type, limit = 50, offset = 0 } = c.req.query();
    
    let query = 'SELECT * FROM gallery_items WHERE user_id = ?';
    const params: (string | number)[] = [user.id];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    
    const items = await c.env.DB.prepare(query).bind(...params).all<GalleryItem>();
    
    // Generate signed URLs for each item
    const itemsWithUrls = await Promise.all(
      (items.results || []).map(async (item) => ({
        ...item,
        url: await getSignedUrl(c.env.MEDIA_BUCKET, item.file_key),
        thumbnail_url: item.thumbnail_key ? await getSignedUrl(c.env.MEDIA_BUCKET, item.thumbnail_key) : null,
      }))
    );
    
    return c.json({
      success: true,
      data: itemsWithUrls,
    });
  } catch (error) {
    console.error('Get gallery error:', error);
    return c.json({ success: false, error: 'Failed to get gallery' }, 500);
  }
});

// Get single gallery item
galleryRoutes.get('/:id', optionalAuthMiddleware(), async (c) => {
  try {
    const itemId = c.req.param('id');
    const userId = c.get('userId');
    
    const item = await c.env.DB.prepare(
      'SELECT * FROM gallery_items WHERE id = ?'
    ).bind(itemId).first<GalleryItem>();
    
    if (!item) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }
    
    // Check access
    if (!item.is_public && item.user_id !== userId) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }
    
    return c.json({
      success: true,
      data: {
        ...item,
        url: await getSignedUrl(c.env.MEDIA_BUCKET, item.file_key),
        thumbnail_url: item.thumbnail_key ? await getSignedUrl(c.env.MEDIA_BUCKET, item.thumbnail_key) : null,
      },
    });
  } catch (error) {
    console.error('Get item error:', error);
    return c.json({ success: false, error: 'Failed to get item' }, 500);
  }
});

// Upload to gallery
galleryRoutes.post('/upload', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'image';
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const prompt = formData.get('prompt') as string;
    const model = formData.get('model') as string;
    
    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }
    
    // Generate unique key
    const ext = file.name.split('.').pop() || 'bin';
    const fileKey = `${user.id}/${type}/${nanoid(16)}.${ext}`;
    
    // Upload to R2
    await c.env.MEDIA_BUCKET.put(fileKey, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
    
    // Create gallery item
    const itemId = `item_${nanoid(16)}`;
    await c.env.DB.prepare(`
      INSERT INTO gallery_items (
        id, user_id, type, title, description, file_key, mime_type, file_size,
        prompt, model, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      itemId, user.id, type, title, description, fileKey,
      file.type, file.size, prompt, model
    ).run();
    
    return c.json({
      success: true,
      data: {
        id: itemId,
        url: await getSignedUrl(c.env.MEDIA_BUCKET, fileKey),
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ success: false, error: 'Failed to upload' }, 500);
  }
});

// Delete gallery item
galleryRoutes.delete('/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const itemId = c.req.param('id');
    
    const item = await c.env.DB.prepare(
      'SELECT * FROM gallery_items WHERE id = ? AND user_id = ?'
    ).bind(itemId, user.id).first<GalleryItem>();
    
    if (!item) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }
    
    // Delete from R2
    await c.env.MEDIA_BUCKET.delete(item.file_key);
    if (item.thumbnail_key) {
      await c.env.MEDIA_BUCKET.delete(item.thumbnail_key);
    }
    
    // Delete from DB
    await c.env.DB.prepare('DELETE FROM gallery_items WHERE id = ?').bind(itemId).run();
    
    return c.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete' }, 500);
  }
});

// Save image from base64 (used by generate, enhance, edit, etc.)
galleryRoutes.post('/images/save', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { imageBase64, name, source, prompt, model, folderId } = await c.req.json();
    
    if (!imageBase64) {
      return c.json({ success: false, error: 'Image data is required' }, 400);
    }
    
    // Extract base64 data
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Detect format from base64 header
    let format = 'png';
    if (imageBase64.startsWith('data:image/jpeg')) format = 'jpg';
    else if (imageBase64.startsWith('data:image/webp')) format = 'webp';
    
    // Generate unique key
    const fileKey = `${user.id}/image/${nanoid(16)}.${format}`;
    
    // Upload to R2
    await c.env.MEDIA_BUCKET.put(fileKey, buffer, {
      httpMetadata: { contentType: `image/${format}` },
    });
    
    // Create gallery item
    const itemId = `item_${nanoid(16)}`;
    await c.env.DB.prepare(`
      INSERT INTO gallery_items (
        id, user_id, type, title, file_key, mime_type, file_size,
        prompt, model, folder_id, created_at, updated_at
      ) VALUES (?, ?, 'image', ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      itemId, user.id, name || `${source || 'generated'}_${Date.now()}`,
      fileKey, `image/${format}`, buffer.length,
      prompt || null, model || null, folderId || null
    ).run();
    
    return c.json({
      success: true,
      data: {
        id: itemId,
        url: `/api/media/${fileKey}`,
      },
    });
  } catch (error) {
    console.error('Save image error:', error);
    return c.json({ success: false, error: 'Failed to save image' }, 500);
  }
});

// Helper to generate signed URL (for private buckets)
async function getSignedUrl(bucket: R2Bucket, key: string): Promise<string> {
  // For public buckets, return direct URL
  // For private buckets, implement presigned URLs
  const object = await bucket.head(key);
  if (!object) return '';
  
  // Return URL via media route
  return `/api/media/${key}`;
}
