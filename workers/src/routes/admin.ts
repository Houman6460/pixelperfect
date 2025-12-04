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

// Create subscription plan
adminRoutes.post('/plans', async (c) => {
  try {
    const { 
      name, description, type, base_price, tokens_per_month, 
      studios, features, billing_periods, is_active 
    } = await c.req.json();
    
    if (!name || !type) {
      return c.json({ success: false, error: 'Name and type are required' }, 400);
    }
    
    const planId = `plan_${Date.now()}`;
    
    await c.env.DB.prepare(`
      INSERT INTO subscription_plans (
        id, name, description, type, base_price, tokens_per_month,
        studios, features, billing_periods, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      planId,
      name,
      description || '',
      type, // 'individual', 'collection', 'full'
      base_price || 0,
      tokens_per_month || 0,
      JSON.stringify(studios || []),
      JSON.stringify(features || []),
      JSON.stringify(billing_periods || { monthly: 1, quarterly: 0.9, biannual: 0.85, annual: 0.8 }),
      is_active ? 1 : 0
    ).run();
    
    return c.json({ 
      success: true, 
      message: 'Plan created successfully',
      data: { id: planId }
    });
  } catch (error) {
    console.error('Create plan error:', error);
    return c.json({ success: false, error: 'Failed to create plan' }, 500);
  }
});

// Delete subscription plan
adminRoutes.delete('/plans/:id', async (c) => {
  try {
    const planId = c.req.param('id');
    
    // Check if any users have this plan
    const activeSubscriptions = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_id = ? AND status = "active"'
    ).bind(planId).first<{ count: number }>();
    
    if (activeSubscriptions && activeSubscriptions.count > 0) {
      return c.json({ 
        success: false, 
        error: `Cannot delete plan with ${activeSubscriptions.count} active subscriptions` 
      }, 400);
    }
    
    await c.env.DB.prepare('DELETE FROM subscription_plans WHERE id = ?').bind(planId).run();
    
    return c.json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    console.error('Delete plan error:', error);
    return c.json({ success: false, error: 'Failed to delete plan' }, 500);
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

// Get AI settings (combined endpoint for frontend)
adminRoutes.get('/ai-settings', async (c) => {
  try {
    const settings = await c.env.DB.prepare('SELECT * FROM admin_settings').all();
    const settingsMap = Object.fromEntries(
      (settings.results || []).map((s: any) => [s.key, s.value])
    );
    
    // Return in the format expected by frontend
    return c.json({ 
      success: true, 
      data: {
        settings: {
          aiProvider: settingsMap.ai_provider || 'openai',
          openaiModel: settingsMap.openai_model || 'gpt-4o',
          geminiModel: settingsMap.gemini_model || 'gemini-2.0',
          replicateModel: settingsMap.replicate_model || 'sdxl',
          autoSaveToGallery: settingsMap.auto_save_to_gallery === 'true',
          defaultUpscaleEnabled: settingsMap.default_upscale_enabled === 'true',
          defaultUpscaleFactor: parseInt(settingsMap.default_upscale_factor) || 2,
        },
        apiKeys: {
          openai: c.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
          gemini: c.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured',
          replicate: c.env.REPLICATE_API_KEY ? 'configured' : 'not_configured',
        }
      }
    });
  } catch (error) {
    console.error('Get AI settings error:', error);
    return c.json({ success: false, error: 'Failed to get AI settings' }, 500);
  }
});

// Get model API settings (which models use direct API vs Replicate)
adminRoutes.get('/model-api-settings', async (c) => {
  try {
    const models = await c.env.DB.prepare('SELECT * FROM ai_model_configs ORDER BY type, provider').all();
    
    // Map provider to API key availability
    const providerKeyMap: Record<string, boolean> = {
      openai: !!c.env.OPENAI_API_KEY,
      anthropic: !!c.env.ANTHROPIC_API_KEY,
      replicate: !!c.env.REPLICATE_API_KEY,
      stability: !!c.env.STABILITY_API_KEY,
      google: !!c.env.GOOGLE_API_KEY,
      suno: !!c.env.SUNO_API_KEY,
      kling: !!c.env.KLING_API_KEY,
      meshy: !!c.env.MESHY_API_KEY,
    };
    
    // Transform to frontend format
    const modelSettings = (models.results || []).map((m: any) => {
      const provider = m.provider?.toLowerCase() || '';
      const hasDirectApiKey = providerKeyMap[provider] || false;
      const hasReplicateKey = providerKeyMap['replicate'] || false;
      
      return {
        modelId: m.id,
        modelName: m.display_name,
        category: m.type,
        provider: m.provider,
        useDirectApi: m.use_direct_api === 1,
        directApiAvailable: hasDirectApiKey,
        replicateAvailable: hasReplicateKey,
        replicateModelId: m.model_id,
      };
    });
    
    return c.json({
      success: true,
      data: {
        models: modelSettings,
        apiKeys: {
          openai: c.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
          anthropic: c.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured',
          replicate: c.env.REPLICATE_API_KEY ? 'configured' : 'not_configured',
          stability: c.env.STABILITY_API_KEY ? 'configured' : 'not_configured',
          google: c.env.GOOGLE_API_KEY ? 'configured' : 'not_configured',
          suno: c.env.SUNO_API_KEY ? 'configured' : 'not_configured',
          kling: c.env.KLING_API_KEY ? 'configured' : 'not_configured',
          meshy: c.env.MESHY_API_KEY ? 'configured' : 'not_configured',
        }
      }
    });
  } catch (error) {
    console.error('Get model API settings error:', error);
    return c.json({ success: false, error: 'Failed to get model API settings' }, 500);
  }
});

// Toggle model API setting (direct vs Replicate)
adminRoutes.post('/model-api-settings/:modelId/toggle', async (c) => {
  try {
    const modelId = c.req.param('modelId');
    
    // Get current setting
    const model = await c.env.DB.prepare(
      'SELECT use_direct_api FROM ai_model_configs WHERE id = ?'
    ).bind(modelId).first<{ use_direct_api: number }>();
    
    if (!model) {
      return c.json({ success: false, error: 'Model not found' }, 404);
    }
    
    const newValue = model.use_direct_api === 1 ? 0 : 1;
    
    await c.env.DB.prepare(
      'UPDATE ai_model_configs SET use_direct_api = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(newValue, modelId).run();
    
    return c.json({
      success: true,
      data: { useDirectApi: newValue === 1 }
    });
  } catch (error) {
    console.error('Toggle model API setting error:', error);
    return c.json({ success: false, error: 'Failed to toggle model API setting' }, 500);
  }
});

// ============ API KEY MANAGEMENT ============

// Provider key mapping
const API_KEY_PROVIDERS = {
  openai: { name: 'OpenAI', envKey: 'OPENAI_API_KEY', kvKey: 'api_key_openai' },
  anthropic: { name: 'Anthropic', envKey: 'ANTHROPIC_API_KEY', kvKey: 'api_key_anthropic' },
  replicate: { name: 'Replicate', envKey: 'REPLICATE_API_KEY', kvKey: 'api_key_replicate' },
  stability: { name: 'Stability AI', envKey: 'STABILITY_API_KEY', kvKey: 'api_key_stability' },
  google: { name: 'Google AI', envKey: 'GOOGLE_API_KEY', kvKey: 'api_key_google' },
  suno: { name: 'Suno', envKey: 'SUNO_API_KEY', kvKey: 'api_key_suno' },
  kling: { name: 'Kling', envKey: 'KLING_API_KEY', kvKey: 'api_key_kling' },
  meshy: { name: 'Meshy', envKey: 'MESHY_API_KEY', kvKey: 'api_key_meshy' },
  elevenlabs: { name: 'ElevenLabs', envKey: 'ELEVENLABS_API_KEY', kvKey: 'api_key_elevenlabs' },
  runway: { name: 'Runway', envKey: 'RUNWAY_API_KEY', kvKey: 'api_key_runway' },
  midjourney: { name: 'Midjourney', envKey: 'MIDJOURNEY_API_KEY', kvKey: 'api_key_midjourney' },
  luma: { name: 'Luma AI', envKey: 'LUMA_API_KEY', kvKey: 'api_key_luma' },
  mistral: { name: 'Mistral', envKey: 'MISTRAL_API_KEY', kvKey: 'api_key_mistral' },
  deepseek: { name: 'DeepSeek', envKey: 'DEEPSEEK_API_KEY', kvKey: 'api_key_deepseek' },
  bfl: { name: 'BFL (Flux)', envKey: 'BFL_API_KEY', kvKey: 'api_key_bfl' },
  ideogram: { name: 'Ideogram', envKey: 'IDEOGRAM_API_KEY', kvKey: 'api_key_ideogram' },
  minimax: { name: 'MiniMax', envKey: 'MINIMAX_API_KEY', kvKey: 'api_key_minimax' },
  pixverse: { name: 'PixVerse', envKey: 'PIXVERSE_API_KEY', kvKey: 'api_key_pixverse' },
  udio: { name: 'Udio', envKey: 'UDIO_API_KEY', kvKey: 'api_key_udio' },
};

// Helper to mask API key
const maskApiKey = (key: string | null): string | null => {
  if (!key) return null;
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
};

// Get all API keys with status
adminRoutes.get('/api-keys', async (c) => {
  try {
    const apiKeys: Record<string, any> = {};
    
    for (const [provider, config] of Object.entries(API_KEY_PROVIDERS)) {
      // Check KV first (user-provided), then env (default)
      const kvKey = await c.env.CACHE.get(config.kvKey);
      const envKey = (c.env as any)[config.envKey] as string | undefined;
      const backupKey = await c.env.CACHE.get(`${config.kvKey}_backup`);
      
      const activeKey = kvKey || envKey || null;
      const source = kvKey ? 'user' : (envKey ? 'env' : 'none');
      
      apiKeys[provider] = {
        name: config.name,
        configured: !!activeKey,
        source, // 'user' (KV), 'env' (.env), or 'none'
        maskedKey: maskApiKey(activeKey),
        hasBackup: !!backupKey,
        backupMaskedKey: maskApiKey(backupKey),
      };
    }
    
    // Get fallback configuration
    const fallbackConfig = await c.env.CACHE.get('api_fallback_config');
    const fallback = fallbackConfig ? JSON.parse(fallbackConfig) : {
      enabled: true,
      primaryPreference: 'direct', // 'direct' or 'replicate'
      autoSwitch: true,
      retryCount: 3,
    };
    
    return c.json({
      success: true,
      data: {
        apiKeys,
        fallback,
      }
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    return c.json({ success: false, error: 'Failed to get API keys' }, 500);
  }
});

// Set/Update API key for a provider
adminRoutes.put('/api-keys/:provider', async (c) => {
  try {
    const provider = c.req.param('provider');
    const { apiKey, isBackup } = await c.req.json();
    
    const config = API_KEY_PROVIDERS[provider as keyof typeof API_KEY_PROVIDERS];
    if (!config) {
      return c.json({ success: false, error: 'Invalid provider' }, 400);
    }
    
    if (!apiKey || apiKey.trim() === '') {
      return c.json({ success: false, error: 'API key is required' }, 400);
    }
    
    const trimmedKey = apiKey.trim();
    const kvKeyName = isBackup ? `${config.kvKey}_backup` : config.kvKey;
    
    // Save to KV cache (primary storage for runtime)
    await c.env.CACHE.put(kvKeyName, trimmedKey);
    
    // Also save to D1 for persistence (backup storage)
    if (!isBackup) {
      try {
        await c.env.DB.prepare(`
          INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
        `).bind(`${provider}_api_key`, trimmedKey).run();
      } catch (dbError) {
        console.error('Failed to save API key to D1:', dbError);
        // Continue - KV save succeeded
      }
    }
    
    return c.json({
      success: true,
      message: `${config.name} ${isBackup ? 'backup ' : ''}API key saved`,
      data: {
        provider,
        maskedKey: maskApiKey(trimmedKey),
        isBackup,
      }
    });
  } catch (error) {
    console.error('Set API key error:', error);
    return c.json({ success: false, error: 'Failed to save API key' }, 500);
  }
});

// Delete API key for a provider
adminRoutes.delete('/api-keys/:provider', async (c) => {
  try {
    const provider = c.req.param('provider');
    const { isBackup } = c.req.query();
    
    const config = API_KEY_PROVIDERS[provider as keyof typeof API_KEY_PROVIDERS];
    if (!config) {
      return c.json({ success: false, error: 'Invalid provider' }, 400);
    }
    
    const kvKeyName = isBackup === 'true' ? `${config.kvKey}_backup` : config.kvKey;
    await c.env.CACHE.delete(kvKeyName);
    
    return c.json({
      success: true,
      message: `${config.name} ${isBackup === 'true' ? 'backup ' : ''}API key removed`,
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    return c.json({ success: false, error: 'Failed to delete API key' }, 500);
  }
});

// Test API key connectivity
adminRoutes.post('/api-keys/:provider/test', async (c) => {
  try {
    const provider = c.req.param('provider');
    const { apiKey } = await c.req.json();
    
    const config = API_KEY_PROVIDERS[provider as keyof typeof API_KEY_PROVIDERS];
    if (!config) {
      return c.json({ success: false, error: 'Invalid provider' }, 400);
    }
    
    // Get the key to test (provided or stored)
    const kvKey = await c.env.CACHE.get(config.kvKey);
    const envKey = (c.env as any)[config.envKey] as string | undefined;
    const keyToTest = apiKey || kvKey || envKey;
    
    if (!keyToTest) {
      return c.json({ success: false, error: 'No API key available to test' }, 400);
    }
    
    // Test connectivity based on provider
    let testResult = { success: false, message: '' };
    
    try {
      switch (provider) {
        case 'openai':
          const openaiRes = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${keyToTest.trim()}` }
          });
          if (openaiRes.ok) {
            testResult = { success: true, message: 'Connected successfully' };
          } else {
            const errorData = await openaiRes.json().catch(() => ({})) as any;
            const errorMsg = errorData?.error?.message || `HTTP ${openaiRes.status}`;
            testResult = { success: false, message: `API Error: ${errorMsg}` };
          }
          break;
        case 'anthropic':
          const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 
              'x-api-key': keyToTest,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: 'claude-3-sonnet-20240229', max_tokens: 1, messages: [{ role: 'user', content: 'test' }] })
          });
          testResult = { success: anthropicRes.status !== 401, message: anthropicRes.status !== 401 ? 'Connected successfully' : 'Invalid API key' };
          break;
        case 'replicate':
          const replicateRes = await fetch('https://api.replicate.com/v1/models', {
            headers: { 'Authorization': `Token ${keyToTest}` }
          });
          testResult = { success: replicateRes.ok, message: replicateRes.ok ? 'Connected successfully' : 'Invalid API key' };
          break;
        case 'google':
          const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${keyToTest}`);
          testResult = { success: googleRes.ok, message: googleRes.ok ? 'Connected successfully' : 'Invalid API key' };
          break;
        default:
          testResult = { success: true, message: 'API key saved (connectivity test not available for this provider)' };
      }
    } catch (e) {
      testResult = { success: false, message: 'Connection failed - check network or API key' };
    }
    
    return c.json({
      success: testResult.success,
      message: testResult.message,
      provider: config.name,
    });
  } catch (error) {
    console.error('Test API key error:', error);
    return c.json({ success: false, error: 'Failed to test API key' }, 500);
  }
});

// Update fallback configuration
adminRoutes.put('/api-keys/fallback', async (c) => {
  try {
    const config = await c.req.json();
    
    const fallbackConfig = {
      enabled: config.enabled ?? true,
      primaryPreference: config.primaryPreference || 'direct',
      autoSwitch: config.autoSwitch ?? true,
      retryCount: config.retryCount || 3,
    };
    
    await c.env.CACHE.put('api_fallback_config', JSON.stringify(fallbackConfig));
    
    return c.json({
      success: true,
      message: 'Fallback configuration updated',
      data: fallbackConfig,
    });
  } catch (error) {
    console.error('Update fallback config error:', error);
    return c.json({ success: false, error: 'Failed to update fallback config' }, 500);
  }
});

// Get effective API key (with fallback logic) - for internal use by other routes
adminRoutes.get('/api-keys/:provider/effective', async (c) => {
  try {
    const provider = c.req.param('provider');
    
    const config = API_KEY_PROVIDERS[provider as keyof typeof API_KEY_PROVIDERS];
    if (!config) {
      return c.json({ success: false, error: 'Invalid provider' }, 400);
    }
    
    // Priority: KV (user) > ENV > Backup
    const kvKey = await c.env.CACHE.get(config.kvKey);
    const envKey = (c.env as any)[config.envKey] as string | undefined;
    const backupKey = await c.env.CACHE.get(`${config.kvKey}_backup`);
    
    const effectiveKey = kvKey || envKey || backupKey || null;
    const source = kvKey ? 'user' : (envKey ? 'env' : (backupKey ? 'backup' : 'none'));
    
    return c.json({
      success: true,
      data: {
        provider,
        hasKey: !!effectiveKey,
        source,
      }
    });
  } catch (error) {
    console.error('Get effective API key error:', error);
    return c.json({ success: false, error: 'Failed to get effective API key' }, 500);
  }
});

// Update AI settings
adminRoutes.put('/ai-settings', async (c) => {
  try {
    const updates = await c.req.json();
    
    // Map frontend keys to database keys
    const keyMap: Record<string, string> = {
      aiProvider: 'ai_provider',
      openaiModel: 'openai_model',
      geminiModel: 'gemini_model',
      replicateModel: 'replicate_model',
      autoSaveToGallery: 'auto_save_to_gallery',
      defaultUpscaleEnabled: 'default_upscale_enabled',
      defaultUpscaleFactor: 'default_upscale_factor',
    };
    
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = keyMap[key] || key;
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
      `).bind(dbKey, String(value)).run();
    }
    
    // Return updated settings
    const settings = await c.env.DB.prepare('SELECT * FROM admin_settings').all();
    const settingsMap = Object.fromEntries(
      (settings.results || []).map((s: any) => [s.key, s.value])
    );
    
    return c.json({ 
      success: true, 
      data: {
        settings: {
          aiProvider: settingsMap.ai_provider || 'openai',
          openaiModel: settingsMap.openai_model || 'gpt-4o',
          geminiModel: settingsMap.gemini_model || 'gemini-2.0',
          replicateModel: settingsMap.replicate_model || 'sdxl',
          autoSaveToGallery: settingsMap.auto_save_to_gallery === 'true',
          defaultUpscaleEnabled: settingsMap.default_upscale_enabled === 'true',
          defaultUpscaleFactor: parseInt(settingsMap.default_upscale_factor) || 2,
        }
      }
    });
  } catch (error) {
    console.error('Update AI settings error:', error);
    return c.json({ success: false, error: 'Failed to update AI settings' }, 500);
  }
});

