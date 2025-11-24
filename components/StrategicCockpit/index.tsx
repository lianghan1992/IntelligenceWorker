import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Subscription, InfoItem, ApiPoi } from '../../types';
import { lookCategories } from './data';
import { StrategicCompass } from './StrategicCompass';
import { FocusPoints } from './FocusPoints';
import { FocusPointManagerModal } from '../Dashboard/FocusPointManagerModal';
import { IntelligenceCenter } from './IntelligenceCenter';
import { EvidenceTrail } from './EvidenceTrail';
import { getUserPois, searchArticlesFiltered } from '../../api';
import { ChevronLeftIcon } from '../icons';

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

    // Mobile View State: 'nav' (Compass) -> 'list' (IntelligenceCenter) -> 'detail' (EvidenceTrail)
    const [mobileView, setMobileView] = useState<'nav' | 'list' | 'detail'>('nav');

    // Data fetching and display state
    const [articles, setArticles] = useState<InfoItem[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
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
        setIsLoading(true);
        if (page === 1) {
            setArticles([]); 
        }
        setError(null);

        try {
            const limit = 20;
            const params: any = {
                query_text: query,
                page,
                limit: limit,
                similarity_threshold: 0.35,
            };
            
            if (subscribedSourceNames.length > 0) {
                params.source_names = subscribedSourceNames;
            }
            
            const response = await searchArticlesFiltered(params);
            
            const calculatedTotalPages = Math.ceil(response.total / limit) || 1;

            setArticles(response.items || []);
            setPagination({ page: response.page, totalPages: calculatedTotalPages, total: response.total });
            
            // On desktop: Auto-select first article only on initial load if none selected
            // On mobile: Do NOT auto-select, as it would trigger a view transition unexpectedly
            if (window.innerWidth >= 768) {
                if (page === 1 && response.items && response.items.length > 0 && !selectedArticle) {
                    setSelectedArticle(response.items[0]);
                } else if (page === 1 && (!response.items || response.items.length === 0)) {
                    setSelectedArticle(null);
                }
            }

        } catch (err: any) {
            setError(err.message || '获取情报失败');
        } finally {
            setIsLoading(false);
        }
    }, [subscribedSourceNames]); 


    useEffect(() => {
        // Trigger fetch when activeQuery changes
        if (activeQuery.value) {
            fetchArticles(activeQuery.value, 1);
        }
    }, [activeQuery, fetchArticles]);

    const handleNavChange = (type: 'sublook' | 'poi', value: string, label: string) => {
        setActiveQuery({ type, value, label });
        setSelectedArticle(null); 
        setMobileView('list'); // Navigate to list on mobile
    };

    const handleArticleSelect = (article: InfoItem) => {
        setSelectedArticle(article);
        setMobileView('detail'); // Navigate to detail on mobile
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchArticles(activeQuery.value, newPage);
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
        fetchPois(); 
    };

    // Mobile Navigation Handlers
    const backToNav = () => setMobileView('nav');
    const backToList = () => {
        setMobileView('list');
    };

    return (
        <div className="h-full flex flex-col bg-[#f8f9fa] md:p-4 overflow-hidden relative">
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden relative md:static">
                {/* Left Sidebar - Navigation Drawer */}
                <aside className={`
                    w-full md:w-72 flex-shrink-0 flex flex-col bg-white md:rounded-[24px] py-6 shadow-sm border-r md:border border-gray-100/50
                    absolute inset-0 z-10 md:static md:z-auto transition-transform duration-300 ease-out
                    ${mobileView === 'nav' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    {/* Mobile Header for Nav */}
                    <div className="md:hidden px-6 mb-4 flex items-center justify-between">
                         <h2 className="text-lg font-bold text-gray-800">AI情报洞察</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
                        <h2 className="text-sm font-bold text-gray-500 px-4 mb-4 uppercase tracking-wider hidden md:block">情报罗盘</h2>
                        <StrategicCompass
                            categories={lookCategories}
                            selectedLook={selectedLook}
                            setSelectedLook={setSelectedLook}
                            selectedSubLook={selectedSubLook}
                            setSelectedSubLook={setSelectedSubLook}
                            onSubCategoryClick={(value, label) => handleNavChange('sublook', value, label)}
                            activeQuery={activeQuery}
                        />
                        <div className="my-6 border-t border-gray-100 mx-2"></div>
                        <FocusPoints 
                            onManageClick={() => setIsFocusPointModalOpen(true)}
                            pois={pois}
                            isLoading={isLoadingPois}
                            onPoiClick={(value, label) => handleNavChange('poi', value, label)}
                            activeQuery={activeQuery}
                        />
                    </div>
                </aside>

                {/* Main Content Area */}
                 <main className="flex-1 flex gap-4 min-w-0 relative w-full md:static">
                    {/* List View */}
                    <div className={`
                        w-full md:w-[420px] flex-shrink-0 flex flex-col bg-white md:rounded-[24px] shadow-sm border border-gray-100/50 overflow-hidden
                        absolute inset-0 z-20 md:static md:z-auto transition-transform duration-300 ease-out
                        ${mobileView === 'list' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                    `}>
                        {/* Mobile Header for List */}
                        <div className="md:hidden px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white flex-shrink-0 shadow-sm z-10">
                            <button onClick={backToNav} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeftIcon className="w-5 h-5 text-gray-600"/></button>
                            <h3 className="font-bold text-gray-800 truncate flex-1">{activeQuery.label}</h3>
                        </div>

                        <IntelligenceCenter
                            title={activeQuery.label}
                            articles={articles}
                            isLoading={isLoading}
                            error={error}
                            selectedArticleId={selectedArticle?.id || null}
                            onSelectArticle={handleArticleSelect}
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.total}
                            onPageChange={handlePageChange}
                        />
                    </div>
                    
                    {/* Detail View */}
                    <div className={`
                        flex-1 flex flex-col min-w-0 bg-white md:rounded-[24px] shadow-sm border border-gray-100/50 overflow-hidden
                        absolute inset-0 z-30 md:static md:z-auto transition-transform duration-300 ease-out
                        ${mobileView === 'detail' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                    `}>
                         {/* Mobile Header for Detail */}
                         <div className="md:hidden px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white flex-shrink-0 shadow-sm z-10">
                            <button onClick={backToList} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeftIcon className="w-5 h-5 text-gray-600"/></button>
                            <h3 className="font-bold text-gray-800">情报详情</h3>
                        </div>
                         <EvidenceTrail
                            selectedArticle={selectedArticle}
                        />
                    </div>
                </main>
            </div>

            {isFocusPointModalOpen && <FocusPointManagerModal onClose={handleModalClose} />}
             <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
            `}</style>
        </div>
    );
};