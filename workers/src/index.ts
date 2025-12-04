import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { Env } from './types';

// Import routes
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { subscriptionRoutes } from './routes/subscriptions';
import { paymentRoutes } from './routes/payments';
import { galleryRoutes } from './routes/gallery';
import { generateRoutes } from './routes/generate';
import { enhanceRoutes } from './routes/enhance';
import { promptRoutes } from './routes/prompt';
import { editRoutes } from './routes/edit';
import { videoRoutes } from './routes/video';
import { musicRoutes, sunoRoutes, musicGalleryRoutes } from './routes/music';
import { textRoutes } from './routes/text';
import { threedRoutes } from './routes/threed';
import { adminRoutes } from './routes/admin';
import { mediaRoutes } from './routes/media';
import { workflowRoutes } from './routes/workflows';
import { timelineRoutes } from './routes/timeline';
import { promptAssistantRoutes } from './routes/prompt-assistant';
import { scenarioRoutes } from './routes/scenario';
import { projectRoutes } from './routes/projects';
import { coverRoutes } from './routes/cover';
import { segmentRoutes } from './routes/segments';
import { audioRoutes } from './routes/audio';
import { resolutionRoutes } from './routes/resolution';
import { enhancementRoutes } from './routes/enhancement';
import { modelsRoutes } from './routes/models';

// Create main app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());

// CORS configuration
app.use('*', cors({
  origin: (origin) => {
    // Allow Cloudflare Pages domains, localhost, and configured origins
    const allowedPatterns = [
      /^https:\/\/.*\.pixelperfect.*\.pages\.dev$/,
      /^https:\/\/pixelperfect.*\.pages\.dev$/,
      /^https:\/\/pixelperfect\.pages\.dev$/,
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
    ];
    
    if (!origin) return '*';
    
    for (const pattern of allowedPatterns) {
      if (pattern.test(origin)) {
        return origin;
      }
    }
    
    return origin; // Allow all origins for now to debug
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
app.route('/api/payments', paymentRoutes);
app.route('/api/gallery', galleryRoutes);
app.route('/api/generate', generateRoutes);
app.route('/api/enhance', enhanceRoutes);
app.route('/api/reimagine', enhanceRoutes); // Alias for reimagine
app.route('/api/prompt', promptRoutes);
app.route('/api/edit', editRoutes);
app.route('/api/video', videoRoutes);
app.route('/api/music', musicRoutes);
app.route('/api/suno', sunoRoutes);
app.route('/api/music-gallery', musicGalleryRoutes);
app.route('/api/text', textRoutes);
app.route('/api/3d', threedRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/media', mediaRoutes);
app.route('/api/workflows', workflowRoutes);
app.route('/api/v1', modelsRoutes); // Video Models & Capabilities API v1 (must be before timelineRoutes)
app.route('/api/v1', timelineRoutes); // Timeline API v1
app.route('/api/v1', promptAssistantRoutes); // Prompt Assistant API v1
app.route('/api/v1', scenarioRoutes); // Scenario Assistant API v1
app.route('/api/v1', projectRoutes); // Projects & Gallery API v1
app.route('/api/v1', coverRoutes); // Cover Generation & Published Gallery API v1
app.route('/api/v1', segmentRoutes); // Segment Generation API v1
app.route('/api/v1', audioRoutes); // Audio Track API v1
app.route('/api/v1', resolutionRoutes); // Resolution & Aspect Ratio API v1
app.route('/api/v1', enhancementRoutes); // Video Enhancement / Upscaler API v1

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
