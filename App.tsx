import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { InfoFeed } from './components/InfoFeed';
import { DeepDives } from './components/DeepDives';
import { IndustryEvents } from './components/IndustryEvents';
import { ReportGenerator } from './components/ReportGenerator';
import { InfoDetailView } from './components/InfoDetailView';
import { AddSourceModal } from './components/AddSourceModal';
import { AddSubscriptionModal } from './components/AddSubscriptionModal';
import { PricingModal } from './components/PricingModal';
import { HomePage } from './components/HomePage';
import { AdminPage } from './components/AdminPage';
import { mockDeepDives } from './mockData';
import { InfoItem, Subscription, User } from './types';
import { getArticles, getPoints, createPoint } from './api';

type NewSubscriptionData = Omit<Subscription, 'id' | 'keywords' | 'query' | 'newItemsCount'>;

const App: React.FC = () => {
    const [currentUser] = useState<User>({
        user_id: 'default_user_01',
        username: '特邀用户',
        email: 'user@example.com',
    });
    const [currentView, setCurrentView] = useState('home');
    const [selectedInfoItem, setSelectedInfoItem] = useState<InfoItem | null>(null);
    
    const [isAddSourceModalOpen, setAddSourceModalOpen] = useState(false);
    const [isPricingModalOpen, setPricingModalOpen] = useState(false);
    const [isAddSubscriptionModalOpen, setAddSubscriptionModalOpen] = useState(false);

    // NEW: state for API data
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [infoFeedItems, setInfoFeedItems] = useState<InfoItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

     // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            if (currentView === 'home') return; // Don't fetch data on home page
            setIsLoading(true);
            setError(null);
            try {
                const [pointsData, articlesData] = await Promise.all([
                    getPoints(),
                    getArticles({ page: 1, limit: 100 }) // Fetch initial batch of articles
                ]);
                setSubscriptions(pointsData);
                setInfoFeedItems(articlesData.items);
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

    const handleAddNewInfoItem = (newItem: any) => { // newItem is not a valid InfoItem anymore
        // This is a temporary fix to make the UI work. The added item won't be perfect.
        const compatibleItem: InfoItem = {
            id: newItem.id,
            point_id: 'custom',
            source_name: newItem.source.name,
            point_name: '自定义来源',
            title: newItem.title,
            original_url: newItem.source.url,
            publish_date: newItem.timestamp,
            content: newItem.content,
            created_at: newItem.timestamp,
        };
        setInfoFeedItems(prevItems => [compatibleItem, ...prevItems]);
        setAddSourceModalOpen(false);
        setCurrentView('feed');
    };

    const renderContent = () => {
        if (selectedInfoItem) {
            return <InfoDetailView item={selectedInfoItem} onBack={handleBackToFeed} />;
        }

        if (isLoading && currentView !== 'home') {
            return <div className="flex items-center justify-center h-full"><p>加载数据中...</p></div>;
        }

        if (error && currentView !== 'home') {
            return <div className="flex items-center justify-center h-full"><p className="text-red-500">错误: {error}</p></div>;
        }

        switch (currentView) {
            case 'home':
                return <HomePage onEnter={() => handleNavigate('dashboard')} />;
            case 'dashboard':
                return <Dashboard 
                            subscriptions={subscriptions}
                            onAddSubscription={() => setAddSubscriptionModalOpen(true)}
                            onAddSource={() => setAddSourceModalOpen(true)}
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
            
            {isAddSourceModalOpen && <AddSourceModal onClose={() => setAddSourceModalOpen(false)} onAdd={handleAddNewInfoItem} />}
            {isPricingModalOpen && <PricingModal onClose={() => setPricingModalOpen(false)} />}
            {isAddSubscriptionModalOpen && <AddSubscriptionModal onClose={() => setAddSubscriptionModalOpen(false)} onSave={handleSaveSubscription} />}
        </>
    );
};

export default App;