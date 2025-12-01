import React, { useState } from "react";
import { Coins, Plus, Calculator, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { authApi } from "../lib/api";
import DashboardLayout from "../components/DashboardLayout";

const tokenPackages = [
  { amount: 100, price: 0.99, popular: false },
  { amount: 500, price: 4.49, popular: false, savings: "10%" },
  { amount: 1000, price: 7.99, popular: true, savings: "20%" },
  { amount: 5000, price: 34.99, popular: false, savings: "30%" },
];

export default function TokensPage() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Token calculator state
  const [calcImageSize, setCalcImageSize] = useState(2); // megapixels
  const [calcScale, setCalcScale] = useState(2);
  const [calcImages, setCalcImages] = useState(10);

  const calculateTokens = () => {
    // Base: 1 token per image + 0.5 per megapixel
    const baseTokens = 1 + calcImageSize * 0.5;
    const scaleMultiplier = calcScale >= 4 ? 2 : 1;
    const tokensPerImage = Math.ceil(baseTokens * scaleMultiplier);
    return tokensPerImage * calcImages;
  };

  const handlePurchase = async (amount: number) => {
    setIsLoading(true);
    setMessage(null);

    try {
      await authApi.purchaseTokens(amount);
      await refreshUser();
      setMessage({ type: "success", text: `Successfully purchased ${amount} tokens!` });
      setSelectedPackage(null);
      setCustomAmount("");
    } catch (error: any) {
      setMessage({ type: "error", text: error.response?.data?.error || "Purchase failed" });
    } finally {
      setIsLoading(false);
    }
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

        {/* Token Packages */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Purchase Tokens</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {tokenPackages.map((pkg) => (
              <button
                key={pkg.amount}
                onClick={() => setSelectedPackage(pkg.amount)}
                className={`p-6 rounded-xl border text-left transition relative ${
                  selectedPackage === pkg.amount
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2 left-4 px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    Popular
                  </span>
                )}
                {pkg.savings && (
                  <span className="absolute top-4 right-4 text-xs font-medium text-emerald-400">
                    Save {pkg.savings}
                  </span>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-5 h-5 text-purple-400" />
                  <span className="text-2xl font-bold text-white">{pkg.amount.toLocaleString()}</span>
                </div>
                <p className="text-lg font-semibold text-slate-300">${pkg.price}</p>
                <p className="text-xs text-slate-500 mt-1">
                  ${(pkg.price / pkg.amount * 100).toFixed(2)} per 100 tokens
                </p>
              </button>
            ))}
          </div>

          {selectedPackage && (
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => handlePurchase(selectedPackage)}
                disabled={isLoading}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {isLoading ? "Processing..." : `Purchase ${selectedPackage} tokens`}
              </button>
              <button
                onClick={() => setSelectedPackage(null)}
                className="px-6 py-3 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Custom Amount */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Custom Amount
          </h3>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Enter amount (min 100)"
              min={100}
              step={100}
              className="flex-1 px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => handlePurchase(parseInt(customAmount))}
              disabled={isLoading || !customAmount || parseInt(customAmount) < 100}
              className="px-6 py-3 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Purchase
            </button>
          </div>
          {customAmount && parseInt(customAmount) >= 100 && (
            <p className="text-sm text-slate-400 mt-2">
              Price: ${((parseInt(customAmount) / 100) * 0.99).toFixed(2)}
            </p>
          )}
        </div>

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
    </DashboardLayout>
  );
}