// ============ PAYMENT SETTINGS ============

// Get all payment methods
adminRoutes.get('/payment-methods', async (c) => {
  try {
    const methods = await c.env.DB.prepare(`
      SELECT * FROM payment_methods ORDER BY sort_order ASC
    `).all();
    
    // Check Stripe configuration status
    const stripeConfigured = !!c.env.STRIPE_SECRET_KEY;
    
    // Map methods with actual configuration status
    const methodsWithStatus = (methods.results || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      displayName: m.display_name,
      description: m.description,
      icon: m.icon,
      isEnabled: m.is_enabled === 1,
      requiresSetup: m.requires_setup === 1,
      setupStatus: stripeConfigured ? 'configured' : 'not_configured',
      supportedCurrencies: JSON.parse(m.supported_currencies || '[]'),
      minAmount: m.min_amount,
      maxAmount: m.max_amount,
      processingFeePercent: m.processing_fee_percent,
      processingFeeFixed: m.processing_fee_fixed,
      sortOrder: m.sort_order,
    }));
    
    return c.json({
      success: true,
      data: {
        methods: methodsWithStatus,
        stripeConfigured,
        webhookConfigured: !!c.env.STRIPE_WEBHOOK_SECRET,
      }
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    return c.json({ success: false, error: 'Failed to get payment methods' }, 500);
  }
});

