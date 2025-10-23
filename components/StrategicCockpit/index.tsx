import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Subscription, InfoItem, ApiPoi } from '../../types';
import { lookCategories } from './data';
import { StrategicCompass } from './StrategicCompass';
import { FocusPoints } from './FocusPoints';
import { FocusPointManagerModal } from '../Dashboard/FocusPointManagerModal';
import { IntelligenceCenter } from './IntelligenceCenter';
import { EvidenceTrail } from './EvidenceTrail';
import { getUserPois, searchArticlesFiltered } from '../../api';

// --- Main Component ---
export const StrategicCockpit: React.FC<{ subscriptions: Subscription[] }> = ({ subscriptions }) => {
    // Left navigation state
    const [selectedLook, setSelectedLook] = useState('all');
    const [selectedSubLook, setSelectedSubLook] = useState<string | null>(null);
    
    // Active query state for API calls
    const [activeQuery, setActiveQuery] = useState<{ type: 'sublook' | 'poi', value: string, label: string }>({ 
        type: 'sublook', 
        value: '*', 
        label: '所有情报' 
    });

    // Data fetching and display state
    const [articles, setArticles] = useState<InfoItem[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Detail view state
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);
    
    // Focus points state
    const [isFocusPointModalOpen, setIsFocusPointModalOpen] = useState(false);
    const [pois, setPois] = useState<ApiPoi[]>([]);
    const [isLoadingPois, setIsLoadingPois] = useState(true);

    const subscribedSourceNames = useMemo(() => {
        if (!subscriptions) return [];
        return Array.from(new Set(subscriptions.map(sub => sub.source_name)));
    }, [subscriptions]);
    
    const fetchArticles = useCallback(async (query: string, page: number = 1) => {
        if (page === 1) {
            setIsLoading(true);
            setArticles([]);
            setSelectedArticle(null); // Reset detail view on new search
        } else {
            setIsLoadingMore(true);
        }
        setError(null);

        try {
            const params: any = {
                query_text: query,
                page,
                limit: 15,
                similarity_threshold: 0.35,
            };
            if (subscribedSourceNames.length > 0) {
                params.source_names = subscribedSourceNames;
            }
            const response = await searchArticlesFiltered(params);
            
            setArticles(prev => (page === 1 ? response.items || [] : [...prev, ...(response.items || [])]));
            setPagination({ page: response.page, totalPages: response.totalPages ?? 1 });
            
            // Auto-select the first article on initial load
            if (page === 1 && response.items && response.items.length > 0) {
                setSelectedArticle(response.items[0]);
            }

        } catch (err: any) {
            setError(err.message || '获取情报失败');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [subscribedSourceNames]);


    useEffect(() => {
        if (activeQuery.value) {
            fetchArticles(activeQuery.value, 1);
        }
    }, [activeQuery, fetchArticles]);

    const handleNavChange = (type: 'sublook' | 'poi', value: string, label: string) => {
        setActiveQuery({ type, value, label });
    };

    const handleLoadMore = () => {
        if (pagination.page < pagination.totalPages && !isLoadingMore) {
            fetchArticles(activeQuery.value, pagination.page + 1);
        }
    };
    
    const fetchPois = useCallback(async () => {
        setIsLoadingPois(true);
        try {
            const userPois = await getUserPois();
            setPois(userPois);
        } catch (err) {
            console.error("Failed to fetch POIs in Cockpit:", err);
        } finally {
            setIsLoadingPois(false);
        }
    }, []);

    useEffect(() => {
        fetchPois();
    }, [fetchPois]);

    const handleModalClose = () => {
        setIsFocusPointModalOpen(false);
        fetchPois(); // Refetch on close
    };

    return (
        <div className="h-full flex bg-slate-50 overflow-hidden">
            {/* Left Sidebar */}
            <aside className="w-64 flex-shrink-0 flex flex-col p-4">
                <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
                    <StrategicCompass
                        categories={lookCategories}
                        selectedLook={selectedLook}
                        setSelectedLook={setSelectedLook}
                        selectedSubLook={selectedSubLook}
                        setSelectedSubLook={setSelectedSubLook}
                        onSubCategoryClick={(value, label) => handleNavChange('sublook', value, label)}
                        activeQuery={activeQuery}
                    />
                    <FocusPoints 
                        onManageClick={() => setIsFocusPointModalOpen(true)}
                        pois={pois}
                        isLoading={isLoadingPois}
                        onPoiClick={(value, label) => handleNavChange('poi', value, label)}
                        activeQuery={activeQuery}
                    />
                </div>
            </aside>

            {/* Main Content Area (Middle + Right) */}
            <main className="flex-1 flex p-4 pl-0 overflow-hidden">
                <div className="flex-1 grid grid-cols-10 gap-4 overflow-hidden">
                    <div className="col-span-6 overflow-hidden h-full">
                        <IntelligenceCenter
                            title={activeQuery.label}
                            articles={articles}
                            isLoading={isLoading}
                            isLoadingMore={isLoadingMore}
                            error={error}
                            selectedArticleId={selectedArticle?.id || null}
                            onSelectArticle={setSelectedArticle}
                            onLoadMore={handleLoadMore}
                            hasMore={pagination.page < pagination.totalPages}
                        />
                    </div>
                    <div className="col-span-4 overflow-hidden h-full">
                         <EvidenceTrail
                            selectedArticle={selectedArticle}
                        />
                    </div>
                </div>
            </main>

            {isFocusPointModalOpen && <FocusPointManagerModal onClose={handleModalClose} />}
             <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
};