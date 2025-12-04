import React, { useState, useEffect } from "react";
import {
  CreditCard, Wallet, Smartphone, ShoppingBag, Check, X, Loader2,
  DollarSign, Package, Plus, Trash2, Edit2, TrendingUp, AlertCircle,
  Settings, ToggleLeft, ToggleRight, RefreshCw, ExternalLink, Copy, Key,
} from "lucide-react";
import { adminApi } from "../lib/api";
import DashboardLayout from "../components/DashboardLayout";

interface PaymentMethod {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  requiresSetup: boolean;
  setupStatus: string;
  supportedCurrencies: string[];
  minAmount: number;
  maxAmount: number | null;
  processingFeePercent: number;
  processingFeeFixed: number;
  sortOrder: number;
}

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  currency: string;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface PaymentStats {
  totalRevenue: number;
  monthlyRevenue: number;
  transactionCount: number;
  recentTransactions: any[];
}

const iconMap: Record<string, React.ReactNode> = {
  "credit-card": <CreditCard className="w-5 h-5" />,
  "wallet": <Wallet className="w-5 h-5" />,
  "smartphone": <Smartphone className="w-5 h-5" />,
  "shopping-bag": <ShoppingBag className="w-5 h-5" />,
  "apple": <Smartphone className="w-5 h-5" />,
};

