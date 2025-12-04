import React, { useState, useEffect } from "react";
import { 
  Coins, DollarSign, TrendingUp, Users, Settings, 
  Edit2, Save, X, Plus, ChevronDown, ChevronUp,
  Loader2, AlertCircle, CheckCircle, BarChart3, Wallet
} from "lucide-react";
import { adminApi } from "../lib/api";
import DashboardLayout from "../components/DashboardLayout";

interface TokenPricing {
  id: string;
  operation: string;
  display_name: string;
  description: string | null;
  base_provider_cost: number;
  tokens_charged: number;
  markup_percent: number;
  is_active: number;
}

interface ProviderCost {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  operation_type: string;
  cost_per_unit: number;
  cost_unit: string;
  notes: string | null;
  is_active: number;
}

interface PlanConfig {
  id: string;
  plan_id: string;
  plan_name: string;
  tokens_monthly: number;
  tokens_bonus: number;
  rollover_enabled: number;
}

interface UserSummary {
  id: string;
  email: string;
  name: string;
  current_balance: number;
  tokens_used_period: number;
  operations_period: number;
  provider_cost_period: number;
  plan_name: string | null;
  monthly_allocation: number | null;
}

export default function AdminTokenEconomics() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Data
  const [pricing, setPricing] = useState<TokenPricing[]>([]);
  const [providerCosts, setProviderCosts] = useState<ProviderCost[]>([]);
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<any>(null);
  const [userSummary, setUserSummary] = useState<UserSummary[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'pricing' | 'providers' | 'plans' | 'users'>('pricing');
  const [expandedSection, setExpandedSection] = useState<string | null>('pricing');
  const [editingPricing, setEditingPricing] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  
  // Edit forms
  const [pricingForm, setPricingForm] = useState<Partial<TokenPricing>>({});
  const [providerForm, setProviderForm] = useState<Partial<ProviderCost>>({});
  const [planForm, setPlanForm] = useState<Partial<PlanConfig>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [economicsRes, usersRes] = await Promise.all([
        adminApi.getTokenEconomics(),
        adminApi.getUsersTokenSummary(),
      ]);
      
      if (economicsRes.data?.data) {
        setPricing(economicsRes.data.data.pricing || []);
        setProviderCosts(economicsRes.data.data.providerCosts || []);
        setPlanConfigs(economicsRes.data.data.planConfigs || []);
        setSettings(economicsRes.data.data.settings || {});
        setStats(economicsRes.data.data.stats || null);
      }
      
      if (usersRes.data?.data) {
        setUserSummary(usersRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load token economics:", err);
      setError("Failed to load token economics data");
    } finally {
      setLoading(false);
    }
  };

  const savePricing = async (item: TokenPricing) => {
    setSaving(true);
    try {
      await adminApi.updateTokenPricing(item.id, {
        tokens_charged: pricingForm.tokens_charged ?? item.tokens_charged,
        markup_percent: pricingForm.markup_percent ?? item.markup_percent,
        base_provider_cost: pricingForm.base_provider_cost ?? item.base_provider_cost,
        is_active: pricingForm.is_active ?? item.is_active,
      });
      setSuccess("Token pricing updated");
      setEditingPricing(null);
      loadData();
    } catch (err) {
      setError("Failed to update pricing");
    } finally {
      setSaving(false);
    }
  };

  const savePlanConfig = async (planId: string) => {
    setSaving(true);
    try {
      await adminApi.updatePlanTokenConfig(planId, {
        tokens_monthly: planForm.tokens_monthly,
        tokens_bonus: planForm.tokens_bonus,
        rollover_enabled: planForm.rollover_enabled,
      });
      setSuccess("Plan token config updated");
      setEditingPlan(null);
      loadData();
    } catch (err) {
      setError("Failed to update plan config");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const calculateProfit = (item: TokenPricing) => {
    const tokenValue = parseFloat(settings.token_usd_rate || '0.01');
    const revenue = item.tokens_charged * tokenValue;
    const cost = item.base_provider_cost;
    const profit = revenue - cost;
    const margin = cost > 0 ? ((profit / cost) * 100).toFixed(0) : '∞';
    return { revenue, cost, profit, margin };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Token Economics</h1>
          <p className="text-slate-400">Manage pricing, provider costs, and subscription tokens</p>
        </div>
        <button 
          onClick={loadData}
          className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
        >
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto" title="Dismiss error" aria-label="Dismiss error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400">
          <CheckCircle className="w-5 h-5" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto" title="Dismiss message" aria-label="Dismiss message">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Coins className="w-4 h-4" />
            <span className="text-sm">Tokens Used (30d)</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats?.last30Days?.total_tokens?.toLocaleString() || 0}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Operations (30d)</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats?.last30Days?.total_operations?.toLocaleString() || 0}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Provider Cost (30d)</span>
          </div>
          <p className="text-2xl font-bold text-red-400">
            {formatCurrency(stats?.last30Days?.total_provider_cost || 0)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Est. Revenue (30d)</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency((stats?.last30Days?.total_tokens || 0) * parseFloat(settings.token_usd_rate || '0.01'))}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700/50 pb-2">
        {[
          { id: 'pricing', label: 'Token Pricing', icon: Coins },
          { id: 'providers', label: 'Provider Costs', icon: Wallet },
          { id: 'plans', label: 'Plan Tokens', icon: Users },
          { id: 'users', label: 'User Analytics', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeTab === tab.id
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Token Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm text-purple-300">
              <strong>Token Pricing:</strong> Configure how many tokens each operation costs users. 
              Adjust markup to ensure profitability over provider costs.
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-400 border-b border-slate-700/50">
                  <th className="pb-3">Operation</th>
                  <th className="pb-3">Provider Cost</th>
                  <th className="pb-3">Tokens Charged</th>
                  <th className="pb-3">Markup %</th>
                  <th className="pb-3">Token Value</th>
                  <th className="pb-3">Profit</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map(item => {
                  const isEditing = editingPricing === item.id;
                  const profitData = calculateProfit(item);
                  
                  return (
                    <tr key={item.id} className="border-b border-slate-700/30">
                      <td className="py-3">
                        <p className="font-medium text-white">{item.display_name}</p>
                        <p className="text-xs text-slate-500">{item.operation}</p>
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.001"
                            value={pricingForm.base_provider_cost ?? item.base_provider_cost}
                            onChange={e => setPricingForm({...pricingForm, base_provider_cost: parseFloat(e.target.value)})}
                            className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white text-sm"
                            aria-label="Provider cost"
                          />
                        ) : (
                          <span className="text-red-400">{formatCurrency(item.base_provider_cost)}</span>
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={pricingForm.tokens_charged ?? item.tokens_charged}
                            onChange={e => setPricingForm({...pricingForm, tokens_charged: parseInt(e.target.value)})}
                            className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white text-sm"
                            aria-label="Tokens charged"
                          />
                        ) : (
                          <span className="text-white font-medium">{item.tokens_charged}</span>
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={pricingForm.markup_percent ?? item.markup_percent}
                            onChange={e => setPricingForm({...pricingForm, markup_percent: parseFloat(e.target.value)})}
                            className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white text-sm"
                            aria-label="Markup percent"
                          />
                        ) : (
                          <span className="text-slate-300">{item.markup_percent}%</span>
                        )}
                      </td>
                      <td className="py-3 text-emerald-400">
                        {formatCurrency(profitData.revenue)}
                      </td>
                      <td className="py-3">
                        <span className={profitData.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {formatCurrency(profitData.profit)}
                        </span>
                        <span className="text-slate-500 text-xs ml-1">({profitData.margin}%)</span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${item.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => savePricing(item)}
                              disabled={saving}
                              className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditingPricing(null); setPricingForm({}); }}
                              className="p-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingPricing(item.id); setPricingForm({}); }}
                            className="p-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provider Costs Tab */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-300">
              <strong>Smart Cost Tracking:</strong> The system automatically calculates costs based on 
              whether a model uses <span className="text-blue-400">Direct API</span> or <span className="text-purple-400">Replicate</span>.
              Replicate costs are calculated from actual prediction time × GPU rate.
            </p>
          </div>

          {/* Replicate Pricing Info */}
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
            <h3 className="font-semibold text-purple-400 mb-2">Replicate GPU Pricing</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-400">NVIDIA T4</p>
                <p className="text-white">$0.000225/sec</p>
              </div>
              <div>
                <p className="text-slate-400">A40 Small</p>
                <p className="text-white">$0.000575/sec</p>
              </div>
              <div>
                <p className="text-slate-400">A40 Large</p>
                <p className="text-white">$0.00115/sec</p>
              </div>
              <div>
                <p className="text-slate-400">H100</p>
                <p className="text-white">$0.0032/sec</p>
              </div>
            </div>
            <p className="text-xs text-purple-300 mt-2">
              Cost = predict_time × GPU rate. Actual time captured from Replicate API response.
            </p>
          </div>
          
          <div className="grid gap-4">
            {Object.entries(
              providerCosts.reduce((acc, cost) => {
                if (!acc[cost.provider]) acc[cost.provider] = [];
                acc[cost.provider].push(cost);
                return acc;
              }, {} as Record<string, ProviderCost[]>)
            ).map(([provider, costs]) => (
              <div key={provider} className="rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white capitalize">{provider}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      provider === 'replicate' 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {provider === 'replicate' ? 'Per-second billing' : 'Direct API'}
                    </span>
                  </div>
                  <span className="text-sm text-slate-400">{costs.length} models</span>
                </div>
                <div className="p-4 space-y-2">
                  {costs.map(cost => {
                    const isEditing = editingProvider === cost.id;
                    return (
                      <div key={cost.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                        <div className="flex-1">
                          <p className="text-white font-medium">{cost.display_name}</p>
                          <p className="text-xs text-slate-500">{cost.model_id} • {cost.operation_type}</p>
                          {cost.notes && <p className="text-xs text-slate-400 mt-1">{cost.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          {isEditing ? (
                            <>
                              <input
                                type="number"
                                step="0.0001"
                                value={providerForm.cost_per_unit ?? cost.cost_per_unit}
                                onChange={e => setProviderForm({...providerForm, cost_per_unit: parseFloat(e.target.value)})}
                                className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white text-sm"
                                aria-label="Cost per unit"
                              />
                              <button
                                onClick={async () => {
                                  setSaving(true);
                                  try {
                                    await adminApi.updateProviderCost(cost.id, { 
                                      cost_per_unit: providerForm.cost_per_unit ?? cost.cost_per_unit 
                                    });
                                    setSuccess("Provider cost updated");
                                    setEditingProvider(null);
                                    loadData();
                                  } catch { setError("Failed to update"); }
                                  setSaving(false);
                                }}
                                className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setEditingProvider(null); setProviderForm({}); }}
                                className="p-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="text-right">
                                <p className="text-red-400 font-medium">{formatCurrency(cost.cost_per_unit)}</p>
                                <p className="text-xs text-slate-500">{cost.cost_unit.replace('_', ' ')}</p>
                              </div>
                              <button
                                onClick={() => { setEditingProvider(cost.id); setProviderForm({}); }}
                                className="p-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
                                title="Edit cost"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Manual Update Warning */}
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-400 mb-1">Manual Updates Required</h3>
                <p className="text-sm text-red-300/80">
                  Provider costs are <strong>NOT</strong> updated automatically. When providers change pricing, 
                  you must manually update them here. Click the edit icon on any model to update its cost.
                </p>
                <p className="text-sm text-red-300/80 mt-2">
                  <strong>Exception:</strong> Replicate costs are calculated from actual API response time, so they're always accurate.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links to Pricing Pages */}
          <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
            <h3 className="font-semibold text-white mb-3">Provider Pricing Pages</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'OpenAI', url: 'https://openai.com/pricing' },
                { name: 'Replicate', url: 'https://replicate.com/pricing' },
                { name: 'Google AI', url: 'https://cloud.google.com/vertex-ai/pricing' },
                { name: 'Stability AI', url: 'https://platform.stability.ai/pricing' },
                { name: 'Anthropic', url: 'https://www.anthropic.com/pricing' },
              ].map(p => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 hover:text-white transition"
                >
                  {p.name} ↗
                </a>
              ))}
            </div>
          </div>

          {/* Cost Calculation Example */}
          <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
            <h3 className="font-semibold text-white mb-3">How Smart Cost Works</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="text-blue-400 font-medium">Direct API Example (DALL-E 3)</p>
                <p className="text-slate-300">1 image × $0.04 = <span className="text-red-400">$0.04</span></p>
                <p className="text-slate-400 text-xs">Fixed per-image cost from OpenAI</p>
              </div>
              <div className="space-y-2">
                <p className="text-purple-400 font-medium">Replicate Example (SDXL)</p>
                <p className="text-slate-300">4.2s × $0.00115 = <span className="text-red-400">$0.0048</span></p>
                <p className="text-slate-400 text-xs">Actual prediction time from API response</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Tokens Tab */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-300">
              <strong>Plan Token Allocation:</strong> Set monthly token allowances for each subscription plan.
              Bonus tokens are added when users first subscribe.
            </p>
          </div>
          
          <div className="grid gap-4">
            {planConfigs.map(plan => {
              const isEditing = editingPlan === plan.plan_id;
              
              return (
                <div key={plan.id} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">{plan.plan_name}</h3>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => savePlanConfig(plan.plan_id)}
                          disabled={saving}
                          className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          title="Save"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingPlan(null); setPlanForm({}); }}
                          className="p-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingPlan(plan.plan_id); setPlanForm({...plan}); }}
                        className="p-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Monthly Tokens</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={planForm.tokens_monthly ?? plan.tokens_monthly}
                          onChange={e => setPlanForm({...planForm, tokens_monthly: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-white"
                          aria-label="Monthly tokens"
                        />
                      ) : (
                        <p className="text-xl font-bold text-white">{plan.tokens_monthly.toLocaleString()}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Signup Bonus</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={planForm.tokens_bonus ?? plan.tokens_bonus}
                          onChange={e => setPlanForm({...planForm, tokens_bonus: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-white"
                          aria-label="Signup bonus tokens"
                        />
                      ) : (
                        <p className="text-xl font-bold text-purple-400">+{plan.tokens_bonus}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Rollover</label>
                      {isEditing ? (
                        <select
                          value={planForm.rollover_enabled ?? plan.rollover_enabled}
                          onChange={e => setPlanForm({...planForm, rollover_enabled: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-white"
                          aria-label="Rollover enabled"
                        >
                          <option value={0}>Disabled</option>
                          <option value={1}>Enabled</option>
                        </select>
                      ) : (
                        <p className={`text-xl font-bold ${plan.rollover_enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {plan.rollover_enabled ? 'Yes' : 'No'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Analytics Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50">
            <p className="text-sm text-slate-300">
              <strong>User Token Analytics:</strong> View token usage and provider costs per user over the last 30 days.
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-400 border-b border-slate-700/50">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Balance</th>
                  <th className="pb-3">Used (30d)</th>
                  <th className="pb-3">Operations</th>
                  <th className="pb-3">Provider Cost</th>
                  <th className="pb-3">Revenue</th>
                  <th className="pb-3">Profit</th>
                </tr>
              </thead>
              <tbody>
                {userSummary.map(user => {
                  const tokenValue = parseFloat(settings.token_usd_rate || '0.01');
                  const revenue = user.tokens_used_period * tokenValue;
                  const profit = revenue - user.provider_cost_period;
                  
                  return (
                    <tr key={user.id} className="border-b border-slate-700/30">
                      <td className="py-3">
                        <p className="font-medium text-white">{user.name || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="py-3 text-slate-300">
                        {user.plan_name || <span className="text-slate-500">Free</span>}
                      </td>
                      <td className="py-3">
                        <span className={`font-medium ${user.current_balance < 10 ? 'text-amber-400' : 'text-white'}`}>
                          {user.current_balance.toLocaleString()}
                        </span>
                        {user.monthly_allocation && (
                          <span className="text-slate-500 text-xs">/{user.monthly_allocation}</span>
                        )}
                      </td>
                      <td className="py-3 text-white">{user.tokens_used_period.toLocaleString()}</td>
                      <td className="py-3 text-slate-300">{user.operations_period}</td>
                      <td className="py-3 text-red-400">{formatCurrency(user.provider_cost_period)}</td>
                      <td className="py-3 text-emerald-400">{formatCurrency(revenue)}</td>
                      <td className="py-3">
                        <span className={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {formatCurrency(profit)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Section */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Global Settings
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Token USD Rate</label>
            <p className="text-white font-medium">${settings.token_usd_rate || '0.01'}/token</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Default Markup</label>
            <p className="text-white font-medium">{settings.default_markup_percent || '100'}%</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Free Tier Tokens</label>
            <p className="text-white font-medium">{settings.free_tier_tokens || '50'} tokens</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Low Balance Warning</label>
            <p className="text-white font-medium">&lt; {settings.low_balance_warning || '10'} tokens</p>
          </div>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
