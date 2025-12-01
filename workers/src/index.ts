import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { Env } from './types';

// Import routes
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { subscriptionRoutes } from './routes/subscriptions';
import { galleryRoutes } from './routes/gallery';
import { generateRoutes } from './routes/generate';
import { adminRoutes } from './routes/admin';
import { mediaRoutes } from './routes/media';

// Create main app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());

// CORS configuration
app.use('*', cors({
  origin: (origin, c) => {
    const env = c.env as Env;
    // Allow configured origins and localhost for development
    const allowedOrigins = [
      env.CORS_ORIGIN,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      return origin || '*';
    }
    return null;
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: true,
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'PixelPerfect API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy' });
});

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/subscriptions', subscriptionRoutes);
app.route('/api/gallery', galleryRoutes);
app.route('/api/generate', generateRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/media', mediaRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    message: `Route ${c.req.method} ${c.req.path} not found`,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    success: false,
    error: 'Internal Server Error',
    message: c.env.ENVIRONMENT === 'development' ? err.message : 'An unexpected error occurred',
  }, 500);
});

export default app;
