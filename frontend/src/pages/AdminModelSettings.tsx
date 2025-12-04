import React, { useState, useEffect } from "react";
import {
  Settings, Check, X, AlertCircle, Loader2, RefreshCw, Server, Cloud,
  Video, Type, Image as ImageIcon, Box, Music, ChevronDown, ChevronRight,
  Search, Filter, ToggleLeft, ToggleRight, Zap, Shield, Key, Eye, EyeOff,
  Trash2, TestTube, Plus, ArrowLeftRight, Copy, ExternalLink,
} from "lucide-react";
import { adminApi } from "../lib/api";
import DashboardLayout from "../components/DashboardLayout";

interface ModelApiSetting {
  modelId: string;
  modelName: string;
  category: "video" | "text" | "image" | "3d" | "audio" | "music";
  provider: string;
  useDirectApi: boolean;
  directApiAvailable: boolean;
  replicateAvailable: boolean;
  directApiKey?: string;
  replicateModelId?: string;
}

interface ApiKeys {
  [key: string]: "configured" | "not_configured";
}

interface ApiKeyInfo {
  name: string;
  configured: boolean;
  source: "user" | "env" | "none";
  maskedKey: string | null;
  hasBackup: boolean;
  backupMaskedKey: string | null;
}

interface FallbackConfig {
  enabled: boolean;
  primaryPreference: "direct" | "replicate";
  autoSwitch: boolean;
  retryCount: number;
}