// Toggle payment method enabled/disabled
adminRoutes.post('/payment-methods/:id/toggle', async (c) => {
  try {
    const methodId = c.req.param('id');
    
    const method = await c.env.DB.prepare(
      'SELECT is_enabled FROM payment_methods WHERE id = ?'
    ).bind(methodId).first<{ is_enabled: number }>();
    
    if (!method) {
      return c.json({ success: false, error: 'Payment method not found' }, 404);
    }
    
    const newValue = method.is_enabled === 1 ? 0 : 1;
    
    await c.env.DB.prepare(
      'UPDATE payment_methods SET is_enabled = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(newValue, methodId).run();
    
    return c.json({
      success: true,
      data: { isEnabled: newValue === 1 }
    });
  } catch (error) {
    console.error('Toggle payment method error:', error);
    return c.json({ success: false, error: 'Failed to toggle payment method' }, 500);
  }
});

// Update payment method settings
adminRoutes.put('/payment-methods/:id', async (c) => {
  try {
    const methodId = c.req.param('id');
    const updates = await c.req.json();
    
    const method = await c.env.DB.prepare(
      'SELECT * FROM payment_methods WHERE id = ?'
    ).bind(methodId).first();
    
    if (!method) {
      return c.json({ success: false, error: 'Payment method not found' }, 404);
    }
    
    await c.env.DB.prepare(`
      UPDATE payment_methods SET 
        display_name = COALESCE(?, display_name),
        description = COALESCE(?, description),
        min_amount = COALESCE(?, min_amount),
        max_amount = COALESCE(?, max_amount),
        processing_fee_percent = COALESCE(?, processing_fee_percent),
        processing_fee_fixed = COALESCE(?, processing_fee_fixed),
        sort_order = COALESCE(?, sort_order),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      updates.displayName,
      updates.description,
      updates.minAmount,
      updates.maxAmount,
      updates.processingFeePercent,
      updates.processingFeeFixed,
      updates.sortOrder,
      methodId
    ).run();
    
    return c.json({ success: true, message: 'Payment method updated' });
  } catch (error) {
    console.error('Update payment method error:', error);
    return c.json({ success: false, error: 'Failed to update payment method' }, 500);
  }
});

// Get token packages
adminRoutes.get('/token-packages', async (c) => {
  try {
    const packages = await c.env.DB.prepare(`
      SELECT * FROM token_packages ORDER BY sort_order ASC
    `).all();
    
    const packagesFormatted = (packages.results || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      tokens: p.tokens,
      price: p.price,
      currency: p.currency,
      isPopular: p.is_popular === 1,
      isActive: p.is_active === 1,
      sortOrder: p.sort_order,
    }));
    
    return c.json({
      success: true,
      data: { packages: packagesFormatted }
    });
  } catch (error) {
    console.error('Get token packages error:', error);
    return c.json({ success: false, error: 'Failed to get token packages' }, 500);
  }
});

// Create token package
adminRoutes.post('/token-packages', async (c) => {
  try {
    const { name, tokens, price, currency, isPopular, sortOrder } = await c.req.json();
    
    const id = `pkg_${Date.now()}`;
    
    await c.env.DB.prepare(`
      INSERT INTO token_packages (id, name, tokens, price, currency, is_popular, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(id, name, tokens, price, currency || 'USD', isPopular ? 1 : 0, sortOrder || 0).run();
    
    return c.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Create token package error:', error);
    return c.json({ success: false, error: 'Failed to create token package' }, 500);
  }
});

// Update token package
adminRoutes.put('/token-packages/:id', async (c) => {
  try {
    const packageId = c.req.param('id');
    const updates = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE token_packages SET 
        name = COALESCE(?, name),
        tokens = COALESCE(?, tokens),
        price = COALESCE(?, price),
        currency = COALESCE(?, currency),
        is_popular = COALESCE(?, is_popular),
        is_active = COALESCE(?, is_active),
        sort_order = COALESCE(?, sort_order),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      updates.name,
      updates.tokens,
      updates.price,
      updates.currency,
      updates.isPopular !== undefined ? (updates.isPopular ? 1 : 0) : null,
      updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : null,
      updates.sortOrder,
      packageId
    ).run();
    
    return c.json({ success: true, message: 'Token package updated' });
  } catch (error) {
    console.error('Update token package error:', error);
    return c.json({ success: false, error: 'Failed to update token package' }, 500);
  }
});

// Delete token package
adminRoutes.delete('/token-packages/:id', async (c) => {
  try {
    const packageId = c.req.param('id');
    
    await c.env.DB.prepare(
      'DELETE FROM token_packages WHERE id = ?'
    ).bind(packageId).run();
    
    return c.json({ success: true, message: 'Token package deleted' });
  } catch (error) {
    console.error('Delete token package error:', error);
    return c.json({ success: false, error: 'Failed to delete token package' }, 500);
  }
});

// Get payment statistics
adminRoutes.get('/payment-stats', async (c) => {
  try {
    // Total revenue
    const totalRevenue = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
      WHERE type IN ('subscription', 'token_purchase') AND status = 'completed'
    `).first<{ total: number }>();
    
    // Revenue this month
    const monthlyRevenue = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
      WHERE type IN ('subscription', 'token_purchase') 
      AND status = 'completed'
      AND created_at >= date('now', 'start of month')
    `).first<{ total: number }>();
    
    // Transaction count
    const transactionCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE type IN ('subscription', 'token_purchase') AND status = 'completed'
    `).first<{ count: number }>();
    
    // Recent transactions
    const recentTransactions = await c.env.DB.prepare(`
      SELECT t.*, u.email as user_email, u.name as user_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.type IN ('subscription', 'token_purchase')
      ORDER BY t.created_at DESC
      LIMIT 10
    `).all();
    
    return c.json({
      success: true,
      data: {
        totalRevenue: totalRevenue?.total || 0,
        monthlyRevenue: monthlyRevenue?.total || 0,
        transactionCount: transactionCount?.count || 0,
        recentTransactions: recentTransactions.results || [],
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    return c.json({ success: false, error: 'Failed to get payment stats' }, 500);
  }
});

// ============ PAYMENT PROVIDER SETTINGS ============

// Get payment provider configuration status
adminRoutes.get('/payment-config', async (c) => {
  try {
    // Check if Stripe key is configured (from env secret or KV)
    const kvStripeKey = await c.env.CACHE.get('stripe_secret_key');
    const stripeConfigured = !!(c.env.STRIPE_SECRET_KEY || kvStripeKey);
    
    // Check webhook secret
    const kvWebhookSecret = await c.env.CACHE.get('stripe_webhook_secret');
    const webhookConfigured = !!(c.env.STRIPE_WEBHOOK_SECRET || kvWebhookSecret);
    
    // Get masked key for display (if exists)
    const activeKey = c.env.STRIPE_SECRET_KEY || kvStripeKey;
    const maskedKey = activeKey ? `${activeKey.substring(0, 7)}...${activeKey.substring(activeKey.length - 4)}` : null;
    
    return c.json({
      success: true,
      data: {
        stripeConfigured,
        webhookConfigured,
        maskedKey,
        source: c.env.STRIPE_SECRET_KEY ? 'environment' : (kvStripeKey ? 'database' : 'none'),
      }
    });
  } catch (error) {
    console.error('Get payment config error:', error);
    return c.json({ success: false, error: 'Failed to get payment config' }, 500);
  }
});

// Save Stripe API key (stored in KV for security)
adminRoutes.post('/payment-config/stripe', async (c) => {
  try {
    const { secretKey, webhookSecret } = await c.req.json();
    
    if (secretKey) {
      // Validate it looks like a Stripe key
      if (!secretKey.startsWith('sk_')) {
        return c.json({ success: false, error: 'Invalid Stripe secret key format. Must start with sk_' }, 400);
      }
      
      // Store in KV (will be used if no env secret is set)
      await c.env.CACHE.put('stripe_secret_key', secretKey);
    }
    
    if (webhookSecret) {
      if (!webhookSecret.startsWith('whsec_')) {
        return c.json({ success: false, error: 'Invalid webhook secret format. Must start with whsec_' }, 400);
      }
      await c.env.CACHE.put('stripe_webhook_secret', webhookSecret);
    }
    
    return c.json({ 
      success: true, 
      message: 'Payment configuration saved successfully'
    });
  } catch (error) {
    console.error('Save payment config error:', error);
    return c.json({ success: false, error: 'Failed to save payment config' }, 500);
  }
});

// Remove Stripe configuration from KV
adminRoutes.delete('/payment-config/stripe', async (c) => {
  try {
    await c.env.CACHE.delete('stripe_secret_key');
    await c.env.CACHE.delete('stripe_webhook_secret');
    
    return c.json({ 
      success: true, 
      message: 'Payment configuration removed'
    });
  } catch (error) {
    console.error('Delete payment config error:', error);
    return c.json({ success: false, error: 'Failed to delete payment config' }, 500);
  }
});

// Save Swish configuration (direct Swish, not via Stripe)
adminRoutes.post('/payment-config/swish', async (c) => {
  try {
    const { phoneNumber, payeeName, enabled } = await c.req.json();
    
    if (phoneNumber) {
      // Format Swedish phone number (remove spaces, ensure starts with 46 or 0)
      let formattedNumber = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
      if (formattedNumber.startsWith('0')) {
        formattedNumber = '46' + formattedNumber.substring(1);
      }
      if (!formattedNumber.startsWith('46')) {
        formattedNumber = '46' + formattedNumber;
      }
      await c.env.CACHE.put('swish_phone_number', formattedNumber);
    }
    if (payeeName) {
      await c.env.CACHE.put('swish_payee_name', payeeName);
    }
    if (enabled !== undefined) {
      await c.env.CACHE.put('swish_enabled', enabled ? 'true' : 'false');
    }
    
    return c.json({ 
      success: true, 
      message: 'Swish configuration saved successfully'
    });
  } catch (error) {
    console.error('Save Swish config error:', error);
    return c.json({ success: false, error: 'Failed to save Swish config' }, 500);
  }
});

// Save PayPal configuration
adminRoutes.post('/payment-config/paypal', async (c) => {
  try {
    const { clientId, clientSecret, sandbox } = await c.req.json();
    
    if (clientId) {
      await c.env.CACHE.put('paypal_client_id', clientId);
    }
    if (clientSecret) {
      await c.env.CACHE.put('paypal_client_secret', clientSecret);
    }
    if (sandbox !== undefined) {
      await c.env.CACHE.put('paypal_sandbox', sandbox ? 'true' : 'false');
    }
    
    return c.json({ 
      success: true, 
      message: 'PayPal configuration saved successfully'
    });
  } catch (error) {
    console.error('Save PayPal config error:', error);
    return c.json({ success: false, error: 'Failed to save PayPal config' }, 500);
  }
});

// Get all payment provider configurations
adminRoutes.get('/payment-config/all', async (c) => {
  try {
    // Stripe
    const kvStripeKey = await c.env.CACHE.get('stripe_secret_key');
    const kvWebhookSecret = await c.env.CACHE.get('stripe_webhook_secret');
    const stripeConfigured = !!(c.env.STRIPE_SECRET_KEY || kvStripeKey);
    const activeStripeKey = c.env.STRIPE_SECRET_KEY || kvStripeKey;
    
    // PayPal
    const paypalClientId = await c.env.CACHE.get('paypal_client_id');
    const paypalClientSecret = await c.env.CACHE.get('paypal_client_secret');
    const paypalSandbox = await c.env.CACHE.get('paypal_sandbox');
    const paypalConfigured = !!(paypalClientId && paypalClientSecret);
    
    // Swish Direct
    const swishPhoneNumber = await c.env.CACHE.get('swish_phone_number');
    const swishPayeeName = await c.env.CACHE.get('swish_payee_name');
    const swishEnabled = await c.env.CACHE.get('swish_enabled');
    const swishConfigured = !!(swishPhoneNumber && swishEnabled === 'true');
    
    return c.json({
      success: true,
      data: {
        stripe: {
          configured: stripeConfigured,
          webhookConfigured: !!(c.env.STRIPE_WEBHOOK_SECRET || kvWebhookSecret),
          maskedKey: activeStripeKey ? `${activeStripeKey.substring(0, 7)}...${activeStripeKey.substring(activeStripeKey.length - 4)}` : null,
          source: c.env.STRIPE_SECRET_KEY ? 'environment' : (kvStripeKey ? 'database' : 'none'),
          // Methods that work through Stripe
          supportedMethods: ['card', 'klarna', 'apple_pay', 'google_pay'],
        },
        paypal: {
          configured: paypalConfigured,
          sandbox: paypalSandbox === 'true',
          maskedClientId: paypalClientId ? `${paypalClientId.substring(0, 10)}...` : null,
        },
        swish: {
          configured: swishConfigured,
          enabled: swishEnabled === 'true',
          phoneNumber: swishPhoneNumber || null,
          maskedPhone: swishPhoneNumber ? `+${swishPhoneNumber.substring(0, 2)} ***${swishPhoneNumber.substring(swishPhoneNumber.length - 3)}` : null,
          payeeName: swishPayeeName || null,
        },
        // Summary of which methods are available
        availableMethods: {
          card: stripeConfigured,
          klarna: stripeConfigured,
          swish_stripe: stripeConfigured, // Swish via Stripe
          swish_direct: swishConfigured,  // Direct Swish QR
          apple_pay: stripeConfigured,
          google_pay: stripeConfigured,
          paypal: paypalConfigured,
        }
      }
    });
  } catch (error) {
    console.error('Get all payment config error:', error);
    return c.json({ success: false, error: 'Failed to get payment configurations' }, 500);
  }
});

// ==========================================
// TOKEN ECONOMICS ENDPOINTS
// ==========================================

// Get token economics dashboard
adminRoutes.get('/token-economics', async (c) => {
  try {
    // Get token pricing rules
    const pricing = await c.env.DB.prepare('SELECT * FROM token_pricing ORDER BY operation').all();
    
    // Get provider costs
    const providerCosts = await c.env.DB.prepare('SELECT * FROM provider_costs ORDER BY provider, model_id').all();
    
    // Get plan token configs
    const planConfigs = await c.env.DB.prepare(`
      SELECT ptc.*, sp.name as plan_name 
      FROM plan_token_config ptc
      JOIN subscription_plans sp ON ptc.plan_id = sp.id
      ORDER BY sp.base_price
    `).all();
    
    // Get settings
    const settings = await c.env.DB.prepare(`
      SELECT key, value FROM admin_settings 
      WHERE key IN ('default_markup_percent', 'token_usd_rate', 'free_tier_tokens', 'low_balance_warning')
    `).all();
    
    // Calculate summary stats
    const totalUsage30d = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_operations,
        SUM(tokens_used) as total_tokens,
        SUM(COALESCE(provider_cost, 0)) as total_provider_cost
      FROM token_usage_log 
      WHERE created_at > datetime('now', '-30 days')
    `).first();
    
    const providerUsage30d = await c.env.DB.prepare(`
      SELECT 
        provider,
        COUNT(*) as operations,
        SUM(cost_usd) as total_cost
      FROM provider_usage_log 
      WHERE created_at > datetime('now', '-30 days')
      GROUP BY provider
    `).all();
    
    return c.json({
      success: true,
      data: {
        pricing: pricing.results,
        providerCosts: providerCosts.results,
        planConfigs: planConfigs.results,
        settings: Object.fromEntries(
          (settings.results as any[]).map(s => [s.key, s.value])
        ),
        stats: {
          last30Days: totalUsage30d,
          providerBreakdown: providerUsage30d.results,
        },
      },
    });
  } catch (error) {
    console.error('Get token economics error:', error);
    return c.json({ success: false, error: 'Failed to get token economics' }, 500);
  }
});

