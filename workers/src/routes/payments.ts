import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';

export const paymentRoutes = new Hono<{ Bindings: Env }>();

// Fallback token packages if database not populated
const FALLBACK_PACKAGES = [
  { id: 'tokens_100', tokens: 100, price: 4.99, popular: false },
  { id: 'tokens_500', tokens: 500, price: 19.99, popular: true },
  { id: 'tokens_1000', tokens: 1000, price: 34.99, popular: false },
  { id: 'tokens_5000', tokens: 5000, price: 149.99, popular: false },
];

// Helper to get enabled payment methods from DB
async function getEnabledPaymentMethods(db: D1Database): Promise<string[]> {
  try {
    const methods = await db.prepare(
      'SELECT name FROM payment_methods WHERE is_enabled = 1'
    ).all();
    return (methods.results || []).map((m: any) => m.name);
  } catch {
    // Fallback if table doesn't exist
    return ['card', 'klarna'];
  }
}

// Helper to get Stripe key from env or KV
async function getStripeKey(env: Env): Promise<string | null> {
  // First check environment secret
  if (env.STRIPE_SECRET_KEY) {
    return env.STRIPE_SECRET_KEY;
  }
  // Fallback to KV storage
  try {
    const kvKey = await env.CACHE.get('stripe_secret_key');
    return kvKey;
  } catch {
    return null;
  }
}

// Helper to get Stripe webhook secret
async function getStripeWebhookSecret(env: Env): Promise<string | null> {
  if (env.STRIPE_WEBHOOK_SECRET) {
    return env.STRIPE_WEBHOOK_SECRET;
  }
  try {
    return await env.CACHE.get('stripe_webhook_secret');
  } catch {
    return null;
  }
}

// Get available token packages (from database)
paymentRoutes.get('/token-packages', async (c) => {
  try {
    const packages = await c.env.DB.prepare(
      'SELECT * FROM token_packages WHERE is_active = 1 ORDER BY sort_order ASC'
    ).all();
    
    if (packages.results && packages.results.length > 0) {
      const formattedPackages = packages.results.map((p: any) => ({
        id: p.id,
        tokens: p.tokens,
        price: p.price,
        popular: p.is_popular === 1,
      }));
      return c.json({ success: true, data: { packages: formattedPackages } });
    }
  } catch (err) {
    console.log('Token packages table not found, using fallback');
  }
  
  return c.json({ success: true, data: { packages: FALLBACK_PACKAGES } });
});

// Get enabled payment methods (public endpoint)
paymentRoutes.get('/methods', async (c) => {
  try {
    const methods = await c.env.DB.prepare(
      'SELECT id, name, display_name, description, icon, supported_currencies FROM payment_methods WHERE is_enabled = 1 ORDER BY sort_order ASC'
    ).all();
    
    const formattedMethods = (methods.results || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      displayName: m.display_name,
      description: m.description,
      icon: m.icon,
      supportedCurrencies: JSON.parse(m.supported_currencies || '["USD"]'),
    }));
    
    return c.json({
      success: true,
      data: { methods: formattedMethods }
    });
  } catch {
    // Fallback
    return c.json({
      success: true,
      data: {
        methods: [
          { id: 'pm_card', name: 'card', displayName: 'Credit/Debit Card', icon: 'credit-card', supportedCurrencies: ['USD'] },
          { id: 'pm_klarna', name: 'klarna', displayName: 'Klarna', icon: 'shopping-bag', supportedCurrencies: ['USD', 'EUR', 'SEK'] },
        ]
      }
    });
  }
});

// Get Swish payment data for QR code generation
paymentRoutes.get('/swish-data', async (c) => {
  try {
    const swishPhoneNumber = await c.env.CACHE.get('swish_phone_number');
    const swishPayeeName = await c.env.CACHE.get('swish_payee_name');
    const swishEnabled = await c.env.CACHE.get('swish_enabled');
    
    if (!swishPhoneNumber || swishEnabled !== 'true') {
      return c.json({ 
        success: false, 
        error: 'Swish is not configured' 
      }, 400);
    }
    
    return c.json({
      success: true,
      data: {
        phoneNumber: swishPhoneNumber,
        payeeName: swishPayeeName || 'PixelPerfect',
        enabled: true,
      }
    });
  } catch (error) {
    console.error('Get Swish data error:', error);
    return c.json({ success: false, error: 'Failed to get Swish data' }, 500);
  }
});

