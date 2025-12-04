import axios from "axios";

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // Check for explicit env variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Production: use Cloudflare Workers API
  if (typeof window !== 'undefined' && window.location.hostname.includes('pages.dev')) {
    return 'https://pixelperfect-api.houman-ghavamzadeh.workers.dev/api';
  }
  
  // Development: use local proxy
  return '/api';
};

const API_BASE = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data: { name: string }) => api.put("/auth/profile", data),
  getSubscriptions: () => api.get("/auth/subscriptions"),
  upgradeSubscription: (subscriptionId: string) =>
    api.post("/auth/subscription/upgrade", { subscriptionId }),
  purchaseTokens: (amount: number) =>
    api.post("/auth/tokens/purchase", { amount }),
  getTransactions: () => api.get("/auth/transactions"),
};

// User API
export const userApi = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data: { name?: string; avatar_url?: string }) => api.put("/users/profile", data),
  getTokens: () => api.get("/users/tokens"),
  getHistory: (type?: string, limit?: number) => api.get("/users/history", { params: { type, limit } }),
  
  // Auto-refill
  getAutoRefill: () => api.get("/users/auto-refill"),
  updateAutoRefill: (data: { 
    enabled?: boolean; 
    threshold?: number; 
    package_id?: string; 
    payment_method?: string;
    max_refills_per_month?: number;
  }) => api.put("/users/auto-refill", data),
  getAutoRefillHistory: () => api.get("/users/auto-refill/history"),
  triggerAutoRefill: () => api.post("/users/auto-refill/trigger"),
};

// Admin API
export const adminApi = {
  getAnalytics: () => api.get("/admin/analytics"),
  getUsers: () => api.get("/admin/users"),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  addTokensToUser: (id: string, tokens: number, reason: string) =>
    api.post(`/admin/users/${id}/tokens`, { tokens, reason }),
  toggleUserStatus: (id: string) => api.post(`/admin/users/${id}/toggle-status`),
  getSubscriptions: () => api.get("/admin/subscriptions"),
  updateSubscription: (id: string, data: any) =>
    api.put(`/admin/subscriptions/${id}`, data),
  getTransactions: () => api.get("/admin/transactions"),
  getSettings: () => api.get("/admin/settings"),
  updateSettings: (data: any) => api.put("/admin/settings", data),
  getTokenRules: () => api.get("/admin/token-rules"),
  updateTokenRule: (id: string, data: any) =>
    api.put(`/admin/token-rules/${id}`, data),
  // Plans
  getPlans: () => api.get("/admin/plans"),
  createPlan: (data: {
    name: string;
    description?: string;
    type: 'individual' | 'collection' | 'full';
    base_price: number;
    tokens_per_month: number;
    studios?: string[];
    features?: string[];
    billing_periods?: { monthly: number; quarterly: number; biannual: number; annual: number };
    is_active?: boolean;
  }) => api.post("/admin/plans", data),
  updatePlan: (id: string, data: any) => api.put(`/admin/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/admin/plans/${id}`),
  // AI Settings
  getAISettings: () => api.get("/admin/ai-settings"),
  updateAISettings: (data: any) => api.put("/admin/ai-settings", data),
  // Model API Settings
  getModelApiSettings: () => api.get("/admin/model-api-settings"),
  toggleModelApiSetting: (modelId: string) => api.post(`/admin/model-api-settings/${modelId}/toggle`),
  // API Key Management
  getApiKeys: () => api.get("/admin/api-keys"),
  setApiKey: (provider: string, apiKey: string, isBackup?: boolean) => 
    api.put(`/admin/api-keys/${provider}`, { apiKey, isBackup }),
  deleteApiKey: (provider: string, isBackup?: boolean) => 
    api.delete(`/admin/api-keys/${provider}`, { params: { isBackup } }),
  testApiKey: (provider: string, apiKey?: string) => 
    api.post(`/admin/api-keys/${provider}/test`, { apiKey }),
  updateFallbackConfig: (config: {
    enabled?: boolean;
    primaryPreference?: 'direct' | 'replicate';
    autoSwitch?: boolean;
    retryCount?: number;
  }) => api.put("/admin/api-keys/fallback", config),
  // Payment Settings
  getPaymentMethods: () => api.get("/admin/payment-methods"),
  togglePaymentMethod: (id: string) => api.post(`/admin/payment-methods/${id}/toggle`),
  updatePaymentMethod: (id: string, data: any) => api.put(`/admin/payment-methods/${id}`, data),
  getTokenPackages: () => api.get("/admin/token-packages"),
  createTokenPackage: (data: any) => api.post("/admin/token-packages", data),
  updateTokenPackage: (id: string, data: any) => api.put(`/admin/token-packages/${id}`, data),
  deleteTokenPackage: (id: string) => api.delete(`/admin/token-packages/${id}`),
  getPaymentStats: () => api.get("/admin/payment-stats"),
  // Payment Provider Config
  getPaymentConfig: () => api.get("/admin/payment-config"),
  getAllPaymentConfig: () => api.get("/admin/payment-config/all"),
  saveStripeConfig: (data: { secretKey?: string; webhookSecret?: string }) => 
    api.post("/admin/payment-config/stripe", data),
  deleteStripeConfig: () => api.delete("/admin/payment-config/stripe"),
  savePayPalConfig: (data: { clientId?: string; clientSecret?: string; sandbox?: boolean }) => 
    api.post("/admin/payment-config/paypal", data),
  saveSwishConfig: (data: { phoneNumber?: string; payeeName?: string; enabled?: boolean }) => 
    api.post("/admin/payment-config/swish", data),
  
  // Token Economics
  getTokenEconomics: () => api.get("/admin/token-economics"),
  updateTokenPricing: (id: string, data: { tokens_charged?: number; markup_percent?: number; base_provider_cost?: number; is_active?: number }) =>
    api.put(`/admin/token-pricing/${id}`, data),
  createTokenPricing: (data: { operation: string; display_name: string; description?: string; base_provider_cost?: number; tokens_charged: number; markup_percent?: number }) =>
    api.post("/admin/token-pricing", data),
  updateProviderCost: (id: string, data: { cost_per_unit?: number; cost_unit?: string; avg_units_per_request?: number; notes?: string; is_active?: number }) =>
    api.put(`/admin/provider-costs/${id}`, data),
  createProviderCost: (data: { provider: string; model_id: string; display_name: string; operation_type: string; cost_per_unit: number; cost_unit?: string; notes?: string }) =>
    api.post("/admin/provider-costs", data),
  updatePlanTokenConfig: (planId: string, data: { tokens_monthly?: number; tokens_bonus?: number; rollover_enabled?: number; rollover_max_months?: number; rollover_cap_percent?: number }) =>
    api.put(`/admin/plan-token-config/${planId}`, data),
  getUserTokenAnalytics: (userId: string) => api.get(`/admin/user-token-analytics/${userId}`),
  getUsersTokenSummary: (period?: string) => api.get("/admin/users-token-summary", { params: { period } }),
  updateAdminSetting: (key: string, value: string) => api.put(`/admin/settings/${key}`, { value }),
};

