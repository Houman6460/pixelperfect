import React, { useState, useEffect } from "react";
import { Coins, Calculator, CreditCard, Loader2, History, X, Smartphone, Wallet, ShoppingBag, ExternalLink, QrCode, Check, Zap, Settings, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { paymentApi, userApi } from "../lib/api";
import DashboardLayout from "../components/DashboardLayout";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams } from "react-router-dom";

interface TokenPackage {
  id: string;
  tokens: number;
  price: number;
  popular: boolean;
}

interface PaymentConfig {
  stripe: { configured: boolean; supportedMethods: string[] };
  paypal: { configured: boolean };
  swish: { configured: boolean; phoneNumber?: string; payeeName?: string };
}

// Fallback packages if API is not available
const defaultPackages: TokenPackage[] = [
  { id: 'tokens_100', tokens: 100, price: 4.99, popular: false },
  { id: 'tokens_500', tokens: 500, price: 19.99, popular: true },
  { id: 'tokens_1000', tokens: 1000, price: 34.99, popular: false },
  { id: 'tokens_5000', tokens: 5000, price: 149.99, popular: false },
];

export default function TokensPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState<TokenPackage[]>(defaultPackages);
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Checkout modal state
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [swishPaymentData, setSwishPaymentData] = useState<any>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  // Token calculator state
  const [calcImageSize, setCalcImageSize] = useState(2);
  const [calcScale, setCalcScale] = useState(2);
  const [calcImages, setCalcImages] = useState(10);

  // Auto-refill state
  const [activeTab, setActiveTab] = useState<'purchase' | 'auto-refill'>(
    searchParams.get('tab') === 'auto-refill' ? 'auto-refill' : 'purchase'
  );
  const [autoRefillSettings, setAutoRefillSettings] = useState<any>(null);
  const [savingAutoRefill, setSavingAutoRefill] = useState(false);
  const [autoRefillForm, setAutoRefillForm] = useState({
    enabled: false,
    threshold: 10,
    package_id: '',
    max_refills_per_month: 5,
  });

  // Load packages and payment config
  useEffect(() => {
    loadPackages();
    loadPaymentConfig();
    loadAutoRefillSettings();
  }, []);

  const loadAutoRefillSettings = async () => {
    try {
      const res = await userApi.getAutoRefill();
      if (res.data?.data) {
        setAutoRefillSettings(res.data.data);
        if (res.data.data.settings) {
          setAutoRefillForm({
            enabled: !!res.data.data.settings.enabled,
            threshold: res.data.data.settings.threshold || 10,
            package_id: res.data.data.settings.package_id || '',
            max_refills_per_month: res.data.data.settings.max_refills_per_month || 5,
          });
        }
      }
    } catch (e) {
      console.error('Failed to load auto-refill settings:', e);
    }
  };

  const saveAutoRefillSettings = async () => {
    setSavingAutoRefill(true);
    try {
      await userApi.updateAutoRefill(autoRefillForm);
      setMessage({ type: 'success', text: 'Auto-refill settings saved!' });
      loadAutoRefillSettings();
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save auto-refill settings' });
    } finally {
      setSavingAutoRefill(false);
    }
  };

  const loadPackages = async () => {
    try {
      const response = await paymentApi.getTokenPackages();
      if (response.data?.data?.packages) {
        setPackages(response.data.data.packages);
      }
    } catch (err) {
      console.error("Failed to load packages:", err);
    }
  };

  const loadPaymentConfig = async () => {
    try {
      const response = await paymentApi.getPaymentConfig();
      if (response.data?.data) {
        setPaymentConfig(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load payment config:", err);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await paymentApi.getTransactions();
      if (response.data?.data?.transactions) {
        setTransactions(response.data.data.transactions);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
    }
  };

  const calculateTokens = () => {
    const baseTokens = 1 + calcImageSize * 0.5;
    const scaleMultiplier = calcScale >= 4 ? 2 : 1;
    const tokensPerImage = Math.ceil(baseTokens * scaleMultiplier);
    return tokensPerImage * calcImages;
  };

  const openCheckout = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setSelectedMethod(null);
    setSwishPaymentData(null);
    setShowQRCode(false);
  };

  const closeCheckout = () => {
    setSelectedPackage(null);
    setSelectedMethod(null);
    setSwishPaymentData(null);
    setShowQRCode(false);
  };

  const handlePayment = async () => {
    if (!selectedPackage || !selectedMethod) return;
    
    setProcessingPayment(true);
    setMessage(null);

    try {
      if (selectedMethod === 'stripe') {
        // Stripe Checkout (Card, Klarna)
        const response = await paymentApi.createTokenCheckout(selectedPackage.id);
        if (response.data?.success && response.data?.data?.url) {
          window.location.href = response.data.data.url;
        } else {
          setMessage({ type: "error", text: response.data?.error || "Failed to start checkout" });
        }
      } else if (selectedMethod === 'swish') {
        // Swish Direct - Generate QR code
        const response = await paymentApi.createSwishDirectPayment({
          amount: selectedPackage.price * 10, // Convert to SEK (approximate)
          packageId: selectedPackage.id,
          message: `${selectedPackage.tokens} Tokens`,
        });
        
        if (response.data?.success) {
          setSwishPaymentData(response.data.data);
          setShowQRCode(true);
        } else {
          setMessage({ type: "error", text: response.data?.error || "Failed to create Swish payment" });
        }
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.response?.data?.error || "Payment failed" });
    } finally {
      setProcessingPayment(false);
    }
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Tokens</h1>
          <p className="text-slate-400">Purchase additional tokens or calculate usage</p>
        </div>

        {/* Current Balance */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">Current Balance</p>
              <p className="text-4xl font-bold text-white">
                {user?.tokensBalance?.toLocaleString() || 0}
                <span className="text-lg font-normal text-slate-400 ml-2">tokens</span>
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Coins className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700/50 pb-2">
          <button
            onClick={() => setActiveTab('purchase')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'purchase'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            Purchase Tokens
          </button>
          <button
            onClick={() => setActiveTab('auto-refill')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'auto-refill'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            Auto-Refill
            {autoRefillForm.enabled && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">ON</span>
            )}
          </button>
        </div>

        {/* Purchase Tokens Tab */}
        {activeTab === 'purchase' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Purchase Tokens</h2>
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) loadTransactions();
              }}
              className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
            >
              <History className="w-4 h-4" />
              {showHistory ? 'Hide History' : 'View History'}
            </button>
          </div>
          
          {/* Payment Methods Info */}
          <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              We accept: 
              {paymentConfig?.stripe?.configured && <span className="text-white font-medium ml-1">Cards, Klarna</span>}
              {paymentConfig?.swish?.configured && <span className="text-green-400 font-medium ml-1">• Swish</span>}
              {paymentConfig?.paypal?.configured && <span className="text-blue-400 font-medium ml-1">• PayPal</span>}
              {!paymentConfig?.stripe?.configured && !paymentConfig?.swish?.configured && !paymentConfig?.paypal?.configured && (
                <span className="text-slate-500 ml-1">Payment methods not configured</span>
              )}
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-4">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => openCheckout(pkg)}
                className={`p-6 rounded-xl border text-left transition relative ${
                  pkg.popular
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2 left-4 px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    Popular
                  </span>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-5 h-5 text-purple-400" />
                  <span className="text-2xl font-bold text-white">{pkg.tokens.toLocaleString()}</span>
                </div>
                <p className="text-lg font-semibold text-slate-300">${pkg.price}</p>
                <p className="text-xs text-slate-500 mt-1">
                  ${(pkg.price / pkg.tokens * 100).toFixed(2)} per 100 tokens
                </p>
              </button>
            ))}
          </div>
        
        {/* Transaction History */}
        {showHistory && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
            {transactions.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn: any) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                    <div>
                      <p className="text-white font-medium">{txn.description}</p>
                      <p className="text-xs text-slate-400">{new Date(txn.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-medium">+{txn.tokens} tokens</p>
                      <p className="text-xs text-slate-400">${txn.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Token Calculator */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Token Calculator
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            Estimate how many tokens you'll need for your project
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div>
              <label htmlFor="calc-image-size" className="block text-sm font-medium text-slate-300 mb-2">
                Average Image Size (MP)
              </label>
              <input
                id="calc-image-size"
                type="number"
                value={calcImageSize}
                onChange={(e) => setCalcImageSize(parseFloat(e.target.value) || 0)}
                min={0.1}
                max={100}
                step={0.1}
                aria-label="Average image size in megapixels"
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label htmlFor="calc-scale" className="block text-sm font-medium text-slate-300 mb-2">
                Upscale Factor
              </label>
              <select
                id="calc-scale"
                value={calcScale}
                onChange={(e) => setCalcScale(parseInt(e.target.value))}
                aria-label="Upscale factor"
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
            <div>
              <label htmlFor="calc-images" className="block text-sm font-medium text-slate-300 mb-2">
                Number of Images
              </label>
              <input
                id="calc-images"
                type="number"
                value={calcImages}
                onChange={(e) => setCalcImages(parseInt(e.target.value) || 0)}
                min={1}
                aria-label="Number of images"
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Estimated tokens needed</p>
                <p className="text-3xl font-bold text-white">{calculateTokens().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-300">Estimated cost</p>
                <p className="text-xl font-semibold text-purple-400">
                  ${((calculateTokens() / 100) * 0.99).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
        )}

        {/* Auto-Refill Tab */}
        {activeTab === 'auto-refill' && (
          <div className="space-y-6">
            {/* Auto-refill info */}
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-400">Automatic Token Refill</h3>
                  <p className="text-sm text-purple-300/80 mt-1">
                    Never run out of tokens! When your balance drops below your threshold, 
                    we'll prompt you to quickly refill with one click.
                  </p>
                </div>
              </div>
            </div>

            {/* Settings Card */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Auto-Refill Settings
              </h3>

              <div className="space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50">
                  <div>
                    <p className="font-medium text-white">Enable Auto-Refill</p>
                    <p className="text-sm text-slate-400">Get notified when tokens are low</p>
                  </div>
                  <button
                    onClick={() => setAutoRefillForm({...autoRefillForm, enabled: !autoRefillForm.enabled})}
                    className={`relative w-14 h-7 rounded-full transition ${
                      autoRefillForm.enabled ? 'bg-purple-500' : 'bg-slate-700'
                    }`}
                    aria-label="Toggle auto-refill"
                  >
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition ${
                      autoRefillForm.enabled ? 'left-8' : 'left-1'
                    }`} />
                  </button>
                </div>

                {autoRefillForm.enabled && (
                  <>
                    {/* Threshold */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Alert when balance falls below
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={autoRefillForm.threshold}
                          onChange={(e) => setAutoRefillForm({...autoRefillForm, threshold: parseInt(e.target.value)})}
                          className="flex-1 accent-purple-500"
                          aria-label="Threshold"
                        />
                        <span className="text-white font-medium w-20 text-right">{autoRefillForm.threshold} tokens</span>
                      </div>
                    </div>

                    {/* Package to purchase */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Quick-refill package
                      </label>
                      <select
                        value={autoRefillForm.package_id}
                        onChange={(e) => setAutoRefillForm({...autoRefillForm, package_id: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        aria-label="Select package"
                      >
                        <option value="">Select a package</option>
                        {packages.map(pkg => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.tokens} tokens - ${pkg.price}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Max refills */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Maximum refills per month
                      </label>
                      <select
                        value={autoRefillForm.max_refills_per_month}
                        onChange={(e) => setAutoRefillForm({...autoRefillForm, max_refills_per_month: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        aria-label="Max refills per month"
                      >
                        {[1, 2, 3, 5, 10, 20].map(n => (
                          <option key={n} value={n}>{n} refill{n > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Save Button */}
                <button
                  onClick={saveAutoRefillSettings}
                  disabled={savingAutoRefill}
                  className="w-full py-3 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingAutoRefill ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  Save Settings
                </button>
              </div>
            </div>

            {/* Current Status */}
            {autoRefillSettings && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Current Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-900/50">
                    <p className="text-sm text-slate-400">Current Balance</p>
                    <p className={`text-2xl font-bold ${
                      autoRefillSettings.isLowBalance ? 'text-amber-400' : 'text-white'
                    }`}>
                      {autoRefillSettings.currentBalance} tokens
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-900/50">
                    <p className="text-sm text-slate-400">Alert Threshold</p>
                    <p className="text-2xl font-bold text-white">{autoRefillForm.threshold} tokens</p>
                  </div>
                </div>
                {autoRefillSettings.isLowBalance && (
                  <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    <div className="flex-1">
                      <p className="text-amber-400 font-medium">Low Balance Alert</p>
                      <p className="text-sm text-amber-300/80">Your token balance is below your threshold.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('purchase')}
                      className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
                    >
                      Buy Now
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Complete Purchase</h2>
                <button
                  onClick={closeCheckout}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">You're purchasing</p>
                    <p className="text-2xl font-bold text-white">{selectedPackage.tokens.toLocaleString()} tokens</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">${selectedPackage.price}</p>
                </div>
              </div>
            </div>

            {/* Swish QR Code View */}
            {showQRCode && swishPaymentData ? (
              <div className="p-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Pay with Swish</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    {isMobile() ? 'Tap the button below to open Swish' : 'Scan this QR code with your Swish app'}
                  </p>
                  
                  {/* QR Code for Desktop */}
                  {!isMobile() && (
                    <div className="bg-white p-4 rounded-xl inline-block mb-4">
                      <QRCodeSVG
                        value={swishPaymentData.swishUrl}
                        size={200}
                        level="M"
                      />
                    </div>
                  )}
                  
                  {/* Payment Details */}
                  <div className="text-left p-4 rounded-lg bg-slate-800/50 mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Amount:</span>
                      <span className="text-white font-medium">{swishPaymentData.amount} SEK</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">To:</span>
                      <span className="text-white font-medium">{swishPaymentData.payeeName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Reference:</span>
                      <span className="text-white font-mono text-xs">{swishPaymentData.paymentRef}</span>
                    </div>
                  </div>
                  
                  {/* Mobile: Open Swish App Button */}
                  {isMobile() && (
                    <a
                      href={swishPaymentData.swishUrl}
                      className="block w-full py-3 px-4 rounded-lg bg-green-500 text-white font-medium hover:bg-green-400 transition mb-4"
                    >
                      Open Swish App
                    </a>
                  )}
                  
                  <p className="text-xs text-slate-500">
                    After paying, your tokens will be added automatically within a few minutes.
                  </p>
                  
                  <button
                    onClick={closeCheckout}
                    className="mt-4 w-full py-2 px-4 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Payment Method Selection */
              <div className="p-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Select Payment Method</h3>
                <div className="space-y-3">
                  {/* Stripe (Card, Klarna) */}
                  {paymentConfig?.stripe?.configured && (
                    <button
                      onClick={() => setSelectedMethod('stripe')}
                      className={`w-full p-4 rounded-lg border text-left flex items-center gap-3 transition ${
                        selectedMethod === 'stripe'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-slate-700">
                        <CreditCard className="w-5 h-5 text-slate-300" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">Card / Klarna</p>
                        <p className="text-xs text-slate-400">Credit card, debit card, or Klarna</p>
                      </div>
                      {selectedMethod === 'stripe' && (
                        <Check className="w-5 h-5 text-purple-400" />
                      )}
                    </button>
                  )}
                  
                  {/* Swish Direct */}
                  {paymentConfig?.swish?.configured && (
                    <button
                      onClick={() => setSelectedMethod('swish')}
                      className={`w-full p-4 rounded-lg border text-left flex items-center gap-3 transition ${
                        selectedMethod === 'swish'
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <Smartphone className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">Swish</p>
                        <p className="text-xs text-slate-400">Pay with Swish (Sweden)</p>
                      </div>
                      {selectedMethod === 'swish' && (
                        <Check className="w-5 h-5 text-green-400" />
                      )}
                    </button>
                  )}
                  
                  {/* PayPal */}
                  {paymentConfig?.paypal?.configured && (
                    <button
                      onClick={() => setSelectedMethod('paypal')}
                      className={`w-full p-4 rounded-lg border text-left flex items-center gap-3 transition ${
                        selectedMethod === 'paypal'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Wallet className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">PayPal</p>
                        <p className="text-xs text-slate-400">Pay with your PayPal account</p>
                      </div>
                      {selectedMethod === 'paypal' && (
                        <Check className="w-5 h-5 text-blue-400" />
                      )}
                    </button>
                  )}
                  
                  {/* No payment methods configured */}
                  {!paymentConfig?.stripe?.configured && !paymentConfig?.swish?.configured && !paymentConfig?.paypal?.configured && (
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-sm text-amber-300">
                        No payment methods are currently available. Please contact support.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Proceed Button */}
                <button
                  onClick={handlePayment}
                  disabled={!selectedMethod || processingPayment}
                  className="w-full mt-6 py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue to Payment
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
