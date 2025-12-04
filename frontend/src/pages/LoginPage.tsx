import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const user = await login(email, password);
      
      // Redirect admins to admin dashboard, regular users to user dashboard
      const targetPath = user?.role === "admin" ? "/admin" : "/dashboard";
      
      // Use setTimeout to allow React state to update before navigation
      setTimeout(() => {
        window.location.hash = targetPath;
      }, 100);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "Login failed. Please check your credentials.";
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            PixelPerfect AI
          </span>
        </Link>

        {/* Form Card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-2">Welcome back</h1>
          <p className="text-slate-400 text-center mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? "Signing in..." : "Sign In"}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-purple-400 hover:text-purple-300">
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <p className="text-xs text-slate-500 text-center mb-2">Demo Admin Credentials</p>
          <p className="text-xs text-slate-400 text-center font-mono">
            admin@pixelperfect.ai / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
