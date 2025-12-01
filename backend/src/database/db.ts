import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import path from "path";

// Studio/Component types
export type StudioType = "image" | "video" | "sound" | "text" | "3d";

// Types
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "user" | "admin";
  subscriptionId: string | null;
  tokensBalance: number;
  tokensUsed: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Legacy subscription interface (keeping for backward compatibility)
export interface Subscription {
  id: string;
  name: string;
  price: number;
  tokensPerMonth: number;
  maxImageSize: number; // in MB
  maxBatchSize: number;
  features: string[];
  isActive: boolean;
}

// New subscription plan types
export type BillingPeriod = "monthly" | "quarterly" | "biannual" | "annual";
export type PlanType = "individual" | "collection" | "advanced";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: PlanType;
  studios: StudioType[]; // Which studios are included
  basePrice: number; // Monthly base price
  features: string[];
  tokensPerMonth: number;
  maxImageSize: number;
  maxBatchSize: number;
  isActive: boolean;
  sortOrder: number;
}

export interface BillingPeriodConfig {
  period: BillingPeriod;
  months: number;
  discountPercent: number;
  label: string;
}

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
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

// Legacy UserSubscription kept for migration
export interface LegacyUserSubscription {
  id: string;
  userId: string;
  subscriptionId: string;
  status: "active" | "cancelled" | "expired";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  tokensRemaining: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "subscription" | "token_purchase" | "usage";
  amount: number;
  tokens: number;
  description: string;
  createdAt: string;
}

