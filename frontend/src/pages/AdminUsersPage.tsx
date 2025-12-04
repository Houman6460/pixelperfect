import React, { useEffect, useState } from "react";
import { Search, MoreVertical, Coins, Ban, CheckCircle } from "lucide-react";
import { adminApi } from "../lib/api";
import DashboardLayout from "../components/DashboardLayout";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  subscriptionId: string;
  tokensBalance: number;
  tokensUsed: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tokensToAdd, setTokensToAdd] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminApi.getUsers();
      // Handle API response format: { success: true, data: [...] }
      const userData = response.data?.data || response.data || [];
      // Transform API fields to frontend format
      const transformedUsers = (Array.isArray(userData) ? userData : []).map((u: any) => ({
        id: u.id,
        email: u.email || '',
        name: u.name || 'Unknown',
        role: u.role || 'user',
        subscriptionId: u.subscription_id || null,
        tokensBalance: u.tokens || 0,
        tokensUsed: u.tokens_used || 0,
        isActive: u.is_active === 1 || u.is_active === true,
        createdAt: u.created_at || new Date().toISOString(),
      }));
      setUsers(transformedUsers);
    } catch (error) {
      console.error("Failed to load users:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await adminApi.toggleUserStatus(userId);
      loadUsers();
    } catch (error) {
      console.error("Failed to toggle user status:", error);
    }
  };

  const handleAddTokens = async () => {
    if (!selectedUser || !tokensToAdd) return;

    try {
      await adminApi.addTokensToUser(selectedUser.id, parseInt(tokensToAdd), reason);
      setSelectedUser(null);
      setTokensToAdd("");
      setReason("");
      loadUsers();
    } catch (error) {
      console.error("Failed to add tokens:", error);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Users</h1>
            <p className="text-slate-400">Manage user accounts and tokens</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            aria-label="Search users"
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Users Table */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading users...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/10 text-purple-400">
                        {user.subscriptionId || "Free"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-white">{user.tokensBalance.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">Used: {user.tokensUsed.toLocaleString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          user.isActive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-2 rounded-lg hover:bg-slate-700 transition"
                          title="Add tokens"
                        >
                          <Coins className="w-4 h-4 text-purple-400" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          className="p-2 rounded-lg hover:bg-slate-700 transition"
                          title={user.isActive ? "Deactivate" : "Activate"}
                        >
                          {user.isActive ? (
                            <Ban className="w-4 h-4 text-red-400" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add Tokens Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">
                Add Tokens to {selectedUser.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tokens to Add
                  </label>
                  <input
                    type="number"
                    value={tokensToAdd}
                    onChange={(e) => setTokensToAdd(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Bonus tokens"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleAddTokens}
                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition"
                  >
                    Add Tokens
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex-1 py-3 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
