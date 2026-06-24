import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { LoginForm } from './components/features/auth/LoginForm';
import { OnboardingForm } from './components/features/onboarding';
import { Messages } from './components/features/Messages';
import { useAuthStore } from './store/authStore';
import { setupGlobalErrorLogging } from './lib/logger';

// Lazy load main route components
const Dashboard = lazy(() => import('./components/features/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const ReferralManagement = lazy(() => import('./components/features/referrals/ReferralManagement').then(module => ({ default: module.ReferralManagement })));
const ResearchInsight = lazy(() => import('./components/features/research-insight/ResearchInsight').then(module => ({ default: module.ResearchInsight })));
const HospitalManagement = lazy(() => import('./components/features/hospitals/HospitalManagement').then(module => ({ default: module.HospitalManagement })));
const ApprovalsPage = lazy(() => import('./components/features/admin/ApprovalsPage').then(module => ({ default: module.ApprovalsPage })));
const SettingsPage = lazy(() => import('./components/features/admin/SettingsPage').then(module => ({ default: module.SettingsPage })));
const MedSyncVideo = lazy(() => import('./components/features/video/MedSyncVideo').then(module => ({ default: module.MedSyncVideo })));

const AIAssistant = lazy(() => Promise.resolve({ default: () => (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold text-neutral-900 mb-4">AI Medical Assistant</h2>
    <p className="text-neutral-600">AI-powered medical insights coming soon...</p>
  </div>
)}));

const Analytics = lazy(() => Promise.resolve({ default: () => (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold text-neutral-900 mb-4">Analytics</h2>
    <p className="text-neutral-600">Medical analytics dashboard coming soon...</p>
  </div>
)}));

// Loading fallback component
const LoadingFallback = React.memo(() => (
  <div className="min-h-[400px] flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <p className="text-neutral-600">Loading...</p>
    </div>
  </div>
));
LoadingFallback.displayName = 'LoadingFallback';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Component to handle authentication redirects
function AuthRedirect() {
  const { user, profile, initialized } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!initialized) return;

    if (user) {
      // User is authenticated
      if (!profile || !profile.profile_completed_at) {
        // Profile not complete, redirect to onboarding
        navigate('/onboarding', { replace: true });
      } else {
        // Profile complete, redirect to dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    }
    // If no user, stay on login page
  }, [user, profile, initialized, navigate, location]);

  // Show loading while checking auth state
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading MedSync360...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated but we're still on login page, show loading
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Show login form
  return <LoginForm />;
}

// Shown to a doctor whose registration is awaiting their hospital superuser.
function AccountStatusScreen({ status }: { status: 'pending' | 'rejected' }) {
  const { signOut } = useAuthStore();
  const pending = status === 'pending';
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md w-full text-center bg-white border border-neutral-200 rounded-xl p-8">
        <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${pending ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
          <span className="text-2xl">{pending ? '⏳' : '⛔'}</span>
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
          {pending ? 'Waiting for approval' : 'Registration not approved'}
        </h2>
        <p className="text-neutral-600 mb-6">
          {pending
            ? 'Your account is pending approval by your hospital’s administrator. You’ll get access as soon as it’s approved.'
            : 'Your registration was not approved. Please contact your hospital administrator if you believe this is a mistake.'}
        </p>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if profile is complete
  if (user && (!profile || !profile.profile_completed_at)) {
    return <Navigate to="/onboarding" replace />;
  }

  // Approval gate. Only explicit pending/rejected are blocked — anything else
  // (approved, or an older row without the column) passes, so existing accounts
  // are never locked out.
  const status = (profile as any)?.approval_status;
  if (status === 'pending') return <AccountStatusScreen status="pending" />;
  if (status === 'rejected') return <AccountStatusScreen status="rejected" />;

  return <>{children}</>;
}

// Separate onboarding route component
function OnboardingRoute() {
  const { user, profile, initialized } = useAuthStore();
  
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If profile is already complete, redirect to dashboard
  if (profile && profile.profile_completed_at) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <OnboardingForm />;
}

function App() {
  const { initialize, initialized, profile } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Global crash/perf error logging to Supabase (non-invasive)
  useEffect(() => {
    setupGlobalErrorLogging(profile?.id);
  }, [profile?.id]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading MedSync360...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<AuthRedirect />} />
            <Route path="/onboarding" element={<OnboardingRoute />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/medsync360_final"
              element={
                <Suspense fallback={<Layout><LoadingFallback /></Layout>}>
                  <MedSyncVideo />
                </Suspense>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<Layout><LoadingFallback /></Layout>}>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/referrals"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<Layout><LoadingFallback /></Layout>}>
                    <Layout>
                      <ReferralManagement />
                    </Layout>
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<Layout><LoadingFallback /></Layout>}>
                    <Layout>
                      <Messages />
                    </Layout>
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-assistant"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<Layout><LoadingFallback /></Layout>}>
                    <Layout>
                      <AIAssistant />
                    </Layout>
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<Layout><LoadingFallback /></Layout>}>
                    <Layout>
                      <Analytics />
                    </Layout>
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<Layout><LoadingFallback /></Layout>}>
                    <Layout>
                      <SettingsPage />
                    </Layout>
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/research-insight"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<Layout><LoadingFallback /></Layout>}>
                    <Layout>
                      <ResearchInsight />
                    </Layout>
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hospitals"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<Layout><LoadingFallback /></Layout>}>
                    <Layout>
                      <HospitalManagement />
                    </Layout>
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/approvals"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<Layout><LoadingFallback /></Layout>}>
                    <Layout>
                      <ApprovalsPage />
                    </Layout>
                  </Suspense>
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#333',
                border: '1px solid #e5e5e5',
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