export interface ProcessingJob {
  id: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  inputFiles: string[];
  outputFiles: string[];
  tokensUsed: number;
  settings: {
    scale: number;
    mode: string;
  };
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface TokenRule {
  id: string;
  name: string;
  description: string;
  baseTokens: number; // per image
  perMegapixel: number; // additional tokens per megapixel
  multipliers: {
    scale2x: number;
    scale4x: number;
    reimagine: number;
    faces: number;
  };
  isActive: boolean;
}

export interface MusicWorkflow {
  id: string;
  name: string;
  description?: string;
  category?: string;
  // Model settings
  modelId: string;
  modelType: "vocal" | "instrumental";
  // Content settings
  prompt: string;
  lyrics?: string;
  style?: string;
  tags?: string;
  negativePrompt?: string;
  // Suno-specific
  sunoTitle?: string;
  sunoCustomMode?: boolean;
  sunoInstrumental?: boolean;
  // Audio parameters
  duration: number;
  temperature?: number;
  topK?: number;
  topP?: number;
  bpm?: number;
  // Instruments & Vocals
  instruments: Array<{ id: string; volume: number }>;
  vocals: Array<{ id: string; volume: number }>;
  // Metadata
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  userId?: string;
}

export interface DatabaseSchema {
  users: User[];
  subscriptions: Subscription[]; // Legacy
  subscriptionPlans: SubscriptionPlan[]; // New plans
  billingPeriods: BillingPeriodConfig[];
  userSubscriptions: UserSubscription[];
  transactions: Transaction[];
  processingJobs: ProcessingJob[];
  tokenRules: TokenRule[];
  musicWorkflows: MusicWorkflow[];
  settings: {
    appName: string;
    tokenPricePerUnit: number; // price per 100 tokens
    minTokenPurchase: number;
    lockedStudioBehavior: "hide" | "popup"; // How to handle non-subscribed studios
  };
}

// Default billing periods with discounts
const defaultBillingPeriods: BillingPeriodConfig[] = [
  { period: "monthly", months: 1, discountPercent: 0, label: "Monthly" },
  { period: "quarterly", months: 3, discountPercent: 10, label: "3 Months" },
  { period: "biannual", months: 6, discountPercent: 15, label: "6 Months" },
  { period: "annual", months: 12, discountPercent: 20, label: "Annual" },
];

// Default subscription plans
const defaultSubscriptionPlans: SubscriptionPlan[] = [
  // Individual Studio Plans
  {
    id: "image-studio",
    name: "Image Studio",
    description: "Full access to AI image generation, enhancement, and editing",
    type: "individual",
    studios: ["image"],
    basePrice: 9.99,
    features: [
      "AI Image Generation",
      "Image Enhancement & Upscaling",
      "Background Removal",
      "Style Transfer",
      "500 tokens/month",
    ],
    tokensPerMonth: 500,
    maxImageSize: 50,
    maxBatchSize: 50,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "video-studio",
    name: "Video Studio",
    description: "Create and edit videos with AI-powered tools",
    type: "individual",
    studios: ["video"],
    basePrice: 14.99,
    features: [
      "AI Video Generation",
      "Video Enhancement",
      "Text-to-Video",
      "Image-to-Video",
      "750 tokens/month",
    ],
    tokensPerMonth: 750,
    maxImageSize: 100,
    maxBatchSize: 20,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "sound-studio",
    name: "Sound Studio",
    description: "Generate music and audio with AI",
    type: "individual",
    studios: ["sound"],
    basePrice: 12.99,
    features: [
      "AI Music Generation",
      "Voice Cloning",
      "Audio Enhancement",
      "Stem Separation",
      "600 tokens/month",
    ],
    tokensPerMonth: 600,
    maxImageSize: 0,
    maxBatchSize: 10,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "text-studio",
    name: "Text Studio",
    description: "AI-powered text generation and chat",
    type: "individual",
    studios: ["text"],
    basePrice: 7.99,
    features: [
      "GPT-4o & Claude Access",
      "AI Chat & Completion",
      "Content Writing",
      "Code Generation",
      "400 tokens/month",
    ],
    tokensPerMonth: 400,
    maxImageSize: 0,
    maxBatchSize: 0,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: "3d-studio",
    name: "3D Studio",
    description: "Generate 3D models and assets",
    type: "individual",
    studios: ["3d"],
    basePrice: 14.99,
    features: [
      "Text-to-3D Generation",
      "Image-to-3D Conversion",
      "3D Model Export",
      "Multiple Formats",
      "500 tokens/month",
    ],
    tokensPerMonth: 500,
    maxImageSize: 50,
    maxBatchSize: 10,
    isActive: true,
    sortOrder: 5,
  },
  // Collection Plans
  {
    id: "creative-collection",
    name: "Creative Collection",
    description: "Image, Video, and Sound studios bundled together",
    type: "collection",
    studios: ["image", "video", "sound"],
    basePrice: 29.99,
    features: [
      "Image Studio - Full Access",
      "Video Studio - Full Access",
      "Sound Studio - Full Access",
      "Priority Processing",
      "1500 tokens/month",
      "Save 20% vs Individual",
    ],
    tokensPerMonth: 1500,
    maxImageSize: 100,
    maxBatchSize: 100,
    isActive: true,
    sortOrder: 10,
  },
  // Advanced/All-Access Plan
  {
    id: "advanced-collection",
    name: "Advanced Collection",
    description: "Complete access to all 5 studios",
    type: "advanced",
    studios: ["image", "video", "sound", "text", "3d"],
    basePrice: 49.99,
    features: [
      "All 5 Studios - Full Access",
      "Priority Processing",
      "API Access",
      "3000 tokens/month",
      "Dedicated Support",
      "Save 35% vs Individual",
    ],
    tokensPerMonth: 3000,
    maxImageSize: 100,
    maxBatchSize: 200,
    isActive: true,
    sortOrder: 20,
  },
];

// Default data
const defaultData: DatabaseSchema = {
  users: [],
  subscriptions: [
    // Legacy subscriptions (kept for backward compatibility)
    {
      id: "free",
      name: "Free",
      price: 0,
      tokensPerMonth: 50,
      maxImageSize: 5,
      maxBatchSize: 5,
      features: ["50 tokens/month", "Up to 5MB images", "Basic upscaling"],
      isActive: true,
    },
    {
      id: "starter",
      name: "Starter",
      price: 9.99,
      tokensPerMonth: 500,
      maxImageSize: 15,
      maxBatchSize: 20,
      features: ["500 tokens/month", "Up to 15MB images", "Batch processing (20)", "Priority processing"],
      isActive: true,
    },
    {
      id: "pro",
      name: "Professional",
      price: 29.99,
      tokensPerMonth: 2000,
      maxImageSize: 50,
      maxBatchSize: 100,
      features: ["2000 tokens/month", "Up to 50MB images", "Batch processing (100)", "Priority processing", "API access"],
      isActive: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 99.99,
      tokensPerMonth: 10000,
      maxImageSize: 100,
      maxBatchSize: 500,
      features: ["10000 tokens/month", "Unlimited image size", "Batch processing (500)", "Priority processing", "API access", "Dedicated support"],
      isActive: true,
    },
  ],
  subscriptionPlans: defaultSubscriptionPlans,
  billingPeriods: defaultBillingPeriods,
  userSubscriptions: [],
  transactions: [],
  processingJobs: [],
  tokenRules: [
    {
      id: "default",
      name: "Default Token Calculation",
      description: "Standard token consumption rules",
      baseTokens: 1, // 1 token per image base
      perMegapixel: 0.5, // 0.5 tokens per megapixel
      multipliers: {
        scale2x: 1,
        scale4x: 2,
        reimagine: 3,
        faces: 1.5,
      },
      isActive: true,
    },
  ],
  musicWorkflows: [],
  settings: {
    appName: "PixelPerfect AI",
    tokenPricePerUnit: 0.99, // $0.99 per 100 tokens
    minTokenPurchase: 100,
    lockedStudioBehavior: "popup", // Show popup when accessing locked studio
  },
};

// Initialize database
const dbPath = path.join(process.cwd(), "data", "db.json");
const adapter = new JSONFile<DatabaseSchema>(dbPath);
export const db = new Low<DatabaseSchema>(adapter, defaultData);

// Ensure data directory exists
import fs from "fs";
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize DB
export async function initDatabase() {
  await db.read();
  if (!db.data) {
    db.data = defaultData;
  }
  // Ensure all collections exist
  db.data.users = db.data.users || [];
  db.data.subscriptions = db.data.subscriptions || defaultData.subscriptions;
  db.data.subscriptionPlans = db.data.subscriptionPlans || defaultSubscriptionPlans;
  db.data.billingPeriods = db.data.billingPeriods || defaultBillingPeriods;
  db.data.userSubscriptions = db.data.userSubscriptions || [];
  db.data.transactions = db.data.transactions || [];
  db.data.processingJobs = db.data.processingJobs || [];
  db.data.tokenRules = db.data.tokenRules || defaultData.tokenRules;
  db.data.musicWorkflows = db.data.musicWorkflows || [];
  db.data.settings = db.data.settings || defaultData.settings;
  
  // Ensure lockedStudioBehavior exists in settings
  if (!db.data.settings.lockedStudioBehavior) {
    db.data.settings.lockedStudioBehavior = "popup";
  }
  
  // Create default admin if not exists
  const adminExists = db.data.users.some(u => u.role === "admin");
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    db.data.users.push({
      id: uuidv4(),
      email: "admin@pixelperfect.ai",
      password: hashedPassword,
      name: "Admin",
      role: "admin",
      subscriptionId: "enterprise",
      tokensBalance: 999999,
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    });
  }
  
