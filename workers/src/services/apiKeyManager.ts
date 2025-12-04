/**
 * API Key Manager Service
 * Centralized API key storage and retrieval from KV, env, and D1
 */

// Provider configuration
export const API_PROVIDERS = {
  openai: { name: 'OpenAI', envKey: 'OPENAI_API_KEY', kvKey: 'api_key_openai' },
  anthropic: { name: 'Anthropic', envKey: 'ANTHROPIC_API_KEY', kvKey: 'api_key_anthropic' },
  google: { name: 'Google AI', envKey: 'GOOGLE_API_KEY', kvKey: 'api_key_google' },
  replicate: { name: 'Replicate', envKey: 'REPLICATE_API_KEY', kvKey: 'api_key_replicate' },
  stability: { name: 'Stability AI', envKey: 'STABILITY_API_KEY', kvKey: 'api_key_stability' },
  suno: { name: 'Suno', envKey: 'SUNO_API_KEY', kvKey: 'api_key_suno' },
  kling: { name: 'Kling', envKey: 'KLING_API_KEY', kvKey: 'api_key_kling' },
  meshy: { name: 'Meshy', envKey: 'MESHY_API_KEY', kvKey: 'api_key_meshy' },
  elevenlabs: { name: 'ElevenLabs', envKey: 'ELEVENLABS_API_KEY', kvKey: 'api_key_elevenlabs' },
  runway: { name: 'Runway', envKey: 'RUNWAY_API_KEY', kvKey: 'api_key_runway' },
  luma: { name: 'Luma AI', envKey: 'LUMA_API_KEY', kvKey: 'api_key_luma' },
  minimax: { name: 'MiniMax', envKey: 'MINIMAX_API_KEY', kvKey: 'api_key_minimax' },
  pixverse: { name: 'PixVerse', envKey: 'PIXVERSE_API_KEY', kvKey: 'api_key_pixverse' },
  midjourney: { name: 'Midjourney', envKey: 'MIDJOURNEY_API_KEY', kvKey: 'api_key_midjourney' },
  mistral: { name: 'Mistral', envKey: 'MISTRAL_API_KEY', kvKey: 'api_key_mistral' },
  deepseek: { name: 'DeepSeek', envKey: 'DEEPSEEK_API_KEY', kvKey: 'api_key_deepseek' },
  bfl: { name: 'BFL (Flux)', envKey: 'BFL_API_KEY', kvKey: 'api_key_bfl' },
  ideogram: { name: 'Ideogram', envKey: 'IDEOGRAM_API_KEY', kvKey: 'api_key_ideogram' },
  udio: { name: 'Udio', envKey: 'UDIO_API_KEY', kvKey: 'api_key_udio' },
} as const;

export type Provider = keyof typeof API_PROVIDERS;

interface Env {
  CACHE: KVNamespace;
  DB: D1Database;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  REPLICATE_API_KEY?: string;
  STABILITY_API_KEY?: string;
  SUNO_API_KEY?: string;
  KLING_API_KEY?: string;
  MESHY_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  RUNWAY_API_KEY?: string;
  LUMA_API_KEY?: string;
  MINIMAX_API_KEY?: string;
  PIXVERSE_API_KEY?: string;
  MIDJOURNEY_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  BFL_API_KEY?: string;
  IDEOGRAM_API_KEY?: string;
  UDIO_API_KEY?: string;
  [key: string]: any;
}

/**
 * Get API key for a provider
 * Priority: 1) KV cache (user-set), 2) Environment variable/secret, 3) D1 database
 */
export async function getApiKey(
  env: Env,
  provider: Provider
): Promise<string | null> {
  const config = API_PROVIDERS[provider];
  if (!config) {
    console.error(`Unknown provider: ${provider}`);
    return null;
  }

  // 1. Check KV cache first (user-provided keys from Admin panel)
  try {
    const kvKey = await env.CACHE.get(config.kvKey);
    if (kvKey && kvKey.trim()) {
      console.log(`Got ${provider} key from KV cache`);
      return kvKey.trim();
    }
  } catch (e) {
    console.error(`Failed to get ${provider} key from KV:`, e);
  }

  // 2. Check environment variable/secret
  const envKey = env[config.envKey];
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    console.log(`Got ${provider} key from env`);
    return envKey.trim();
  }

  // 3. Check D1 database (legacy storage)
  try {
    const result = await env.DB.prepare(
      `SELECT value FROM admin_settings WHERE key = ?`
    ).bind(`${provider}_api_key`).first<{ value: string }>();
    
    if (result?.value && result.value.trim()) {
      console.log(`Got ${provider} key from D1`);
      return result.value.trim();
    }
  } catch (e) {
    console.error(`Failed to get ${provider} key from D1:`, e);
  }

  return null;
}

