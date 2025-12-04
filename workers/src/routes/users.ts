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

// ==========================================
// AUTO-REFILL ENDPOINTS
// ==========================================

// Get auto-refill settings
userRoutes.get('/auto-refill', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    const settings = await c.env.DB.prepare(
      'SELECT * FROM user_auto_refill WHERE user_id = ?'
    ).bind(user.id).first();
    
    // Get available token packages
    const packages = await c.env.DB.prepare(
      'SELECT * FROM token_packages WHERE is_active = 1 ORDER BY tokens ASC'
    ).all();
    
    // Get low balance threshold
    const thresholdSetting = await c.env.DB.prepare(
      "SELECT value FROM admin_settings WHERE key = 'low_balance_warning_threshold'"
    ).first<{ value: string }>();
    
    return c.json({
      success: true,
      data: {
        settings: settings || {
          enabled: false,
          threshold: 10,
          refill_amount: 100,
          package_id: null,
          payment_method: 'card',
          max_refills_per_month: 5,
          refills_this_month: 0,
        },
        packages: packages.results,
        lowBalanceThreshold: parseInt(thresholdSetting?.value || '10'),
        currentBalance: user.tokens,
        isLowBalance: user.tokens <= parseInt(thresholdSetting?.value || '10'),
      },
    });
  } catch (error) {
    console.error('Get auto-refill settings error:', error);
    return c.json({ success: false, error: 'Failed to get auto-refill settings' }, 500);
  }
});

// Update auto-refill settings
userRoutes.put('/auto-refill', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { enabled, threshold, package_id, payment_method, max_refills_per_month } = await c.req.json();
    
    // Check if settings exist
    const existing = await c.env.DB.prepare(
      'SELECT id FROM user_auto_refill WHERE user_id = ?'
    ).bind(user.id).first();
    
    // Get package tokens if package_id provided
    let refillAmount = 100;
    if (package_id) {
      const pkg = await c.env.DB.prepare(
        'SELECT tokens FROM token_packages WHERE id = ?'
      ).bind(package_id).first<{ tokens: number }>();
      if (pkg) refillAmount = pkg.tokens;
    }
    
    if (existing) {
      await c.env.DB.prepare(`
        UPDATE user_auto_refill 
        SET enabled = ?, threshold = ?, refill_amount = ?, package_id = ?, 
            payment_method = ?, max_refills_per_month = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).bind(
        enabled ? 1 : 0,
        threshold || 10,
        refillAmount,
        package_id || null,
        payment_method || 'card',
        max_refills_per_month || 5,
        user.id
      ).run();
    } else {
      const { nanoid } = await import('nanoid');
      await c.env.DB.prepare(`
        INSERT INTO user_auto_refill (id, user_id, enabled, threshold, refill_amount, package_id, payment_method, max_refills_per_month)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        `ar_${nanoid(16)}`,
        user.id,
        enabled ? 1 : 0,
        threshold || 10,
        refillAmount,
        package_id || null,
        payment_method || 'card',
        max_refills_per_month || 5
      ).run();
    }
    
    return c.json({
      success: true,
      message: 'Auto-refill settings updated',
    });
  } catch (error) {
    console.error('Update auto-refill settings error:', error);
    return c.json({ success: false, error: 'Failed to update auto-refill settings' }, 500);
  }
});

// Get auto-refill history
userRoutes.get('/auto-refill/history', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    const history = await c.env.DB.prepare(`
      SELECT * FROM auto_refill_log 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `).bind(user.id).all();
    
    return c.json({
      success: true,
      data: history.results,
    });
  } catch (error) {
    console.error('Get auto-refill history error:', error);
    return c.json({ success: false, error: 'Failed to get auto-refill history' }, 500);
  }
});

// Manual trigger refill (for testing or manual refill)
userRoutes.post('/auto-refill/trigger', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    // Get user's auto-refill settings
    const settings = await c.env.DB.prepare(
      'SELECT * FROM user_auto_refill WHERE user_id = ? AND enabled = 1'
    ).bind(user.id).first<any>();
    
    if (!settings) {
      return c.json({ success: false, error: 'Auto-refill not enabled' }, 400);
    }
    
    // Check if we've hit the monthly limit
    if (settings.refills_this_month >= settings.max_refills_per_month) {
      return c.json({ success: false, error: 'Monthly refill limit reached' }, 400);
    }
    
    // Get the package
    const pkg = await c.env.DB.prepare(
      'SELECT * FROM token_packages WHERE id = ?'
    ).bind(settings.package_id).first<any>();
    
    if (!pkg) {
      return c.json({ success: false, error: 'Token package not found' }, 400);
    }
    
    // For now, redirect to checkout - in production you'd use saved payment method
    return c.json({
      success: true,
      data: {
        action: 'checkout_required',
        package: pkg,
        message: 'Please complete the checkout to add tokens',
      },
    });
  } catch (error) {
    console.error('Trigger auto-refill error:', error);
    return c.json({ success: false, error: 'Failed to trigger auto-refill' }, 500);
  }
});