// Update token pricing rule
adminRoutes.put('/token-pricing/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { tokens_charged, markup_percent, base_provider_cost, is_active } = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE token_pricing 
      SET tokens_charged = ?, markup_percent = ?, base_provider_cost = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(tokens_charged, markup_percent, base_provider_cost, is_active ? 1 : 0, id).run();
    
    return c.json({ success: true, message: 'Token pricing updated' });
  } catch (error) {
    console.error('Update token pricing error:', error);
    return c.json({ success: false, error: 'Failed to update token pricing' }, 500);
  }
});

// Add new token pricing rule
adminRoutes.post('/token-pricing', async (c) => {
  try {
    const { operation, display_name, description, base_provider_cost, tokens_charged, markup_percent } = await c.req.json();
    
    const id = `tp_${operation.replace(/[^a-z0-9]/gi, '_')}`;
    
    await c.env.DB.prepare(`
      INSERT INTO token_pricing (id, operation, display_name, description, base_provider_cost, tokens_charged, markup_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, operation, display_name, description || null, base_provider_cost || 0, tokens_charged, markup_percent || 100).run();
    
    return c.json({ success: true, message: 'Token pricing rule created' });
  } catch (error) {
    console.error('Create token pricing error:', error);
    return c.json({ success: false, error: 'Failed to create token pricing' }, 500);
  }
});

// Update provider cost
adminRoutes.put('/provider-costs/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { cost_per_unit, cost_unit, avg_units_per_request, notes, is_active } = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE provider_costs 
      SET cost_per_unit = ?, cost_unit = ?, avg_units_per_request = ?, notes = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(cost_per_unit, cost_unit, avg_units_per_request || 1, notes || null, is_active ? 1 : 0, id).run();
    
    return c.json({ success: true, message: 'Provider cost updated' });
  } catch (error) {
    console.error('Update provider cost error:', error);
    return c.json({ success: false, error: 'Failed to update provider cost' }, 500);
  }
});

// Add new provider cost
adminRoutes.post('/provider-costs', async (c) => {
  try {
    const { provider, model_id, display_name, operation_type, cost_per_unit, cost_unit, notes } = await c.req.json();
    
    const id = `pc_${provider}_${model_id.replace(/[^a-z0-9]/gi, '_')}`;
    
    await c.env.DB.prepare(`
      INSERT INTO provider_costs (id, provider, model_id, display_name, operation_type, cost_per_unit, cost_unit, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, provider, model_id, display_name, operation_type, cost_per_unit, cost_unit || 'per_request', notes || null).run();
    
    return c.json({ success: true, message: 'Provider cost created' });
  } catch (error) {
    console.error('Create provider cost error:', error);
    return c.json({ success: false, error: 'Failed to create provider cost' }, 500);
  }
});

// Update plan token config
adminRoutes.put('/plan-token-config/:planId', async (c) => {
  try {
    const planId = c.req.param('planId');
    const { tokens_monthly, tokens_bonus, rollover_enabled, rollover_max_months, rollover_cap_percent } = await c.req.json();
    
    // Check if config exists
    const existing = await c.env.DB.prepare('SELECT id FROM plan_token_config WHERE plan_id = ?').bind(planId).first();
    
    if (existing) {
      await c.env.DB.prepare(`
        UPDATE plan_token_config 
        SET tokens_monthly = ?, tokens_bonus = ?, rollover_enabled = ?, rollover_max_months = ?, rollover_cap_percent = ?, updated_at = datetime('now')
        WHERE plan_id = ?
      `).bind(tokens_monthly, tokens_bonus || 0, rollover_enabled ? 1 : 0, rollover_max_months || 1, rollover_cap_percent || 100, planId).run();
    } else {
      await c.env.DB.prepare(`
        INSERT INTO plan_token_config (id, plan_id, tokens_monthly, tokens_bonus, rollover_enabled, rollover_max_months, rollover_cap_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(`ptc_${planId}`, planId, tokens_monthly, tokens_bonus || 0, rollover_enabled ? 1 : 0, rollover_max_months || 1, rollover_cap_percent || 100).run();
    }
    
    // Also update the subscription_plans table
    await c.env.DB.prepare(`
      UPDATE subscription_plans SET tokens_per_month = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(tokens_monthly, planId).run();
    
    return c.json({ success: true, message: 'Plan token config updated' });
  } catch (error) {
    console.error('Update plan token config error:', error);
    return c.json({ success: false, error: 'Failed to update plan token config' }, 500);
  }
});

// Get per-user token analytics
adminRoutes.get('/user-token-analytics/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    
    // Get user info
    const user = await c.env.DB.prepare('SELECT id, email, name, tokens FROM users WHERE id = ?').bind(userId).first();
    
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }
    
    // Get token usage history
    const usageHistory = await c.env.DB.prepare(`
      SELECT operation, SUM(tokens_used) as total_tokens, COUNT(*) as count,
             SUM(COALESCE(provider_cost, 0)) as total_provider_cost
      FROM token_usage_log 
      WHERE user_id = ?
      GROUP BY operation
      ORDER BY total_tokens DESC
    `).bind(userId).all();
    
    // Get recent usage
    const recentUsage = await c.env.DB.prepare(`
      SELECT * FROM token_usage_log 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).bind(userId).all();
    
    // Get monthly breakdown
    const monthlyUsage = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        SUM(tokens_used) as tokens,
        SUM(COALESCE(provider_cost, 0)) as provider_cost,
        COUNT(*) as operations
      FROM token_usage_log 
      WHERE user_id = ?
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `).bind(userId).all();
    
    // Get user's subscription and token allocation
    const subscription = await c.env.DB.prepare(`
      SELECT us.*, sp.name as plan_name, sp.tokens_per_month,
             ptc.tokens_bonus, ptc.rollover_enabled
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      LEFT JOIN plan_token_config ptc ON ptc.plan_id = sp.id
      WHERE us.user_id = ? AND us.status = 'active'
    `).bind(userId).first();
    
    return c.json({
      success: true,
      data: {
        user,
        subscription,
        usageByOperation: usageHistory.results,
        recentUsage: recentUsage.results,
        monthlyBreakdown: monthlyUsage.results,
      },
    });
  } catch (error) {
    console.error('Get user token analytics error:', error);
    return c.json({ success: false, error: 'Failed to get user token analytics' }, 500);
  }
});