// Generate Swish payment URL/data for a specific amount
paymentRoutes.post('/swish-payment', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { amount, message, packageId } = await c.req.json();
    
    const swishPhoneNumber = await c.env.CACHE.get('swish_phone_number');
    const swishPayeeName = await c.env.CACHE.get('swish_payee_name');
    const swishEnabled = await c.env.CACHE.get('swish_enabled');
    
    if (!swishPhoneNumber || swishEnabled !== 'true') {
      return c.json({ 
        success: false, 
        error: 'Swish is not configured' 
      }, 400);
    }
    
    // Create a unique payment reference
    const paymentRef = `PP${Date.now().toString(36).toUpperCase()}`;
    
    // Create payment message
    const paymentMessage = message || `PixelPerfect ${packageId || 'Tokens'} - ${paymentRef}`;
    
    // Store pending Swish payment in DB for verification
    const paymentId = nanoid();
    await c.env.DB.prepare(`
      INSERT INTO payment_logs (id, user_id, payment_method, amount, currency, status, metadata, created_at)
      VALUES (?, ?, 'swish_direct', ?, 'SEK', 'pending', ?, datetime('now'))
    `).bind(
      paymentId,
      user.id,
      amount,
      JSON.stringify({ 
        reference: paymentRef, 
        packageId, 
        message: paymentMessage,
        swishNumber: swishPhoneNumber 
      })
    ).run();
    
    // Generate Swish URL for mobile app
    // Format: swish://payment?data={"version":1,"payee":{"value":"1234567890"},"amount":{"value":100},"message":{"value":"Test"}}
    const swishData = {
      version: 1,
      payee: { value: swishPhoneNumber },
      amount: { value: amount },
      message: { value: paymentMessage.substring(0, 50) }, // Swish message max 50 chars
    };
    
    const swishUrl = `swish://payment?data=${encodeURIComponent(JSON.stringify(swishData))}`;
    
    // QR code data (same format, will be rendered as QR on frontend)
    const qrData = JSON.stringify(swishData);
    
    return c.json({
      success: true,
      data: {
        paymentId,
        paymentRef,
        phoneNumber: swishPhoneNumber,
        payeeName: swishPayeeName || 'PixelPerfect',
        amount,
        currency: 'SEK',
        message: paymentMessage,
        swishUrl, // For mobile - opens Swish app
        qrData,   // For desktop - render as QR code
      }
    });
  } catch (error) {
    console.error('Create Swish payment error:', error);
    return c.json({ success: false, error: 'Failed to create Swish payment' }, 500);
  }
});

// Create checkout session for subscription
paymentRoutes.post('/create-checkout', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { planId, billingPeriod, successUrl, cancelUrl } = await c.req.json();
    
    const stripeKey = await getStripeKey(c.env);
    if (!stripeKey) {
      return c.json({ success: false, error: 'Payment not configured. Please add your Stripe API key in Payment Settings.' }, 500);
    }
    
    // Get plan details
    const plan = await c.env.DB.prepare(
      'SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1'
    ).bind(planId).first();
    
    if (!plan) {
      return c.json({ success: false, error: 'Plan not found' }, 404);
    }
    
    // Get billing period
    const bp = await c.env.DB.prepare(
      'SELECT * FROM billing_periods WHERE period = ?'
    ).bind(billingPeriod).first();
    
    if (!bp) {
      return c.json({ success: false, error: 'Invalid billing period' }, 400);
    }
    
    const price = (plan.base_price as number) * (bp.months as number) * (1 - (bp.discount_percent as number) / 100);
    const priceInCents = Math.round(price * 100);
    
    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': successUrl || `${c.env.CORS_ORIGIN}/#/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': cancelUrl || `${c.env.CORS_ORIGIN}/#/pricing`,
        'customer_email': user.email,
        'client_reference_id': user.id,
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': `${plan.name} - ${bp.label}`,
        'line_items[0][price_data][product_data][description]': plan.description as string || '',
        'line_items[0][price_data][unit_amount]': priceInCents.toString(),
        'line_items[0][quantity]': '1',
        'payment_method_types[0]': 'card',
        'payment_method_types[1]': 'klarna',
        'metadata[type]': 'subscription',
        'metadata[user_id]': user.id,
        'metadata[plan_id]': planId,
        'metadata[billing_period]': billingPeriod,
        'metadata[tokens]': (plan.tokens_per_month as number).toString(),
      }),
    });
    
    const session = await stripeResponse.json() as any;
    
    if (session.error) {
      console.error('Stripe error:', session.error);
      return c.json({ success: false, error: session.error.message }, 400);
    }
    
    return c.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    return c.json({ success: false, error: 'Failed to create checkout session' }, 500);
  }
});

