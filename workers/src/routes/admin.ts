import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// Apply auth and admin middleware to all routes
adminRoutes.use('*', authMiddleware());
adminRoutes.use('*', adminMiddleware());

// Get analytics
adminRoutes.get('/analytics', async (c) => {
  try {
    const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
    const activeUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first<{ count: number }>();
    const totalSubscriptions = await c.env.DB.prepare('SELECT COUNT(*) as count FROM user_subscriptions WHERE status = "active"').first<{ count: number }>();
    
    const tokenUsage = await c.env.DB.prepare(`
      SELECT SUM(tokens_used) as total 
      FROM token_usage_log 
      WHERE created_at > datetime('now', '-30 days')
    `).first<{ total: number }>();
    
    const subscriptionBreakdown = await c.env.DB.prepare(`
      SELECT sp.name, COUNT(*) as count
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.status = 'active'
      GROUP BY sp.id
    `).all();
    
    const recentTransactions = await c.env.DB.prepare(`
      SELECT t.*, u.email 
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `).all();
    
    return c.json({
      success: true,
      data: {
        totalUsers: totalUsers?.count || 0,
        activeUsers: activeUsers?.count || 0,
        totalSubscriptions: totalSubscriptions?.count || 0,
        tokenUsage: tokenUsage?.total || 0,
        subscriptionBreakdown: subscriptionBreakdown.results,
        recentTransactions: recentTransactions.results,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return c.json({ success: false, error: 'Failed to get analytics' }, 500);
  }
});

// Get all users
adminRoutes.get('/users', async (c) => {
  try {
    const { limit = 50, offset = 0, search } = c.req.query();
    
    let query = 'SELECT id, email, name, role, tokens, created_at, is_active FROM users';
    const params: (string | number)[] = [];
    
    if (search) {
      query += ' WHERE email LIKE ? OR name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    
    const users = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      success: true,
      data: users.results,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ success: false, error: 'Failed to get users' }, 500);
  }
});

// Update user
adminRoutes.put('/users/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const { name, role, tokens, is_active } = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE users SET name = ?, role = ?, tokens = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(name, role, tokens, is_active ? 1 : 0, userId).run();
    
    return c.json({ success: true, message: 'User updated' });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ success: false, error: 'Failed to update user' }, 500);
  }
});

// Get subscription plans
adminRoutes.get('/plans', async (c) => {
  try {
    const plans = await c.env.DB.prepare('SELECT * FROM subscription_plans ORDER BY type, base_price').all();
    return c.json({ success: true, data: plans.results });
  } catch (error) {
    console.error('Get plans error:', error);
    return c.json({ success: false, error: 'Failed to get plans' }, 500);
  }
});

// Update subscription plan
adminRoutes.put('/plans/:id', async (c) => {
  try {
    const planId = c.req.param('id');
    const { name, description, base_price, tokens_per_month, studios, features, is_active } = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE subscription_plans 
      SET name = ?, description = ?, base_price = ?, tokens_per_month = ?,
          studios = ?, features = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      name, description, base_price, tokens_per_month,
      JSON.stringify(studios), JSON.stringify(features), is_active ? 1 : 0, planId
    ).run();
    
    return c.json({ success: true, message: 'Plan updated' });
  } catch (error) {
    console.error('Update plan error:', error);
    return c.json({ success: false, error: 'Failed to update plan' }, 500);
  }
});

// Get token rules
adminRoutes.get('/token-rules', async (c) => {
  try {
    const rules = await c.env.DB.prepare('SELECT * FROM token_rules ORDER BY operation').all();
    return c.json({ success: true, data: rules.results });
  } catch (error) {
    console.error('Get token rules error:', error);
    return c.json({ success: false, error: 'Failed to get token rules' }, 500);
  }
});

// Update token rule
adminRoutes.put('/token-rules/:id', async (c) => {
  try {
    const ruleId = c.req.param('id');
    const { tokens_cost, description, is_active } = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE token_rules SET tokens_cost = ?, description = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(tokens_cost, description, is_active ? 1 : 0, ruleId).run();
    
    return c.json({ success: true, message: 'Token rule updated' });
  } catch (error) {
    console.error('Update token rule error:', error);
    return c.json({ success: false, error: 'Failed to update token rule' }, 500);
  }
});

// Get settings
adminRoutes.get('/settings', async (c) => {
  try {
    const settings = await c.env.DB.prepare('SELECT * FROM admin_settings').all();
    const settingsMap = Object.fromEntries(
      (settings.results || []).map((s: any) => [s.key, s.value])
    );
    return c.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error('Get settings error:', error);
    return c.json({ success: false, error: 'Failed to get settings' }, 500);
  }
});

// Update setting
adminRoutes.put('/settings/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const { value } = await c.req.json();
    
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `).bind(key, value).run();
    
    // Also update cache
    await c.env.CACHE.put(`setting:${key}`, value, { expirationTtl: 3600 });
    
    return c.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    console.error('Update setting error:', error);
    return c.json({ success: false, error: 'Failed to update setting' }, 500);
  }
});

// Get AI model configs
adminRoutes.get('/ai-models', async (c) => {
  try {
    const models = await c.env.DB.prepare('SELECT * FROM ai_model_configs ORDER BY type, provider').all();
    return c.json({ success: true, data: models.results });
  } catch (error) {
    console.error('Get AI models error:', error);
    return c.json({ success: false, error: 'Failed to get AI models' }, 500);
  }
});