export default function AdminPaymentSettings() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingMethod, setTogglingMethod] = useState<string | null>(null);
  const [editingPackage, setEditingPackage] = useState<TokenPackage | null>(null);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: "", tokens: 0, price: 0, isPopular: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  // PayPal config
  const [paypalClientId, setPaypalClientId] = useState("");
  const [paypalClientSecret, setPaypalClientSecret] = useState("");
  const [paypalSandbox, setPaypalSandbox] = useState(true);
  const [paypalConfigured, setPaypalConfigured] = useState(false);
  const [paypalMaskedId, setPaypalMaskedId] = useState<string | null>(null);
  const [savingPaypal, setSavingPaypal] = useState(false);
  // Swish Direct config
  const [swishPhoneNumber, setSwishPhoneNumber] = useState("");
  const [swishPayeeName, setSwishPayeeName] = useState("");
  const [swishEnabled, setSwishEnabled] = useState(false);
  const [swishConfigured, setSwishConfigured] = useState(false);
  const [swishMaskedPhone, setSwishMaskedPhone] = useState<string | null>(null);
  const [savingSwish, setSavingSwish] = useState(false);

  useEffect(() => {
    loadData();
    loadPaymentConfig();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [methodsRes, packagesRes, statsRes] = await Promise.all([
        adminApi.getPaymentMethods(),
        adminApi.getTokenPackages(),
        adminApi.getPaymentStats(),
      ]);

      if (methodsRes.data?.data) {
        setPaymentMethods(methodsRes.data.data.methods || []);
        setStripeConfigured(methodsRes.data.data.stripeConfigured);
        setWebhookConfigured(methodsRes.data.data.webhookConfigured);
      }
      if (packagesRes.data?.data) {
        setTokenPackages(packagesRes.data.data.packages || []);
      }
      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load payment settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentConfig = async () => {
    try {
      const res = await adminApi.getAllPaymentConfig();
      if (res.data?.data) {
        // Stripe
        setStripeConfigured(res.data.data.stripe?.configured || false);
        setWebhookConfigured(res.data.data.stripe?.webhookConfigured || false);
        setMaskedKey(res.data.data.stripe?.maskedKey || null);
        // PayPal
        setPaypalConfigured(res.data.data.paypal?.configured || false);
        setPaypalMaskedId(res.data.data.paypal?.maskedClientId || null);
        setPaypalSandbox(res.data.data.paypal?.sandbox || true);
        // Swish
        setSwishConfigured(res.data.data.swish?.configured || false);
        setSwishEnabled(res.data.data.swish?.enabled || false);
        setSwishMaskedPhone(res.data.data.swish?.maskedPhone || null);
        if (res.data.data.swish?.payeeName) {
          setSwishPayeeName(res.data.data.swish.payeeName);
        }
      }
    } catch (err) {
      console.error("Failed to load payment config:", err);
    }
  };

  const saveStripeConfig = async () => {
    if (!stripeSecretKey && !stripeWebhookSecret) {
      setError("Please enter at least one key to save");
      return;
    }
    
    setSavingConfig(true);
    setError(null);
    try {
      const res = await adminApi.saveStripeConfig({
        secretKey: stripeSecretKey || undefined,
        webhookSecret: stripeWebhookSecret || undefined,
      });
      
      if (res.data?.success) {
        setSuccess("Stripe configuration saved successfully!");
        setStripeSecretKey("");
        setStripeWebhookSecret("");
        setTimeout(() => setSuccess(null), 3000);
        loadPaymentConfig();
        loadData();
      } else {
        setError(res.data?.error || "Failed to save configuration");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const savePaypalConfig = async () => {
    if (!paypalClientId && !paypalClientSecret) {
      setError("Please enter PayPal credentials");
      return;
    }
    
    setSavingPaypal(true);
    setError(null);
    try {
      const res = await adminApi.savePayPalConfig({
        clientId: paypalClientId || undefined,
        clientSecret: paypalClientSecret || undefined,
        sandbox: paypalSandbox,
      });
      
      if (res.data?.success) {
        setSuccess("PayPal configuration saved successfully!");
        setPaypalClientId("");
        setPaypalClientSecret("");
        setTimeout(() => setSuccess(null), 3000);
        loadPaymentConfig();
      } else {
        setError(res.data?.error || "Failed to save PayPal configuration");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save PayPal configuration");
    } finally {
      setSavingPaypal(false);
    }
  };

  const saveSwishConfig = async () => {
    if (!swishPhoneNumber) {
      setError("Please enter your Swish phone number");
      return;
    }
    
    setSavingSwish(true);
    setError(null);
    try {
      const res = await adminApi.saveSwishConfig({
        phoneNumber: swishPhoneNumber,
        payeeName: swishPayeeName || undefined,
        enabled: swishEnabled,
      });
      
      if (res.data?.success) {
        setSuccess("Swish configuration saved successfully!");
        setSwishPhoneNumber("");
        setTimeout(() => setSuccess(null), 3000);
        loadPaymentConfig();
      } else {
        setError(res.data?.error || "Failed to save Swish configuration");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save Swish configuration");
    } finally {
      setSavingSwish(false);
    }
  };

  const toggleMethod = async (id: string) => {
    setTogglingMethod(id);
    setError(null);
    try {
      const res = await adminApi.togglePaymentMethod(id);
      if (res.data?.success) {
        setPaymentMethods(prev =>
          prev.map(m => m.id === id ? { ...m, isEnabled: !m.isEnabled } : m)
        );
        setSuccess("Payment method updated");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.data?.error || "Failed to toggle payment method");
      }
    } catch (err: any) {
      console.error("Failed to toggle payment method:", err);
      setError(err.response?.data?.error || "Failed to toggle payment method");
    } finally {
      setTogglingMethod(null);
    }
  };

  const addPackage = async () => {
    try {
      await adminApi.createTokenPackage({
        name: newPackage.name || `${newPackage.tokens} Tokens`,
        tokens: newPackage.tokens,
        price: newPackage.price,
        isPopular: newPackage.isPopular,
        sortOrder: tokenPackages.length,
      });
      setShowAddPackage(false);
      setNewPackage({ name: "", tokens: 0, price: 0, isPopular: false });
      loadData();
    } catch (err) {
      console.error("Failed to add package:", err);
    }
  };

  const updatePackage = async (pkg: TokenPackage) => {
    try {
      await adminApi.updateTokenPackage(pkg.id, pkg);
      setEditingPackage(null);
      loadData();
    } catch (err) {
      console.error("Failed to update package:", err);
    }
  };

  const deletePackage = async (id: string) => {
    if (!confirm("Delete this token package?")) return;
    try {
      await adminApi.deleteTokenPackage(id);
      loadData();
    } catch (err) {
      console.error("Failed to delete package:", err);
    }
  };

  const togglePackageActive = async (pkg: TokenPackage) => {
    try {
      await adminApi.updateTokenPackage(pkg.id, { isActive: !pkg.isActive });
      setTokenPackages(prev =>
        prev.map(p => p.id === pkg.id ? { ...p, isActive: !p.isActive } : p)
      );
    } catch (err) {
      console.error("Failed to toggle package:", err);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <CreditCard className="w-6 h-6" />
              </div>
              Payment Settings
            </h1>
            <p className="text-slate-400 mt-1">
              Manage payment methods, token packages, and view revenue
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Refresh data"
            aria-label="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300" title="Dismiss error" aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-400" />
            <p className="text-sm text-emerald-300">{success}</p>
          </div>
        )}

        {/* Stripe Configuration Section */}
        <div className={`rounded-xl border ${stripeConfigured ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              {stripeConfigured ? (
                <Check className="w-5 h-5 text-emerald-400 mt-0.5" />
              ) : (
                <Key className="w-5 h-5 text-amber-400 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${stripeConfigured ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {stripeConfigured ? 'Stripe Connected' : 'Connect Your Stripe Account'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {stripeConfigured 
                    ? `API Key: ✓ Configured • Webhook: ${webhookConfigured ? '✓ Configured' : '⚠ Not Configured'}`
                    : 'Connect Stripe to start accepting payments'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {showSetupGuide ? 'Hide' : 'Setup Guide'}
            </button>
          </div>
          
          {showSetupGuide && (
            <div className="p-4 border-t border-slate-700/50 space-y-4">
              <h3 className="font-medium text-white">Connect Your Stripe Account</h3>
              
              {/* Current Status */}
              {maskedKey && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-300">
                    Current API Key: <code className="text-emerald-400">{maskedKey}</code>
                  </p>
                </div>
              )}
              
              {/* Step 1: Get Keys */}
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-sm font-medium text-cyan-400 mb-2">Step 1: Get Your Stripe API Keys</p>
                <p className="text-xs text-slate-400 mb-2">
                  Get your API keys from Stripe Dashboard → Developers → API keys
                </p>
                <a 
                  href="https://dashboard.stripe.com/apikeys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                >
                  Open Stripe Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              
              {/* Step 2: Enter Keys */}
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-sm font-medium text-cyan-400 mb-3">Step 2: Enter Your API Keys</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Stripe Secret Key <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="sk_live_... or sk_test_..."
                      value={stripeSecretKey}
                      onChange={(e) => setStripeSecretKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">Find this in Stripe Dashboard → Developers → API keys → Secret key</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Webhook Secret (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="whsec_..."
                      value={stripeWebhookSecret}
                      onChange={(e) => setStripeWebhookSecret(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">Required for automatic payment confirmation via webhooks</p>
                  </div>
                  
                  <button
                    onClick={saveStripeConfig}
                    disabled={savingConfig || (!stripeSecretKey && !stripeWebhookSecret)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
              
              {/* Step 3: Webhook Setup */}
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-sm font-medium text-cyan-400 mb-2">Step 3: Set Up Webhook (Recommended)</p>
                <p className="text-xs text-slate-400 mb-2">
                  Create a webhook in Stripe pointing to this URL:
                </p>
                <div className="flex items-center gap-2 bg-slate-800 rounded p-2">
                  <code className="text-xs text-emerald-400 flex-1 break-all">https://pixelperfect-api.houman-ghavamzadeh.workers.dev/api/payments/webhook</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://pixelperfect-api.houman-ghavamzadeh.workers.dev/api/payments/webhook');
                      setSuccess('Webhook URL copied!');
                      setTimeout(() => setSuccess(null), 2000);
                    }}
                    className="p-1 rounded hover:bg-slate-700"
                    title="Copy URL"
                  >
                    <Copy className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Select event: <code className="text-cyan-400">checkout.session.completed</code></p>
              </div>
              
              {/* Step 4: Enable Payment Methods */}
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-sm font-medium text-cyan-400 mb-2">Step 4: Enable Payment Methods in Stripe</p>
                <p className="text-xs text-slate-400 mb-2">
                  Enable Cards, Klarna, and Swish in your Stripe Dashboard
                </p>
                <a 
                  href="https://dashboard.stripe.com/settings/payment_methods" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                >
                  Stripe Payment Methods <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* PayPal Configuration */}
        <div className={`rounded-xl border ${paypalConfigured ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-800/50 border-slate-700/50'}`}>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${paypalConfigured ? 'bg-blue-500/20' : 'bg-slate-700'}`}>
                <Wallet className={`w-5 h-5 ${paypalConfigured ? 'text-blue-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${paypalConfigured ? 'text-blue-300' : 'text-slate-300'}`}>
                  PayPal {paypalConfigured ? '(Connected)' : '(Not Connected)'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {paypalConfigured 
                    ? `Client ID: ${paypalMaskedId} • Mode: ${paypalSandbox ? 'Sandbox' : 'Live'}`
                    : 'Connect PayPal to accept PayPal payments'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-700/50 space-y-4">
            <div className="p-3 rounded-lg bg-slate-900/50">
              <p className="text-sm font-medium text-blue-400 mb-2">Get PayPal API Credentials</p>
              <p className="text-xs text-slate-400 mb-2">
                Get your Client ID and Secret from PayPal Developer Dashboard
              </p>
              <a 
                href="https://developer.paypal.com/dashboard/applications" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              >
                PayPal Developer Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">PayPal Client ID</label>
                <input
                  type="text"
                  placeholder="Your PayPal Client ID"
                  value={paypalClientId}
                  onChange={(e) => setPaypalClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">PayPal Secret</label>
                <input
                  type="password"
                  placeholder="Your PayPal Secret"
                  value={paypalClientSecret}
                  onChange={(e) => setPaypalClientSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="paypalSandbox"
                  checked={paypalSandbox}
                  onChange={(e) => setPaypalSandbox(e.target.checked)}
                  className="rounded border-slate-600"
                />
                <label htmlFor="paypalSandbox" className="text-sm text-slate-400">
                  Sandbox Mode (for testing)
                </label>
              </div>
              
              <button
                onClick={savePaypalConfig}
                disabled={savingPaypal || (!paypalClientId && !paypalClientSecret)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPaypal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {savingPaypal ? 'Saving...' : 'Save PayPal Configuration'}
              </button>
            </div>
          </div>
        </div>

        {/* Swish Direct Configuration */}
        <div className={`rounded-xl border ${swishConfigured ? 'bg-green-500/10 border-green-500/20' : 'bg-slate-800/50 border-slate-700/50'}`}>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${swishConfigured ? 'bg-green-500/20' : 'bg-slate-700'}`}>
                <Smartphone className={`w-5 h-5 ${swishConfigured ? 'text-green-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${swishConfigured ? 'text-green-300' : 'text-slate-300'}`}>
                  Swish Direct {swishConfigured ? '(Connected)' : '(Not Connected)'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {swishConfigured 
                    ? `Phone: ${swishMaskedPhone} • QR Code enabled`
                    : 'Add your Swish number for direct QR code payments'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-700/50 space-y-4">
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <p className="text-xs text-green-300">
                <strong>How it works:</strong> Users scan a QR code (desktop) or tap to open Swish app (mobile) with your number and amount pre-filled. Payment goes directly to your Swish account.
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Your Swish Phone Number</label>
                <input
                  type="tel"
                  placeholder="070 123 45 67 or 0701234567"
                  value={swishPhoneNumber}
                  onChange={(e) => setSwishPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-green-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Swedish mobile number linked to your Swish account</p>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Display Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Your name or business name"
                  value={swishPayeeName}
                  onChange={(e) => setSwishPayeeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="swishEnabled"
                  checked={swishEnabled}
                  onChange={(e) => setSwishEnabled(e.target.checked)}
                  className="rounded border-slate-600"
                />
                <label htmlFor="swishEnabled" className="text-sm text-slate-400">
                  Enable Swish Direct payments
                </label>
              </div>
              
              <button
                onClick={saveSwishConfig}
                disabled={savingSwish || !swishPhoneNumber}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSwish ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {savingSwish ? 'Saving...' : 'Save Swish Configuration'}
              </button>
            </div>
            
            <div className="p-3 rounded-lg bg-slate-900/50">
              <p className="text-sm font-medium text-green-400 mb-2">About Swish</p>
              <p className="text-xs text-slate-400 mb-2">
                Swish is Sweden's most popular mobile payment app. When enabled, users in Sweden can pay directly from their bank account.
              </p>
              <a 
                href="https://www.swish.nu" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                Learn more about Swish <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Payment Methods Info */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <p className="text-sm text-slate-400 mb-3">
            <strong className="text-white">Payment Method Providers:</strong>
          </p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${stripeConfigured ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
              <span className="text-slate-300">Cards, Klarna, Apple Pay</span>
              <span className="text-slate-500">→ Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${paypalConfigured ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
              <span className="text-slate-300">PayPal</span>
              <span className="text-slate-500">→ PayPal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${swishConfigured ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
              <span className="text-slate-300">Swish QR</span>
              <span className="text-slate-500">→ Direct</span>
            </div>
          </div>
        </div>

        {/* Revenue Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">This Month</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">${stats.monthlyRevenue.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Package className="w-4 h-4" />
                <span className="text-sm">Transactions</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.transactionCount}</p>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-cyan-400" />
            Payment Methods
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Enable or disable payment methods for your customers
          </p>
          
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`p-4 rounded-lg border ${
                  method.isEnabled 
                    ? 'bg-slate-900/50 border-slate-700' 
                    : 'bg-slate-900/30 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${method.isEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-500'}`}>
                      {iconMap[method.icon] || <CreditCard className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-white">{method.displayName}</p>
                      <p className="text-xs text-slate-400">{method.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-slate-500">
                      {method.supportedCurrencies.join(", ")}
                    </div>
                    <button
                      onClick={() => toggleMethod(method.id)}
                      disabled={togglingMethod === method.id}
                      title={method.isEnabled ? 'Disable payment method' : 'Enable payment method'}
                      className={`p-2 rounded-lg transition ${
                        method.isEnabled
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      } disabled:opacity-50`}
                    >
                      {togglingMethod === method.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : method.isEnabled ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Token Packages */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                Token Packages
              </h2>
              <p className="text-sm text-slate-400">
                Configure token packages available for purchase
              </p>
            </div>
            <button
              onClick={() => setShowAddPackage(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-400 transition"
            >
              <Plus className="w-4 h-4" />
              Add Package
            </button>
          </div>

          {/* Add Package Form */}
          {showAddPackage && (
            <div className="mb-4 p-4 rounded-lg bg-slate-900/50 border border-slate-700">
              <h3 className="font-medium text-white mb-3">New Token Package</h3>
              <div className="grid grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={newPackage.name}
                  onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                />
                <input
                  type="number"
                  placeholder="Tokens"
                  value={newPackage.tokens || ""}
                  onChange={(e) => setNewPackage({ ...newPackage, tokens: parseInt(e.target.value) || 0 })}
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                />
                <input
                  type="number"
                  placeholder="Price ($)"
                  step="0.01"
                  value={newPackage.price || ""}
                  onChange={(e) => setNewPackage({ ...newPackage, price: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={newPackage.isPopular}
                      onChange={(e) => setNewPackage({ ...newPackage, isPopular: e.target.checked })}
                      className="rounded"
                    />
                    Popular
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={addPackage}
                  disabled={!newPackage.tokens || !newPackage.price}
                  className="px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-400 transition disabled:opacity-50"
                >
                  Create Package
                </button>
                <button
                  onClick={() => setShowAddPackage(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Package List */}
          <div className="space-y-2">
            {tokenPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`p-4 rounded-lg border ${
                  pkg.isActive 
                    ? 'bg-slate-900/50 border-slate-700' 
                    : 'bg-slate-900/30 border-slate-800 opacity-60'
                }`}
              >
                {editingPackage?.id === pkg.id ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editingPackage.name}
                      onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                      aria-label="Package name"
                      placeholder="Package name"
                    />
                    <input
                      type="number"
                      value={editingPackage.tokens}
                      onChange={(e) => setEditingPackage({ ...editingPackage, tokens: parseInt(e.target.value) || 0 })}
                      className="w-24 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                      aria-label="Token amount"
                      placeholder="Tokens"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={editingPackage.price}
                      onChange={(e) => setEditingPackage({ ...editingPackage, price: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                      aria-label="Price"
                      placeholder="Price"
                    />
                    <button
                      onClick={() => updatePackage(editingPackage)}
                      className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      title="Save changes"
                      aria-label="Save changes"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingPackage(null)}
                      className="p-2 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600"
                      title="Cancel editing"
                      aria-label="Cancel editing"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium text-white">{pkg.name}</p>
                        <p className="text-sm text-slate-400">{pkg.tokens.toLocaleString()} tokens</p>
                      </div>
                      {pkg.isPopular && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-white">${pkg.price}</p>
                      <button
                        onClick={() => setEditingPackage(pkg)}
                        className="p-2 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition"
                        title="Edit package"
                        aria-label="Edit package"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => togglePackageActive(pkg)}
                        className={`p-2 rounded-lg transition ${
                          pkg.isActive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-slate-500'
                        }`}
                      >
                        {pkg.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deletePackage(pkg.id)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                        title="Delete package"
                        aria-label="Delete package"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        {stats && stats.recentTransactions.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Recent Transactions
            </h2>
            <div className="space-y-2">
              {stats.recentTransactions.map((txn: any) => (
                <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                  <div>
                    <p className="text-white font-medium">{txn.description}</p>
                    <p className="text-xs text-slate-400">
                      {txn.user_email || 'Unknown user'} • {new Date(txn.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-medium">${txn.amount?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-slate-400">{txn.tokens} tokens</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
