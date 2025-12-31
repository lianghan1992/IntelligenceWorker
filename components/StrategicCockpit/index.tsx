
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SystemSource, InfoItem, ApiPoi, User } from '../../types';
import { lookCategories } from './data';
import { StrategicCompass } from './StrategicCompass';
import { FocusPoints } from './FocusPoints';
import { FocusPointManagerModal } from '../Dashboard/FocusPointManagerModal';
import { IntelligenceCenter } from './IntelligenceCenter';
import { EvidenceTrail } from './EvidenceTrail';
import { AIChatPanel } from './AIChatPanel';
import { searchArticlesFiltered, searchSemanticSegments, getArticlesByTags, getUserPois } from '../../api';
import { getMe } from '../../api/auth';
import { SparklesIcon } from '../icons';

interface StrategicCockpitProps {
    subscriptions: SystemSource[];
    user?: User; 
}

export const StrategicCockpit: React.FC<StrategicCockpitProps> = ({ subscriptions, user }) => {
    // --- State Management ---
    
    // Navigation & Query
    const [selectedLook, setSelectedLook] = useState('all');
    const [selectedSubLook, setSelectedSubLook] = useState<string | null>(null);
    const [activeQuery, setActiveQuery] = useState<{ type: 'sublook' | 'poi' | 'search', value: string, label: string }>({ 
        type: 'sublook', 
        value: '*', 
        label: '所有情报' 
    });

    // Content Data
    const [articles, setArticles] = useState<InfoItem[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);
    const selectedArticleRef = useRef<InfoItem | null>(null);

    // Metadata
    const [pois, setPois] = useState<ApiPoi[]>([]);
    const [isLoadingPois, setIsLoadingPois] = useState(true);
    const [isFocusPointModalOpen, setIsFocusPointModalOpen] = useState(false);

    // Layout State for Mobile
    const [mobileTab, setMobileTab] = useState<'list' | 'detail' | 'chat'>('list');

    useEffect(() => {
        selectedArticleRef.current = selectedArticle;
    }, [selectedArticle]);

    // Fetch POIs
    const fetchPois = useCallback(async () => {
        setIsLoadingPois(true);
        try {
            const userPois = await getUserPois();
            setPois(userPois);
        } catch (err) {
            console.error("Failed to fetch POIs", err);
        } finally {
            setIsLoadingPois(false);
        }
    }, []);

    useEffect(() => { fetchPois(); }, [fetchPois]);

    // Fetch Articles Logic
    const fetchArticles = useCallback(async (
        queryValue: string, 
        lookType: string, 
        queryType: string, 
        queryLabel: string, 
        page: number = 1
    ) => {
        setIsLoading(true);
        if (page === 1) setArticles([]); 
        setError(null);

        try {
            const limit = 20;
            let response;
            let currentPage = page;

            if (queryType === 'sublook' && (lookType === 'industry' || lookType === 'customer')) {
                const tagResponse = await getArticlesByTags({ tags: [queryLabel], page, page_size: limit });
                response = { items: tagResponse.items as unknown as InfoItem[], total: tagResponse.total };
                currentPage = tagResponse.page;
            } else if (queryValue === '*') {
                const params: any = { page, limit };
                const articleResponse = await searchArticlesFiltered(params);
                response = { items: articleResponse.items, total: articleResponse.total };
                currentPage = articleResponse.page;
            } else {
                const searchResponse = await searchSemanticSegments({
                    query_text: queryValue,
                    page,
                    page_size: limit,
                    similarity_threshold: 0.35
                });
                response = searchResponse;
            }
            
            const calculatedTotalPages = Math.ceil(response.total / limit) || 1;
            setArticles(response.items || []);
            setPagination({ page: currentPage, totalPages: calculatedTotalPages, total: response.total });

            // Auto-select first article on desktop if none selected
            if (window.innerWidth >= 1024 && page === 1 && response.items?.length > 0 && !selectedArticleRef.current) {
                setSelectedArticle(response.items[0]);
            }

        } catch (err: any) {
            setError(err.message || '获取情报失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Effect to trigger search when query changes
    useEffect(() => {
        fetchArticles(activeQuery.value, selectedLook, activeQuery.type, activeQuery.label, 1);
    }, [activeQuery, selectedLook, fetchArticles]);

    // Handlers
    const handleNavChange = (type: 'sublook' | 'poi', value: string, label: string) => {
        setActiveQuery({ type, value, label });
        setSelectedArticle(null);
        setMobileTab('list');
    };

    const handleSearch = (keyword: string) => {
        if (!keyword.trim()) return;
        setActiveQuery({ type: 'search', value: keyword, label: `搜索: ${keyword}` });
        setSelectedArticle(null);
        setMobileTab('list');
    };

    const handleArticleSelect = (article: InfoItem) => {
        setSelectedArticle(article);
        setMobileTab('detail');
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchArticles(activeQuery.value, selectedLook, activeQuery.type, activeQuery.label, newPage);
        }
    };

    const handleCopilotCitationClick = (item: InfoItem) => {
        setSelectedArticle(item);
        setMobileTab('detail'); // Switch view on mobile
        // On desktop, the detail view updates automatically via state
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] font-sans overflow-hidden">
            
            {/* --- Top Navigation Bar (Horizontal) --- */}
            <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-20">
                <div className="flex items-center h-16 px-4 md:px-6 gap-6">
                    {/* Left: Categories Tabs */}
                    <div className="flex-shrink-0 overflow-hidden">
                        <StrategicCompass
                            categories={lookCategories}
                            selectedLook={selectedLook}
                            setSelectedLook={setSelectedLook}
                            selectedSubLook={selectedSubLook}
                            setSelectedSubLook={setSelectedSubLook}
                            onSubCategoryClick={(value, label) => handleNavChange('sublook', value, label)}
                            activeQuery={activeQuery}
                        />
                    </div>

                    <div className="w-px h-8 bg-slate-200 flex-shrink-0 hidden md:block"></div>

                    {/* Right: Focus Points (Scrollable) */}
                    <div className="flex-1 overflow-hidden hidden md:block">
                        <FocusPoints 
                            onManageClick={() => setIsFocusPointModalOpen(true)}
                            pois={pois}
                            isLoading={isLoadingPois}
                            onPoiClick={(value, label) => handleNavChange('poi', value, label)}
                            activeQuery={activeQuery}
                        />
                    </div>
                </div>
            </header>

            {/* --- Main 3-Column Layout --- */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* 1. Left Column: Intelligence List */}
                <div className={`
                    w-full md:w-[28%] lg:w-[25%] xl:w-[22%] bg-white border-r border-slate-200 flex flex-col z-10 transition-transform duration-300 absolute md:static inset-0
                    ${mobileTab === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
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
                        onSearch={handleSearch}
                        isSidebarOpen={true} // Always show list content
                    />
                </div>

                {/* 2. Middle Column: Detail View */}
                <div className={`
                    flex-1 bg-white flex flex-col min-w-0 transition-transform duration-300 absolute md:static inset-0 z-20 md:z-0
                    ${mobileTab === 'detail' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                    {/* Mobile Back Button Overlay inside EvidenceTrail header usually needed, but here simple toggle */}
                    <EvidenceTrail selectedArticle={selectedArticle} />
                </div>

                {/* 3. Right Column: AI Chat (Fixed) */}
                <div className={`
                    w-full md:w-[32%] lg:w-[30%] xl:w-[28%] bg-white border-l border-slate-200 flex flex-col z-30 transition-transform duration-300 absolute md:static inset-0
                    ${mobileTab === 'chat' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                     <AIChatPanel onReferenceClick={handleCopilotCitationClick} />
                </div>
            </div>

            {/* --- Mobile Bottom Navigation --- */}
            <div className="md:hidden flex-shrink-0 h-14 bg-white border-t border-slate-200 flex justify-around items-center z-40 relative">
                <button 
                    onClick={() => setMobileTab('list')}
                    className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'list' ? 'text-indigo-600' : 'text-slate-400'}`}
                >
                    <span className="text-xs font-bold mt-1">情报列表</span>
                </button>
                <button 
                    onClick={() => setMobileTab('detail')}
                    className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'detail' ? 'text-indigo-600' : 'text-slate-400'}`}
                    disabled={!selectedArticle}
                >
                    <span className="text-xs font-bold mt-1">详情阅读</span>
                </button>
                <button 
                    onClick={() => setMobileTab('chat')}
                    className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'chat' ? 'text-indigo-600' : 'text-slate-400'}`}
                >
                    <SparklesIcon className="w-5 h-5 mb-0.5" />
                    <span className="text-xs font-bold">AI 助手</span>
                </button>
            </div>

            {isFocusPointModalOpen && (
                <FocusPointManagerModal onClose={() => { setIsFocusPointModalOpen(false); fetchPois(); }} />
            )}
        </div>
    );
};
