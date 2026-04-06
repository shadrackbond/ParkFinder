import { lazy, Suspense, useEffect, useState, useCallback, memo } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import RoleRoute from './components/common/RoleRoute';
import AccessibilityMenuModal from './components/common/AccessibilityMenuModal';
import OnboardingModal from './components/common/OnboardingModal';

/* ── Route-based code splitting ──────────────────────────────────────────── */
const Login             = lazy(() => import('./pages/Login'));
const ProviderRegister  = lazy(() => import('./pages/ProviderRegister'));
const Home              = lazy(() => import('./pages/Home'));
const Bookings          = lazy(() => import('./pages/Bookings'));
const History           = lazy(() => import('./pages/History'));
const Profile           = lazy(() => import('./pages/Profile'));
const HelpSupport       = lazy(() => import('./pages/HelpSupport'));

const ProviderDashboard = lazy(() => import('./pages/provider/ProviderDashboard'));
const LotManager        = lazy(() => import('./pages/provider/LotManager'));
const QRScanner         = lazy(() => import('./pages/provider/QRScanner'));

const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard'));
const ApprovalQueue     = lazy(() => import('./pages/admin/ApprovalQueue'));
const UserManager       = lazy(() => import('./pages/admin/UserManager'));
const LotsList          = lazy(() => import('./pages/admin/LotsList'));
const Analytics         = lazy(() => import('./pages/admin/Analytics'));

/* ── Route-level loading fallback ────────────────────────────────────────── */
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-xs text-gray-400 font-medium">Loading…</p>
      </div>
    </div>
  );
}

/* ── Route-level error boundary ──────────────────────────────────────────── */
import { Component } from 'react';

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[RouteErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Page Error</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              This page encountered an error. Try going back or refreshing.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.history.back()}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-xl text-sm transition"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl text-sm transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Route helpers ────────────────────────────────────────────────────────── */
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/customer/login" />;
}

function SmartRedirect() {
  const { currentUser, userRole } = useAuth();
  if (!currentUser) return <Navigate to="/customer/login" />;
  if (userRole === 'admin') return <Navigate to="/admin" />;
  if (userRole === 'provider') return <Navigate to="/provider" />;
  return (
    <Suspense fallback={<PageLoader />}>
      <Home />
    </Suspense>
  );
}

/* ── Global FABs + modals (memoized) ─────────────────────────────────────── */
const GlobalOverlay = memo(function GlobalOverlay() {
  const [showA11y,      setShowA11y]      = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const openA11y = useCallback(() => {
    setShowA11y(true);
    setShowOnboarding(false);
  }, []);

  const openOnboarding = useCallback(() => {
    setShowOnboarding(true);
    setShowA11y(false);
  }, []);

  const closeA11y = useCallback(() => setShowA11y(false), []);
  const closeOnboarding = useCallback(() => setShowOnboarding(false), []);

  return (
    <>
      {/* ── Left FAB: Accessibility ────────────────────────────────────── */}
      <button
        id="fab-accessibility"
        aria-label="Open accessibility settings"
        onClick={openA11y}
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))', left: '1.25rem', position: 'fixed' }}
        className="z-[9990] fab-enter
          w-14 h-14 rounded-full
          bg-white dark:bg-gray-800
          shadow-float border border-gray-200 dark:border-gray-700
          flex items-center justify-center
          text-teal-600 dark:text-teal-400
          hover:scale-110 hover:shadow-xl
          active:scale-95
          transition-all duration-200 will-change-transform
          focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
          <path d="M5 8.5l7 1.5 7-1.5" />
          <path d="M12 10v5" />
          <path d="M9 21l3-6 3 6" />
        </svg>
        <span className="sr-only">Accessibility</span>
      </button>

      {/* ── Right FAB: Help / Onboarding ──────────────────────────────── */}
      <button
        id="fab-help"
        aria-label="Open onboarding tutorial"
        onClick={openOnboarding}
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))', right: '1.25rem', position: 'fixed' }}
        className="z-[9990] fab-enter
          w-14 h-14 rounded-full
          bg-teal-500 dark:bg-teal-600
          shadow-float
          flex items-center justify-center
          text-white
          hover:scale-110 hover:bg-teal-600 dark:hover:bg-teal-500 hover:shadow-xl
          active:scale-95
          transition-all duration-200 will-change-transform
          focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none"/>
        </svg>
        <span className="sr-only">Help</span>
      </button>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {showA11y       && <AccessibilityMenuModal onClose={closeA11y} />}
      {showOnboarding && <OnboardingModal        onClose={closeOnboarding} />}
    </>
  );
});

/* ── Root App ─────────────────────────────────────────────────────────────── */
function App() {
  // Wake-up ping for Render free-tier (fire-and-forget, no error surfaced)
  useEffect(() => {
    axios.get('https://parkfinder-hwy4.onrender.com/health-check').catch(() => {});
  }, []);

  return (
    <AccessibilityProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-[#121212] transition-colors duration-300">
            <RouteErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login"             element={<Navigate to="/customer/login" replace />} />
                  <Route path="/customer/login"    element={<Login />} />
                  <Route path="/provider/login"    element={<Login />} />
                  <Route path="/provider/register" element={<ProviderRegister />} />

                  <Route path="/"        element={<Navigate to="/customer/login" replace />} />
                  <Route path="/app"     element={<PrivateRoute><SmartRedirect /></PrivateRoute>} />
                  <Route path="/bookings" element={<PrivateRoute><Bookings /></PrivateRoute>} />
                  <Route path="/history"  element={<PrivateRoute><History /></PrivateRoute>} />
                  <Route path="/profile"  element={<PrivateRoute><Profile /></PrivateRoute>} />
                  <Route path="/help"     element={<PrivateRoute><HelpSupport /></PrivateRoute>} />

                  <Route path="/provider"         element={<RoleRoute allowedRoles={['provider']}><ProviderDashboard /></RoleRoute>} />
                  <Route path="/provider/lots"    element={<RoleRoute allowedRoles={['provider']}><LotManager /></RoleRoute>} />
                  <Route path="/provider/scanner" element={<RoleRoute allowedRoles={['provider']}><QRScanner /></RoleRoute>} />

                  <Route path="/admin"           element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>} />
                  <Route path="/admin/approvals" element={<RoleRoute allowedRoles={['admin']}><ApprovalQueue /></RoleRoute>} />
                  <Route path="/admin/users"     element={<RoleRoute allowedRoles={['admin']}><UserManager /></RoleRoute>} />
                  <Route path="/admin/lots"      element={<RoleRoute allowedRoles={['admin']}><LotsList /></RoleRoute>} />
                  <Route path="/admin/analytics" element={<RoleRoute allowedRoles={['admin']}><Analytics /></RoleRoute>} />

                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Suspense>
            </RouteErrorBoundary>

            {/* Global FABs — rendered outside <Routes> so they appear on every page */}
            <GlobalOverlay />
          </div>
        </Router>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

export default App;