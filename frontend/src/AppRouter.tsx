import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

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
import AdminPaymentSettings from "./pages/AdminPaymentSettings";
import AdminTokenEconomics from "./pages/AdminTokenEconomics";
import ImageStudioPage from "./pages/studios/ImageStudioPage";
import VideoStudioPage from "./pages/studios/VideoStudioPage";
import SoundStudioPage from "./pages/studios/SoundStudioPage";
import TextStudioPage from "./pages/studios/TextStudioPage";
import ThreeDStudioPage from "./pages/studios/ThreeDStudioPage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import CookiePolicyPage from "./pages/legal/CookiePolicyPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import App from "./App";

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-slate-400">Loading...</div>
      </div>
    </div>
  );
}

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading while auth is initializing
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Check if we have a token but user data is still loading
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('token');
  if (hasToken && !user) {
    // Token exists but user not loaded yet - show loading
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Admin Route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, user } = useAuth();

  // Show loading while auth is initializing
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Check if we have a token but user data is still loading
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('token');
  if (hasToken && !user) {
    // Token exists but user not loaded yet - show loading
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Page wrapper with error boundary
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><RegisterPage /></PageWrapper>} />
        
        {/* Studio Landing Pages */}
        <Route path="/studios/image" element={<PageWrapper><ImageStudioPage /></PageWrapper>} />
        <Route path="/studios/video" element={<PageWrapper><VideoStudioPage /></PageWrapper>} />
        <Route path="/studios/sound" element={<PageWrapper><SoundStudioPage /></PageWrapper>} />
        <Route path="/studios/text" element={<PageWrapper><TextStudioPage /></PageWrapper>} />
        <Route path="/studios/3d" element={<PageWrapper><ThreeDStudioPage /></PageWrapper>} />
        
        {/* Legal Pages */}
        <Route path="/legal/privacy" element={<PageWrapper><PrivacyPolicyPage /></PageWrapper>} />
        <Route path="/legal/terms" element={<PageWrapper><TermsOfServicePage /></PageWrapper>} />
        <Route path="/legal/cookies" element={<PageWrapper><CookiePolicyPage /></PageWrapper>} />
        
        {/* Subscription/Pricing Page */}
        <Route path="/pricing" element={<PageWrapper><SubscriptionPage /></PageWrapper>} />
        <Route path="/subscribe" element={<PageWrapper><SubscriptionPage /></PageWrapper>} />
        
        {/* Payment Routes */}
        <Route path="/payment/success" element={<ProtectedRoute><PageWrapper><PaymentSuccessPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/tokens" element={<ProtectedRoute><PageWrapper><TokensPage /></PageWrapper></ProtectedRoute>} />
        
        {/* Demo/App Route (legacy, no auth required) */}
        <Route path="/app" element={<PageWrapper><App /></PageWrapper>} />

        {/* Protected User Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><PageWrapper><DashboardPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/dashboard/enhance" element={<ProtectedRoute><PageWrapper><App /></PageWrapper></ProtectedRoute>} />
        <Route path="/dashboard/tokens" element={<ProtectedRoute><PageWrapper><TokensPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/dashboard/subscription" element={<ProtectedRoute><PageWrapper><TokensPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/dashboard/history" element={<ProtectedRoute><PageWrapper><DashboardPage /></PageWrapper></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute><AdminRoute><PageWrapper><AdminDashboard /></PageWrapper></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><PageWrapper><AdminUsersPage /></PageWrapper></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/subscriptions" element={<ProtectedRoute><AdminRoute><PageWrapper><AdminSubscriptionsPage /></PageWrapper></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/token-rules" element={<ProtectedRoute><AdminRoute><PageWrapper><AdminDashboard /></PageWrapper></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/model-settings" element={<ProtectedRoute><AdminRoute><PageWrapper><AdminModelSettings /></PageWrapper></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/payment-settings" element={<ProtectedRoute><AdminRoute><PageWrapper><AdminPaymentSettings /></PageWrapper></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/token-economics" element={<ProtectedRoute><AdminRoute><PageWrapper><AdminTokenEconomics /></PageWrapper></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><AdminRoute><PageWrapper><AdminDashboard /></PageWrapper></AdminRoute></ProtectedRoute>} />

        {/* Test Route for Model Settings (temporary - no auth) */}
        <Route path="/test-model-settings" element={<PageWrapper><AdminModelSettings /></PageWrapper>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
