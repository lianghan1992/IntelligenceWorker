
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Header } from './components/Header';
import { AuthModal } from './components/HomePage/AuthModal';
import { PricingModal } from './components/PricingModal';
import { HomePage } from './components/HomePage/index';
import { BillingModal } from './components/UserProfile/BillingModal';
import { User, View, SystemSource } from './types';
import { getUserSubscribedSources, getMe } from './api';

// Lazy load components with named export adaptation
const StrategicCockpit = React.lazy(() => import('./components/StrategicCockpit/index').then(module => ({ default: module.StrategicCockpit })));
const CompetitivenessDashboard = React.lazy(() => import('./components/CompetitivenessDashboard/index').then(module => ({ default: module.CompetitivenessDashboard })));
const DeepDives = React.lazy(() => import('./components/DeepDives/index').then(module => ({ default: module.DeepDives })));
const IndustryEvents = React.lazy(() => import('./components/IndustryEvents/index').then(module => ({ default: module.IndustryEvents })));
const ReportGenerator = React.lazy(() => import('./components/ReportGenerator/index').then(module => ({ default: module.ReportGenerator })));
const AdminPage = React.lazy(() => import('./components/Admin/index').then(module => ({ default: module.AdminPage })));
// New Marketplace
const AgentMarketplace = React.lazy(() => import('./components/AgentMarketplace/index'));

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-full bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="text-sm text-gray-500 font-medium">系统初始化中...</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('cockpit'); // Default view updated to 'cockpit'
  
  // ⚡️ PERFORMANCE OPTIMIZATION: Optimistic Initialization
  // Initialize isLoading based on whether we potentially have a session (token exists).
  // If no token (New User), start as FALSE to render HomePage immediately (Zero Wait Time).
  // If token exists (Returning User), start as TRUE to verify session.
  const [isLoading, setIsLoading] = useState(() => !!localStorage.getItem('accessToken'));
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  
  const [subscriptions, setSubscriptions] = useState<SystemSource[]>([]);

  // PWA Cleanup: Unregister Service Worker if it exists
  useEffect(() => {
    const cleanupServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
          console.log('ServiceWorker cleanup done.');
        } catch (error) {
          console.warn('Service Worker unregistration failed (non-critical):', error);
        }
      }
    };
    cleanupServiceWorker();
  }, []);

  const handleLoginSuccess = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    setShowAuthModal(false);
    setView('cockpit'); // Navigate to cockpit after login
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setView('cockpit');
  }, []);

  const loadInitialData = useCallback(async () => {
    if (!user) return;
    // Don't set full page loading for background data fetch
    try {
        const subs = await getUserSubscribedSources();
        setSubscriptions(subs);
    } catch (error) {
      console.error("Failed to load initial data", error);
    }
  }, [user]);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('accessToken');
      
      // If no token, we are already in "not loading" state (from useState init).
      // Just ensure we are explicitly set to false to be safe.
      if (!token) {
          setIsLoading(false);
          return;
      }

      // If token exists, verify it
      try {
        const userData = await getMe();
        setUser(userData);
      } catch (e) {
        console.error("Failed to verify token:", e);
        localStorage.removeItem('accessToken');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
        loadInitialData();
    }
  }, [user, loadInitialData]);
  
  const handleNavigate = (newView: View) => {
      setView(newView);
  };
  
  // Show loading spinner ONLY if we are verifying a session
  if (isLoading) {
    return <PageLoader />;
  }

  // Instant render for non-authenticated users
  if (!user) {
    return (
      <>
        <HomePage onEnter={() => setShowAuthModal(true)} />
        {showAuthModal && <AuthModal onLoginSuccess={handleLoginSuccess} onClose={() => setShowAuthModal(false)} />}
      </>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'cockpit':
        return <StrategicCockpit subscriptions={subscriptions} user={user} />;
      case 'techboard':
        return <CompetitivenessDashboard />;
      case 'dives':
        return <DeepDives />;
      case 'events':
        return <IndustryEvents />;
      case 'ai':
        return <ReportGenerator />;
      case 'marketplace':
        return <AgentMarketplace />;
      case 'admin':
        return <AdminPage />;
      default:
        return <StrategicCockpit subscriptions={subscriptions} user={user} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
        <Header 
            user={user}
            currentView={view}
            onNavigate={handleNavigate}
            onUpgrade={() => setShowPricingModal(true)}
            onLogout={handleLogout}
            onShowBilling={() => setShowBillingModal(true)}
        />
        <main className="flex-1 min-h-0">
          <Suspense fallback={<PageLoader />}>
            {renderView()}
          </Suspense>
        </main>
        {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
        {showBillingModal && user && <BillingModal user={user} onClose={() => setShowBillingModal(false)} />}
    </div>
  );
};

export default App;
