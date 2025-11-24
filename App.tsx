import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard/index';
import { DeepDives } from './components/DeepDives/index';
import { IndustryEvents } from './components/IndustryEvents/index';
import { ReportGenerator } from './components/ReportGenerator/index';
import { AdminPage } from './components/Admin';
import { AuthModal } from './components/HomePage/AuthModal';
import { PricingModal } from './components/PricingModal';
import { HomePage } from './components/HomePage/index';
import { StrategicCockpit } from './components/StrategicCockpit/index';
import { CompetitivenessDashboard } from './components/CompetitivenessDashboard/index'; // 导入新的竞争力看板组件
import { User, View, Subscription } from './types';
import { getSubscriptions, getMe } from './api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const handleLoginSuccess = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    setShowAuthModal(false);
    setView('dashboard');
  }, []);

  const loadInitialData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const subs = await getSubscriptions();
        setSubscriptions(subs);
    } catch (error) {
      console.error("Failed to load initial data", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const checkUser = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const userData = await getMe();
          setUser(userData);
        } catch (e) {
          console.error("Failed to verify token:", e);
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      }
      setIsLoading(false);
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
  
  if (isLoading && !user) {
    return <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-600">正在初始化应用...</div>;
  }

  if (!user) {
    return (
      <>
        <HomePage onEnter={() => setShowAuthModal(true)} />
        {showAuthModal && <AuthModal onLoginSuccess={handleLoginSuccess} onClose={() => setShowAuthModal(false)} />}
      </>
    );
  }

  const renderView = () => {
    if (isLoading) {
        return <div className="flex items-center justify-center h-full text-gray-600">正在加载数据...</div>;
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard user={user} subscriptions={subscriptions} onNavigate={handleNavigate} />;
      case 'cockpit':
        return <StrategicCockpit subscriptions={subscriptions} />;
      case 'techboard':
        return <CompetitivenessDashboard />;
      case 'dives':
        return <DeepDives />;
      case 'events':
        return <IndustryEvents />;
      case 'ai':
        return <ReportGenerator />;
      case 'admin':
        return <AdminPage />;
      default:
        return <Dashboard user={user} subscriptions={subscriptions} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
        <Header 
            user={user}
            currentView={view}
            onNavigate={handleNavigate}
            onUpgrade={() => setShowPricingModal(true)}
        />
        <main className="flex-1 min-h-0">
          {renderView()}
        </main>
        {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
    </div>
  );
};

export default App;