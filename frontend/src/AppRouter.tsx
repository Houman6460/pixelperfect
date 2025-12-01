import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// Import ALL pages directly to fix navigation issues
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import DashboardPage from "./pages/DashboardPage";
import TokensPage from "./pages/TokensPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminModelSettings from "./pages/AdminModelSettings";
import AdminSubscriptionsPage from "./pages/AdminSubscriptionsPage";
import ImageStudioPage from "./pages/studios/ImageStudioPage";
import VideoStudioPage from "./pages/studios/VideoStudioPage";
import SoundStudioPage from "./pages/studios/SoundStudioPage";
import TextStudioPage from "./pages/studios/TextStudioPage";
import ThreeDStudioPage from "./pages/studios/ThreeDStudioPage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import CookiePolicyPage from "./pages/legal/CookiePolicyPage";
import App from "./App";

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Admin Route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Studio Landing Pages */}
      <Route path="/studios/image" element={<ImageStudioPage />} />
      <Route path="/studios/video" element={<VideoStudioPage />} />
      <Route path="/studios/sound" element={<SoundStudioPage />} />
      <Route path="/studios/text" element={<TextStudioPage />} />
      <Route path="/studios/3d" element={<ThreeDStudioPage />} />
      
      {/* Legal Pages */}
      <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/legal/terms" element={<TermsOfServicePage />} />
      <Route path="/legal/cookies" element={<CookiePolicyPage />} />
      
      {/* Subscription/Pricing Page */}
      <Route path="/pricing" element={<SubscriptionPage />} />
      <Route path="/subscribe" element={<SubscriptionPage />} />
      
      {/* Demo/App Route (legacy, no auth required) */}
      <Route path="/app" element={<App />} />

      {/* Protected User Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/dashboard/enhance" element={<ProtectedRoute><App /></ProtectedRoute>} />
      <Route path="/dashboard/tokens" element={<ProtectedRoute><TokensPage /></ProtectedRoute>} />
      <Route path="/dashboard/subscription" element={<ProtectedRoute><TokensPage /></ProtectedRoute>} />
      <Route path="/dashboard/history" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><AdminUsersPage /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/subscriptions" element={<ProtectedRoute><AdminRoute><AdminSubscriptionsPage /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/token-rules" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/model-settings" element={<ProtectedRoute><AdminRoute><AdminModelSettings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />

      {/* Test Route for Model Settings (temporary - no auth) */}
      <Route path="/test-model-settings" element={<AdminModelSettings />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