// Enhancement API
export const enhanceApi = {
  getStatus: () => api.get("/status"),
  enhance: (formData: FormData) =>
    api.post("/enhance", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  reimagine: (formData: FormData) =>
    api.post("/reimagine", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// Subscriptions API (public + authenticated endpoints)
export const subscriptionApi = {
  // Public - get all available plans
  getPlans: () => api.get("/subscriptions/plans"),
  
  // Authenticated - get user's subscriptions
  getMySubscriptions: () => api.get("/subscriptions/my-subscriptions"),
  
  // Authenticated - subscribe to a plan
  subscribe: (planId: string, billingPeriod: string) =>
    api.post("/subscriptions/subscribe", { planId, billingPeriod }),
  
  // Authenticated - cancel subscription
  cancelSubscription: (subscriptionId: string) =>
    api.post(`/subscriptions/cancel/${subscriptionId}`),
  
  // Authenticated - check access to studio
  checkAccess: (studio: string) => api.get(`/subscriptions/access/${studio}`),
};

// Gallery API
export const galleryApi = {
  getItems: (type?: string) => api.get("/gallery", { params: { type } }),
  getItem: (id: string) => api.get(`/gallery/${id}`),
  uploadItem: (formData: FormData) =>
    api.post("/gallery/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteItem: (id: string) => api.delete(`/gallery/${id}`),
};

// Generation API
export const generateApi = {
  image: (data: { prompt: string; model?: string; size?: string }) =>
    api.post("/generate/image", data),
  text: (data: { messages: Array<{ role: string; content: string }>; model?: string }) =>
    api.post("/generate/text", data),
  getJobStatus: (jobId: string) => api.get(`/generate/job/${jobId}`),
};

// Media API (R2 storage)
export const mediaApi = {
  getUploadUrl: (filename: string, contentType: string, type?: string) =>
    api.post("/media/upload-url", { filename, contentType, type }),
  listFiles: (type?: string) => api.get("/media/list", { params: { type } }),
  getUsage: () => api.get("/media/usage"),
  deleteFile: (key: string) => api.delete(`/media/file/${key}`),
};

// Video Timeline API (v1)
export const timelineApi = {
  // Timelines
  getTimelines: () => api.get("/v1/timelines"),
  getTimeline: (id: string) => api.get(`/v1/timelines/${id}`),
  createTimeline: (data: { name?: string; description?: string; target_resolution?: string; aspect_ratio?: string }) =>
    api.post("/v1/timelines", data),
  updateTimeline: (id: string, data: { name?: string; description?: string; target_resolution?: string; global_style?: string; aspect_ratio?: string }) =>
    api.put(`/v1/timelines/${id}`, data),
  deleteTimeline: (id: string) => api.delete(`/v1/timelines/${id}`),
  
  // Segments
  addSegment: (timelineId: string, data: any) => api.post(`/v1/timelines/${timelineId}/segments`, data),
  updateSegment: (timelineId: string, segmentId: string, data: any) => 
    api.put(`/v1/timelines/${timelineId}/segments/${segmentId}`, data),
  deleteSegment: (timelineId: string, segmentId: string) => 
    api.delete(`/v1/timelines/${timelineId}/segments/${segmentId}`),
  reorderSegments: (timelineId: string, order: string[]) => 
    api.patch(`/v1/timelines/${timelineId}/segments/reorder`, { order }),
  
  // Jobs
  createPreview: (timelineId: string, data?: { quality?: string; resolution?: string }) => 
    api.post(`/v1/timelines/${timelineId}/preview`, data || {}),
  createRender: (timelineId: string, data?: { quality?: string; resolution?: string }) => 
    api.post(`/v1/timelines/${timelineId}/render`, data || {}),
  getJob: (jobId: string) => api.get(`/v1/jobs/${jobId}`),
  getJobs: (timelineId?: string) => api.get("/v1/jobs", { params: { timeline_id: timelineId } }),
  
  // Models
  getModels: () => api.get("/v1/models"),
  getModel: (modelId: string) => api.get(`/v1/models/${modelId}`),
};

// Video Models API (v1)
export const videoModelsApi = {
  // Get all models with capabilities
  getAll: () => api.get("/v1/models"),
  getById: (id: string) => api.get(`/v1/models/${id}`),
  getByProvider: (provider: string) => api.get(`/v1/models/provider/${provider}`),
  
  // Sora & Veo
  getSora: () => api.get("/v1/models/sora"),
  getVeo: () => api.get("/v1/models/veo"),
  
  // Capabilities
  getTextToVideoModels: () => api.get("/v1/models/capabilities/text-to-video"),
  getModelsForSegment: (position: number) => api.get(`/v1/models/for-segment/${position}`),
  
  // Validation
  validate: (data: { model_id: string; mode?: string; aspect_ratio?: string; duration_sec?: number }) =>
    api.post("/v1/models/validate", data),
  recommend: (data: { mode?: string; aspect_ratio?: string; max_duration?: number; prefer_quality?: boolean }) =>
    api.post("/v1/models/recommend", data),
  
  // Cache
  refreshCache: () => api.post("/v1/models/cache/refresh"),
};

// Resolution & Aspect Ratio API (v1)
export const resolutionApi = {
  // Aspect ratios
  getAspects: () => api.get("/v1/resolution/aspects"),
  getResolutions: () => api.get("/v1/resolution/resolutions"),
  getDimensions: (resolution: string, aspect: string) => 
    api.get(`/v1/resolution/dimensions/${resolution}/${aspect.replace(':', 'x')}`),
  getAllCombinations: () => api.get("/v1/resolution/all-combinations"),
  
  // Platforms
  getPlatforms: () => api.get("/v1/resolution/platforms"),
  getPlatform: (platform: string) => api.get(`/v1/resolution/platforms/${platform}`),
  checkPlatformAspect: (platform: string, aspect: string) => 
    api.get(`/v1/resolution/platforms/${platform}/check/${aspect.replace(':', 'x')}`),
  getPlatformsForAspect: (aspect: string) => api.get(`/v1/resolution/for-aspect/${aspect.replace(':', 'x')}`),
  
  // Prompt helpers
  getPromptSuffix: (aspect: string) => api.get(`/v1/resolution/prompt-suffix/${aspect.replace(':', 'x')}`),
  
  // Timeline resolution
  getTimelineResolution: (timelineId: string) => api.get(`/v1/resolution/timeline/${timelineId}`),
  updateTimelineResolution: (timelineId: string, data: { target_resolution?: string; aspect_ratio?: string }) =>
    api.put(`/v1/resolution/timeline/${timelineId}`, data),
  suggestForPlatform: (timelineId: string, platform: string) =>
    api.post(`/v1/resolution/timeline/${timelineId}/suggest`, { platform }),
};

// Audio Track API (v1)
export const audioTrackApi = {
  // Formats
  getFormats: () => api.get("/v1/audio/formats"),
  
  // Track management
  getByTimeline: (timelineId: string) => api.get(`/v1/audio/${timelineId}`),
  upload: (timelineId: string, file: File, durationSec?: number) => {
    const formData = new FormData();
    formData.append("timeline_id", timelineId);
    formData.append("file", file);
    if (durationSec) formData.append("duration_sec", durationSec.toString());
    return api.post("/v1/audio/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  updateSettings: (audioId: string, data: {
    volume?: number;
    video_audio_volume?: number;
    mute_video_audio?: boolean;
    fade_in_sec?: number;
    fade_out_sec?: number;
    video_fade_in_sec?: number;
    video_fade_out_sec?: number;
    trim_to_video?: boolean;
    loop_if_shorter?: boolean;
    start_offset_sec?: number;
  }) => api.post(`/v1/audio/${audioId}/settings`, data),
  
  // Preview & Process
  preview: (timelineId: string) => api.post(`/v1/audio/${timelineId}/preview`),
  process: (timelineId: string, videoUrl: string) => 
    api.post(`/v1/audio/${timelineId}/process`, { videoUrl }),
  
  // Delete
  delete: (audioId: string) => api.delete(`/v1/audio/${audioId}`),
  deleteByTimeline: (timelineId: string) => api.delete(`/v1/audio/timeline/${timelineId}`),
};

// Video Enhancement / Upscaler API (v1)
export const videoEnhancementApi = {
  // Upscaler models
  getUpscalers: () => api.get("/v1/enhancement/upscalers"),
  getUpscaler: (id: string) => api.get(`/v1/enhancement/upscalers/${id}`),
  getUpscalersByProvider: (provider: string) => api.get(`/v1/enhancement/upscalers/provider/${provider}`),
  
  // Segment enhancement
  getSegmentStatus: (segmentId: string) => api.get(`/v1/enhancement/segment/${segmentId}`),
  enableSegment: (segmentId: string, modelId: string, scaleFactor?: number) =>
    api.post(`/v1/enhancement/segment/${segmentId}/enable`, { model_id: modelId, scale_factor: scaleFactor }),
  disableSegment: (segmentId: string) => api.post(`/v1/enhancement/segment/${segmentId}/disable`),
  queueSegment: (segmentId: string, data: { model_id?: string; scale_factor?: number; input_url: string }) =>
    api.post(`/v1/enhancement/segment/${segmentId}/queue`, data),
  
  // Timeline enhancement
  getTimelineStatus: (timelineId: string) => api.get(`/v1/enhancement/timeline/${timelineId}`),
  enhanceAll: (timelineId: string) => api.post(`/v1/enhancement/timeline/${timelineId}/enhance-all`),
  enableAll: (timelineId: string, modelId: string) =>
    api.post(`/v1/enhancement/timeline/${timelineId}/enable-all`, { model_id: modelId }),
  
  // Jobs
  getJob: (jobId: string) => api.get(`/v1/enhancement/jobs/${jobId}`),
  processJob: (jobId: string) => api.post(`/v1/enhancement/jobs/${jobId}/process`),
  getPendingJobs: (timelineId: string) => api.get(`/v1/enhancement/jobs/pending/${timelineId}`),
};

// Segment Generation API (v1)
export const segmentApi = {
  // Modes
  getModes: () => api.get("/v1/segments/modes"),
  
  // Generation
  generate: (data: {
    timeline_id: string;
    segment_id: string;
    mode: string;
    prompt: string;
    model_id?: string;
    duration_sec?: number;
    first_frame_url?: string;
    source_video_url?: string;
    negative_prompt?: string;
  }) => api.post("/v1/segments/generate", data),
  
  // Timeline generation
  generateTimeline: (timelineId: string, options?: {
    use_frame_chaining?: boolean;
    start_segment?: number;
    end_segment?: number;
  }) => api.post("/v1/segments/generate-timeline", { timeline_id: timelineId, ...options }),
  
  // Status
  getStatus: (segmentId: string) => api.get(`/v1/segments/${segmentId}/status`),
  
  // Frame chaining
  getLastFrame: (segmentId: string) => api.get(`/v1/segments/${segmentId}/last-frame`),
};

// Scenario Assistant API (v1)
export const scenarioApi = {
  // Models
  getModels: () => api.get("/v1/scenario/models"),
  
  // Parse
  parse: (scenarioText: string, language?: string) =>
    api.post("/v1/scenario/parse", { scenario_text: scenarioText, language }),
  
  // Improve
  improve: (scenarioText: string, options?: { target_duration_sec?: number; target_model_id?: string }) =>
    api.post("/v1/scenario/improve", { scenario_text: scenarioText, ...options }),
  
  // Generate plan
  generatePlan: (scenarioText: string, options?: {
    target_duration_sec?: number;
    target_model_id?: string;
    timeline_id?: string;
  }) => api.post("/v1/scenario/generate-plan", { scenario_text: scenarioText, ...options }),
  
  // Apply plan
  applyPlan: (planId: string, timelineId: string) =>
    api.post("/v1/scenario/apply-plan", { plan_id: planId, timeline_id: timelineId }),
};

// Prompt Assistant API (v1)
export const promptAssistantApi = {
  // Improve prompt
  improve: (data: { model_id: string; scene_prompt: string; tone?: string; language?: string }) =>
    api.post("/v1/prompt/improve", data),
  
  // Get model capabilities
  getModelCapabilities: (modelId: string) => api.get(`/v1/prompt/model/${modelId}`),
};

// Cover Generation API (v1)
export const coverApi = {
  // Templates
  getChannelTemplates: () => api.get("/v1/covers/templates"),
  
  // Generate
  generate: (data: {
    timeline_id: string;
    template_id?: string;
    title?: string;
    style?: string;
    platform?: string;
  }) => api.post("/v1/covers/generate", data),
  
  // Get cover
  getCover: (timelineId: string) => api.get(`/v1/covers/${timelineId}`),
  
  // Variants
  generateVariants: (timelineId: string, count?: number) =>
    api.post(`/v1/covers/${timelineId}/variants`, { count }),
};

// Projects API (v1)
export const projectsApi = {
  // Projects
  getAll: () => api.get("/v1/projects"),
  getById: (id: string) => api.get(`/v1/projects/${id}`),
  create: (data: { name: string; description?: string; folder_id?: string }) =>
    api.post("/v1/projects", data),
  update: (id: string, data: { name?: string; description?: string; folder_id?: string }) =>
    api.put(`/v1/projects/${id}`, data),
  delete: (id: string) => api.delete(`/v1/projects/${id}`),
  
  // Folders
  getFolders: () => api.get("/v1/projects/folders"),
  createFolder: (name: string, parentId?: string) =>
    api.post("/v1/projects/folders", { name, parent_id: parentId }),
  
  // AI metadata
  generateMetadata: (projectId: string) => api.post(`/v1/projects/${projectId}/generate-metadata`),
  
  // Publishing
  getPublishJobs: (projectId: string) => api.get(`/v1/projects/${projectId}/publish-jobs`),
  createPublishJob: (projectId: string, platforms: string[]) =>
    api.post(`/v1/projects/${projectId}/publish`, { platforms }),
};

// Payment API
export const paymentApi = {
  // Get token packages
  getTokenPackages: () => api.get("/payments/token-packages"),
  
  // Get available payment methods
  getPaymentMethods: () => api.get("/payments/methods"),
  
  // Get all payment provider config (for checkout)
  getPaymentConfig: () => api.get("/admin/payment-config/all"),
  
  // Get Swish data for QR code
  getSwishData: () => api.get("/payments/swish-data"),
  
  // Create checkout session for subscription
  createSubscriptionCheckout: (planId: string, billingPeriod: string, successUrl?: string, cancelUrl?: string) =>
    api.post("/payments/create-checkout", { planId, billingPeriod, successUrl, cancelUrl }),
  
  // Create checkout session for token purchase
  createTokenCheckout: (packageId: string, successUrl?: string, cancelUrl?: string) =>
    api.post("/payments/create-token-checkout", { packageId, successUrl, cancelUrl }),
  
  // Get session status
  getSessionStatus: (sessionId: string) => api.get(`/payments/session/${sessionId}`),
  
  // Get transaction history
  getTransactions: () => api.get("/payments/transactions"),
  
  // Create Swish direct payment (QR code)
  createSwishDirectPayment: (data: { amount: number; message?: string; packageId?: string }) =>
    api.post("/payments/swish-payment", data),
  
  // Create Swish payment via Stripe
  createSwishPayment: (data: { amount: number; packageId?: string; planId?: string; billingPeriod?: string }) =>
    api.post("/payments/create-swish-payment", data),
};
