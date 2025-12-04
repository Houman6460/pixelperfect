import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { subscriptionApi } from "../lib/api";
import {
  StudioType,
  BillingPeriod,
  SubscriptionPlan,
  UserSubscription,
  BillingPeriodConfig,
} from "../types/subscription";

interface SubscriptionContextType {
  // State
  plans: SubscriptionPlan[];
  billingPeriods: BillingPeriodConfig[];
  userSubscriptions: UserSubscription[];
  accessibleStudios: StudioType[];
  lockedStudioBehavior: "hide" | "popup";
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchPlans: () => Promise<void>;
  fetchUserSubscriptions: () => Promise<void>;
  fetchAccess: () => Promise<void>;
  subscribe: (planId: string, billingPeriod: BillingPeriod) => Promise<boolean>;
  cancelSubscription: (subscriptionId: string, immediate?: boolean) => Promise<boolean>;
  hasStudioAccess: (studio: StudioType) => boolean;
  getPlansForStudio: (studio: StudioType) => SubscriptionPlan[];
  
  // UI state
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  upgradeModalStudio: StudioType | null;
  setUpgradeModalStudio: (studio: StudioType | null) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// All studios for admin access
const ALL_STUDIOS: StudioType[] = ['image', 'video', 'sound', 'text', '3d'];

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // State
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriodConfig[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [accessibleStudios, setAccessibleStudios] = useState<StudioType[]>([]);
  const [lockedStudioBehavior, setLockedStudioBehavior] = useState<"hide" | "popup">("popup");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state for upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalStudio, setUpgradeModalStudio] = useState<StudioType | null>(null);
  
  // Fetch available plans
  const fetchPlans = useCallback(async () => {
    try {
      const response = await subscriptionApi.getPlans();
      if (response.data?.success && response.data?.data) {
        // Ensure studios and features are arrays (might be JSON strings from API)
        const rawPlans = response.data.data.plans || [];
        const parsedPlans = rawPlans.map((plan: any) => ({
          ...plan,
          studios: Array.isArray(plan.studios) ? plan.studios : 
            (typeof plan.studios === 'string' ? JSON.parse(plan.studios) : []),
          features: Array.isArray(plan.features) ? plan.features :
            (typeof plan.features === 'string' ? JSON.parse(plan.features) : []),
        }));
        setPlans(parsedPlans);
        setBillingPeriods(response.data.data.billingPeriods || []);
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      setError("Failed to fetch subscription plans");
    }
  }, []);
  
  // Fetch user's subscriptions
  const fetchUserSubscriptions = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await subscriptionApi.getMySubscriptions();
      if (response.data?.success && response.data?.data) {
        setUserSubscriptions(response.data.data.subscriptions || []);
      }
    } catch (err) {
      console.error("Failed to fetch user subscriptions:", err);
    }
  }, [isAuthenticated]);
  
  // Fetch user's access - derive from subscriptions
  const fetchAccess = useCallback(async () => {
    if (!isAuthenticated) {
      setAccessibleStudios([]);
      return;
    }
    
    // Admins get access to all studios
    if (isAdmin) {
      setAccessibleStudios([...ALL_STUDIOS]);
      return;
    }
    
    try {
      // Get accessible studios from user's active subscriptions
      const allStudios: StudioType[] = [];
      if (Array.isArray(userSubscriptions)) {
        userSubscriptions.forEach((sub: any) => {
          // Handle studios as JSON string or array
          let studios = sub.studios || [];
          if (typeof studios === 'string') {
            try { studios = JSON.parse(studios); } catch { studios = []; }
          }
          if (Array.isArray(studios)) {
            studios.forEach((studio: StudioType) => {
              if (!allStudios.includes(studio)) {
                allStudios.push(studio);
              }
            });
          }
        });
      }
      setAccessibleStudios(allStudios);
    } catch (err) {
      console.error("Failed to fetch access:", err);
      setAccessibleStudios([]);
    }
  }, [isAuthenticated, isAdmin, userSubscriptions]);
  
  // Subscribe to a plan
  const subscribe = useCallback(async (planId: string, billingPeriod: BillingPeriod): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await subscriptionApi.subscribe(planId, billingPeriod);
      
      if (response.data?.success) {
        // Refresh subscriptions and access
        await fetchUserSubscriptions();
        setIsLoading(false);
        return true;
      }
      
      setError(response.data?.error || "Failed to subscribe");
      setIsLoading(false);
      return false;
    } catch (err: any) {
      console.error("Failed to subscribe:", err);
      setError(err.response?.data?.error || "Failed to subscribe");
      setIsLoading(false);
      return false;
    }
  }, [isAuthenticated, fetchUserSubscriptions]);
  
  // Cancel subscription
  const cancelSubscription = useCallback(async (subscriptionId: string, immediate = false): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await subscriptionApi.cancelSubscription(subscriptionId);
      
      if (response.data?.success) {
        // Refresh subscriptions
        await fetchUserSubscriptions();
        setIsLoading(false);
        return true;
      }
      
      setError(response.data?.error || "Failed to cancel subscription");
      setIsLoading(false);
      return false;
    } catch (err: any) {
      console.error("Failed to cancel subscription:", err);
      setError(err.response?.data?.error || "Failed to cancel subscription");
      setIsLoading(false);
      return false;
    }
  }, [isAuthenticated, fetchUserSubscriptions]);
  
  // Check if user has access to a studio
  const hasStudioAccess = useCallback((studio: StudioType): boolean => {
    // Admins have access to all studios
    if (isAdmin) return true;
    return accessibleStudios.includes(studio);
  }, [accessibleStudios, isAdmin]);
  
  // Get plans that include a specific studio
  const getPlansForStudio = useCallback((studio: StudioType): SubscriptionPlan[] => {
    if (!Array.isArray(plans)) return [];
    return plans.filter(plan => {
      const studios = Array.isArray(plan.studios) ? plan.studios : [];
      return studios.includes(studio);
    });
  }, [plans]);
  
  // Initial load
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);
  
  // Load user data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserSubscriptions();
      fetchAccess();
    } else {
      setUserSubscriptions([]);
      setAccessibleStudios([]);
    }
  }, [isAuthenticated, fetchUserSubscriptions, fetchAccess]);
  
  return (
    <SubscriptionContext.Provider
      value={{
        plans,
        billingPeriods,
        userSubscriptions,
        accessibleStudios,
        lockedStudioBehavior,
        isLoading,
        error,
        fetchPlans,
        fetchUserSubscriptions,
        fetchAccess,
        subscribe,
        cancelSubscription,
        hasStudioAccess,
        getPlansForStudio,
        showUpgradeModal,
        setShowUpgradeModal,
        upgradeModalStudio,
        setUpgradeModalStudio,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
