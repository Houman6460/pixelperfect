import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Check,
  Image,
  Video,
  Music,
  MessageSquare,
  Box,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  Users,
  TrendingUp,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { adminApi } from "../lib/api";

// Plan category tabs
const planCategories = [
  { key: "individual", label: "Individual Studios", description: "Subscribe to specific studios" },
  { key: "collection", label: "Collections", description: "Bundled studio packages" },
  { key: "full", label: "Full Plans", description: "Complete tier-based plans" },
];

// Billing periods with discounts
const billingPeriods = [
  { key: "monthly", label: "Monthly", months: 1, discount: 0 },
  { key: "quarterly", label: "3 Months", months: 3, discount: 10 },
  { key: "biannual", label: "6 Months", months: 6, discount: 15 },
  { key: "annual", label: "Annual", months: 12, discount: 20 },
];

// Individual Studio Plans
const individualPlans = [
  { id: "image-studio", name: "Image Studio", basePrice: 9.99, tokens: 500, features: ["AI Image Generation", "Image Enhancement", "Background Removal", "Style Transfer"], icon: "image", studios: ["image"], isActive: true },
  { id: "video-studio", name: "Video Studio", basePrice: 14.99, tokens: 750, features: ["AI Video Generation", "Video Enhancement", "Text-to-Video", "Image-to-Video"], icon: "video", studios: ["video"], isActive: true },
  { id: "sound-studio", name: "Sound Studio", basePrice: 12.99, tokens: 600, features: ["AI Music Generation", "Voice Cloning", "Audio Enhancement", "Stem Separation"], icon: "sound", studios: ["sound"], isActive: true },
  { id: "text-studio", name: "Text Studio", basePrice: 7.99, tokens: 400, features: ["GPT-4o & Claude Access", "AI Chat & Completion", "Content Writing", "Code Generation"], icon: "text", studios: ["text"], isActive: true },
  { id: "3d-studio", name: "3D Studio", basePrice: 14.99, tokens: 500, features: ["Text-to-3D Generation", "Image-to-3D Conversion", "3D Model Export", "Multiple Formats"], icon: "3d", studios: ["3d"], isActive: true },
];

// Collection Bundle Plans
const collectionPlans = [
  { id: "creative-collection", name: "Creative Collection", basePrice: 29.99, tokens: 1500, features: ["Image Studio", "Video Studio", "Sound Studio", "Priority Processing", "Save 20%"], icon: "collection", studios: ["image", "video", "sound"], isActive: true },
  { id: "advanced-collection", name: "Advanced Collection", basePrice: 49.99, tokens: 3000, features: ["All 5 Studios", "Priority Processing", "API Access", "Dedicated Support", "Save 35%"], icon: "advanced", studios: ["image", "video", "sound", "text", "3d"], isActive: true },
];

// Full Tier Plans
const fullPlans = [
  { id: "free", name: "Free", basePrice: 0, tokens: 50, features: ["50 tokens/month", "Image Studio only", "Basic models", "Web interface"], icon: "free", studios: ["image"], isActive: true },
  { id: "creator", name: "Creator", basePrice: 19, tokens: 1000, features: ["1,000 tokens/month", "Choose 2 Studios", "All premium models", "Priority processing"], icon: "creator", studios: [], isActive: true },
  { id: "professional", name: "Professional", basePrice: 49, tokens: 5000, features: ["5,000 tokens/month", "All 5 Studios", "Fastest processing", "Full API access"], icon: "professional", studios: ["image", "video", "sound", "text", "3d"], isActive: true },
  { id: "enterprise", name: "Enterprise", basePrice: 0, tokens: -1, features: ["Unlimited tokens", "All Studios + Custom", "Dedicated infrastructure", "SLA guarantee"], icon: "enterprise", studios: ["image", "video", "sound", "text", "3d"], isActive: true, isCustom: true },
];

const studioIcons: Record<string, React.ReactNode> = {
  image: <Image className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  sound: <Music className="w-4 h-4" />,
  text: <MessageSquare className="w-4 h-4" />,
  "3d": <Box className="w-4 h-4" />,
};

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  planBreakdown: { planId: string; count: number }[];
}