  await db.write();
  console.log("[DB] Database initialized");
}

// User functions
export async function createUser(email: string, password: string, name: string): Promise<User> {
  await db.read();
  
  const existingUser = db.data!.users.find(u => u.email === email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user: User = {
    id: uuidv4(),
    email,
    password: hashedPassword,
    name,
    role: "user",
    subscriptionId: "free",
    tokensBalance: 50, // Free tier tokens
    tokensUsed: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
  };
  
  db.data!.users.push(user);
  await db.write();
  
  return user;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  await db.read();
  return db.data!.users.find(u => u.email === email);
}

export async function findUserById(id: string): Promise<User | undefined> {
  await db.read();
  return db.data!.users.find(u => u.id === id);
}

export async function validatePassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password);
}

export async function updateUserTokens(userId: string, tokensToDeduct: number): Promise<void> {
  await db.read();
  const user = db.data!.users.find(u => u.id === userId);
  if (user) {
    user.tokensBalance -= tokensToDeduct;
    user.tokensUsed += tokensToDeduct;
    user.updatedAt = new Date().toISOString();
    await db.write();
  }
}

export async function addTokensToUser(userId: string, tokens: number): Promise<void> {
  await db.read();
  const user = db.data!.users.find(u => u.id === userId);
  if (user) {
    user.tokensBalance += tokens;
    user.updatedAt = new Date().toISOString();
    await db.write();
  }
}

// Transaction functions
export async function createTransaction(
  userId: string,
  type: Transaction["type"],
  amount: number,
  tokens: number,
  description: string
): Promise<Transaction> {
  await db.read();
  const transaction: Transaction = {
    id: uuidv4(),
    userId,
    type,
    amount,
    tokens,
    description,
    createdAt: new Date().toISOString(),
  };
  db.data!.transactions.push(transaction);
  await db.write();
  return transaction;
}

