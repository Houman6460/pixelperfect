import { Context, Next } from 'hono';
import * as jose from 'jose';
import { Env, JWTPayload, User } from '../types';

// Extended context with user
export interface AuthContext {
  user: User;
  userId: string;
}

// Verify JWT token
export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Generate JWT token
export async function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: string = '7d'
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  const token = await new jose.SignJWT(payload as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
  return token;
}

// Auth middleware - requires valid JWT
export function authMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      }, 401);
    }
    
    const token = authHeader.slice(7);
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    
    if (!payload) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }, 401);
    }
    
    // Get user from database
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ? AND is_active = 1'
    ).bind(payload.userId).first<User>();
    
    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'User not found or inactive',
      }, 401);
    }
    
    // Set user in context
    c.set('user', user);
    c.set('userId', user.id);
    
    await next();
  };
}

// Admin middleware - requires admin role
export function adminMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user') as User;
    
    if (!user || user.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Forbidden',
        message: 'Admin access required',
      }, 403);
    }
    
    await next();
  };
}

// Optional auth middleware - sets user if token present, but doesn't require it
export function optionalAuthMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = await verifyToken(token, c.env.JWT_SECRET);
      
      if (payload) {
        const user = await c.env.DB.prepare(
          'SELECT * FROM users WHERE id = ? AND is_active = 1'
        ).bind(payload.userId).first<User>();
        
        if (user) {
          c.set('user', user);
          c.set('userId', user.id);
        }
      }
    }
    
    await next();
  };
}

// Hash password using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
