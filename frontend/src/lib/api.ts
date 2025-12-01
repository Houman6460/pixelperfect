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
  // AI Settings
  getAISettings: () => api.get("/admin/ai-settings"),
  updateAISettings: (data: any) => api.put("/admin/ai-settings", data),
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
