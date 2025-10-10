import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';
import { InfoFeed } from './components/InfoFeed';
import { StrategicCockpit } from './components/StrategicCockpit';
import { DeepDives } from './components/DeepDives';
import { IndustryEvents } from './components/IndustryEvents';
import { ReportGenerator } from './components/ReportGenerator';
import { AdminPage } from './components/AdminPage';
import { PricingModal } from './components/PricingModal';
import { AddSourceModal } from './components/AddSourceModal';
import { User, InfoItem, Subscription, DeepDive, View } from './types';
import { getPoints, getArticles, getMe } from './api';
import { mockDeepDives } from './mockData';

type AppState = 'initializing' | 'landing' | 'auth' | 'app';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('initializing');
    const [user, setUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [infoItems, setInfoItems] = useState<InfoItem[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [deepDives] = useState<DeepDive[]>(mockDeepDives);
    
    // UI states
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);

    useEffect(() => {
        const checkAuthStatus = async () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const currentUser = await getMe();
                    handleLoginSuccess(currentUser);
                } catch (error) {
                    console.warn("会话已过期或无效。");
                    localStorage.removeItem('accessToken');
                    setAppState('landing');
                }
            } else {
                setAppState('landing');
            }
        };
        checkAuthStatus();
    }, []);

    const loadAppData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const pointsData = await getPoints();
            setSubscriptions(pointsData);
            
            if (pointsData.length > 0) {
                const pointIds = pointsData.map(p => p.id);
                const articlesData = await getArticles(pointIds, { page: 1, limit: 100 });
                setInfoItems(articlesData.items);
            } else {
                setInfoItems([]);
            }
        } catch (err: any) {
            setError(err.message || '无法加载应用数据');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    useEffect(() => {
        if (user) {
            loadAppData();
        }
    }, [user, loadAppData]);

    const handleLoginSuccess = (loggedInUser: User) => {
        setUser(loggedInUser);
        setAppState('app');
    };

    const handleEnter = () => {
        setAppState('auth');
    };

    const handleNavigate = (view: View) => {
        setCurrentView(view);
    };

    const handleAddCustomSource = (newItem: InfoItem) => {
        setInfoItems(prev => [newItem, ...prev]);
        setIsAddSourceModalOpen(false);
        setCurrentView('cockpit');
    };

    const renderMainView = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard user={user!} subscriptions={subscriptions} />;
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
                return <div>视图未找到</div>;
        }
    };

    if (appState === 'initializing') {
        return <div className="flex items-center justify-center h-screen">正在初始化...</div>;
    }
    
    if (appState === 'landing') {
        return <HomePage onEnter={handleEnter} />;
    }

    if (appState === 'auth') {
        return <AuthModal onClose={() => setAppState('landing')} onLoginSuccess={handleLoginSuccess} />;
    }
    
    if (appState === 'app' && isLoading) {
        return <div className="flex items-center justify-center h-screen">正在加载工作台...</div>;
    }
    
    if (error) {
        return <div className="flex items-center justify-center h-screen text-red-500">错误: {error}</div>;
    }

    if (appState === 'app' && user) {
        return (
            <div className="flex flex-col h-screen bg-gray-100">
                <Header 
                    currentView={currentView} 
                    onNavigate={handleNavigate} 
                    onUpgrade={() => setIsPricingModalOpen(true)}
                    user={user}
                />
                <main className="flex-1 overflow-hidden">
                    {renderMainView()}
                </main>
                {isPricingModalOpen && <PricingModal onClose={() => setIsPricingModalOpen(false)} />}
                {isAddSourceModalOpen && <AddSourceModal onClose={() => setIsAddSourceModalOpen(false)} onAdd={handleAddCustomSource} />}
            </div>
        );
    }

    return <HomePage onEnter={handleEnter} />;
};

export default App;