export default function AdminSubscriptionsPage() {
  const [selectedCategory, setSelectedCategory] = useState("individual");
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState("monthly");
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Simulated stats - in real app, fetch from API
      setStats({
        totalSubscriptions: 1247,
        activeSubscriptions: 892,
        monthlyRevenue: 34567.89,
        planBreakdown: [
          { planId: "image-studio", count: 234 },
          { planId: "video-studio", count: 189 },
          { planId: "creative-collection", count: 312 },
          { planId: "professional", count: 157 },
        ],
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPlans = () => {
    switch (selectedCategory) {
      case "individual": return individualPlans;
      case "collection": return collectionPlans;
      case "full": return fullPlans;
      default: return individualPlans;
    }
  };

  const calculatePrice = (basePrice: number) => {
    const period = billingPeriods.find(p => p.key === selectedBillingPeriod);
    if (!period || basePrice === 0) return { monthly: basePrice, total: basePrice, discount: 0 };
    const discountedMonthly = basePrice * (1 - period.discount / 100);
    return {
      monthly: discountedMonthly,
      total: discountedMonthly * period.months,
      discount: period.discount,
    };
  };

  const togglePlanStatus = (planId: string) => {
    // In real app, call API to toggle plan status
    console.log("Toggle plan:", planId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
            <p className="text-slate-400 mt-1">Manage subscription plans and pricing</p>
          </div>
          <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Plan
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <CreditCard className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Subscriptions</p>
                <p className="text-2xl font-bold text-white">{stats?.totalSubscriptions || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Active Subscriptions</p>
                <p className="text-2xl font-bold text-white">{stats?.activeSubscriptions || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Monthly Revenue</p>
                <p className="text-2xl font-bold text-white">${stats?.monthlyRevenue?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <Check className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Conversion Rate</p>
                <p className="text-2xl font-bold text-white">24.5%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Category Selector */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Subscription Plans</h2>
          
          <div className="flex flex-wrap gap-3 mb-6">
            {planCategories.map((category) => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  selectedCategory === category.key
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg shadow-purple-500/25"
                    : "bg-slate-700/50 text-slate-300 border-slate-600 hover:border-slate-500 hover:text-white"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Billing Period Selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {billingPeriods.map((period) => (
              <button
                key={period.key}
                onClick={() => setSelectedBillingPeriod(period.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedBillingPeriod === period.key
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {period.label}
                {period.discount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                    -{period.discount}%
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Plans Grid */}
          <div className={`grid gap-4 ${
            selectedCategory === "individual" ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" :
            selectedCategory === "collection" ? "md:grid-cols-2" :
            "md:grid-cols-2 lg:grid-cols-4"
          }`}>
            {getCurrentPlans().map((plan) => {
              const pricing = calculatePrice(plan.basePrice);
              const isEditing = editingPlan === plan.id;
              
              return (
                <div
                  key={plan.id}
                  className={`bg-slate-900/50 rounded-xl border p-5 ${
                    plan.isActive ? "border-slate-600" : "border-slate-700 opacity-60"
                  }`}
                >
                  {/* Plan Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {plan.studios.map((studio) => (
                          <span
                            key={studio}
                            className="p-1.5 rounded bg-slate-700 text-slate-300"
                            title={studio}
                          >
                            {studioIcons[studio]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingPlan(isEditing ? null : plan.id)}
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
                      >
                        {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    {(plan as any).isCustom ? (
                      <span className="text-2xl font-bold text-white">Custom</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-white">
                          ${pricing.monthly.toFixed(2)}
                        </span>
                        <span className="text-slate-400 text-sm">/mo</span>
                        {pricing.discount > 0 && (
                          <div className="text-xs text-slate-500 line-through mt-1">
                            ${plan.basePrice}/mo
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Tokens */}
                  <div className="mb-4 text-sm text-purple-400">
                    {plan.tokens === -1 ? "Unlimited" : `${plan.tokens} tokens/month`}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-4">
                    {plan.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-slate-700">
                    <button
                      onClick={() => togglePlanStatus(plan.id)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                        plan.isActive
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                      }`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </button>
                    <button 
                      className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
                      title="Edit plan"
                      aria-label="Edit plan"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Subscriptions */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Subscriptions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Period</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 text-white">john@example.com</td>
                  <td className="py-3 text-slate-300">Creative Collection</td>
                  <td className="py-3 text-slate-300">Annual</td>
                  <td className="py-3 text-white">$287.90</td>
                  <td className="py-3"><span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">Active</span></td>
                  <td className="py-3 text-slate-400">Dec 1, 2025</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 text-white">sarah@example.com</td>
                  <td className="py-3 text-slate-300">Video Studio</td>
                  <td className="py-3 text-slate-300">Monthly</td>
                  <td className="py-3 text-white">$14.99</td>
                  <td className="py-3"><span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">Active</span></td>
                  <td className="py-3 text-slate-400">Dec 1, 2025</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 text-white">mike@example.com</td>
                  <td className="py-3 text-slate-300">Professional</td>
                  <td className="py-3 text-slate-300">6 Months</td>
                  <td className="py-3 text-white">$249.90</td>
                  <td className="py-3"><span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">Active</span></td>
                  <td className="py-3 text-slate-400">Nov 30, 2025</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
