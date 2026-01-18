
import React, { useState, useEffect, Suspense } from 'react';
import { User, View, SystemSource } from './types';
import { getUserSubscribedSources, getMe } from './api';

// Components
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { AuthModal } from './components/HomePage/AuthModal';
import { PricingModal } from './components/PricingModal';
import { UserProfileModal } from './components/UserProfile/UserProfileModal';
import { BillingModal } from './components/UserProfile/BillingModal';

// Views
import { StrategicCockpit } from './components/StrategicCockpit';
import { TechDashboard } from './components/TechDashboard';
import { DeepDives } from './components/DeepDives';
import { IndustryEvents } from './components/IndustryEvents';
import { ReportGenerator } from './components/ReportGenerator';
import { AdminPage } from './components/Admin';

// Lazy load
const AgentMarketplace = React.lazy(() => import('./components/AgentMarketplace/index'));

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('cockpit');
  const [subscriptions, setSubscriptions] = useState<SystemSource[]>([]);
  
  // Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBilling, setShowBilling] = useState(false);

  useEffect(() => {
    // Check local storage for user cache or token
    const token = localStorage.getItem('accessToken');
    if (token) {
       getMe().then(u => setUser(u)).catch(() => {
         localStorage.removeItem('accessToken');
         setUser(null);
       });
    }
  }, []);

  useEffect(() => {
      if (user) {
          getUserSubscribedSources().then(setSubscriptions).catch(console.error);
      }
  }, [user]);

  const handleLoginSuccess = (u: User) => {
      setUser(u);
      setShowAuthModal(false);
      setView('cockpit');
  };

  const handleLogout = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user_cache');
      setUser(null);
      setView('cockpit');
  };

  const renderView = () => {
    switch (view) {
      case 'cockpit':
        return <StrategicCockpit subscriptions={subscriptions} user={user!} />;
      case 'techboard':
        return <TechDashboard />;
      case 'dives':
        return <DeepDives />;
      case 'events':
        return <IndustryEvents />;
      case 'ai':
        return <ReportGenerator onShowBilling={() => setShowBilling(true)} />;
      case 'marketplace':
         return (
             <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                <AgentMarketplace user={user!} />
             </Suspense>
         );
      case 'admin':
        return <AdminPage />;
      default:
        return <StrategicCockpit subscriptions={subscriptions} user={user!} />;
    }
  };

  if (!user) {
      return (
          <>
              <HomePage onEnter={() => setShowAuthModal(true)} />
              {showAuthModal && <AuthModal onLoginSuccess={handleLoginSuccess} onClose={() => setShowAuthModal(false)} />}
          </>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
        <Header 
            currentView={view} 
            onNavigate={setView} 
            onUpgrade={() => setShowPricing(true)} 
            onLogout={handleLogout}
            onShowBilling={() => setShowBilling(true)}
            onShowProfile={() => setShowProfile(true)}
            user={user}
        />
        <main className="flex-1 overflow-hidden relative">
            {renderView()}
        </main>

        {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
        {showProfile && <UserProfileModal user={user} onClose={() => setShowProfile(false)} />}
        {showBilling && <BillingModal user={user} onClose={() => setShowBilling(false)} />}
    </div>
  );
}