// Create checkout session for token purchase
paymentRoutes.post('/create-token-checkout', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { packageId, successUrl, cancelUrl } = await c.req.json();
    
    const stripeKey = await getStripeKey(c.env);
    if (!stripeKey) {
      return c.json({ success: false, error: 'Payment not configured. Please add your Stripe API key in Payment Settings.' }, 500);
    }
    
    const tokenPackage = FALLBACK_PACKAGES.find(p => p.id === packageId);
    if (!tokenPackage) {
      return c.json({ success: false, error: 'Invalid package' }, 400);
    }
    
    const priceInCents = Math.round(tokenPackage.price * 100);
    
    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': successUrl || `${c.env.CORS_ORIGIN}/#/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': cancelUrl || `${c.env.CORS_ORIGIN}/#/tokens`,
        'customer_email': user.email,
        'client_reference_id': user.id,
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': `${tokenPackage.tokens} Tokens`,
        'line_items[0][price_data][product_data][description]': `Token pack for AI generations`,
        'line_items[0][price_data][unit_amount]': priceInCents.toString(),
        'line_items[0][quantity]': '1',
        'payment_method_types[0]': 'card',
        'payment_method_types[1]': 'klarna',
        'metadata[type]': 'tokens',
        'metadata[user_id]': user.id,
        'metadata[package_id]': packageId,
        'metadata[tokens]': tokenPackage.tokens.toString(),
      }),
    });
    
    const session = await stripeResponse.json() as any;
    
    if (session.error) {
      console.error('Stripe error:', session.error);
      return c.json({ success: false, error: session.error.message }, 400);
    }
    
    return c.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error('Create token checkout error:', error);
    return c.json({ success: false, error: 'Failed to create checkout session' }, 500);
  }
});

// Stripe webhook handler
paymentRoutes.post('/webhook', async (c) => {
  try {
    const signature = c.req.header('stripe-signature');
    const body = await c.req.text();
    
    // Verify webhook signature (simplified - in production use proper verification)
    if (!signature || !c.env.STRIPE_WEBHOOK_SECRET) {
      console.log('Webhook received without proper signature verification');
    }
    
    const event = JSON.parse(body);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      
      if (metadata.type === 'subscription') {
        // Handle subscription payment
        await handleSubscriptionPayment(c.env, metadata);
      } else if (metadata.type === 'tokens') {
        // Handle token purchase
        await handleTokenPurchase(c.env, metadata);
      }
    }
    
    return c.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Webhook handler failed' }, 400);
  }
});

