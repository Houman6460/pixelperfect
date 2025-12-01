import React, { lazy, Suspense, Component, ErrorInfo, ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { Loader2, AlertCircle } from "lucide-react";

// Import critical pages directly (not lazy) to ensure they work
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SubscriptionPage from "./pages/SubscriptionPage";

// Error Boundary to catch render errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Render error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h2 className="text-red-400 font-semibold">Something went wrong</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">{this.state.error?.message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      <span className="text-slate-400 text-sm">Loading...</span>
    </div>
  </div>
);

// Helper to wrap lazy components with Suspense
const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// Lazy load non-critical pages
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TokensPage = lazy(() => import("./pages/TokensPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminModelSettings = lazy(() => import("./pages/AdminModelSettings"));
const AdminSubscriptionsPage = lazy(() => import("./pages/AdminSubscriptionsPage"));

// Studio Landing Pages
const ImageStudioPage = lazy(() => import("./pages/studios/ImageStudioPage"));
const VideoStudioPage = lazy(() => import("./pages/studios/VideoStudioPage"));
const SoundStudioPage = lazy(() => import("./pages/studios/SoundStudioPage"));
const TextStudioPage = lazy(() => import("./pages/studios/TextStudioPage"));
const ThreeDStudioPage = lazy(() => import("./pages/studios/ThreeDStudioPage"));

// Legal Pages
const PrivacyPolicyPage = lazy(() => import("./pages/legal/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/legal/TermsOfServicePage"));
const CookiePolicyPage = lazy(() => import("./pages/legal/CookiePolicyPage"));

// Legacy App (Enhance Page) - Heavy component, lazy load
const App = lazy(() => import("./App"));

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
    <ErrorBoundary>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Studio Landing Pages */}
      <Route path="/studios/image" element={withSuspense(ImageStudioPage)} />
      <Route path="/studios/video" element={withSuspense(VideoStudioPage)} />
      <Route path="/studios/sound" element={withSuspense(SoundStudioPage)} />
      <Route path="/studios/text" element={withSuspense(TextStudioPage)} />
      <Route path="/studios/3d" element={withSuspense(ThreeDStudioPage)} />
      
      {/* Legal Pages */}
      <Route path="/legal/privacy" element={withSuspense(PrivacyPolicyPage)} />
      <Route path="/legal/terms" element={withSuspense(TermsOfServicePage)} />
      <Route path="/legal/cookies" element={withSuspense(CookiePolicyPage)} />
      
      {/* Subscription/Pricing Page */}
      <Route path="/pricing" element={<SubscriptionPage />} />
      <Route path="/subscribe" element={<SubscriptionPage />} />
      
      {/* Demo/App Route (legacy, no auth required) */}
      <Route path="/app" element={withSuspense(App)} />

      {/* Protected User Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/enhance"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}><App /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/tokens"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}><TokensPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/subscription"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}><TokensPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/history"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Suspense fallback={<PageLoader />}><AdminUsersPage /></Suspense>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/subscriptions"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Suspense fallback={<PageLoader />}><AdminSubscriptionsPage /></Suspense>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/token-rules"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/model-settings"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Suspense fallback={<PageLoader />}><AdminModelSettings /></Suspense>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      {/* Test Route for Model Settings (temporary - no auth) */}
      <Route path="/test-model-settings" element={withSuspense(AdminModelSettings)} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
