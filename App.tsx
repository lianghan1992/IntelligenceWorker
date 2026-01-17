import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { User, View, SystemSource } from './types';
import { getUserSubscribedSources, getMe } from './api';

// --- 1. Critical Imports (Keep Minimal) ---
// Only import minimal types or utils that are absolutely required for the initial render logic.
// Icons and heavy components should be lazy loaded.

// --- 2. Lazy Load Components (Code Splitting) ---
// By using React.lazy, these components are split into separate JS chunks
// and only loaded when rendered. This drastically reduces the initial bundle size.

const Header = React.lazy(() => import('./components/Header').then(m => ({ default: m.Header })));
const HomePage = React.lazy(() => import('./components/HomePage/index').then(m => ({ default: m.HomePage })));
const AuthModal = React.lazy(() => import('./components/HomePage/AuthModal').then(m => ({ default: m.AuthModal })));
const PricingModal = React.lazy(() => import('./components/PricingModal').then(m => ({ default: m.PricingModal })));
const BillingModal = React.lazy(() => import('./components/UserProfile/BillingModal').then(m => ({ default: m.BillingModal })));
const UserProfileModal = React.lazy(() => import('./components/UserProfile/UserProfileModal').then(m => ({ default: m.UserProfileModal })));

// Functional Modules (Already split, but listed here for clarity)
const StrategicCockpit = React.lazy(() => import('./components/StrategicCockpit/index').then(m => ({ default: m.StrategicCockpit })));
const CompetitivenessDashboard = React.lazy(() => import('./components/CompetitivenessDashboard/index').then(m => ({ default: m.CompetitivenessDashboard })));
const DeepDives = React.lazy(() => import('./components/DeepDives/index').then(m => ({ default: m.DeepDives })));
const IndustryEvents = React.lazy(() => import('./components/IndustryEvents/index').then(m => ({ default: m.IndustryEvents })));
const ReportGenerator = React.lazy(() => import('./components/ReportGenerator/index').then(m => ({ default: m.ReportGenerator })));
const AdminPage = React.lazy(() => import('./components/Admin/index').then(m => ({ default: m.AdminPage })));
const AgentMarketplace = React.lazy(() => import('./components/AgentMarketplace/index'));

// --- 3. Preload Loaders (Background Fetching) ---
const preloaders = [
    () => import('./components/Header'),
    () => import('./components/HomePage/index'),
    () => import('./components/StrategicCockpit/index'),
    () => import('./components/CompetitivenessDashboard/index'),
    () => import('./components/DeepDives/index'),
    () => import('./components/IndustryEvents/index'),
    () => import('./components/ReportGenerator/index'),
];

// --- 4. Loading Fallback ---
// A lightweight loader that displays while lazy chunks are downloading.
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-full bg-[#f8fafc]">
    <div className="flex flex-col items-center gap-4">
      {/* CSS-only simple spinner to avoid dependencies */}
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <span className="text-xs font-bold text-slate-400 tracking-widest uppercase animate-pulse">Loading Engine...</span>
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
      // Delay prefetching to prioritize the main thread for initial render and interactivity
      // Increased delay to 5s to ensure "Time to Interactive" is not affected on slow networks
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('🚀 [AutoInsight] Starting idle resource prefetching...');
      
      preloaders.forEach(loader => {
        try {
          loader(); // Trigger the network request
        } catch (e) {
          // Ignore prefetch errors
        }
      });
    };

    // Only prefetch if we have a user (likely to use the app)
    if (user) {
        prefetchResources();
    }
  }, [user]);

  // PWA Cleanup
  useEffect(() => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (const registration of registrations) {
                registration.unregister();
            }
        });
    }
  }, []);

  const handleLoginSuccess = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('user_cache', JSON.stringify(loggedInUser));
    setShowAuthModal(false);
    setView('cockpit'); 
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user_cache');
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
        const userData = await getMe();
        setUser(userData);
        localStorage.setItem('user_cache', JSON.stringify(userData));
      } catch (e) {
        console.error("Failed to verify token:", e);
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
  
  // Render View Switcher
  const renderView = () => {
    switch (view) {
      case 'cockpit':
        return <StrategicCockpit subscriptions={subscriptions} user={user!} />;
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
        return <StrategicCockpit subscriptions={subscriptions} user={user!} />;
    }
  };

  // 🔴 Immediate Fallback for Auth Check
  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      {!user ? (
        <>
          <HomePage onEnter={() => setShowAuthModal(true)} />
          {showAuthModal && <AuthModal onLoginSuccess={handleLoginSuccess} onClose={() => setShowAuthModal(false)} />}
        </>
      ) : (
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
               {renderView()}
            </main>
            {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
            {showBillingModal && <BillingModal user={user} onClose={() => setShowBillingModal(false)} />}
            {showProfileModal && <UserProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
        </div>
      )}
    </Suspense>
  );
};

export default App;