// Handle subscription payment completion
async function handleSubscriptionPayment(env: Env, metadata: any) {
  const { user_id, plan_id, billing_period, tokens } = metadata;
  
  // Get billing period details
  const bp = await env.DB.prepare(
    'SELECT * FROM billing_periods WHERE period = ?'
  ).bind(billing_period).first();
  
  if (!bp) return;
  
  // Get plan details
  const plan = await env.DB.prepare(
    'SELECT * FROM subscription_plans WHERE id = ?'
  ).bind(plan_id).first();
  
  if (!plan) return;
  
  // Calculate dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + (bp.months as number));
  
  // Create subscription
  const subscriptionId = `sub_${nanoid(16)}`;
  await env.DB.prepare(`
    INSERT INTO user_subscriptions (
      id, user_id, plan_id, billing_period, status,
      current_period_start, current_period_end, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))
  `).bind(
    subscriptionId,
    user_id,
    plan_id,
    billing_period,
    startDate.toISOString(),
    endDate.toISOString()
  ).run();
  
  // Add tokens to user
  const tokenAmount = parseInt(tokens) || (plan.tokens_per_month as number) || 0;
  if (tokenAmount > 0) {
    await env.DB.prepare(
      'UPDATE users SET tokens = tokens + ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(tokenAmount, user_id).run();
  }
  
  // Record transaction
  const price = (plan.base_price as number) * (bp.months as number) * (1 - (bp.discount_percent as number) / 100);
  await env.DB.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, tokens, description, status, created_at)
    VALUES (?, ?, 'subscription', ?, ?, ?, 'completed', datetime('now'))
  `).bind(
    `txn_${nanoid(16)}`,
    user_id,
    price,
    tokenAmount,
    `Subscribed to ${plan.name} (${bp.label})`
  ).run();
}

// Handle token purchase completion
async function handleTokenPurchase(env: Env, metadata: any) {
  const { user_id, package_id, tokens } = metadata;
  
  const tokenPackage = FALLBACK_PACKAGES.find(p => p.id === package_id);
  if (!tokenPackage) return;
  
  const tokenAmount = parseInt(tokens) || tokenPackage.tokens;
  
  // Add tokens to user
  await env.DB.prepare(
    'UPDATE users SET tokens = tokens + ?, updated_at = datetime("now") WHERE id = ?'
  ).bind(tokenAmount, user_id).run();
  
  // Record transaction
  await env.DB.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, tokens, description, status, created_at)
    VALUES (?, ?, 'token_purchase', ?, ?, ?, 'completed', datetime('now'))
  `).bind(
    `txn_${nanoid(16)}`,
    user_id,
    tokenPackage.price,
    tokenAmount,
    `Purchased ${tokenAmount} tokens`
  ).run();
}

// Get payment session status
paymentRoutes.get('/session/:sessionId', authMiddleware(), async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    
    const stripeKey = await getStripeKey(c.env);
    if (!stripeKey) {
      return c.json({ success: false, error: 'Payment not configured' }, 500);
    }
    
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
      },
    });
    
    const session = await response.json() as any;
    
    if (session.error) {
      return c.json({ success: false, error: session.error.message }, 400);
    }
    
    return c.json({
      success: true,
      data: {
        status: session.payment_status,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    return c.json({ success: false, error: 'Failed to get session' }, 500);
  }
});

// Get user's transaction history
paymentRoutes.get('/transactions', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    const transactions = await c.env.DB.prepare(`
      SELECT * FROM transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).bind(user.id).all();
    
    return c.json({
      success: true,
      data: { transactions: transactions.results || [] },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return c.json({ success: false, error: 'Failed to get transactions' }, 500);
  }
});

// Create Swish payment (Sweden-specific)
paymentRoutes.post('/create-swish-payment', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { amount, packageId, planId, billingPeriod } = await c.req.json();
    
    const stripeKey = await getStripeKey(c.env);
    if (!stripeKey) {
      return c.json({ success: false, error: 'Payment not configured' }, 500);
    }
    
    // Create a payment intent with Swish
    const params = new URLSearchParams({
      'amount': Math.round(amount * 100).toString(),
      'currency': 'sek', // Swish only works with SEK
      'payment_method_types[0]': 'swish',
      'metadata[user_id]': user.id,
    });
    
    if (packageId) {
      params.append('metadata[type]', 'tokens');
      params.append('metadata[package_id]', packageId);
      const tokenPackage = FALLBACK_PACKAGES.find(p => p.id === packageId);
      if (tokenPackage) {
        params.append('metadata[tokens]', tokenPackage.tokens.toString());
      }
    } else if (planId) {
      params.append('metadata[type]', 'subscription');
      params.append('metadata[plan_id]', planId);
      params.append('metadata[billing_period]', billingPeriod);
    }
    
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    
    const paymentIntent = await response.json() as any;
    
    if (paymentIntent.error) {
      return c.json({ success: false, error: paymentIntent.error.message }, 400);
    }
    
    return c.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    console.error('Create Swish payment error:', error);
    return c.json({ success: false, error: 'Failed to create Swish payment' }, 500);
  }
});
