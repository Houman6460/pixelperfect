import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware, hashPassword } from '../middleware/auth';

export const userRoutes = new Hono<{ Bindings: Env }>();

// Get user profile
userRoutes.get('/profile', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    return c.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tokens: user.tokens,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ success: false, error: 'Failed to get profile' }, 500);
  }
});

// Update user profile
userRoutes.put('/profile', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { name, avatar_url } = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE users SET name = ?, avatar_url = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(name || user.name, avatar_url || user.avatar_url, user.id).run();
    
    return c.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ success: false, error: 'Failed to update profile' }, 500);
  }
});

// Change password
userRoutes.put('/password', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { currentPassword, newPassword } = await c.req.json();
    
    // Verify current password (simplified - in production use proper comparison)
    const currentHash = await hashPassword(currentPassword);
    if (currentHash !== user.password_hash) {
      return c.json({ success: false, error: 'Current password is incorrect' }, 400);
    }
    
    const newHash = await hashPassword(newPassword);
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(newHash, user.id).run();
    
    return c.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ success: false, error: 'Failed to change password' }, 500);
  }
});

// Get user tokens
userRoutes.get('/tokens', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    // Get token usage history
    const usage = await c.env.DB.prepare(`
      SELECT * FROM token_usage_log 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).bind(user.id).all();
    
    return c.json({
      success: true,
      data: {
        balance: user.tokens,
        usage: usage.results,
      },
    });
  } catch (error) {
    console.error('Get tokens error:', error);
    return c.json({ success: false, error: 'Failed to get tokens' }, 500);
  }
});

// Get user's generation history
userRoutes.get('/history', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { type, limit = 20, offset = 0 } = c.req.query();
    
    let query = `
      SELECT * FROM generation_jobs 
      WHERE user_id = ?
    `;
    const params: (string | number)[] = [user.id];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    
    const jobs = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      success: true,
      data: jobs.results,
    });
  } catch (error) {
    console.error('Get history error:', error);
    return c.json({ success: false, error: 'Failed to get history' }, 500);
  }
});
