import React, { useState } from "react";
import { X, Check, Sparkles, Lock, Image, Video, Music, MessageSquare, Box } from "lucide-react";
import { useSubscription } from "../contexts/SubscriptionContext";
import { StudioType, BillingPeriod, STUDIO_INFO, SubscriptionPlan } from "../types/subscription";

const studioIcons: Record<StudioType, React.ReactNode> = {
  image: <Image className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  sound: <Music className="w-5 h-5" />,
  text: <MessageSquare className="w-5 h-5" />,
  "3d": <Box className="w-5 h-5" />,
};

interface UpgradeModalProps {
  isOpen: boolean;
  onClose?: () => void; // Optional - if not provided, modal cannot be closed
  targetStudio?: StudioType;
  forceRequired?: boolean; // If true, user must upgrade (cannot close)
}

export function UpgradeModal({ isOpen, onClose, targetStudio, forceRequired = false }: UpgradeModalProps) {
  const { plans, billingPeriods, subscribe, isLoading, getPlansForStudio } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>("monthly");
  const [step, setStep] = useState<"select" | "confirm">("select");
  
  if (!isOpen) return null;
  
  // Get relevant plans - either for specific studio or all plans
  const relevantPlans = targetStudio 
    ? getPlansForStudio(targetStudio)
    : plans;
  
  // Sort plans by type (individual first, then collection, then advanced)
  const sortedPlans = [...relevantPlans].sort((a, b) => {
    const typeOrder = { individual: 0, collection: 1, advanced: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });
  
  const selectedPlanDetails = plans.find(p => p.id === selectedPlan);
  const selectedPricing = selectedPlanDetails?.pricing?.find(p => p.period === selectedPeriod);
  
  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    
    const success = await subscribe(selectedPlan, selectedPeriod);
    if (success) {
      onClose?.();
    }
  };
  
  const canClose = !forceRequired && onClose;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={canClose ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              {targetStudio ? studioIcons[targetStudio] : <Sparkles className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {targetStudio 
                  ? `Unlock ${STUDIO_INFO[targetStudio].name}`
                  : "Choose Your Plan"
                }
              </h2>
              <p className="text-slate-400 text-sm">
                {forceRequired 
                  ? "A subscription is required to access this feature"
                  : "Select a plan to get started"
                }
              </p>
            </div>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition"
              aria-label="Close modal"
              title="Close"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {step === "select" ? (
            <>
              {/* Billing Period Selector */}
              <div className="flex justify-center gap-2 mb-8">
                {billingPeriods.map((bp) => (
                  <button
                    key={bp.period}
                    onClick={() => setSelectedPeriod(bp.period)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedPeriod === bp.period
                        ? "bg-purple-500 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {bp.label}
                    {bp.discountPercent > 0 && (
                      <span className="ml-2 text-xs text-emerald-400">-{bp.discountPercent}%</span>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Plans Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedPlans.map((plan) => {
                  const pricing = plan.pricing?.find(p => p.period === selectedPeriod);
                  const isSelected = selectedPlan === plan.id;
                  const isCollection = plan.type === "collection";
                  const isAdvanced = plan.type === "advanced";
                  
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                      } ${isAdvanced ? "md:col-span-2 lg:col-span-1" : ""}`}
                    >
                      {/* Badge */}
                      {(isCollection || isAdvanced) && (
                        <div className={`absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-bold ${
                          isAdvanced 
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                            : "bg-emerald-500 text-white"
                        }`}>
                          {isAdvanced ? "Best Value" : "Popular"}
                        </div>
                      )}
                      
                      {/* Plan Header */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                        <p className="text-slate-400 text-sm">{plan.description}</p>
                      </div>
                      
                      {/* Studios Included */}
                      <div className="flex gap-2 mb-4">
                        {plan.studios.map((studio) => (
                          <div
                            key={studio}
                            className={`p-2 rounded-lg bg-gradient-to-br ${STUDIO_INFO[studio].color} text-white`}
                            title={STUDIO_INFO[studio].name}
                          >
                            {studioIcons[studio]}
                          </div>
                        ))}
                      </div>
                      
                      {/* Price */}
                      <div className="mb-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-white">
                            ${pricing?.monthlyPrice.toFixed(2)}
                          </span>
                          <span className="text-slate-400">/mo</span>
                        </div>
                        {pricing && pricing.discount > 0 && (
                          <p className="text-sm text-emerald-400">
                            ${pricing.totalPrice.toFixed(2)} billed {selectedPeriod === "annual" ? "yearly" : `every ${pricing.months} months`}
                          </p>
                        )}
                      </div>
                      
                      {/* Features */}
                      <ul className="space-y-2">
                        {plan.features.slice(0, 5).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Confirmation Step */
            <div className="max-w-md mx-auto text-center">
              <div className="p-4 rounded-xl bg-slate-800 mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{selectedPlanDetails?.name}</h3>
                <p className="text-slate-400 mb-4">{selectedPlanDetails?.description}</p>
                
                <div className="flex items-center justify-center gap-2 mb-4">
                  {selectedPlanDetails?.studios.map((studio) => (
                    <div
                      key={studio}
                      className={`p-2 rounded-lg bg-gradient-to-br ${STUDIO_INFO[studio].color} text-white`}
                    >
                      {studioIcons[studio]}
                    </div>
                  ))}
                </div>
                
                <div className="text-3xl font-bold text-white">
                  ${selectedPricing?.totalPrice.toFixed(2)}
                </div>
                <p className="text-slate-400">
                  {billingPeriods.find(bp => bp.period === selectedPeriod)?.label} subscription
                </p>
              </div>
              
              <p className="text-slate-400 text-sm mb-6">
                You can cancel anytime. Your subscription will remain active until the end of the billing period.
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-6 flex justify-between items-center">
          {step === "select" ? (
            <>
              <p className="text-slate-400 text-sm">
                {selectedPlan 
                  ? `Selected: ${selectedPlanDetails?.name}`
                  : "Select a plan to continue"
                }
              </p>
              <button
                onClick={() => setStep("confirm")}
                disabled={!selectedPlan}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("select")}
                className="px-6 py-3 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition"
              >
                Back
              </button>
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Subscribe Now"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple hook to trigger upgrade modal for a specific studio
export function useUpgradeModal() {
  const { setShowUpgradeModal, setUpgradeModalStudio, hasStudioAccess, lockedStudioBehavior } = useSubscription();
  
  const checkAndPromptUpgrade = (studio: StudioType): boolean => {
    if (hasStudioAccess(studio)) {
      return true; // Has access
    }
    
    // No access - show upgrade modal
    setUpgradeModalStudio(studio);
    setShowUpgradeModal(true);
    return false;
  };
  
  return { checkAndPromptUpgrade, lockedStudioBehavior };
}