// Token calculation
export async function calculateTokensForImage(
  imageSizeMB: number,
  megapixels: number,
  scale: number,
  mode: "enhance" | "reimagine",
  hasFaces: boolean
): Promise<number> {
  await db.read();
  const rule = db.data!.tokenRules.find(r => r.isActive);
  if (!rule) return 1;
  
  let tokens = rule.baseTokens;
  tokens += megapixels * rule.perMegapixel;
  
  // Apply scale multiplier
  if (scale >= 4) {
    tokens *= rule.multipliers.scale4x;
  } else if (scale >= 2) {
    tokens *= rule.multipliers.scale2x;
  }
  
  // Apply mode multiplier
  if (mode === "reimagine") {
    tokens *= rule.multipliers.reimagine;
  }
  
  // Apply face multiplier
  if (hasFaces) {
    tokens *= rule.multipliers.faces;
  }
  
  return Math.ceil(tokens);
}

// Get all users (admin)
export async function getAllUsers(): Promise<User[]> {
  await db.read();
  return db.data!.users;
}

// Get all subscriptions
export async function getSubscriptions(): Promise<Subscription[]> {
  await db.read();
  return db.data!.subscriptions;
}

// Update user (admin)
export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  await db.read();
  const userIndex = db.data!.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return null;
  
  db.data!.users[userIndex] = {
    ...db.data!.users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await db.write();
  return db.data!.users[userIndex];
}

// Get user transactions
export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  await db.read();
  return db.data!.transactions.filter(t => t.userId === userId);
}

// Get all transactions (admin)
export async function getAllTransactions(): Promise<Transaction[]> {
  await db.read();
  return db.data!.transactions;
}

// Get settings
export async function getSettings() {
  await db.read();
  return db.data!.settings;
}

// Update settings (admin)
export async function updateSettings(updates: Partial<DatabaseSchema["settings"]>) {
  await db.read();
  db.data!.settings = { ...db.data!.settings, ...updates };
  await db.write();
  return db.data!.settings;
}

// Get token rules
export async function getTokenRules(): Promise<TokenRule[]> {
  await db.read();
  return db.data!.tokenRules;
}

// Update token rule (admin)
export async function updateTokenRule(ruleId: string, updates: Partial<TokenRule>): Promise<TokenRule | null> {
  await db.read();
  const ruleIndex = db.data!.tokenRules.findIndex(r => r.id === ruleId);
  if (ruleIndex === -1) return null;
  
  db.data!.tokenRules[ruleIndex] = {
    ...db.data!.tokenRules[ruleIndex],
    ...updates,
  };
  await db.write();
  return db.data!.tokenRules[ruleIndex];
}

// Analytics for admin
export async function getAnalytics() {
  await db.read();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const totalUsers = db.data!.users.length;
  const activeUsers = db.data!.users.filter(u => u.isActive).length;
  const totalTokensUsed = db.data!.users.reduce((sum, u) => sum + u.tokensUsed, 0);
  
  const recentTransactions = db.data!.transactions.filter(
    t => new Date(t.createdAt) > thirtyDaysAgo
  );
  const revenue = recentTransactions
    .filter(t => t.type !== "usage")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const subscriptionBreakdown = db.data!.subscriptions.map(sub => ({
    name: sub.name,
    count: db.data!.users.filter(u => u.subscriptionId === sub.id).length,
  }));
  
  return {
    totalUsers,
    activeUsers,
    totalTokensUsed,
    revenueThisMonth: revenue,
    subscriptionBreakdown,
    recentTransactions: recentTransactions.slice(-20),
  };
}

// ==========================================
// New Subscription System Functions
// ==========================================

// Get all subscription plans
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  await db.read();
  return db.data!.subscriptionPlans.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

// Get subscription plan by ID
export async function getSubscriptionPlanById(planId: string): Promise<SubscriptionPlan | undefined> {
  await db.read();
  return db.data!.subscriptionPlans.find(p => p.id === planId);
}

// Get billing periods
export async function getBillingPeriods(): Promise<BillingPeriodConfig[]> {
  await db.read();
  return db.data!.billingPeriods;
}

// Calculate price with discount
export function calculatePriceWithDiscount(
  basePrice: number,
  billingPeriod: BillingPeriod,
  billingPeriods: BillingPeriodConfig[]
): { totalPrice: number; monthlyPrice: number; discount: number; months: number } {
  const config = billingPeriods.find(bp => bp.period === billingPeriod);
  if (!config) {
    return { totalPrice: basePrice, monthlyPrice: basePrice, discount: 0, months: 1 };
  }
  
  const totalWithoutDiscount = basePrice * config.months;
  const discountAmount = totalWithoutDiscount * (config.discountPercent / 100);
  const totalPrice = totalWithoutDiscount - discountAmount;
  const monthlyPrice = totalPrice / config.months;
  
  return {
    totalPrice: Math.round(totalPrice * 100) / 100,
    monthlyPrice: Math.round(monthlyPrice * 100) / 100,
    discount: config.discountPercent,
    months: config.months,
  };
}

