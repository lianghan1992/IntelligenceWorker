import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { User, View, SystemSource } from './types';
import { getUserSubscribedSources, getMe } from './api';

// --- 1. Lazy Components ---
const Header = React.lazy(() => import('./components/Header').then(m => ({ default: m.Header })));
const HomePage = React.lazy(() => import('./components/HomePage/index').then(m => ({ default: m.HomePage })));
const AuthModal = React.lazy(() => import('./components/HomePage/AuthModal').then(m => ({ default: m.AuthModal })));
const PricingModal = React.lazy(() => import('./components/PricingModal').then(m => ({ default: m.PricingModal })));
const BillingModal = React.lazy(() => import('./components/UserProfile/BillingModal').then(m => ({ default: m.BillingModal })));
const UserProfileModal = React.lazy(() => import('./components/UserProfile/UserProfileModal').then(m => ({ default: m.UserProfileModal })));

const StrategicCockpit = React.lazy(() => import('./components/StrategicCockpit/index').then(m => ({ default: m.StrategicCockpit })));
const CompetitivenessDashboard = React.lazy(() => import('./components/CompetitivenessDashboard/index').then(m => ({ default: m.CompetitivenessDashboard })));
const DeepDives = React.lazy(() => import('./components/DeepDives/index').then(m => ({ default: m.DeepDives })));
const IndustryEvents = React.lazy(() => import('./components/IndustryEvents/index').then(m => ({ default: m.IndustryEvents })));
const ReportGenerator = React.lazy(() => import('./components/ReportGenerator/index').then(m => ({ default: m.ReportGenerator })));
const AdminPage = React.lazy(() => import('./components/Admin/index').then(m => ({ default: m.AdminPage })));
const AgentMarketplace = React.lazy(() => import('./components/AgentMarketplace/index'));

// --- 2. Prefetch List ---
const preloaders = [
    () => import('./components/StrategicCockpit/index'),
    () => import('./components/CompetitivenessDashboard/index'),
    () => import('./components/DeepDives/index'),
    () => import('./components/IndustryEvents/index'),
    () => import('./components/ReportGenerator/index'),
];

// --- 3. Loading Placeholder (Matches CSS Skeleton) ---
// This React component takes over once React loads but before the specific page chunk arrives
const PageLoader = () => (
  <div className="fixed inset-0 bg-[#f8fafc] z-50 flex flex-col animate-pulse">
    {/* Header Skeleton */}
    <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center gap-6">
        <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
        <div className="w-32 h-5 bg-slate-200 rounded"></div>
        <div className="flex-1"></div>
        <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
    </div>
    {/* Body Skeleton */}
    <div className="flex-1 p-6 flex gap-6 overflow-hidden">
        <div className="hidden md:block w-96 bg-white border border-slate-200 rounded-2xl h-full p-4 space-y-4">
            <div className="w-full h-10 bg-slate-100 rounded-lg"></div>
            <div className="w-full h-24 bg-slate-50 rounded-xl"></div>
            <div className="w-full h-24 bg-slate-50 rounded-xl"></div>
        </div>
        <div className="flex-1 flex flex-col gap-6">
            <div className="w-full h-48 bg-slate-200/50 rounded-2xl"></div>
            <div className="flex gap-6">
                 <div className="flex-1 h-32 bg-white border border-slate-200 rounded-xl"></div>
                 <div className="flex-1 h-32 bg-white border border-slate-200 rounded-xl"></div>
            </div>
        </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
        const cachedUser = localStorage.getItem('user_cache');
        return cachedUser ? JSON.parse(cachedUser) : null;
    } catch (e) {
        return null;
    }
  });

  const [view, setView] = useState<View>('cockpit'); 
  const hasToken = !!localStorage.getItem('accessToken');
  const [isLoading, setIsLoading] = useState(hasToken && !user);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SystemSource[]>([]);

  // 🚀 Optimized Prefetching: Use requestIdleCallback
  useEffect(() => {
    if (!user) return;

    const runPrefetch = () => {
        // Define a safe idle callback shim
        const idleCallback = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 3000));
        
        idleCallback(() => {
            console.log('🚀 [AutoInsight] Network idle, prefetching next chunks...');
            preloaders.forEach(loader => {
                // Add a small staggered delay between requests to avoid burst
                setTimeout(() => {
                    try { loader(); } catch(e) {}
                }, Math.random() * 2000);
            });
        });
    };

    // Wait for initial render to settle completely
    const t = setTimeout(runPrefetch, 4000);
    return () => clearTimeout(t);
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
  
  const renderView = () => {
    switch (view) {
      case 'cockpit': return <StrategicCockpit subscriptions={subscriptions} user={user!} />;
      case 'techboard': return <CompetitivenessDashboard />;
      case 'dives': return <DeepDives />;
      case 'events': return <IndustryEvents />;
      case 'ai': return <ReportGenerator onShowBilling={() => setShowBillingModal(true)} />;
      case 'marketplace': return <AgentMarketplace />;
      case 'admin': return <AdminPage />;
      default: return <StrategicCockpit subscriptions={subscriptions} user={user!} />;
    }
  };

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
        <div className="flex flex-col h-screen bg-[#f8fafc] font-sans">
            <Header 
                user={user}
                currentView={view}
                onNavigate={handleNavigate}
                onUpgrade={() => setShowPricingModal(true)}
                onLogout={handleLogout}
                onShowBilling={() => setShowBillingModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
            />
            <main className="flex-1 min-h-0 relative">
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