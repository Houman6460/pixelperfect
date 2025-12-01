// Studio types
export type StudioType = "image" | "video" | "sound" | "text" | "3d";

// Billing periods
export type BillingPeriod = "monthly" | "quarterly" | "biannual" | "annual";
export type PlanType = "individual" | "collection" | "advanced";

// Billing period configuration
export interface BillingPeriodConfig {
  period: BillingPeriod;
  months: number;
  discountPercent: number;
  label: string;
}

// Pricing for a specific billing period
export interface PlanPricing {
  period: BillingPeriod;
  label: string;
  months: number;
  totalPrice: number;
  monthlyPrice: number;
  discount: number;
}

// Subscription plan
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: PlanType;
  studios: StudioType[];
  basePrice: number;
  features: string[];
  tokensPerMonth: number;
  maxImageSize: number;
  maxBatchSize: number;
  isActive: boolean;
  sortOrder: number;
  pricing?: PlanPricing[];
}

// User's active subscription
export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  billingPeriod: BillingPeriod;
  status: "active" | "cancelled" | "expired" | "past_due";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  tokensRemaining: number;
  amountPaid: number;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  plan?: SubscriptionPlan;
}

// Access information
export interface StudioAccess {
  accessibleStudios: StudioType[];
  lockedStudioBehavior: "hide" | "popup";
  allStudios: StudioType[];
}

// Studio metadata for UI
export interface StudioInfo {
  id: StudioType;
  name: string;
  description: string;
  icon: string;
  color: string;
  route: string;
}

export const STUDIO_INFO: Record<StudioType, StudioInfo> = {
  image: {
    id: "image",
    name: "Image Studio",
    description: "AI image generation, enhancement, and editing",
    icon: "Image",
    color: "from-purple-500 to-pink-500",
    route: "/dashboard/enhance",
  },
  video: {
    id: "video",
    name: "Video Studio",
    description: "Create and edit videos with AI",
    icon: "Video",
    color: "from-blue-500 to-cyan-500",
    route: "/dashboard/video",
  },
  sound: {
    id: "sound",
    name: "Sound Studio",
    description: "Generate music and audio with AI",
    icon: "Music",
    color: "from-green-500 to-emerald-500",
    route: "/dashboard/music",
  },
  text: {
    id: "text",
    name: "Text Studio",
    description: "AI-powered text and chat",
    icon: "MessageSquare",
    color: "from-orange-500 to-amber-500",
    route: "/dashboard/text",
  },
  "3d": {
    id: "3d",
    name: "3D Studio",
    description: "Generate 3D models and assets",
    icon: "Box",
    color: "from-indigo-500 to-violet-500",
    route: "/dashboard/3d",
  },
};
