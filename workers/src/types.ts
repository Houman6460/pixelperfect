// Cloudflare Workers Environment Types

export interface Env {
  // D1 Database
  DB: D1Database;
  
  // R2 Storage
  MEDIA_BUCKET: R2Bucket;
  
  // KV Namespaces
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  
  // Environment variables
  ENVIRONMENT: string;
  CORS_ORIGIN: string;
  
  // Secrets (set via wrangler secret put)
  JWT_SECRET: string;
  // AI Provider API Keys
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  REPLICATE_API_KEY?: string;
  STABILITY_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  SUNO_API_KEY?: string;
  KLING_API_KEY?: string;
  MESHY_API_KEY?: string;
  // Payment
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  role: 'user' | 'admin';
  tokens: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: number;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

// Subscription types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  type: 'individual' | 'collection' | 'advanced' | 'tier';
  base_price: number;
  tokens_per_month: number;
  studios: string; // JSON array
  features: string; // JSON array
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface BillingPeriod {
  id: string;
  period: string;
  label: string;
  months: number;
  discount_percent: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  billing_period: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: number;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

// Gallery types
export interface GalleryItem {
  id: string;
  user_id: string;
  type: 'image' | 'video' | 'audio' | '3d';
  title: string | null;
  description: string | null;
  file_key: string;
  thumbnail_key: string | null;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  metadata: string | null; // JSON
  prompt: string | null;
  model: string | null;
  is_public: number;
  created_at: string;
  updated_at: string;
}

// Generation job types
export interface GenerationJob {
  id: string;
  user_id: string;
  type: 'image' | 'video' | 'audio' | 'text' | '3d';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input_data: string; // JSON
  output_data: string | null; // JSON
  error_message: string | null;
  tokens_used: number;
  provider: string | null;
  model: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Token and Transaction types
export interface TokenUsageLog {
  id: string;
  user_id: string;
  operation: string;
  tokens_used: number;
  job_id: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'subscription' | 'token_purchase' | 'refund' | 'usage';
  amount: number | null;
  tokens: number | null;
  description: string | null;
  stripe_payment_id: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

// API key types
export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string | null; // JSON array
  last_used_at: string | null;
  expires_at: string | null;
  is_active: number;
  created_at: string;
}

// Admin types
export interface TokenRule {
  id: string;
  operation: string;
  tokens_cost: number;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// Token Economics types
export interface ProviderCost {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  operation_type: string;
  cost_per_unit: number;
  cost_unit: string;
  avg_units_per_request: number;
  currency: string;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface TokenPricing {
  id: string;
  operation: string;
  display_name: string;
  description: string | null;
  base_provider_cost: number;
  tokens_charged: number;
  markup_percent: number;
  min_tokens: number;
  max_tokens: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface PlanTokenConfig {
  id: string;
  plan_id: string;
  tokens_monthly: number;
  tokens_bonus: number;
  rollover_enabled: number;
  rollover_max_months: number;
  rollover_cap_percent: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderUsageLog {
  id: string;
  provider: string;
  model: string;
  operation_type: string;
  user_id: string | null;
  job_id: string | null;
  units_consumed: number;
  cost_usd: number;
  request_metadata: string | null;
  response_time_ms: number | null;
  success: number;
  error_message: string | null;
  created_at: string;
}

export interface AIModelConfig {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  type: 'image' | 'video' | 'audio' | 'text' | '3d';
  config: string | null; // JSON
  tokens_per_use: number;
  is_active: number;
  created_at: string;
}

// JWT payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// R2 Upload types
export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}
