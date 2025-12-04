import React, { useEffect, useState } from "react";
import { 
  Users, 
  Coins, 
  CreditCard, 
  TrendingUp,
  ArrowUp,
} from "lucide-react";
import { adminApi } from "../lib/api";
import DashboardLayout from "../components/DashboardLayout";

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalTokensUsed: number;
  revenueThisMonth: number;
  subscriptionBreakdown: { name: string; count: number }[];
  recentTransactions: any[];
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await adminApi.getAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400">Overview of your platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <span className="flex items-center text-xs text-emerald-400">
                <ArrowUp className="w-3 h-3 mr-1" /> 12%
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{analytics?.totalUsers || 0}</p>
            <p className="text-sm text-slate-400">Total Users</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="flex items-center text-xs text-emerald-400">
                <ArrowUp className="w-3 h-3 mr-1" /> 8%
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{analytics?.activeUsers || 0}</p>
            <p className="text-sm text-slate-400">Active Users</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Coins className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {analytics?.totalTokensUsed?.toLocaleString() || 0}
            </p>
            <p className="text-sm text-slate-400">Tokens Used</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-pink-400" />
              </div>
              <span className="flex items-center text-xs text-emerald-400">
                <ArrowUp className="w-3 h-3 mr-1" /> 23%
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              ${analytics?.revenueThisMonth?.toFixed(2) || "0.00"}
            </p>
            <p className="text-sm text-slate-400">Revenue (30 days)</p>
          </div>
        </div>

        {/* Subscription Breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Subscription Breakdown</h2>
            <div className="space-y-4">
              {analytics?.subscriptionBreakdown?.map((sub) => (
                <div key={sub.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-slate-300">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white font-semibold">{sub.count}</span>
                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{
                          width: `${Math.min(100, (sub.count / (analytics?.totalUsers || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
            <div className="space-y-3">
              {analytics?.recentTransactions?.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <div>
                    <p className="text-sm text-white">{tx.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.amount > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                      {tx.amount > 0 ? `+$${tx.amount.toFixed(2)}` : "—"}
                    </p>
                    <p className="text-xs text-slate-500">{tx.tokens} tokens</p>
                  </div>
                </div>
              ))}
              {(!analytics?.recentTransactions || analytics.recentTransactions.length === 0) && (
                <p className="text-slate-400 text-sm text-center py-4">No recent transactions</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
