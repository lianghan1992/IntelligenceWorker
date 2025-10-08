import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';
import { InfoFeed } from './components/InfoFeed';
import { DeepDives } from './components/DeepDives';
import { IndustryEvents } from './components/IndustryEvents';
import { ReportGenerator } from './components/ReportGenerator';
import { AdminPage } from './components/AdminPage';
import { InfoDetailView } from './components/InfoDetailView';
import { PricingModal } from './components/PricingModal';
import { AddSourceModal } from './components/AddSourceModal';
import { User, InfoItem, Subscription, DeepDive } from './types';
import { getPoints, getArticles } from './api';
import { mockDeepDives } from './mockData';

type AppState = 'landing' | 'auth' | 'loading' | 'app';
type View = 'dashboard' | 'feed' | 'dives' | 'events' | 'ai' | 'admin';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('landing');
    const [user, setUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [infoItems, setInfoItems] = useState<InfoItem[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [deepDives] = useState<DeepDive[]>(mockDeepDives);
    
    // UI states
    const [selectedInfoItem, setSelectedInfoItem] = useState<InfoItem | null>(null);
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);

    const loadAppData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [pointsData, articlesData] = await Promise.all([
                getPoints(),
                getArticles({ page: 1, limit: 100 }) 
            ]);
            setSubscriptions(pointsData);
            setInfoItems(articlesData.items);
            setAppState('app');
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
        setAppState('loading');
    };

    const handleEnter = () => {
        // For demo purposes, we'll show auth. In a real app, you might check for a stored token.
        setAppState('auth');
    };

    const handleNavigate = (view: View) => {
        setCurrentView(view);
        setSelectedInfoItem(null); // Return to feed view when navigating
    };

    const handleAddCustomSource = (newItem: InfoItem) => {
        setInfoItems(prev => [newItem, ...prev]);
        setIsAddSourceModalOpen(false);
        setCurrentView('feed');
    };

    const renderMainView = () => {
        if (selectedInfoItem) {
            return <InfoDetailView item={selectedInfoItem} onBack={() => setSelectedInfoItem(null)} />;
        }

        switch (currentView) {
            case 'dashboard':
                return <Dashboard user={user!} infoItems={infoItems} subscriptions={subscriptions} onAddSource={() => setIsAddSourceModalOpen(true)} />;
            case 'feed':
                return <InfoFeed items={infoItems} onSelectItem={setSelectedInfoItem} subscriptions={subscriptions} />;
            case 'dives':
                return <DeepDives dives={deepDives} />;
            case 'events':
                return <IndustryEvents />;
            case 'ai':
                return <ReportGenerator />;
            case 'admin':
                return <AdminPage subscriptions={subscriptions} onSubscriptionsUpdate={setSubscriptions} />;
            default:
                return <div>视图未找到</div>;
        }
    };
    
    if (appState === 'landing') {
        return <HomePage onEnter={handleEnter} />;
    }

    if (appState === 'auth') {
        return <AuthModal onClose={() => setAppState('landing')} onLoginSuccess={handleLoginSuccess} />;
    }
    
    if (appState === 'loading' || isLoading) {
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

    // Fallback or should not be reached state
    return <HomePage onEnter={handleEnter} />;
};

export default App;