/**
 * Save API key for a provider to KV cache
 */
export async function saveApiKey(
  env: Env,
  provider: Provider,
  apiKey: string,
  isBackup: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const config = API_PROVIDERS[provider];
  if (!config) {
    return { success: false, error: `Unknown provider: ${provider}` };
  }

  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'API key is required' };
  }

  try {
    const kvKeyName = isBackup ? `${config.kvKey}_backup` : config.kvKey;
    await env.CACHE.put(kvKeyName, apiKey.trim());
    
    // Also save to D1 for persistence
    await env.DB.prepare(`
      INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `).bind(`${provider}_api_key`, apiKey.trim()).run();
    
    return { success: true };
  } catch (e) {
    console.error(`Failed to save ${provider} key:`, e);
    return { success: false, error: 'Failed to save API key' };
  }
}

/**
 * Delete API key for a provider
 */
export async function deleteApiKey(
  env: Env,
  provider: Provider,
  isBackup: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const config = API_PROVIDERS[provider];
  if (!config) {
    return { success: false, error: `Unknown provider: ${provider}` };
  }

  try {
    const kvKeyName = isBackup ? `${config.kvKey}_backup` : config.kvKey;
    await env.CACHE.delete(kvKeyName);
    
    // Also delete from D1
    if (!isBackup) {
      await env.DB.prepare(`
        DELETE FROM admin_settings WHERE key = ?
      `).bind(`${provider}_api_key`).run();
    }
    
    return { success: true };
  } catch (e) {
    console.error(`Failed to delete ${provider} key:`, e);
    return { success: false, error: 'Failed to delete API key' };
  }
}

/**
 * Check if provider has a valid API key configured
 */
export async function hasApiKey(env: Env, provider: Provider): Promise<boolean> {
  const key = await getApiKey(env, provider);
  return !!key;
}

/**
 * Mask an API key for display
 */
export function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
}

/**
 * Get all API keys status
 */
export async function getAllApiKeysStatus(env: Env): Promise<Record<Provider, {
  name: string;
  configured: boolean;
  source: 'kv' | 'env' | 'db' | 'none';
  maskedKey: string | null;
}>> {
  const status: Record<string, any> = {};
  
  for (const [provider, config] of Object.entries(API_PROVIDERS)) {
    let source: 'kv' | 'env' | 'db' | 'none' = 'none';
    let key: string | null = null;
    
    // Check KV
    try {
      const kvKey = await env.CACHE.get(config.kvKey);
      if (kvKey && kvKey.trim()) {
        key = kvKey.trim();
        source = 'kv';
      }
    } catch (e) {}
    
    // Check env if no KV key
    if (!key) {
      const envKey = env[config.envKey];
      if (envKey && typeof envKey === 'string' && envKey.trim()) {
        key = envKey.trim();
        source = 'env';
      }
    }
    
    // Check DB if no env key
    if (!key) {
      try {
        const result = await env.DB.prepare(
          `SELECT value FROM admin_settings WHERE key = ?`
        ).bind(`${provider}_api_key`).first<{ value: string }>();
        if (result?.value && result.value.trim()) {
          key = result.value.trim();
          source = 'db';
        }
      } catch (e) {}
    }
    
    status[provider] = {
      name: config.name,
      configured: !!key,
      source,
      maskedKey: maskApiKey(key),
    };
  }
  
  return status as any;
}

export default {
  API_PROVIDERS,
  getApiKey,
  saveApiKey,
  deleteApiKey,
  hasApiKey,
  maskApiKey,
  getAllApiKeysStatus,
};