const CATEGORY_INFO: Record<string, { icon: any; label: string; color: string; bgColor: string }> = {
  video: { icon: Video, label: "Video", color: "text-red-400", bgColor: "bg-red-500/10" },
  text: { icon: Type, label: "Text/LLM", color: "text-indigo-400", bgColor: "bg-indigo-500/10" },
  image: { icon: ImageIcon, label: "Image", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  "3d": { icon: Box, label: "3D", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  audio: { icon: Music, label: "Music", color: "text-purple-400", bgColor: "bg-purple-500/10" },
};

// API providers configuration with dashboard URLs
const API_PROVIDERS = [
  { id: "openai", name: "OpenAI", color: "emerald", url: "https://platform.openai.com/api-keys" },
  { id: "anthropic", name: "Anthropic", color: "orange", url: "https://console.anthropic.com/settings/keys" },
  { id: "google", name: "Google AI", color: "blue", url: "https://aistudio.google.com/app/apikey" },
  { id: "replicate", name: "Replicate", color: "purple", url: "https://replicate.com/account/api-tokens" },
  { id: "stability", name: "Stability AI", color: "pink", url: "https://platform.stability.ai/account/keys" },
  { id: "mistral", name: "Mistral", color: "amber", url: "https://console.mistral.ai/api-keys" },
  { id: "deepseek", name: "DeepSeek", color: "sky", url: "https://platform.deepseek.com/api_keys" },
  { id: "bfl", name: "BFL (Flux)", color: "lime", url: "https://api.bfl.ml/auth/profile" },
  { id: "ideogram", name: "Ideogram", color: "fuchsia", url: "https://ideogram.ai/manage-api" },
  { id: "suno", name: "Suno", color: "yellow", url: "https://suno.com/account" },
  { id: "udio", name: "Udio", color: "orange", url: "https://www.udio.com/settings" },
  { id: "kling", name: "Kling", color: "red", url: "https://klingai.com/dev" },
  { id: "minimax", name: "MiniMax", color: "slate", url: "https://www.minimaxi.com/platform" },
  { id: "pixverse", name: "PixVerse", color: "zinc", url: "https://pixverse.ai/settings" },
  { id: "meshy", name: "Meshy", color: "cyan", url: "https://www.meshy.ai/api" },
  { id: "elevenlabs", name: "ElevenLabs", color: "indigo", url: "https://elevenlabs.io/app/settings/api-keys" },
  { id: "runway", name: "Runway", color: "rose", url: "https://app.runwayml.com/settings/api-keys" },
  { id: "luma", name: "Luma AI", color: "teal", url: "https://lumalabs.ai/dream-machine/api/keys" },
  { id: "midjourney", name: "Midjourney", color: "violet", url: "https://www.midjourney.com/account" },
];

export default function AdminModelSettings() {
  const [models, setModels] = useState<ModelApiSetting[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["video", "text", "image", "3d", "audio"]));
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  // API Key Management State
  const [apiKeyData, setApiKeyData] = useState<Record<string, ApiKeyInfo>>({});
  const [fallbackConfig, setFallbackConfig] = useState<FallbackConfig>({
    enabled: true,
    primaryPreference: "direct",
    autoSwitch: true,
    retryCount: 3,
  });
  const [showApiKeys, setShowApiKeys] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [isBackupKey, setIsBackupKey] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; success: boolean; message: string } | null>(null);
  const [savingKey, setSavingKey] = useState(false);

  // Fetch model settings
  useEffect(() => {
    fetchSettings();
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await adminApi.getApiKeys();
      if (response.data?.success) {
        setApiKeyData(response.data.data?.apiKeys || {});
        setFallbackConfig(response.data.data?.fallback || {
          enabled: true,
          primaryPreference: "direct",
          autoSwitch: true,
          retryCount: 3,
        });
      }
    } catch (err) {
      console.error("Failed to fetch API keys:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getModelApiSettings();
      if (response.data?.success) {
        setModels(response.data.data?.models || []);
        setApiKeys(response.data.data?.apiKeys || {});
        setError(null);
      } else {
        setError(response.data?.error || "Failed to load settings");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (provider: string) => {
    if (!newKeyValue.trim()) return;
    try {
      setSavingKey(true);
      const response = await adminApi.setApiKey(provider, newKeyValue.trim(), isBackupKey);
      if (response.data?.success) {
        await fetchApiKeys();
        setEditingKey(null);
        setNewKeyValue("");
        setIsBackupKey(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save API key");
    } finally {
      setSavingKey(false);
    }
  };

  const deleteApiKey = async (provider: string, isBackup: boolean = false) => {
    if (!confirm(`Delete ${isBackup ? "backup " : ""}API key for ${provider}?`)) return;
    try {
      await adminApi.deleteApiKey(provider, isBackup);
      await fetchApiKeys();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete API key");
    }
  };

  const testApiKey = async (provider: string) => {
    try {
      setTestingKey(provider);
      setTestResult(null);
      const response = await adminApi.testApiKey(provider);
      setTestResult({
        provider,
        success: response.data?.success,
        message: response.data?.message || "Test completed",
      });
    } catch (err: any) {
      setTestResult({
        provider,
        success: false,
        message: err.response?.data?.error || "Test failed",
      });
    } finally {
      setTestingKey(null);
    }
  };

  const updateFallbackSetting = async (updates: Partial<FallbackConfig>) => {
    try {
      const newConfig = { ...fallbackConfig, ...updates };
      setFallbackConfig(newConfig);
      await adminApi.updateFallbackConfig(newConfig);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update fallback config");
    }
  };

  const toggleModel = async (modelId: string) => {
    try {
      setSaving(modelId);
      const response = await adminApi.toggleModelApiSetting(modelId);
      
      if (response.data?.success) {
        setModels(prev =>
          prev.map(m =>
            m.modelId === modelId ? { ...m, useDirectApi: response.data.data?.useDirectApi } : m
          )
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to toggle model");
    } finally {
      setSaving(null);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const getApiKeyStatus = (model: ModelApiSetting): "configured" | "not_configured" | "na" => {
    if (!model.directApiKey) return "na";
    const keyName = model.directApiKey.toLowerCase().replace(/_api_key|_api_token/g, "");
    return apiKeys[keyName] || "not_configured";
  };

  // Filter models
  const filteredModels = models.filter(m => {
    const matchesSearch = m.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || m.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Group models by category
  const groupedModels = filteredModels.reduce((acc, model) => {
    if (!acc[model.category]) acc[model.category] = [];
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, ModelApiSetting[]>);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <Settings className="w-6 h-6" />
            </div>
            Model API Settings
          </h1>
          <p className="text-slate-400 mt-2">
            Configure whether each AI model uses direct API or Replicate
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-cyan-400 mt-0.5" />
            <div>
              <p className="text-sm text-cyan-300 font-medium">Admin Only Setting</p>
              <p className="text-xs text-slate-400 mt-1">
                Toggle between using direct API from providers (faster, may require separate billing) or Replicate (unified billing, may be slower).
                Users are not affected by these changes - only backend routing is modified.
              </p>
            </div>
          </div>
        </div>

        {/* API Key Management Section */}
        <div className="mb-6 bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowApiKeys(!showApiKeys)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">API Key Management</h2>
                <p className="text-sm text-slate-400">Configure provider API keys directly from the dashboard</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showApiKeys ? "rotate-180" : ""}`} />
          </button>

          {showApiKeys && (
            <div className="p-4 border-t border-slate-700/50 space-y-6">
              {/* Fallback Configuration */}
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-purple-400" />
                  Backup & Fallback Settings
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm text-slate-300">Enable Fallback</span>
                    <button
                      onClick={() => updateFallbackSetting({ enabled: !fallbackConfig.enabled })}
                      className={`w-10 h-6 rounded-full transition-colors ${fallbackConfig.enabled ? "bg-emerald-500" : "bg-slate-600"}`}
                      title="Toggle fallback"
                      aria-label={`Fallback ${fallbackConfig.enabled ? "enabled" : "disabled"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${fallbackConfig.enabled ? "translate-x-4" : ""}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm text-slate-300">Auto-Switch</span>
                    <button
                      onClick={() => updateFallbackSetting({ autoSwitch: !fallbackConfig.autoSwitch })}
                      className={`w-10 h-6 rounded-full transition-colors ${fallbackConfig.autoSwitch ? "bg-emerald-500" : "bg-slate-600"}`}
                      title="Toggle auto-switch"
                      aria-label={`Auto-switch ${fallbackConfig.autoSwitch ? "enabled" : "disabled"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${fallbackConfig.autoSwitch ? "translate-x-4" : ""}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm text-slate-300">Primary</span>
                    <select
                      value={fallbackConfig.primaryPreference}
                      onChange={(e) => updateFallbackSetting({ primaryPreference: e.target.value as "direct" | "replicate" })}
                      className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                      title="Primary API preference"
                      aria-label="Primary API preference"
                    >
                      <option value="direct">Direct API</option>
                      <option value="replicate">Replicate</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm text-slate-300">Retry Count</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={fallbackConfig.retryCount}
                      onChange={(e) => updateFallbackSetting({ retryCount: parseInt(e.target.value) || 3 })}
                      className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white text-center"
                      title="Retry count"
                      aria-label="Retry count"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  When enabled, if primary API fails, system automatically switches to backup. Add backup keys below for seamless failover.
                </p>
              </div>

              {/* API Keys Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {API_PROVIDERS.map((provider) => {
                  const keyInfo = apiKeyData[provider.id];
                  const isEditing = editingKey === provider.id;
                  const isTesting = testingKey === provider.id;
                  
                  return (
                    <div
                      key={provider.id}
                      className={`p-4 rounded-lg border transition-all ${
                        keyInfo?.configured
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : "bg-slate-800/50 border-slate-700/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${keyInfo?.configured ? "bg-emerald-400" : "bg-slate-500"}`} />
                          <span className="font-medium text-white">{provider.name}</span>
                          <a
                            href={provider.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                            title={`Get API key from ${provider.name}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
                          </a>
                        </div>
                        <div className="flex items-center gap-1">
                          {keyInfo?.source === "env" && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">ENV</span>
                          )}
                          {keyInfo?.source === "user" && (
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Custom</span>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="password"
                            value={newKeyValue}
                            onChange={(e) => setNewKeyValue(e.target.value)}
                            placeholder="Enter API key..."
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-white placeholder-slate-500"
                          />
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-xs text-slate-400">
                              <input
                                type="checkbox"
                                checked={isBackupKey}
                                onChange={(e) => setIsBackupKey(e.target.checked)}
                                className="rounded border-slate-600"
                              />
                              Save as Backup
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveApiKey(provider.id)}
                              disabled={savingKey || !newKeyValue.trim()}
                              className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 rounded text-sm text-white flex items-center justify-center gap-1"
                            >
                              {savingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingKey(null); setNewKeyValue(""); setIsBackupKey(false); }}
                              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {keyInfo?.configured && (
                            <div className="mb-2">
                              <code className="text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded">
                                {keyInfo.maskedKey}
                              </code>
                            </div>
                          )}
                          {keyInfo?.hasBackup && (
                            <div className="mb-2 flex items-center gap-1">
                              <span className="text-xs text-amber-400">Backup:</span>
                              <code className="text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded">
                                {keyInfo.backupMaskedKey}
                              </code>
                              <button
                                onClick={() => deleteApiKey(provider.id, true)}
                                className="p-1 hover:bg-red-500/20 rounded"
                                title="Remove backup key"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          )}
                          
                          {/* Test Result */}
                          {testResult?.provider === provider.id && (
                            <div className={`mb-2 text-xs p-2 rounded ${testResult.success ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                              {testResult.message}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingKey(provider.id); setNewKeyValue(""); }}
                              className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white flex items-center justify-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              {keyInfo?.configured ? "Update" : "Add Key"}
                            </button>
                            {keyInfo?.configured && (
                              <>
                                <button
                                  onClick={() => testApiKey(provider.id)}
                                  disabled={isTesting}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 rounded text-xs text-white flex items-center gap-1"
                                  title="Test connection"
                                >
                                  {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                                </button>
                                {keyInfo.source === "user" && (
                                  <button
                                    onClick={() => deleteApiKey(provider.id)}
                                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 rounded text-xs text-red-300"
                                    title="Remove key"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Replicate Section */}
              <div className="p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-purple-400" />
                  Replicate (Universal Fallback)
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Replicate provides access to thousands of AI models with unified billing. 
                  Configure as a universal fallback for any direct API that fails.
                </p>
                {apiKeyData.replicate?.configured ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <Check className="w-4 h-4" />
                    Configured and ready as fallback
                  </div>
                ) : (
                  <div className="text-amber-400 text-sm">
                    Add Replicate API key above to enable universal fallback
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{error}</span>
            <button onClick={() => setError(null)} title="Dismiss error" aria-label="Dismiss error" className="ml-auto p-1 hover:bg-red-500/20 rounded">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search models or providers..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            title="Filter by category"
            aria-label="Filter by category"
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
          >
            <option value="all">All Categories</option>
            <option value="video">Video</option>
            <option value="text">Text/LLM</option>
            <option value="image">Image</option>
            <option value="3d">3D</option>
            <option value="music">Music</option>
          </select>
          <button
            onClick={fetchSettings}
            title="Refresh"
            aria-label="Refresh settings"
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* API Keys Status */}
        <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            API Keys Status
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(apiKeys).map(([key, status]) => (
              <div
                key={key}
                className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 ${
                  status === "configured"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {status === "configured" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {key.toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        {/* Model Categories */}
        <div className="space-y-4">
          {Object.entries(CATEGORY_INFO).map(([category, info]) => {
            const categoryModels = groupedModels[category] || [];
            if (categoryModels.length === 0 && filterCategory !== "all" && filterCategory !== category) return null;
            
            const IconComponent = info.icon;
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${info.bgColor}`}>
                      <IconComponent className={`w-5 h-5 ${info.color}`} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-white">{info.label}</h3>
                      <p className="text-xs text-slate-400">{categoryModels.length} models</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {/* Model List */}
                {isExpanded && categoryModels.length > 0 && (
                  <div className="border-t border-slate-800">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-800">
                          <th className="px-4 py-2 text-left font-medium">Model</th>
                          <th className="px-4 py-2 text-left font-medium">Provider</th>
                          <th className="px-4 py-2 text-center font-medium">Direct API</th>
                          <th className="px-4 py-2 text-center font-medium">Replicate</th>
                          <th className="px-4 py-2 text-center font-medium">Current Mode</th>
                          <th className="px-4 py-2 text-center font-medium">Toggle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryModels.map(model => {
                          const apiStatus = getApiKeyStatus(model);
                          const canToggle = model.directApiAvailable && model.replicateAvailable;
                          
                          return (
                            <tr key={model.modelId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                              <td className="px-4 py-3">
                                <span className="text-white font-medium">{model.modelName}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-slate-400">{model.provider}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {model.directApiAvailable ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    {apiStatus !== "na" && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                        apiStatus === "configured"
                                          ? "bg-emerald-500/20 text-emerald-400"
                                          : "bg-red-500/20 text-red-400"
                                      }`}>
                                        {apiStatus === "configured" ? "Key OK" : "No Key"}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <X className="w-4 h-4 text-slate-600 mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {model.replicateAvailable ? (
                                  <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                                ) : (
                                  <X className="w-4 h-4 text-slate-600 mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                  model.useDirectApi
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-orange-500/20 text-orange-400"
                                }`}>
                                  {model.useDirectApi ? (
                                    <><Server className="w-3 h-3" />Direct</>
                                  ) : (
                                    <><Cloud className="w-3 h-3" />Replicate</>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {canToggle ? (
                                  <button
                                    onClick={() => toggleModel(model.modelId)}
                                    disabled={saving === model.modelId}
                                    title={`Switch to ${model.useDirectApi ? "Replicate" : "Direct API"}`}
                                    aria-label={`Toggle ${model.modelName} API provider`}
                                    className={`p-1.5 rounded-lg transition ${
                                      saving === model.modelId
                                        ? "bg-slate-700 cursor-wait"
                                        : "hover:bg-slate-700"
                                    }`}
                                  >
                                    {saving === model.modelId ? (
                                      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                    ) : model.useDirectApi ? (
                                      <ToggleRight className="w-6 h-6 text-blue-400" />
                                    ) : (
                                      <ToggleLeft className="w-6 h-6 text-orange-400" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-500">N/A</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {isExpanded && categoryModels.length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-400 border-t border-slate-800">
                    No models found
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 rounded-xl bg-slate-800/30 border border-slate-700">
          <h4 className="text-sm font-medium text-white mb-3">Legend</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">Direct API - Uses provider's API directly</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-orange-400" />
              <span className="text-slate-300">Replicate - Routes through Replicate</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-slate-600" />
              <span className="text-slate-300">Not Available</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
