import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Coins, Zap, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../lib/api';

interface LowBalanceWarningProps {
  threshold?: number;
  onBuyTokens?: () => void;
}

export default function LowBalanceWarning({ threshold = 10, onBuyTokens }: LowBalanceWarningProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [autoRefillEnabled, setAutoRefillEnabled] = useState(false);
  
  useEffect(() => {
    // Check if user has auto-refill enabled
    const checkAutoRefill = async () => {
      try {
        const res = await userApi.getAutoRefill();
        if (res.data?.data?.settings?.enabled) {
          setAutoRefillEnabled(true);
        }
      } catch (e) {
        // Ignore errors
      }
    };
    checkAutoRefill();
  }, []);

  if (!user || user.tokensBalance > threshold || dismissed) {
    return null;
  }

  const isZero = user.tokensBalance === 0;
  const isCritical = user.tokensBalance <= 5;

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-md rounded-xl shadow-2xl border ${
      isZero 
        ? 'bg-red-500/20 border-red-500/50' 
        : isCritical 
          ? 'bg-amber-500/20 border-amber-500/50'
          : 'bg-yellow-500/10 border-yellow-500/30'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            isZero ? 'bg-red-500/30' : isCritical ? 'bg-amber-500/30' : 'bg-yellow-500/20'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${
              isZero ? 'text-red-400' : isCritical ? 'text-amber-400' : 'text-yellow-400'
            }`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className={`font-semibold ${
                isZero ? 'text-red-400' : isCritical ? 'text-amber-400' : 'text-yellow-300'
              }`}>
                {isZero ? 'Out of Tokens!' : isCritical ? 'Very Low Balance!' : 'Low Token Balance'}
              </h3>
              <button 
                onClick={() => setDismissed(true)}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                aria-label="Dismiss warning"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-slate-300 mb-3">
              You have <span className={`font-bold ${isZero ? 'text-red-400' : 'text-white'}`}>
                {user.tokensBalance} tokens
              </span> remaining.
              {isZero 
                ? ' Add tokens to continue using AI features.'
                : ' Consider adding more to avoid interruptions.'}
            </p>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (onBuyTokens) {
                    onBuyTokens();
                  } else {
                    navigate('/tokens');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isZero 
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                <Coins className="w-4 h-4" />
                Buy Tokens
              </button>
              
              {!autoRefillEnabled && (
                <Link
                  to="/dashboard/tokens?tab=auto-refill"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
                >
                  <Zap className="w-4 h-4" />
                  Set Up Auto-Refill
                </Link>
              )}
              
              {autoRefillEnabled && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-emerald-500/20 text-emerald-400">
                  <Zap className="w-4 h-4" />
                  Auto-refill active
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline banner version for use in pages
export function LowBalanceBanner({ threshold = 10, compact = false }: { threshold?: number; compact?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  if (!user || user.tokensBalance > threshold) {
    return null;
  }

  const isZero = user.tokensBalance === 0;

  if (compact) {
    return (
      <div className={`flex items-center justify-between px-4 py-2 rounded-lg ${
        isZero ? 'bg-red-500/20 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/20'
      }`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${isZero ? 'text-red-400' : 'text-amber-400'}`} />
          <span className={`text-sm ${isZero ? 'text-red-300' : 'text-amber-300'}`}>
            {isZero ? 'No tokens left!' : `Only ${user.tokensBalance} tokens remaining`}
          </span>
        </div>
        <button
          onClick={() => navigate('/tokens')}
          className={`text-xs px-2 py-1 rounded ${
            isZero ? 'bg-red-500 text-white' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
          }`}
        >
          Add Tokens
        </button>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl ${
      isZero ? 'bg-red-500/20 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/20'
    }`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-6 h-6 ${isZero ? 'text-red-400' : 'text-amber-400'}`} />
        <div className="flex-1">
          <h3 className={`font-semibold mb-1 ${isZero ? 'text-red-400' : 'text-amber-400'}`}>
            {isZero ? 'Out of Tokens' : 'Low Token Balance'}
          </h3>
          <p className="text-sm text-slate-300 mb-3">
            You have <strong className="text-white">{user.tokensBalance}</strong> tokens.
            {isZero 
              ? ' Purchase tokens to continue using AI features.'
              : ' Consider purchasing more tokens or setting up auto-refill.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/tokens')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                isZero ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              Buy Tokens
            </button>
            <Link
              to="/dashboard/tokens?tab=auto-refill"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-white hover:bg-slate-600"
            >
              Auto-Refill Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
