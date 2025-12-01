import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export const api = axios.create({
  baseURL: API_BASE || "/api",
  headers: {
    "Content-Type": "application/json",
  },
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
