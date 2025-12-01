import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User, SubscriptionPlan, BillingPeriod, UserSubscription } from '../types';
import { authMiddleware } from '../middleware/auth';

export const subscriptionRoutes = new Hono<{ Bindings: Env }>();

// Get all subscription plans
subscriptionRoutes.get('/plans', async (c) => {
  try {
    const plans = await c.env.DB.prepare(
      'SELECT * FROM subscription_plans WHERE is_active = 1'
    ).all<SubscriptionPlan>();
    
    const billingPeriods = await c.env.DB.prepare(
      'SELECT * FROM billing_periods ORDER BY months ASC'
    ).all<BillingPeriod>();
    
    // Calculate prices with discounts
    const plansWithPricing = plans.results?.map(plan => ({
      ...plan,
      studios: JSON.parse(plan.studios),
      features: JSON.parse(plan.features || '[]'),
      pricing: billingPeriods.results?.map(bp => ({
        period: bp.period,
        label: bp.label,
        months: bp.months,
        discount: bp.discount_percent,
        monthlyPrice: plan.base_price * (1 - bp.discount_percent / 100),
        totalPrice: plan.base_price * bp.months * (1 - bp.discount_percent / 100),
      })),
    }));
    
    return c.json({
      success: true,
      data: {
        plans: plansWithPricing,
        billingPeriods: billingPeriods.results,
      },
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return c.json({ success: false, error: 'Failed to get plans' }, 500);
  }
});

// Get user's subscriptions
subscriptionRoutes.get('/my-subscriptions', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    const subscriptions = await c.env.DB.prepare(`
      SELECT us.*, sp.name as plan_name, sp.studios, sp.features, sp.type as plan_type, sp.tokens_per_month
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? AND us.status = 'active'
    `).bind(user.id).all();
    
    const formatted = subscriptions.results?.map(sub => ({
      ...sub,
      studios: JSON.parse(sub.studios as string || '[]'),
      features: JSON.parse(sub.features as string || '[]'),
    }));
    
    return c.json({
      success: true,
      data: { subscriptions: formatted },
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return c.json({ success: false, error: 'Failed to get subscriptions' }, 500);
  }
});

// Subscribe to a plan
subscriptionRoutes.post('/subscribe', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { planId, billingPeriod } = await c.req.json();
    
    // Get plan details
    const plan = await c.env.DB.prepare(
      'SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1'
    ).bind(planId).first<SubscriptionPlan>();
    
    if (!plan) {
      return c.json({ success: false, error: 'Plan not found' }, 404);
    }
    
    // Get billing period
    const bp = await c.env.DB.prepare(
      'SELECT * FROM billing_periods WHERE period = ?'
    ).bind(billingPeriod).first<BillingPeriod>();
    
    if (!bp) {
      return c.json({ success: false, error: 'Invalid billing period' }, 400);
    }
    
    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + bp.months);
    
    // Create subscription
    const subscriptionId = `sub_${nanoid(16)}`;
    await c.env.DB.prepare(`
      INSERT INTO user_subscriptions (
        id, user_id, plan_id, billing_period, status,
        current_period_start, current_period_end, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))
    `).bind(
      subscriptionId,
      user.id,
      planId,
      billingPeriod,
      startDate.toISOString(),
      endDate.toISOString()
    ).run();
    
    // Add tokens to user based on plan
    if (plan.tokens_per_month > 0) {
      await c.env.DB.prepare(
        'UPDATE users SET tokens = tokens + ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(plan.tokens_per_month, user.id).run();
    }
    
    // Record transaction
    const price = plan.base_price * bp.months * (1 - bp.discount_percent / 100);
    await c.env.DB.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, tokens, description, status, created_at)
      VALUES (?, ?, 'subscription', ?, ?, ?, 'completed', datetime('now'))
    `).bind(
      `txn_${nanoid(16)}`,
      user.id,
      price,
      plan.tokens_per_month,
      `Subscribed to ${plan.name} (${bp.label})`
    ).run();
    
    return c.json({
      success: true,
      message: 'Subscription created successfully',
      data: { subscriptionId },
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return c.json({ success: false, error: 'Failed to create subscription' }, 500);
  }
});

// Cancel subscription
subscriptionRoutes.post('/cancel/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const subscriptionId = c.req.param('id');
    
    const subscription = await c.env.DB.prepare(
      'SELECT * FROM user_subscriptions WHERE id = ? AND user_id = ?'
    ).bind(subscriptionId, user.id).first<UserSubscription>();
    
    if (!subscription) {
      return c.json({ success: false, error: 'Subscription not found' }, 404);
    }
    
    await c.env.DB.prepare(`
      UPDATE user_subscriptions 
      SET cancel_at_period_end = 1, updated_at = datetime('now')
      WHERE id = ?
    `).bind(subscriptionId).run();
    
    return c.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return c.json({ success: false, error: 'Failed to cancel subscription' }, 500);
  }
});

// Check access to a studio
subscriptionRoutes.get('/access/:studio', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const studio = c.req.param('studio');
    
    // Get user's active subscriptions
    const subscriptions = await c.env.DB.prepare(`
      SELECT sp.studios
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? AND us.status = 'active'
    `).bind(user.id).all();
    
    // Check if any subscription includes the requested studio
    const hasAccess = subscriptions.results?.some(sub => {
      const studios = JSON.parse(sub.studios as string || '[]');
      return studios.includes(studio);
    });
    
    return c.json({
      success: true,
      data: { hasAccess: !!hasAccess },
    });
  } catch (error) {
    console.error('Check access error:', error);
    return c.json({ success: false, error: 'Failed to check access' }, 500);
  }
});
