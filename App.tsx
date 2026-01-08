
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Header } from './components/Header';
import { AuthModal } from './components/HomePage/AuthModal';
import { PricingModal } from './components/PricingModal';
import { HomePage } from './components/HomePage/index';
import { User, View, SystemSource } from './types';
import { getUserSubscribedSources, getMe } from './api';

// Lazy load components with named export adaptation
const StrategicCockpit = React.lazy(() => import('./components/StrategicCockpit/index').then(module => ({ default: module.StrategicCockpit })));
const CompetitivenessDashboard = React.lazy(() => import('./components/CompetitivenessDashboard/index').then(module => ({ default: module.CompetitivenessDashboard })));
const DeepDives = React.lazy(() => import('./components/DeepDives/index').then(module => ({ default: module.DeepDives })));
const IndustryEvents = React.lazy(() => import('./components/IndustryEvents/index').then(module => ({ default: module.IndustryEvents })));
const ReportGenerator = React.lazy(() => import('./components/ReportGenerator/index').then(module => ({ default: module.ReportGenerator })));
const EfficiencyMart = React.lazy(() => import('./components/EfficiencyMart/index').then(module => ({ default: module.EfficiencyMart })));
const AdminPage = React.lazy(() => import('./components/Admin/index').then(module => ({ default: module.AdminPage })));

export const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('cockpit');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subscriptions, setSubscriptions] = useState<SystemSource[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await getMe();
        setUser(currentUser);
        const subs = await getUserSubscribedSources();
        setSubscriptions(subs);
      } catch (e) {
        console.error("Not logged in or failed to fetch", e);
        // If getMe fails (e.g. token expired), apiFetch might have already cleared token/reloaded,
        // or if it's a network error, we just stay in logged out state.
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const handleLoginSuccess = async (u: User) => {
    setUser(u);
    setShowAuthModal(false);
    try {
        const subs = await getUserSubscribedSources();
        setSubscriptions(subs);
    } catch(e) {}
  };

  const renderView = () => {
    if (isLoading) {
        return <div className="flex items-center justify-center h-full text-gray-600">正在加载数据...</div>;
    }

    if (!user) {
        return <HomePage onEnter={() => setShowAuthModal(true)} />;
    }

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
      case 'mart':
        return <EfficiencyMart />;
      case 'admin':
        return <AdminPage />;
      default:
        return <StrategicCockpit subscriptions={subscriptions} user={user} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      {user && (
          <Header 
            currentView={view} 
            onNavigate={setView} 
            onUpgrade={() => setShowPricingModal(true)}
            onLogout={() => { setUser(null); localStorage.removeItem('accessToken'); }}
            user={user}
          />
      )}
      
      <div className="flex-1 overflow-hidden relative">
        <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            {renderView()}
        </Suspense>
      </div>

      {showAuthModal && <AuthModal onLoginSuccess={handleLoginSuccess} onClose={() => setShowAuthModal(false)} />}
      {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
    </div>
  );
};
