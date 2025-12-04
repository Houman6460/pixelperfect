import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Loader2, XCircle, ArrowRight, Coins } from "lucide-react";
import { paymentApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const sessionId = searchParams.get("session_id");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setStatus("error");
      setError("No session ID provided");
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const response = await paymentApi.getSessionStatus(sessionId!);
      
      if (response.data?.success && response.data?.data?.status === "paid") {
        setSessionData(response.data.data);
        setStatus("success");
        // Refresh user data to get updated token balance
        await refreshUser();
      } else {
        setStatus("error");
        setError("Payment verification failed");
      }
    } catch (err: any) {
      setStatus("error");
      setError(err.response?.data?.error || "Failed to verify payment");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {status === "loading" && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin text-purple-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Verifying Payment...</h1>
            <p className="text-slate-400">Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
            <p className="text-slate-400 mb-8">
              Thank you for your purchase. Your account has been updated.
            </p>
            
            {sessionData?.metadata?.type === "tokens" && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center gap-2 text-purple-400 mb-2">
                  <Coins className="w-5 h-5" />
                  <span className="text-lg font-medium">Tokens Added</span>
                </div>
                <p className="text-4xl font-bold text-white">
                  +{sessionData.metadata.tokens}
                </p>
              </div>
            )}

            {sessionData?.metadata?.type === "subscription" && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                <p className="text-lg font-medium text-emerald-400 mb-2">Subscription Activated</p>
                <p className="text-slate-300">
                  Your subscription is now active. Enjoy full access to all features!
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Link
                to="/dashboard"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/tokens"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 transition"
              >
                View Token Balance
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Payment Failed</h1>
            <p className="text-slate-400 mb-8">
              {error || "Something went wrong with your payment."}
            </p>
            
            <div className="space-y-3">
              <Link
                to="/tokens"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-400 transition"
              >
                Try Again
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
