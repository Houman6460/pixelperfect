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
