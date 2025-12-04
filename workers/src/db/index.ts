/**
 * Database Access Layer
 * Unified interface for D1, R2, and KV operations
 */

import { Env } from '../types';

// ==================== TYPE DEFINITIONS ====================

export interface DBResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    changes?: number;
    last_row_id?: number;
    duration?: number;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ==================== D1 DATABASE OPERATIONS ====================

export class Database {
  constructor(private db: D1Database) {}

  /**
   * Execute a query and return all results
   */
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<DBResult<T[]>> {
    try {
      const start = Date.now();
      const stmt = this.db.prepare(sql).bind(...params);
      const result = await stmt.all<T>();
      
      return {
        success: true,
        data: result.results,
        meta: {
          duration: Date.now() - start,
        },
      };
    } catch (error: any) {
      console.error('D1 Query Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute a query and return first result
   */
  async queryFirst<T = unknown>(sql: string, params: unknown[] = []): Promise<DBResult<T | null>> {
    try {
      const start = Date.now();
      const stmt = this.db.prepare(sql).bind(...params);
      const result = await stmt.first<T>();
      
      return {
        success: true,
        data: result,
        meta: {
          duration: Date.now() - start,
        },
      };
    } catch (error: any) {
      console.error('D1 QueryFirst Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute a mutation (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: unknown[] = []): Promise<DBResult<void>> {
    try {
      const start = Date.now();
      const stmt = this.db.prepare(sql).bind(...params);
      const result = await stmt.run();
      
      return {
        success: result.success,
        meta: {
          changes: result.meta?.changes,
          last_row_id: result.meta?.last_row_id,
          duration: Date.now() - start,
        },
      };
    } catch (error: any) {
      console.error('D1 Execute Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(statements: { sql: string; params: unknown[] }[]): Promise<DBResult<void>> {
    try {
      const start = Date.now();
      const stmts = statements.map(s => this.db.prepare(s.sql).bind(...s.params));
      await this.db.batch(stmts);
      
      return {
        success: true,
        meta: {
          duration: Date.now() - start,
        },
      };
    } catch (error: any) {
      console.error('D1 Batch Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ==================== R2 STORAGE OPERATIONS ====================

export class Storage {
  constructor(private bucket: R2Bucket) {}

  /**
   * Upload a file to R2
   */
  async upload(
    key: string,
    data: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<DBResult<{ key: string; url: string }>> {
    try {
      const httpMetadata: R2HTTPMetadata = {};
      if (options?.contentType) {
        httpMetadata.contentType = options.contentType;
      }

      await this.bucket.put(key, data, {
        httpMetadata,
        customMetadata: options?.metadata,
      });

      return {
        success: true,
        data: {
          key,
          url: this.getPublicUrl(key),
        },
      };
    } catch (error: any) {
      console.error('R2 Upload Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Download a file from R2
   */
  async download(key: string): Promise<DBResult<{
    data: ArrayBuffer;
    contentType?: string;
    metadata?: Record<string, string>;
  }>> {
    try {
      const object = await this.bucket.get(key);
      
      if (!object) {
        return {
          success: false,
          error: 'Object not found',
        };
      }

      const data = await object.arrayBuffer();
      
      return {
        success: true,
        data: {
          data,
          contentType: object.httpMetadata?.contentType,
          metadata: object.customMetadata,
        },
      };
    } catch (error: any) {
      console.error('R2 Download Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<DBResult<void>> {
    try {
      await this.bucket.delete(key);
      return { success: true };
    } catch (error: any) {
      console.error('R2 Delete Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List files with prefix
   */
  async list(
    prefix: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<DBResult<{ keys: string[]; cursor?: string; truncated: boolean }>> {
    try {
      const result = await this.bucket.list({
        prefix,
        limit: options?.limit || 100,
        cursor: options?.cursor,
      });

      return {
        success: true,
        data: {
          keys: result.objects.map(obj => obj.key),
          cursor: result.truncated ? result.cursor : undefined,
          truncated: result.truncated,
        },
      };
    } catch (error: any) {
      console.error('R2 List Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get public URL for an object
   */
  getPublicUrl(key: string): string {
    // This would be configured based on your R2 public bucket settings
    return `https://media.pixelperfect.ai/${key}`;
  }

  /**
   * Generate storage key for different asset types
   */
  static generateKey(
    type: 'videos' | 'segments' | 'frames' | 'covers' | 'thumbnails',
    userId: string,
    id: string,
    filename: string
  ): string {
    return `${type}/${userId}/${id}/${filename}`;
  }
}

// ==================== KV CACHE OPERATIONS ====================

export class Cache {
  constructor(private kv: KVNamespace) {}

  /**
   * Get a value from KV
   */
  async get<T = unknown>(key: string): Promise<DBResult<T | null>> {
    try {
      const value = await this.kv.get(key, 'json');
      return {
        success: true,
        data: value as T | null,
      };
    } catch (error: any) {
      console.error('KV Get Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get a string value from KV
   */
  async getString(key: string): Promise<DBResult<string | null>> {
    try {
      const value = await this.kv.get(key, 'text');
      return {
        success: true,
        data: value,
      };
    } catch (error: any) {
      console.error('KV GetString Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set a value in KV
   */
  async set<T = unknown>(
    key: string,
    value: T,
    options?: { expirationTtl?: number; expiration?: number }
  ): Promise<DBResult<void>> {
    try {
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: options?.expirationTtl,
        expiration: options?.expiration,
      });
      return { success: true };
    } catch (error: any) {
      console.error('KV Set Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set a string value in KV
   */
  async setString(
    key: string,
    value: string,
    options?: { expirationTtl?: number; expiration?: number }
  ): Promise<DBResult<void>> {
    try {
      await this.kv.put(key, value, {
        expirationTtl: options?.expirationTtl,
        expiration: options?.expiration,
      });
      return { success: true };
    } catch (error: any) {
      console.error('KV SetString Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a value from KV
   */
  async delete(key: string): Promise<DBResult<void>> {
    try {
      await this.kv.delete(key);
      return { success: true };
    } catch (error: any) {
      console.error('KV Delete Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List keys with prefix
   */
  async list(prefix: string, limit?: number): Promise<DBResult<string[]>> {
    try {
      const result = await this.kv.list({ prefix, limit });
      return {
        success: true,
        data: result.keys.map(k => k.name),
      };
    } catch (error: any) {
      console.error('KV List Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==================== COMMON CACHE PATTERNS ====================

  /**
   * Get or set with callback
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttl: number = 3600
  ): Promise<DBResult<T>> {
    const cached = await this.get<T>(key);
    if (cached.success && cached.data !== null) {
      return { success: true, data: cached.data };
    }

    try {
      const value = await callback();
      await this.set(key, value, { expirationTtl: ttl });
      return { success: true, data: value };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cache model capabilities
   */
  async cacheModelCapabilities(modelId: string, capabilities: unknown): Promise<void> {
    await this.set(`model_caps:${modelId}`, capabilities, { expirationTtl: 86400 }); // 24h
  }

  /**
   * Get cached model capabilities
   */
  async getModelCapabilities<T>(modelId: string): Promise<T | null> {
    const result = await this.get<T>(`model_caps:${modelId}`);
    return result.data ?? null;
  }

  /**
   * Cache session state
   */
  async setSessionState(userId: string, state: unknown): Promise<void> {
    await this.set(`session:${userId}`, state, { expirationTtl: 3600 }); // 1h
  }

  /**
   * Get session state
   */
  async getSessionState<T>(userId: string): Promise<T | null> {
    const result = await this.get<T>(`session:${userId}`);
    return result.data ?? null;
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current timestamp in ISO format
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Parse JSON safely
 */
export function parseJSON<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * Create database instances from environment
 */
export function createDBClients(env: Env & { KV?: KVNamespace }): {
  db: Database;
  storage: Storage;
  cache?: Cache;
} {
  return {
    db: new Database(env.DB),
    storage: new Storage(env.MEDIA_BUCKET),
    cache: env.KV ? new Cache(env.KV) : undefined,
  };
}

export default {
  Database,
  Storage,
  Cache,
  generateId,
  now,
  parseJSON,
  createDBClients,
};
