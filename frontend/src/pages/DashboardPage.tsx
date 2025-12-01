import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Coins, 
  Image, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  Clock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { authApi } from "../lib/api";
import DashboardLayout from "../components/DashboardLayout";

interface Transaction {
  id: string;
  type: string;
  tokens: number;
  description: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshUser();
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await authApi.getTransactions();
      setTransactions(response.data.slice(0, 5));
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const tokenPercentage = user?.subscription?.tokensPerMonth
    ? Math.round((user.tokensBalance / user.subscription.tokensPerMonth) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name}!</h1>
          <p className="text-slate-400">Here's an overview of your account</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Tokens Balance */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Coins className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                {user?.subscription?.name || "Free"}
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {user?.tokensBalance?.toLocaleString() || 0}
            </p>
            <p className="text-sm text-slate-400">Tokens remaining</p>
            {user?.subscription?.tokensPerMonth && (
              <div className="mt-4">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, tokenPercentage)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {tokenPercentage}% of monthly allowance
                </p>
              </div>
            )}
          </div>

          {/* Images Enhanced */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Image className="w-6 h-6 text-emerald-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {user?.tokensUsed || 0}
            </p>
            <p className="text-sm text-slate-400">Tokens used</p>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-lg font-semibold text-white mb-2">Ready to enhance?</p>
            <p className="text-sm text-slate-300 mb-4">
              Upload an image and see the magic happen
            </p>
            <Link
              to="/dashboard/enhance"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-900 font-medium text-sm hover:bg-slate-100 transition"
            >
              Start Enhancing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm mt-1">Start enhancing images to see your history</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        tx.type === "usage"
                          ? "bg-red-500/20"
                          : "bg-emerald-500/20"
                      }`}
                    >
                      <Coins
                        className={`w-5 h-5 ${
                          tx.type === "usage" ? "text-red-400" : "text-emerald-400"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{tx.description}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      tx.type === "usage" ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {tx.type === "usage" ? "-" : "+"}
                    {tx.tokens} tokens
                  </span>
                </div>
              ))}
            </div>
          )}
          {transactions.length > 0 && (
            <Link
              to="/dashboard/history"
              className="block p-4 text-center text-sm text-purple-400 hover:text-purple-300 transition border-t border-slate-700/50"
            >
              View all activity
            </Link>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
