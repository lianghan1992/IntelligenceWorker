import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { InfoFeed } from './components/InfoFeed';
import { DeepDives } from './components/DeepDives';
import { IndustryEvents } from './components/IndustryEvents';
import { ReportGenerator } from './components/ReportGenerator';
import { AdminPage } from './components/AdminPage';
import { AuthModal } from './components/AuthModal';
import { PricingModal } from './components/PricingModal';
import { HomePage } from './components/HomePage';
import { StrategicCockpit } from './components/StrategicCockpit';
import { User, View, Subscription, InfoItem, DeepDive } from './types';
import { getSubscriptions, getArticles, getMe } from './api';
import { mockDeepDives } from './mockData';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [infoItems, setInfoItems] = useState<InfoItem[]>([]);
  const [deepDives, setDeepDives] = useState<DeepDive[]>(mockDeepDives);

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
        if (subs.length > 0) {
            const pointIds = subs.map(s => s.id);
            const articlesData = await getArticles(pointIds, { page: 1, limit: 100 });
            setInfoItems(articlesData.items);
        } else {
            setInfoItems([]);
        }
    } catch (error) {
      console.error("Failed to load initial data", error);
      if ((error as any).message.includes('401')) {
          localStorage.removeItem('accessToken');
          setUser(null);
      }
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
  
  const handleAddCustomInfoItem = (newItem: InfoItem) => {
    setInfoItems(prev => [newItem, ...prev]);
    // Optionally close any open modals, though AddSourceModal handles its own closing
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
        return <Dashboard user={user} subscriptions={subscriptions} />;
      case 'cockpit':
        return <StrategicCockpit subscriptions={subscriptions} />;
      case 'feed':
        return <InfoFeed items={infoItems} subscriptions={subscriptions} />;
      case 'dives':
        return <DeepDives dives={deepDives} />;
      case 'events':
        return <IndustryEvents />;
      case 'ai':
        return <ReportGenerator />;
      case 'admin':
        return <AdminPage />;
      default:
        return <Dashboard user={user} subscriptions={subscriptions} />;
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
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
        {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
    </div>
  );
};

export default App;