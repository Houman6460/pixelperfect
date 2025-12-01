import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User, GalleryItem } from '../types';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

export const galleryRoutes = new Hono<{ Bindings: Env }>();

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

// Helper to generate signed URL (for private buckets)
async function getSignedUrl(bucket: R2Bucket, key: string): Promise<string> {
  // For public buckets, return direct URL
  // For private buckets, implement presigned URLs
  const object = await bucket.head(key);
  if (!object) return '';
  
  // Return public URL format - adjust based on your R2 setup
  return `https://media.pixelperfect.ai/${key}`;
}
