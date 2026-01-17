import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Header } from './components/Header';
import { AuthModal } from './components/HomePage/AuthModal';
import { PricingModal } from './components/PricingModal';
import { HomePage } from './components/HomePage/index';
import { BillingModal } from './components/UserProfile/BillingModal';
import { UserProfileModal } from './components/UserProfile/UserProfileModal';
import { User, View, SystemSource } from './types';
import { getUserSubscribedSources, getMe } from './api';

// --- Lazy Load Loaders (Extracted for Prefetching) ---
const loadStrategicCockpit = () => import('./components/StrategicCockpit/index').then(module => ({ default: module.StrategicCockpit }));
const loadCompetitivenessDashboard = () => import('./components/CompetitivenessDashboard/index').then(module => ({ default: module.CompetitivenessDashboard }));
const loadDeepDives = () => import('./components/DeepDives/index').then(module => ({ default: module.DeepDives }));
const loadIndustryEvents = () => import('./components/IndustryEvents/index').then(module => ({ default: module.IndustryEvents }));
const loadReportGenerator = () => import('./components/ReportGenerator/index').then(module => ({ default: module.ReportGenerator }));
const loadAdminPage = () => import('./components/Admin/index').then(module => ({ default: module.AdminPage }));
const loadAgentMarketplace = () => import('./components/AgentMarketplace/index');

// --- Lazy Components ---
const StrategicCockpit = React.lazy(loadStrategicCockpit);
const CompetitivenessDashboard = React.lazy(loadCompetitivenessDashboard);
const DeepDives = React.lazy(loadDeepDives);
const IndustryEvents = React.lazy(loadIndustryEvents);
const ReportGenerator = React.lazy(loadReportGenerator);
const AdminPage = React.lazy(loadAdminPage);
const AgentMarketplace = React.lazy(loadAgentMarketplace);

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
  // ⚡️ PERFORMANCE: Initialize user from local cache immediately
  const [user, setUser] = useState<User | null>(() => {
    try {
        const cachedUser = localStorage.getItem('user_cache');
        return cachedUser ? JSON.parse(cachedUser) : null;
    } catch (e) {
        return null;
    }
  });

  const [view, setView] = useState<View>('cockpit'); 
  
  // ⚡️ PERFORMANCE: Only show loading if we have a token but NO cached user
  const hasToken = !!localStorage.getItem('accessToken');
  const [isLoading, setIsLoading] = useState(hasToken && !user);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const [subscriptions, setSubscriptions] = useState<SystemSource[]>([]);

  // 🚀 Intelligent Prefetching Strategy
  useEffect(() => {
    const prefetchResources = async () => {
      // Wait for 3.5 seconds to ensure the main thread is idle and LCP (Largest Contentful Paint) is finished
      await new Promise(resolve => setTimeout(resolve, 3500));
      
      console.log('🚀 [AutoInsight] Starting idle resource prefetching...');
      
      // Trigger network requests for all chunks. 
      // Since these imports match the React.lazy definitions, the browser will cache them.
      const loaders = [
        loadStrategicCockpit,
        loadCompetitivenessDashboard,
        loadDeepDives,
        loadIndustryEvents,
        loadReportGenerator,
        loadAgentMarketplace,
        // Only prefetch admin if likely needed, or just always (it's split anyway)
        loadAdminPage
      ];

      loaders.forEach(loader => {
        try {
          loader(); 
        } catch (e) {
          // Ignore prefetch errors, they will be handled by ErrorBoundaries if real load fails
        }
      });
    };

    // Only prefetch if we have a user (meaning we are inside the dashboard)
    if (user) {
        prefetchResources();
    }
  }, [user]); // Run when user logs in

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
    localStorage.setItem('user_cache', JSON.stringify(loggedInUser)); // Cache user
    setShowAuthModal(false);
    setView('cockpit'); 
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user_cache'); // Clear cache
    setUser(null);
    setView('cockpit');
  }, []);

  const loadInitialData = useCallback(async () => {
    if (!user) return;
    try {
        const subs = await getUserSubscribedSources();
        setSubscriptions(subs);
    } catch (error) {
      console.error("Failed to load initial data", error);
    }
  }, [user]);

  // Silent Auth Verification
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
          setIsLoading(false);
          return;
      }

      try {
        // Run verification in background
        const userData = await getMe();
        setUser(userData);
        // Update cache with fresh data
        localStorage.setItem('user_cache', JSON.stringify(userData));
      } catch (e) {
        console.error("Failed to verify token:", e);
        // Only verify failed (401), we log out
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user_cache');
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
        return <ReportGenerator onShowBilling={() => setShowBillingModal(true)} />;
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
            onShowProfile={() => setShowProfileModal(true)}
        />
        <main className="flex-1 min-h-0">
          <Suspense fallback={<PageLoader />}>
            {renderView()}
          </Suspense>
        </main>
        {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
        {showBillingModal && user && <BillingModal user={user} onClose={() => setShowBillingModal(false)} />}
        {showProfileModal && user && <UserProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
    </div>
  );
};

export default App;