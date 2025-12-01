import React, { useEffect, useState } from "react";
import { 
  Users, 
  Coins, 
  CreditCard, 
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Cpu,
  Check,
  AlertCircle,
} from "lucide-react";
import { adminApi } from "../lib/api";
import DashboardLayout from "../components/DashboardLayout";

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalTokensUsed: number;
  revenueThisMonth: number;
  subscriptionBreakdown: { name: string; count: number }[];
  recentTransactions: any[];
}

interface AISettings {
  aiProvider: "replicate" | "openai" | "gemini";
  openaiModel: string;
  geminiModel: string;
  replicateModel: string;
  autoSaveToGallery: boolean;
  defaultUpscaleEnabled: boolean;
  defaultUpscaleFactor: number;
}

interface ApiKeys {
  replicate: string;
  openai: string;
  gemini: string;
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [savingAI, setSavingAI] = useState(false);

  useEffect(() => {
    loadAnalytics();
    loadAISettings();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await adminApi.getAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAISettings = async () => {
    try {
      const response = await adminApi.getAISettings();
      setAiSettings(response.data.settings);
      setApiKeys(response.data.apiKeys);
    } catch (error) {
      console.error("Failed to load AI settings:", error);
    }
  };

  const updateAIProvider = async (provider: "replicate" | "openai" | "gemini") => {
    setSavingAI(true);
    try {
      const response = await adminApi.updateAISettings({ aiProvider: provider });
      setAiSettings(response.data.settings);
    } catch (error) {
      console.error("Failed to update AI provider:", error);
    } finally {
      setSavingAI(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400">Overview of your platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <span className="flex items-center text-xs text-emerald-400">
                <ArrowUp className="w-3 h-3 mr-1" /> 12%
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{analytics?.totalUsers || 0}</p>
            <p className="text-sm text-slate-400">Total Users</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="flex items-center text-xs text-emerald-400">
                <ArrowUp className="w-3 h-3 mr-1" /> 8%
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{analytics?.activeUsers || 0}</p>
            <p className="text-sm text-slate-400">Active Users</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Coins className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {analytics?.totalTokensUsed?.toLocaleString() || 0}
            </p>
            <p className="text-sm text-slate-400">Tokens Used</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-pink-400" />
              </div>
              <span className="flex items-center text-xs text-emerald-400">
                <ArrowUp className="w-3 h-3 mr-1" /> 23%
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              ${analytics?.revenueThisMonth?.toFixed(2) || "0.00"}
            </p>
            <p className="text-sm text-slate-400">Revenue (30 days)</p>
          </div>
        </div>

        {/* AI Provider Settings */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Image Generation</h2>
              <p className="text-sm text-slate-400">Choose which AI provider to use for image generation</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* OpenAI */}
            <button
              onClick={() => updateAIProvider("openai")}
              disabled={savingAI || apiKeys?.openai !== "configured"}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                aiSettings?.aiProvider === "openai"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : apiKeys?.openai === "configured"
                  ? "border-slate-600 hover:border-slate-500 bg-slate-800/50"
                  : "border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed"
              }`}
            >
              {aiSettings?.aiProvider === "openai" && (
                <div className="absolute top-2 right-2">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
              )}
              <div className="font-semibold text-white mb-1">OpenAI</div>
              <div className="text-xs text-slate-400 mb-2">GPT-Image-1 / DALL-E 3</div>
              <div className="flex items-center gap-1 text-xs">
                {apiKeys?.openai === "configured" ? (
                  <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Configured</span></>
                ) : (
                  <><AlertCircle className="w-3 h-3 text-amber-400" /><span className="text-amber-400">Add API Key</span></>
                )}
              </div>
            </button>

            {/* Gemini */}
            <button
              onClick={() => updateAIProvider("gemini")}
              disabled={savingAI || apiKeys?.gemini !== "configured"}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                aiSettings?.aiProvider === "gemini"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : apiKeys?.gemini === "configured"
                  ? "border-slate-600 hover:border-slate-500 bg-slate-800/50"
                  : "border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed"
              }`}
            >
              {aiSettings?.aiProvider === "gemini" && (
                <div className="absolute top-2 right-2">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
              )}
              <div className="font-semibold text-white mb-1">Google Gemini</div>
              <div className="text-xs text-slate-400 mb-2">Imagen 3 / Gemini 2.0</div>
              <div className="flex items-center gap-1 text-xs">
                {apiKeys?.gemini === "configured" ? (
                  <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Configured</span></>
                ) : (
                  <><AlertCircle className="w-3 h-3 text-amber-400" /><span className="text-amber-400">Add API Key</span></>
                )}
              </div>
            </button>

            {/* Replicate */}
            <button
              onClick={() => updateAIProvider("replicate")}
              disabled={savingAI || apiKeys?.replicate !== "configured"}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                aiSettings?.aiProvider === "replicate"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : apiKeys?.replicate === "configured"
                  ? "border-slate-600 hover:border-slate-500 bg-slate-800/50"
                  : "border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed"
              }`}
            >
              {aiSettings?.aiProvider === "replicate" && (
                <div className="absolute top-2 right-2">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
              )}
              <div className="font-semibold text-white mb-1">Replicate</div>
              <div className="text-xs text-slate-400 mb-2">SDXL / InstructPix2Pix</div>
              <div className="flex items-center gap-1 text-xs">
                {apiKeys?.replicate === "configured" ? (
                  <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Configured</span></>
                ) : (
                  <><AlertCircle className="w-3 h-3 text-amber-400" /><span className="text-amber-400">Add API Key</span></>
                )}
              </div>
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Current provider: <span className="text-purple-400 font-medium">{aiSettings?.aiProvider?.toUpperCase() || "Not set"}</span>
            {savingAI && <span className="ml-2 text-amber-400">Saving...</span>}
          </p>
        </div>

        {/* Subscription Breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Subscription Breakdown</h2>
            <div className="space-y-4">
              {analytics?.subscriptionBreakdown?.map((sub) => (
                <div key={sub.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-slate-300">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white font-semibold">{sub.count}</span>
                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{
                          width: `${Math.min(100, (sub.count / (analytics?.totalUsers || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
            <div className="space-y-3">
              {analytics?.recentTransactions?.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <div>
                    <p className="text-sm text-white">{tx.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.amount > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                      {tx.amount > 0 ? `+$${tx.amount.toFixed(2)}` : "—"}
                    </p>
                    <p className="text-xs text-slate-500">{tx.tokens} tokens</p>
                  </div>
                </div>
              ))}
              {(!analytics?.recentTransactions || analytics.recentTransactions.length === 0) && (
                <p className="text-slate-400 text-sm text-center py-4">No recent transactions</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