// Get user's active subscriptions
export async function getUserActiveSubscriptions(userId: string): Promise<UserSubscription[]> {
  await db.read();
  return db.data!.userSubscriptions.filter(
    sub => sub.userId === userId && sub.status === "active"
  );
}

// Check if user has access to a studio
export async function userHasStudioAccess(userId: string, studio: StudioType): Promise<boolean> {
  await db.read();
  
  // Admin always has access
  const user = db.data!.users.find(u => u.id === userId);
  if (user?.role === "admin") return true;
  
  // Check active subscriptions
  const activeSubscriptions = await getUserActiveSubscriptions(userId);
  
  for (const userSub of activeSubscriptions) {
    const plan = db.data!.subscriptionPlans.find(p => p.id === userSub.planId);
    if (plan && plan.studios.includes(studio)) {
      return true;
    }
  }
  
  return false;
}

// Get all studios user has access to
export async function getUserAccessibleStudios(userId: string): Promise<StudioType[]> {
  await db.read();
  
  // Admin has access to all
  const user = db.data!.users.find(u => u.id === userId);
  if (user?.role === "admin") {
    return ["image", "video", "sound", "text", "3d"];
  }
  
  const activeSubscriptions = await getUserActiveSubscriptions(userId);
  const accessibleStudios = new Set<StudioType>();
  
  for (const userSub of activeSubscriptions) {
    const plan = db.data!.subscriptionPlans.find(p => p.id === userSub.planId);
    if (plan) {
      plan.studios.forEach(studio => accessibleStudios.add(studio));
    }
  }
  
  return Array.from(accessibleStudios);
}

// Create user subscription
export async function createUserSubscription(
  userId: string,
  planId: string,
  billingPeriod: BillingPeriod,
  amountPaid: number,
  stripeSubscriptionId?: string,
  stripeCustomerId?: string
): Promise<UserSubscription> {
  await db.read();
  
  const plan = db.data!.subscriptionPlans.find(p => p.id === planId);
  if (!plan) {
    throw new Error("Subscription plan not found");
  }
  
  const billingConfig = db.data!.billingPeriods.find(bp => bp.period === billingPeriod);
  if (!billingConfig) {
    throw new Error("Invalid billing period");
  }
  
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + billingConfig.months);
  
  const subscription: UserSubscription = {
    id: uuidv4(),
    userId,
    planId,
    billingPeriod,
    status: "active",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    tokensRemaining: plan.tokensPerMonth * billingConfig.months,
    amountPaid,
    stripeSubscriptionId,
    stripeCustomerId,
    cancelAtPeriodEnd: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  
  db.data!.userSubscriptions.push(subscription);
  
  // Add tokens to user
  const user = db.data!.users.find(u => u.id === userId);
  if (user) {
    user.tokensBalance += plan.tokensPerMonth;
    user.updatedAt = now.toISOString();
  }
  
  await db.write();
  return subscription;
}

// Cancel user subscription
export async function cancelUserSubscription(
  subscriptionId: string,
  cancelImmediately: boolean = false
): Promise<UserSubscription | null> {
  await db.read();
  
  const subIndex = db.data!.userSubscriptions.findIndex(s => s.id === subscriptionId);
  if (subIndex === -1) return null;
  
  const subscription = db.data!.userSubscriptions[subIndex];
  
  if (cancelImmediately) {
    subscription.status = "cancelled";
  } else {
    subscription.cancelAtPeriodEnd = true;
  }
  subscription.updatedAt = new Date().toISOString();
  
  await db.write();
  return subscription;
}

// Update subscription plan (admin)
export async function updateSubscriptionPlan(
  planId: string,
  updates: Partial<SubscriptionPlan>
): Promise<SubscriptionPlan | null> {
  await db.read();
  
  const planIndex = db.data!.subscriptionPlans.findIndex(p => p.id === planId);
  if (planIndex === -1) return null;
  
  db.data!.subscriptionPlans[planIndex] = {
    ...db.data!.subscriptionPlans[planIndex],
    ...updates,
  };
  
  await db.write();
  return db.data!.subscriptionPlans[planIndex];
}

// Get locked studio behavior setting
export async function getLockedStudioBehavior(): Promise<"hide" | "popup"> {
  await db.read();
  return db.data!.settings.lockedStudioBehavior || "popup";
}
