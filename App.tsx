import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { InfoFeed } from './components/InfoFeed';
import { DeepDives } from './components/DeepDives';
import { IndustryEvents } from './components/IndustryEvents';
import { ReportGenerator } from './components/ReportGenerator';
import { InfoDetailView } from './components/InfoDetailView';
import { AddSubscriptionModal } from './components/AddSubscriptionModal';
import { PricingModal } from './components/PricingModal';
import { HomePage } from './components/HomePage';
import { AdminPage } from './components/AdminPage';
import { mockDeepDives } from './mockData';
import { InfoItem, Subscription, User, SystemSource } from './types';
import { getArticles, getPoints, createPoint, getSources } from './api';

type NewSubscriptionData = Omit<Subscription, 'id' | 'keywords' | 'newItemsCount'>;

const App: React.FC = () => {
    const [currentUser] = useState<User>({
        user_id: 'default_user_01',
        username: '特邀用户',
        email: 'user@example.com',
    });
    const [currentView, setCurrentView] = useState('home');
    const [selectedInfoItem, setSelectedInfoItem] = useState<InfoItem | null>(null);
    
    const [isPricingModalOpen, setPricingModalOpen] = useState(false);
    const [isAddSubscriptionModalOpen, setAddSubscriptionModalOpen] = useState(false);

    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [infoFeedItems, setInfoFeedItems] = useState<InfoItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dashboardStats, setDashboardStats] = useState({
        articlesToday: 0,
        pointsWithUpdates: 0,
        totalPoints: 0,
        totalSources: 0,
    });

     // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            if (currentView === 'home' || currentView === 'admin') return; 
            setIsLoading(true);
            setError(null);
            try {
                const [pointsData, articlesData, sourcesData] = await Promise.all([
                    getPoints(),
                    getArticles({ page: 1, limit: 200 }), // Fetch more for better stats
                    getSources()
                ]);

                setSubscriptions(pointsData);
                setInfoFeedItems(articlesData.items);
                
                // Calculate dashboard stats
                const today = new Date().toDateString();
                const articlesToday = articlesData.items.filter(item => 
                    new Date(item.created_at).toDateString() === today
                );
                const updatedPointIds = new Set(articlesToday.map(item => item.point_id));

                setDashboardStats({
                    articlesToday: articlesToday.length,
                    pointsWithUpdates: updatedPointIds.size,
                    totalPoints: pointsData.length,
                    totalSources: sourcesData.length,
                });

            } catch (err: any) {
                setError(err.message || 'Failed to load initial data.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [currentView]);


    const handleNavigate = (view: string) => {
        setSelectedInfoItem(null); // Reset detail view on navigation
        setCurrentView(view);
    };

    const handleSelectItem = (item: InfoItem) => {
        setCurrentView('feed');
        setSelectedInfoItem(item);
    };

    const handleBackToFeed = () => {
        setSelectedInfoItem(null);
    };

    const handleSaveSubscription = async (newSubData: NewSubscriptionData) => {
        try {
            const result = await createPoint(newSubData);
            const newSubscription: Subscription = {
                ...newSubData,
                id: result.point_id,
                keywords: [newSubData.point_name, newSubData.source_name].filter(Boolean),
                newItemsCount: 0
            };
            setSubscriptions(prev => [newSubscription, ...prev]);
            setAddSubscriptionModalOpen(false);
        } catch (error: any) {
            console.error("Failed to save subscription:", error);
            alert(`保存失败: ${error.message}`);
        }
    };

    const renderContent = () => {
        if (selectedInfoItem) {
            return <InfoDetailView item={selectedInfoItem} onBack={handleBackToFeed} />;
        }

        if (isLoading && !['home', 'admin'].includes(currentView)) {
            return <div className="flex items-center justify-center h-full"><p>加载数据中...</p></div>;
        }

        if (error && !['home', 'admin'].includes(currentView)) {
            return <div className="flex items-center justify-center h-full"><p className="text-red-500">错误: {error}</p></div>;
        }

        switch (currentView) {
            case 'home':
                return <HomePage onEnter={() => handleNavigate('dashboard')} />;
            case 'dashboard':
                return <Dashboard 
                            subscriptions={subscriptions}
                            onAddSubscription={() => setAddSubscriptionModalOpen(true)}
                            stats={dashboardStats}
                        />;
            case 'feed':
                return <InfoFeed items={infoFeedItems} onSelectItem={handleSelectItem} subscriptions={subscriptions} />;
            case 'dives':
                return <DeepDives dives={mockDeepDives} />;
            case 'events':
                return <IndustryEvents />;
            case 'ai':
                return <ReportGenerator />;
            case 'admin':
                return <AdminPage />;
            default:
                return <HomePage onEnter={() => handleNavigate('dashboard')} />;
        }
    };

    const isHomePage = currentView === 'home';

    return (
        <>
            {isHomePage ? (
                renderContent()
            ) : (
                <div className="h-screen w-screen flex flex-col bg-gray-100 font-sans overflow-hidden">
                    <Header
                        user={currentUser}
                        currentView={currentView}
                        onNavigate={handleNavigate}
                        onUpgrade={() => setPricingModalOpen(true)}
                    />
                    <main className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            )}
            
            {isPricingModalOpen && <PricingModal onClose={() => setPricingModalOpen(false)} />}
            {isAddSubscriptionModalOpen && <AddSubscriptionModal onClose={() => setAddSubscriptionModalOpen(false)} onSave={handleSaveSubscription} />}
        </>
    );
};

export default App;