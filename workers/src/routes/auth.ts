import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { generateToken, hashPassword, verifyPassword, authMiddleware } from '../middleware/auth';

export const authRoutes = new Hono<{ Bindings: Env }>();

// Register new user
authRoutes.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) {
      return c.json({
        success: false,
        error: 'Email and password are required',
      }, 400);
    }
    
    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();
    
    if (existingUser) {
      return c.json({
        success: false,
        error: 'User with this email already exists',
      }, 409);
    }
    
    // Get signup settings
    const freeTokensSetting = await c.env.DB.prepare(
      'SELECT value FROM admin_settings WHERE key = ?'
    ).bind('free_tokens_on_signup').first<{ value: string }>();
    
    const freeTokens = freeTokensSetting ? parseInt(freeTokensSetting.value) : 50;
    
    // Create user
    const userId = `user_${nanoid(16)}`;
    const passwordHash = await hashPassword(password);
    
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, name, tokens, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(userId, email.toLowerCase(), passwordHash, name || null, freeTokens).run();
    
    // Generate JWT token
    const token = await generateToken(
      { userId, email: email.toLowerCase(), role: 'user' },
      c.env.JWT_SECRET
    );
    
    // Store session in KV
    await c.env.SESSIONS.put(`session:${userId}`, JSON.stringify({
      token,
      createdAt: new Date().toISOString(),
    }), { expirationTtl: 60 * 60 * 24 * 7 }); // 7 days
    
    return c.json({
      success: true,
      data: {
        user: {
          id: userId,
          email: email.toLowerCase(),
          name: name || null,
          role: 'user',
          tokens: freeTokens,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({
      success: false,
      error: 'Failed to register user',
    }, 500);
  }
});

// Login
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return c.json({
        success: false,
        error: 'Email and password are required',
      }, 400);
    }
    
    // Find user
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ? AND is_active = 1'
    ).bind(email.toLowerCase()).first<User>();
    
    if (!user) {
      console.log('User not found for email:', email.toLowerCase());
      return c.json({
        success: false,
        error: 'Invalid email or password',
      }, 401);
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', user.email);
      return c.json({
        success: false,
        error: 'Invalid email or password',
      }, 401);
    }
    
    // Check if JWT_SECRET exists
    if (!c.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return c.json({
        success: false,
        error: 'Server configuration error',
      }, 500);
    }
    
    // Update last login
    await c.env.DB.prepare(
      'UPDATE users SET last_login_at = datetime("now") WHERE id = ?'
    ).bind(user.id).run();
    
    // Generate JWT token
    const token = await generateToken(
      { userId: user.id, email: user.email, role: user.role },
      c.env.JWT_SECRET
    );
    
    // Store session in KV
    await c.env.SESSIONS.put(`session:${user.id}`, JSON.stringify({
      token,
      createdAt: new Date().toISOString(),
    }), { expirationTtl: 60 * 60 * 24 * 7 }); // 7 days
    
    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tokens: user.tokens,
          avatar_url: user.avatar_url,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error?.message || error);
    return c.json({
      success: false,
      error: 'Failed to login: ' + (error?.message || 'Unknown error'),
    }, 500);
  }
});

// Logout
authRoutes.post('/logout', authMiddleware(), async (c) => {
  try {
    const userId = c.get('userId');
    
    // Remove session from KV
    await c.env.SESSIONS.delete(`session:${userId}`);
    
    return c.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({
      success: false,
      error: 'Failed to logout',
    }, 500);
  }
});

// Get current user
authRoutes.get('/me', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    // Get user's active subscriptions
    const subscriptions = await c.env.DB.prepare(`
      SELECT us.*, sp.name as plan_name, sp.studios, sp.type as plan_type
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? AND us.status = 'active'
    `).bind(user.id).all();
    
    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tokens: user.tokens,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
        },
        subscriptions: subscriptions.results,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({
      success: false,
      error: 'Failed to get user',
    }, 500);
  }
});

// Refresh token
authRoutes.post('/refresh', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    // Generate new JWT token
    const token = await generateToken(
      { userId: user.id, email: user.email, role: user.role },
      c.env.JWT_SECRET
    );
    
    // Update session in KV
    await c.env.SESSIONS.put(`session:${user.id}`, JSON.stringify({
      token,
      createdAt: new Date().toISOString(),
    }), { expirationTtl: 60 * 60 * 24 * 7 }); // 7 days
    
    return c.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json({
      success: false,
      error: 'Failed to refresh token',
    }, 500);
  }
});
