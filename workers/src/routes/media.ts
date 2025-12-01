import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

export const mediaRoutes = new Hono<{ Bindings: Env }>();

// Get presigned upload URL
mediaRoutes.post('/upload-url', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { filename, contentType, type = 'image' } = await c.req.json();
    
    if (!filename || !contentType) {
      return c.json({ success: false, error: 'Filename and content type required' }, 400);
    }
    
    const ext = filename.split('.').pop() || 'bin';
    const key = `${user.id}/${type}/${nanoid(16)}.${ext}`;
    
    // For Cloudflare R2, direct upload through worker
    return c.json({
      success: true,
      data: {
        key,
        uploadUrl: `/api/media/upload/${key}`,
        method: 'PUT',
      },
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    return c.json({ success: false, error: 'Failed to get upload URL' }, 500);
  }
});

// Direct upload to R2
mediaRoutes.put('/upload/:key{.+}', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const key = c.req.param('key');
    
    // Verify the key belongs to this user
    if (!key.startsWith(`${user.id}/`)) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }
    
    const contentType = c.req.header('Content-Type') || 'application/octet-stream';
    const body = await c.req.arrayBuffer();
    
    // Upload to R2
    await c.env.MEDIA_BUCKET.put(key, body, {
      httpMetadata: { contentType },
    });
    
    return c.json({
      success: true,
      data: {
        key,
        url: `https://media.pixelperfect.ai/${key}`,
        size: body.byteLength,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ success: false, error: 'Failed to upload' }, 500);
  }
});

// Get file from R2 (with access control)
mediaRoutes.get('/file/:key{.+}', optionalAuthMiddleware(), async (c) => {
  try {
    const key = c.req.param('key');
    const userId = c.get('userId');
    
    // Extract user ID from key
    const keyUserId = key.split('/')[0];
    
    // Check if file is public or belongs to requesting user
    // For simplicity, user files are accessible by the owner
    // In production, check gallery_items.is_public flag
    if (keyUserId !== userId && !key.includes('/public/')) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }
    
    const object = await c.env.MEDIA_BUCKET.get(key);
    
    if (!object) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }
    
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('ETag', object.etag);
    
    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Get file error:', error);
    return c.json({ success: false, error: 'Failed to get file' }, 500);
  }
});

// Delete file from R2
mediaRoutes.delete('/file/:key{.+}', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const key = c.req.param('key');
    
    // Verify the key belongs to this user
    if (!key.startsWith(`${user.id}/`)) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }
    
    await c.env.MEDIA_BUCKET.delete(key);
    
    // Also remove from gallery if exists
    await c.env.DB.prepare(
      'DELETE FROM gallery_items WHERE file_key = ? AND user_id = ?'
    ).bind(key, user.id).run();
    
    return c.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Delete file error:', error);
    return c.json({ success: false, error: 'Failed to delete file' }, 500);
  }
});

// List user's files
mediaRoutes.get('/list', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { type, limit = 100 } = c.req.query();
    
    const prefix = type ? `${user.id}/${type}/` : `${user.id}/`;
    const listed = await c.env.MEDIA_BUCKET.list({
      prefix,
      limit: Number(limit),
    });
    
    return c.json({
      success: true,
      data: {
        objects: listed.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
        })),
        truncated: listed.truncated,
      },
    });
  } catch (error) {
    console.error('List files error:', error);
    return c.json({ success: false, error: 'Failed to list files' }, 500);
  }
});

// Get storage usage
mediaRoutes.get('/usage', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    const prefix = `${user.id}/`;
    const listed = await c.env.MEDIA_BUCKET.list({ prefix, limit: 1000 });
    
    const totalSize = listed.objects.reduce((sum, obj) => sum + obj.size, 0);
    const fileCount = listed.objects.length;
    
    return c.json({
      success: true,
      data: {
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        fileCount,
      },
    });
  } catch (error) {
    console.error('Get usage error:', error);
    return c.json({ success: false, error: 'Failed to get usage' }, 500);
  }
});
