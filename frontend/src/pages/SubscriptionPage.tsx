import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Check, 
  Sparkles, 
  Image, 
  Video, 
  Music, 
  MessageSquare, 
  Box,
  Crown,
  Zap,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { useSubscription } from "../contexts/SubscriptionContext";
import { useAuth } from "../contexts/AuthContext";
import { StudioType, BillingPeriod, STUDIO_INFO } from "../types/subscription";
import DashboardLayout from "../components/DashboardLayout";

const studioIcons: Record<StudioType, React.ReactNode> = {
  image: <Image className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  sound: <Music className="w-5 h-5" />,
  text: <MessageSquare className="w-5 h-5" />,
  "3d": <Box className="w-5 h-5" />,
};

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { 
    plans, 
    billingPeriods, 
    userSubscriptions, 
    subscribe, 
    isLoading,
    accessibleStudios 
  } = useSubscription();
  
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>("monthly");
  const [subscribingTo, setSubscribingTo] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"individual" | "collection" | "full">("individual");
  
  // Group plans by type
  const individualPlans = plans.filter(p => p.type === "individual");
  const collectionPlans = plans.filter(p => p.type === "collection");
  const advancedPlans = plans.filter(p => p.type === "advanced");
  
  // Plan categories for tabs
  const planCategories = [
    { key: "individual" as const, label: "Individual Studios", description: "Subscribe to specific studios" },
    { key: "collection" as const, label: "Collections", description: "Bundled studio packages" },
    { key: "full" as const, label: "Full Plans", description: "Complete tier-based plans" },
  ];
  
  // Get current plans based on selected category
  const getCurrentPlans = () => {
    switch (selectedCategory) {
      case "individual": return individualPlans;
      case "collection": return [...collectionPlans, ...advancedPlans];
      case "full": return plans; // Show all for full
      default: return individualPlans;
    }
  };
  
  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    setSubscribingTo(planId);
    const success = await subscribe(planId, selectedPeriod);
    setSubscribingTo(null);
    
    if (success) {
      navigate("/dashboard");
    }
  };
  
  // Check if user already has a plan that includes certain studios
  const hasAccessTo = (studios: StudioType[]) => {
    return studios.every(s => accessibleStudios.includes(s));
  };
  
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-950 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
              <Crown className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-medium">Choose Your Creative Power</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Subscription Plans
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Subscribe to individual studios or save with our collection bundles. 
              All plans include full access to selected AI tools.
            </p>
          </div>
          
          {/* Plan Category Selector */}
          <div className="flex justify-center gap-2 mb-6">
            {planCategories.map((category) => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  selectedCategory === category.key
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg shadow-purple-500/25"
                    : "bg-slate-800/50 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
          
          {/* Billing Period Selector */}
          <div className="flex justify-center gap-2 mb-12">
            {billingPeriods.map((bp) => (
              <button
                key={bp.period}
                onClick={() => setSelectedPeriod(bp.period)}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                  selectedPeriod === bp.period
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {bp.label}
                {bp.discountPercent > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                    Save {bp.discountPercent}%
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Plans Grid - based on selected category */}
          <div className={`grid gap-4 ${
            selectedCategory === "individual" ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" :
            selectedCategory === "collection" ? "md:grid-cols-2 max-w-3xl mx-auto" :
            "md:grid-cols-2 lg:grid-cols-4"
          }`}>
            {getCurrentPlans().map((plan) => {
              const pricing = plan.pricing?.find(p => p.period === selectedPeriod);
              const hasAccess = hasAccessTo(plan.studios);
              
              return (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-2xl border transition-all ${
                    hasAccess 
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  {/* Studio Icons */}
                  <div className="flex gap-2 mb-4">
                    {plan.studios.map((studio) => (
                      <div 
                        key={studio}
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${STUDIO_INFO[studio].color} flex items-center justify-center text-white`}
                      >
                        {studioIcons[studio]}
                      </div>
                    ))}
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                  
                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        ${pricing?.monthlyPrice.toFixed(2)}
                      </span>
                      <span className="text-slate-400">/mo</span>
                    </div>
                    {pricing && pricing.discount > 0 && (
                      <p className="text-xs text-slate-500">
                        ${pricing.totalPrice.toFixed(2)} billed {selectedPeriod === "annual" ? "yearly" : `every ${pricing.months} months`}
                      </p>
                    )}
                  </div>
                  
                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {plan.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={hasAccess || subscribingTo === plan.id}
                    className={`w-full py-3 rounded-xl font-medium transition-all ${
                      hasAccess
                        ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                        : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                    } disabled:opacity-50`}
                  >
                    {subscribingTo === plan.id ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : hasAccess ? (
                      "Active"
                    ) : (
                      "Subscribe"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          
          {/* Current Subscriptions */}
          {userSubscriptions.length > 0 && (
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-6">Your Active Subscriptions</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userSubscriptions.map((sub) => (
                  <div key={sub.id} className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-2">{sub.plan?.name}</h3>
                    <p className="text-slate-400 text-sm mb-4">
                      {sub.billingPeriod} • Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sub.plan?.studios.map((studio) => (
                        <div
                          key={studio}
                          className={`p-2 rounded-lg bg-gradient-to-br ${STUDIO_INFO[studio].color} text-white`}
                        >
                          {studioIcons[studio]}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {/* FAQ or Help Section */}
          <section className="text-center">
            <p className="text-slate-400">
              Need help choosing? <a href="/contact" className="text-purple-400 hover:underline">Contact our team</a>
            </p>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
