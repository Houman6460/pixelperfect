import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Settings, Check, X, AlertCircle, Loader2, RefreshCw, Server, Cloud,
  Video, Type, Image as ImageIcon, Box, Music, ChevronDown, ChevronRight,
  Search, Filter, ToggleLeft, ToggleRight, Zap, Shield,
} from "lucide-react";

const API_BASE = "http://localhost:4000";

interface ModelApiSetting {
  modelId: string;
  modelName: string;
  category: "video" | "text" | "image" | "3d" | "music";
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

const CATEGORY_INFO = {
  video: { icon: Video, label: "Video", color: "text-red-400", bgColor: "bg-red-500/10" },
  text: { icon: Type, label: "Text/LLM", color: "text-indigo-400", bgColor: "bg-indigo-500/10" },
  image: { icon: ImageIcon, label: "Image", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  "3d": { icon: Box, label: "3D", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  music: { icon: Music, label: "Music", color: "text-purple-400", bgColor: "bg-purple-500/10" },
};

export default function AdminModelSettings() {
  const [models, setModels] = useState<ModelApiSetting[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["video", "text", "image", "3d", "music"]));
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Fetch model settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/admin/model-api-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModels(response.data.settings.models);
      setApiKeys(response.data.apiKeys);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const toggleModel = async (modelId: string) => {
    try {
      setSaving(modelId);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE}/api/admin/model-api-settings/${modelId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setModels(prev =>
          prev.map(m =>
            m.modelId === modelId ? { ...m, useDirectApi: response.data.model.useDirectApi } : m
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
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
    </div>
  );
}
