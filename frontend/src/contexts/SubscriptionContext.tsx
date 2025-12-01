import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import {
  StudioType,
  BillingPeriod,
  SubscriptionPlan,
  UserSubscription,
  BillingPeriodConfig,
} from "../types/subscription";

const API_BASE = "http://localhost:4000";

// Helper to get token from localStorage
const getToken = () => localStorage.getItem("token");

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

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
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
      const response = await axios.get(`${API_BASE}/api/subscriptions/plans`);
      setPlans(response.data.plans);
      setBillingPeriods(response.data.billingPeriods);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      setError("Failed to fetch subscription plans");
    }
  }, []);
  
  // Fetch user's subscriptions
  const fetchUserSubscriptions = useCallback(async () => {
    const token = getToken();
    if (!isAuthenticated || !token) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/subscriptions/my-subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserSubscriptions(response.data.subscriptions);
    } catch (err) {
      console.error("Failed to fetch user subscriptions:", err);
    }
  }, [isAuthenticated]);
  
  // Fetch user's access
  const fetchAccess = useCallback(async () => {
    const token = getToken();
    if (!isAuthenticated || !token) {
      // Not logged in - no access
      setAccessibleStudios([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API_BASE}/api/subscriptions/access`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccessibleStudios(response.data.accessibleStudios);
      setLockedStudioBehavior(response.data.lockedStudioBehavior);
    } catch (err) {
      console.error("Failed to fetch access:", err);
      setAccessibleStudios([]);
    }
  }, [isAuthenticated]);
  
  // Subscribe to a plan
  const subscribe = useCallback(async (planId: string, billingPeriod: BillingPeriod): Promise<boolean> => {
    const token = getToken();
    if (!isAuthenticated || !token) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await axios.post(`${API_BASE}/api/subscriptions/subscribe`, { planId, billingPeriod }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh subscriptions and access
      await fetchUserSubscriptions();
      await fetchAccess();
      
      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error("Failed to subscribe:", err);
      setError(err.response?.data?.error || "Failed to subscribe");
      setIsLoading(false);
      return false;
    }
  }, [isAuthenticated, fetchUserSubscriptions, fetchAccess]);
  
  // Cancel subscription
  const cancelSubscription = useCallback(async (subscriptionId: string, immediate = false): Promise<boolean> => {
    const token = getToken();
    if (!isAuthenticated || !token) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await axios.post(`${API_BASE}/api/subscriptions/cancel/${subscriptionId}`, { immediate }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh subscriptions
      await fetchUserSubscriptions();
      if (immediate) {
        await fetchAccess();
      }
      
      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error("Failed to cancel subscription:", err);
      setError(err.response?.data?.error || "Failed to cancel subscription");
      setIsLoading(false);
      return false;
    }
  }, [isAuthenticated, fetchUserSubscriptions, fetchAccess]);
  
  // Check if user has access to a studio
  const hasStudioAccess = useCallback((studio: StudioType): boolean => {
    return accessibleStudios.includes(studio);
  }, [accessibleStudios]);
  
  // Get plans that include a specific studio
  const getPlansForStudio = useCallback((studio: StudioType): SubscriptionPlan[] => {
    return plans.filter(plan => plan.studios.includes(studio));
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