// Get all users token summary
adminRoutes.get('/users-token-summary', async (c) => {
  try {
    const { period = '30' } = c.req.query();
    
    const userSummary = await c.env.DB.prepare(`
      SELECT 
        u.id, u.email, u.name, u.tokens as current_balance,
        COALESCE(usage.total_used, 0) as tokens_used_period,
        COALESCE(usage.operations, 0) as operations_period,
        COALESCE(usage.provider_cost, 0) as provider_cost_period,
        sp.name as plan_name,
        sp.tokens_per_month as monthly_allocation
      FROM users u
      LEFT JOIN (
        SELECT user_id, 
               SUM(tokens_used) as total_used, 
               COUNT(*) as operations,
               SUM(COALESCE(provider_cost, 0)) as provider_cost
        FROM token_usage_log 
        WHERE created_at > datetime('now', '-' || ? || ' days')
        GROUP BY user_id
      ) usage ON usage.user_id = u.id
      LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
      LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
      ORDER BY usage.total_used DESC
      LIMIT 100
    `).bind(period).all();
    
    return c.json({
      success: true,
      data: userSummary.results,
    });
  } catch (error) {
    console.error('Get users token summary error:', error);
    return c.json({ success: false, error: 'Failed to get users token summary' }, 500);
  }
});

