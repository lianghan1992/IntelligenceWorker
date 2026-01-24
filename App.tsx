
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Header } from './components/Header';
import { MobileMenu } from './components/MobileMenu'; // Import the new shared component
import { AuthModal } from './components/HomePage/AuthModal';
import { PricingModal } from './components/PricingModal';
import { HomePage } from './components/HomePage/index';
import { BillingModal } from './components/UserProfile/BillingModal';
import { UserProfileModal } from './components/UserProfile/UserProfileModal';
import { User, View, SystemSource } from './types';
import { getUserSubscribedSources, getMe } from './api';
import { LogoIcon, MenuIcon } from './components/icons'; // Import icons for Mobile Top Bar

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Global Mobile Menu State
  
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
    localStorage.setItem('user_cache', JSON.stringify(loggedInUser)); // Cache user
    setShowAuthModal(false);
    setView('cockpit'); 
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user_cache'); // Clear cache
    setUser(null);
    setView('cockpit');
    setIsMobileMenuOpen(false);
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
      setIsMobileMenuOpen(false);
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
        // Pass openMobileMenu handler to Cockpit
        return <StrategicCockpit subscriptions={subscriptions} user={user} onNavigate={handleNavigate} onLogout={handleLogout} onShowProfile={() => setShowProfileModal(true)} onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />;
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
        return <StrategicCockpit subscriptions={subscriptions} user={user} onNavigate={handleNavigate} onLogout={handleLogout} onShowProfile={() => setShowProfileModal(true)} onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
        {/* Desktop Header */}
        <Header 
            user={user}
            currentView={view}
            onNavigate={handleNavigate}
            onUpgrade={() => setShowPricingModal(true)}
            onLogout={handleLogout}
            onShowBilling={() => setShowBillingModal(true)}
            onShowProfile={() => setShowProfileModal(true)}
        />

        {/* Unified Mobile Global Header (Visible on non-cockpit pages) */}
        {view !== 'cockpit' && (
            <div className="md:hidden h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-40 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-2">
                     <LogoIcon className="w-7 h-7" />
                     <span className="font-extrabold text-slate-800 text-lg tracking-tight">Auto Insight</span>
                </div>
                <button 
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
                >
                    <MenuIcon className="w-6 h-6" />
                </button>
            </div>
        )}

        <main className="flex-1 min-h-0">
          <Suspense fallback={<PageLoader />}>
            {renderView()}
          </Suspense>
        </main>
        
        {/* Global Mobile Menu Drawer */}
        <MobileMenu 
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            user={user}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onShowProfile={() => setShowProfileModal(true)}
        />

        {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
        {showBillingModal && user && <BillingModal user={user} onClose={() => setShowBillingModal(false)} />}
        {showProfileModal && user && <UserProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
    </div>
  );
};

export default App;
