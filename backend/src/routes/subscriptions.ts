import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  getSubscriptionPlans,
  getSubscriptionPlanById,
  getBillingPeriods,
  calculatePriceWithDiscount,
  getUserActiveSubscriptions,
  getUserAccessibleStudios,
  userHasStudioAccess,
  createUserSubscription,
  cancelUserSubscription,
  getLockedStudioBehavior,
  findUserById,
  createTransaction,
  StudioType,
  BillingPeriod,
} from "../database/db";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "pixelperfect-secret-key-change-in-production";

// Middleware to verify JWT token
function authenticateToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    (req as any).user = user;
    next();
  });
}

// GET /api/subscriptions/plans - Get all available subscription plans
router.get("/plans", async (_req: Request, res: Response) => {
  try {
    const plans = await getSubscriptionPlans();
    const billingPeriods = await getBillingPeriods();
    
    // Calculate prices for each plan with each billing period
    const plansWithPricing = plans.map(plan => ({
      ...plan,
      pricing: billingPeriods.map(bp => {
        const priceInfo = calculatePriceWithDiscount(plan.basePrice, bp.period, billingPeriods);
        return {
          period: bp.period,
          label: bp.label,
          ...priceInfo,
        };
      }),
    }));
    
    res.json({
      plans: plansWithPricing,
      billingPeriods,
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({ error: "Failed to fetch subscription plans" });
  }
});

// GET /api/subscriptions/plans/:planId - Get specific plan details
router.get("/plans/:planId", async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const plan = await getSubscriptionPlanById(planId);
    
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }
    
    const billingPeriods = await getBillingPeriods();
    const pricing = billingPeriods.map(bp => {
      const priceInfo = calculatePriceWithDiscount(plan.basePrice, bp.period, billingPeriods);
      return {
        period: bp.period,
        label: bp.label,
        ...priceInfo,
      };
    });
    
    res.json({
      ...plan,
      pricing,
    });
  } catch (error) {
    console.error("Error fetching plan:", error);
    res.status(500).json({ error: "Failed to fetch plan" });
  }
});

// GET /api/subscriptions/my-subscriptions - Get user's active subscriptions
router.get("/my-subscriptions", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const subscriptions = await getUserActiveSubscriptions(userId);
    
    // Enrich with plan details
    const enrichedSubs = await Promise.all(
      subscriptions.map(async (sub) => {
        const plan = await getSubscriptionPlanById(sub.planId);
        return {
          ...sub,
          plan,
        };
      })
    );
    
    res.json({ subscriptions: enrichedSubs });
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

// GET /api/subscriptions/access - Get user's studio access
router.get("/access", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const accessibleStudios = await getUserAccessibleStudios(userId);
    const lockedBehavior = await getLockedStudioBehavior();
    
    res.json({
      accessibleStudios,
      lockedStudioBehavior: lockedBehavior,
      allStudios: ["image", "video", "sound", "text", "3d"] as StudioType[],
    });
  } catch (error) {
    console.error("Error checking access:", error);
    res.status(500).json({ error: "Failed to check access" });
  }
});

// GET /api/subscriptions/access/:studio - Check access to specific studio
router.get("/access/:studio", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const studio = req.params.studio as StudioType;
    
    const validStudios: StudioType[] = ["image", "video", "sound", "text", "3d"];
    if (!validStudios.includes(studio)) {
      return res.status(400).json({ error: "Invalid studio type" });
    }
    
    const hasAccess = await userHasStudioAccess(userId, studio);
    const lockedBehavior = await getLockedStudioBehavior();
    
    res.json({
      studio,
      hasAccess,
      lockedStudioBehavior: lockedBehavior,
    });
  } catch (error) {
    console.error("Error checking studio access:", error);
    res.status(500).json({ error: "Failed to check studio access" });
  }
});

// POST /api/subscriptions/subscribe - Subscribe to a plan
router.post("/subscribe", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { planId, billingPeriod } = req.body;
    
    if (!planId || !billingPeriod) {
      return res.status(400).json({ error: "planId and billingPeriod are required" });
    }
    
    // Validate plan exists
    const plan = await getSubscriptionPlanById(planId);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }
    
    // Calculate price
    const billingPeriods = await getBillingPeriods();
    const pricing = calculatePriceWithDiscount(plan.basePrice, billingPeriod, billingPeriods);
    
    // In a real implementation, this would integrate with Stripe
    // For now, we'll create the subscription directly
    const subscription = await createUserSubscription(
      userId,
      planId,
      billingPeriod as BillingPeriod,
      pricing.totalPrice
    );
    
    // Create transaction record
    await createTransaction(
      userId,
      "subscription",
      pricing.totalPrice,
      plan.tokensPerMonth,
      `Subscribed to ${plan.name} (${billingPeriod})`
    );
    
    res.json({
      success: true,
      subscription,
      message: `Successfully subscribed to ${plan.name}`,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

// POST /api/subscriptions/cancel/:subscriptionId - Cancel a subscription
router.post("/cancel/:subscriptionId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { subscriptionId } = req.params;
    const { immediate } = req.body;
    
    // Verify subscription belongs to user
    const userSubs = await getUserActiveSubscriptions(userId);
    const subscription = userSubs.find(s => s.id === subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }
    
    const cancelled = await cancelUserSubscription(subscriptionId, immediate === true);
    
    res.json({
      success: true,
      subscription: cancelled,
      message: immediate 
        ? "Subscription cancelled immediately"
        : "Subscription will be cancelled at the end of the billing period",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// GET /api/subscriptions/calculate-price - Calculate price for a plan
router.get("/calculate-price", async (req: Request, res: Response) => {
  try {
    const { planId, billingPeriod } = req.query;
    
    if (!planId || !billingPeriod) {
      return res.status(400).json({ error: "planId and billingPeriod are required" });
    }
    
    const plan = await getSubscriptionPlanById(planId as string);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }
    
    const billingPeriods = await getBillingPeriods();
    const pricing = calculatePriceWithDiscount(
      plan.basePrice,
      billingPeriod as BillingPeriod,
      billingPeriods
    );
    
    res.json({
      planId,
      planName: plan.name,
      billingPeriod,
      ...pricing,
    });
  } catch (error) {
    console.error("Error calculating price:", error);
    res.status(500).json({ error: "Failed to calculate price" });
  }
});

export default router;