// Update admin settings
adminRoutes.put('/settings/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const { value } = await c.req.json();
    
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `).bind(key, value.toString()).run();
    
    return c.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    console.error('Update setting error:', error);
    return c.json({ success: false, error: 'Failed to update setting' }, 500);
  }
});

// ==================== BACKEND VERIFICATION ====================

import { initializeKVCache, VIDEO_MODELS, UPSCALER_MODELS, PLATFORM_PROFILES } from '../services/kvCacheInit';

// GET /admin/verify-backend - Deep verification of D1, R2, KV
adminRoutes.get('/verify-backend', async (c) => {
  const results = {
    d1: { status: 'checking', tables: [] as any[], issues: [] as string[] },
    r2: { status: 'checking', paths: [] as any[], issues: [] as string[] },
    kv: { status: 'checking', keys: [] as any[], issues: [] as string[] },
    connections: { status: 'checking', issues: [] as string[] },
    overall: 'PENDING',
  };

  try {
    // ==================== D1 VERIFICATION ====================
    const requiredTables = [
      'users', 'scenarios', 'scene_breakdowns', 'timelines', 'segments',
      'generation_plans', 'audio_tracks', 'covers', 'publish_jobs',
      'published_items', 'enhancement_jobs', 'upscaler_models',
      'platform_video_profiles', 'video_projects', 'project_folders'
    ];

    for (const table of requiredTables) {
      try {
        const result = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
        results.d1.tables.push({ name: table, exists: true, count: result?.count || 0 });
      } catch {
        results.d1.tables.push({ name: table, exists: false });
        results.d1.issues.push(`Table '${table}' missing or inaccessible`);
      }
    }

    // Check critical columns in segments
    try {
      const segmentCols = await c.env.DB.prepare(`PRAGMA table_info(segments)`).all();
      const colNames = segmentCols.results?.map((r: any) => r.name) || [];
      const requiredSegmentCols = ['negative_prompt', 'style_preset', 'enhance_enabled', 'inline_tags_json'];
      for (const col of requiredSegmentCols) {
        if (!colNames.includes(col)) {
          results.d1.issues.push(`Column 'segments.${col}' missing - run migration 011`);
        }
      }
    } catch (e) {
      results.d1.issues.push('Could not verify segment columns');
    }

    // Check scenarios table for tags_json
    try {
      const scenarioCols = await c.env.DB.prepare(`PRAGMA table_info(scenarios)`).all();
      const colNames = scenarioCols.results?.map((r: any) => r.name) || [];
      if (!colNames.includes('tags_json')) {
        results.d1.issues.push(`Column 'scenarios.tags_json' missing - run migration 011`);
      }
    } catch (e) {
      results.d1.issues.push('Could not verify scenario columns');
    }

    results.d1.status = results.d1.issues.length === 0 ? 'PASS' : 'FAIL';

    // ==================== R2 VERIFICATION ====================
    const testPaths = [
      { prefix: 'videos/', type: 'Videos' },
      { prefix: 'frames/', type: 'Frames' },
      { prefix: 'audio/', type: 'Audio' },
      { prefix: 'covers/', type: 'Covers' },
      { prefix: 'thumbnails/', type: 'Thumbnails' },
      { prefix: 'storyboard/', type: 'Storyboards' },
    ];

    for (const path of testPaths) {
      try {
        const list = await c.env.MEDIA_BUCKET.list({ prefix: path.prefix, limit: 1 });
        results.r2.paths.push({ 
          prefix: path.prefix, 
          type: path.type, 
          accessible: true, 
          hasObjects: list.objects.length > 0 
        });
      } catch (e) {
        results.r2.paths.push({ prefix: path.prefix, type: path.type, accessible: false });
        results.r2.issues.push(`R2 path '${path.prefix}' not accessible`);
      }
    }

    results.r2.status = results.r2.issues.length === 0 ? 'PASS' : 'FAIL';

    // ==================== KV VERIFICATION ====================
    const kvKeys = [
      'video_models:list',
      'video_models:recommended',
      'upscalers:list',
      'platforms:list',
    ];

    for (const key of kvKeys) {
      try {
        const value = await c.env.CACHE.get(key);
        results.kv.keys.push({ key, exists: value !== null, size: value?.length || 0 });
        if (!value) {
          results.kv.issues.push(`KV key '${key}' not initialized`);
        }
      } catch (e) {
        results.kv.keys.push({ key, exists: false, error: true });
        results.kv.issues.push(`KV key '${key}' error`);
      }
    }

    results.kv.status = results.kv.issues.length === 0 ? 'PASS' : 'NEEDS_INIT';

    // ==================== CONNECTION VERIFICATION ====================
    // Verify Scenario → Timeline connection
    try {
      const orphanedTimelines = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM timelines 
        WHERE scenario_id IS NOT NULL 
        AND scenario_id NOT IN (SELECT id FROM scenarios)
      `).first();
      if (orphanedTimelines && (orphanedTimelines as any).count > 0) {
        results.connections.issues.push(`${(orphanedTimelines as any).count} timelines with broken scenario references`);
      }
    } catch (e) {
      results.connections.issues.push('Could not verify timeline-scenario connections');
    }

    // Verify Segment → Timeline connection
    try {
      const orphanedSegments = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM segments 
        WHERE timeline_id NOT IN (SELECT id FROM timelines)
      `).first();
      if (orphanedSegments && (orphanedSegments as any).count > 0) {
        results.connections.issues.push(`${(orphanedSegments as any).count} orphaned segments`);
      }
    } catch (e) {
      // Segments table might not exist yet
    }

    results.connections.status = results.connections.issues.length === 0 ? 'PASS' : 'WARN';

    // ==================== OVERALL STATUS ====================
    const allPass = results.d1.status === 'PASS' && 
                   results.r2.status === 'PASS' && 
                   (results.kv.status === 'PASS' || results.kv.status === 'NEEDS_INIT');
    results.overall = allPass ? 'PASS' : 'FAIL';

    return c.json({
      success: true,
      verification: results,
      summary: {
        d1: `${results.d1.tables.filter(t => t.exists).length}/${requiredTables.length} tables OK`,
        r2: `${results.r2.paths.filter(p => p.accessible).length}/${testPaths.length} paths OK`,
        kv: `${results.kv.keys.filter(k => k.exists).length}/${kvKeys.length} keys OK`,
        connections: results.connections.status,
      },
      recommendations: [
        ...(results.d1.issues.length > 0 ? ['Run migration 011_scenario_timeline_completion.sql'] : []),
        ...(results.kv.status === 'NEEDS_INIT' ? ['Call POST /admin/init-kv-cache to initialize KV'] : []),
      ],
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
      verification: results,
    }, 500);
  }
});

// POST /admin/init-kv-cache - Initialize all KV caches
adminRoutes.post('/init-kv-cache', async (c) => {
  try {
    const result = await initializeKVCache(c.env.CACHE);
    
    return c.json({
      success: result.success,
      data: {
        initialized: result.initialized,
        errors: result.errors,
        counts: {
          video_models: VIDEO_MODELS.length,
          upscalers: UPSCALER_MODELS.length,
          platforms: PLATFORM_PROFILES.length,
        },
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /admin/run-migration - Run a specific migration
adminRoutes.post('/run-migration/:name', async (c) => {
  try {
    const migrationName = c.req.param('name');
    
    // Security: Only allow known migrations
    const allowedMigrations = [
      '011_scenario_timeline_completion',
    ];
    
    if (!allowedMigrations.includes(migrationName)) {
      return c.json({ success: false, error: 'Migration not allowed' }, 400);
    }
    
    // Read and execute migration (in production, this would read from file)
    // For now, return instructions
    return c.json({
      success: true,
      message: `Migration ${migrationName} is ready`,
      instructions: [
        `Run: wrangler d1 execute pixelperfect-db --file=./src/db/migrations/${migrationName}.sql`,
        'Or execute via Cloudflare Dashboard > D1 > Console',
      ],
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /admin/data-flow-map - Get visual map of data flow
adminRoutes.get('/data-flow-map', async (c) => {
  return c.json({
    success: true,
    data: {
      scenario_mode: {
        input: ['scenario_text', 'target_model_id', 'target_duration', 'storyboard_images', 'inline_tags'],
        d1_writes: ['scenarios', 'scene_breakdowns', 'storyboard_images'],
        r2_writes: ['storyboard/{userId}/{scenarioId}/*.png'],
        kv_reads: ['video_models:list', 'video_models:recommended'],
        output: ['improved_scenario', 'tags_json', 'breakdown'],
      },
      generate_plan: {
        input: ['scenario_id', 'inline_tags', 'target_model_id', 'options'],
        d1_writes: ['timelines', 'segments', 'generation_plans'],
        d1_reads: ['scenarios', 'scene_breakdowns'],
        kv_reads: ['video_models:list'],
        output: ['timeline', 'segments[]', 'generation_plan'],
      },
      segment_generation: {
        input: ['segment_id', 'prompt', 'model_id', 'first_frame'],
        d1_updates: ['segments.status', 'segments.video_url', 'segments.last_frame_url'],
        r2_writes: [
          'videos/raw/{userId}/{timelineId}/{segmentId}.mp4',
          'frames/{userId}/{timelineId}/{segmentId}/last.png',
          'thumbnails/{userId}/{timelineId}/{segmentId}.jpg',
        ],
        kv_reads: ['video_models:{modelId}'],
      },
      enhancement: {
        input: ['segment_id', 'enhance_model'],
        d1_updates: ['segments.enhance_status', 'segments.enhanced_video_url', 'enhancement_jobs'],
        r2_writes: ['videos/enhanced/{userId}/{timelineId}/{segmentId}.mp4'],
        kv_reads: ['upscalers:list'],
      },
      audio_track: {
        input: ['timeline_id', 'audio_file', 'settings'],
        d1_writes: ['audio_tracks'],
        r2_writes: [
          'audio/{userId}/{timelineId}/original.{format}',
          'audio/{userId}/{timelineId}/processed.mp3',
        ],
      },
      cover_generation: {
        input: ['timeline_id', 'platform', 'style'],
        d1_writes: ['covers'],
        r2_writes: ['covers/{userId}/{timelineId}/{platform}.png'],
        kv_reads: ['platform:{platformId}'],
      },
      publishing: {
        input: ['project_id', 'platform', 'video_url', 'metadata'],
        d1_writes: ['publish_jobs', 'published_items'],
        d1_reads: ['timelines', 'covers', 'audio_tracks'],
        kv_reads: ['platform:{platformId}'],
      },
      gallery: {
        d1_reads: ['video_projects', 'timelines', 'published_items', 'covers'],
        r2_reads: ['thumbnails/*', 'covers/*', 'videos/final/*'],
      },
    },
  });
});
