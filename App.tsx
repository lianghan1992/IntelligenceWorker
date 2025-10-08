import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { AuthModal } from './components/AuthModal';
// FiX: Corrected path to Dashboard.tsx to resolve module not found error.
import { Dashboard } from './components/Dashboard';
import { InfoFeed } from './components/InfoFeed';
import { DeepDives } from './components/DeepDives';
import { IndustryEvents } from './components/IndustryEvents';
import { ReportGenerator } from './components/ReportGenerator';
import { AdminPage } from './components/AdminPage';
import { InfoDetailView } from './components/InfoDetailView';
import { PricingModal } from './components/PricingModal';
import { AddSourceModal } from './components/AddSourceModal';
import { User, InfoItem, Subscription, DeepDive, View } from './types';
// FiX: Corrected path to api.ts to resolve module not found error.
import { getPoints, getArticles } from './api';
import { mockDeepDives } from './mockData';

type AppState = 'landing' | 'auth' | 'loading' | 'app';

// 创建一个模拟用户以绕过登录流程
const mockUser: User = {
    user_id: 'temp_user_01',
    username: '访客用户',
    email: 'guest@example.com',
};

const App: React.FC = () => {
    // 设置初始状态为 'loading' 并使用模拟用户，以直接进入应用
    const [appState, setAppState] = useState<AppState>('loading');
    const [user, setUser] = useState<User | null>(mockUser);
    
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
    
    // 应用加载时直接获取数据
    useEffect(() => {
        loadAppData();
    }, [loadAppData]);

    // 保留登录逻辑以备后续使用
    const handleLoginSuccess = (loggedInUser: User) => {
        setUser(loggedInUser);
        setAppState('loading');
    };

    // 保留进入逻辑以备后续使用
    const handleEnter = () => {
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
                return <Dashboard user={user!} subscriptions={subscriptions} />;
            case 'feed':
                return <InfoFeed items={infoItems} onSelectItem={setSelectedInfoItem} subscriptions={subscriptions} />;
            case 'dives':
                return <DeepDives dives={deepDives} />;
            case 'events':
                return <IndustryEvents />;
            case 'ai':
                return <ReportGenerator />;
            case 'admin':
                return <AdminPage subscriptions={subscriptions} onSubscriptionsUpdate={setSubscriptions} onAddSource={() => setIsAddSourceModalOpen(true)} />;
            default:
                return <div>视图未找到</div>;
        }
    };
    
    // 以下视图在当前配置下将被跳过，但保留代码
    if (appState === 'landing') {
        return <HomePage onEnter={handleEnter} />;
    }

    if (appState === 'auth') {
        return <AuthModal onClose={() => setAppState('landing')} onLoginSuccess={handleLoginSuccess} />;
    }
    
    // 应用启动时会先显示加载状态
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