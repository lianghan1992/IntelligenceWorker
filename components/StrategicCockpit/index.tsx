
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SystemSource, InfoItem, User, View } from '../../types';
import { lookCategories } from './data';
import { IntelligenceCenter } from './IntelligenceCenter';
import { EvidenceTrail } from './EvidenceTrail';
import { AIChatPanel } from './AIChatPanel';
import { searchArticlesFiltered, getArticlesByTags } from '../../api';
import { SparklesIcon, ChevronLeftIcon } from '../icons';

interface StrategicCockpitProps {
    subscriptions: SystemSource[];
    user?: User;
    onNavigate?: (view: View) => void;
    onLogout?: () => void;
    onShowProfile?: () => void;
}

export const StrategicCockpit: React.FC<StrategicCockpitProps> = ({ subscriptions, user, onNavigate, onLogout, onShowProfile }) => {
    // --- State Management ---
    
    // Navigation & Query
    const [selectedLook, setSelectedLook] = useState('all'); 
    const [selectedSubLook, setSelectedSubLook] = useState<string | null>(null);
    const [activeQuery, setActiveQuery] = useState<{ type: 'tag' | 'search' | 'all', value: string, label: string }>({ 
        type: 'all', 
        value: '', 
        label: '全部情报' 
    });

    // Content Data
    const [articles, setArticles] = useState<InfoItem[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);
    
    // Copilot Expand/Collapse State
    const [isCopilotExpanded, setIsCopilotExpanded] = useState(true); // 初始进入展示

    // Layout State for Mobile
    const [showMobileDetail, setShowMobileDetail] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);

    // Initialize Default View
    useEffect(() => {
        if (lookCategories.some(c => c.key === 'all')) {
            setSelectedLook('all');
            setActiveQuery({ type: 'all', value: '', label: '全部情报' });
        }
    }, []);

    // Fetch Articles Logic
    const fetchArticles = useCallback(async (
        queryValue: string, 
        queryType: 'tag' | 'search' | 'all', 
        page: number = 1
    ) => {
        setIsLoading(true);
        if (page === 1) setArticles([]); 
        setError(null);

        try {
            const limit = 20;
            let response;

            if (queryType === 'search') {
                response = await searchArticlesFiltered({ keyword: queryValue, page, limit });
            } else if (queryType === 'all') {
                 response = await searchArticlesFiltered({ page, limit });
            } else {
                response = await getArticlesByTags({ tags: [queryValue], page, size: limit });
            }
            
            const calculatedTotalPages = Math.ceil(response.total / limit) || 1;
            const rawItems = response.items || [];
            
            // Filter out "深度洞察报告" sources globally here to ensure list and selection are consistent
            const items = rawItems.filter(a => a.source_name !== '深度洞察报告');

            setArticles(items);
            setPagination({ page: response.page, totalPages: calculatedTotalPages, total: response.total });

            // Desktop Auto Select First Valid Item
            const isDesktop = window.innerWidth >= 768;
            if (page === 1 && items.length > 0 && isDesktop) {
                setSelectedArticle(prev => prev ? prev : items[0]);
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || '获取情报失败');
        } finally {
            setIsLoading(false);
        }
    }, []); 

    useEffect(() => {
        if (activeQuery.type === 'all' || activeQuery.value) {
            fetchArticles(activeQuery.value, activeQuery.type as any, 1);
        }
    }, [activeQuery, fetchArticles]);

    // Handlers
    const handleNavChange = (value: string, label: string) => {
        if (value === '全部') {
             setActiveQuery({ type: 'all', value: '', label: '全部情报' });
        } else {
             setActiveQuery({ type: 'tag', value: label, label: label });
        }
        setSelectedArticle(null); 
        setShowMobileDetail(false);
    };

    const handleSearch = (keyword: string) => {
        if (!keyword.trim()) return;
        setActiveQuery({ type: 'search', value: keyword, label: `搜索: ${keyword}` });
        setSelectedArticle(null);
        setShowMobileDetail(false);
    };

    const handleArticleSelect = (article: InfoItem) => {
        setSelectedArticle(article);
        setShowMobileDetail(true);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchArticles(activeQuery.value, activeQuery.type as any, newPage);
        }
    };

    const handleCopilotCitationClick = (item: InfoItem) => {
        setSelectedArticle(item);
        setShowMobileDetail(true); 
        setShowMobileChat(false); // Close chat to see detail
    };

    return (
        <div className="h-full flex flex-col bg-slate-100 font-sans overflow-hidden relative">
            
            {/* Mobile Header (App Store Style: Large Title + Profile) */}
            <div className="md:hidden flex-shrink-0 bg-white/90 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-slate-200/60 sticky top-0 z-30">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">情报洞察</h1>
                <button onClick={onShowProfile} className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                        {user?.username.charAt(0).toUpperCase()}
                    </div>
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden relative md:p-3 md:gap-3">
                
                {/* 1. Left Column: Intelligence List */}
                <div className={`
                    w-full md:w-[320px] flex-shrink-0 flex flex-col z-10 transition-transform duration-300 absolute md:static inset-0 h-full
                    bg-white md:rounded-2xl md:border border-slate-200 md:shadow-sm overflow-hidden
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
                        isSidebarOpen={true}
                        categories={lookCategories}
                        selectedLook={selectedLook}
                        setSelectedLook={setSelectedLook}
                        selectedSubLook={selectedSubLook}
                        setSelectedSubLook={setSelectedSubLook}
                        onSubCategoryClick={(value, label) => handleNavChange(value, label)}
                        activeQuery={activeQuery as { type: string; value: string }}
                    />
                </div>

                {/* 2. Middle Column: Detail View (Mobile Overlay / Desktop Flex) */}
                <div className={`
                    flex-1 flex flex-col min-w-0 transition-transform duration-300 absolute md:static inset-0 z-20 md:z-0
                    bg-white md:rounded-2xl md:border border-slate-200 md:shadow-sm overflow-hidden
                    ${showMobileDetail ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                     <EvidenceTrail 
                        selectedArticle={selectedArticle} 
                        onBack={() => setShowMobileDetail(false)}
                    />
                </div>

                {/* 3. Right Column: AI Copilot (Desktop) */}
                <div className={`
                    hidden md:flex flex-col transition-all duration-500 ease-in-out flex-shrink-0
                    bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden
                    ${isCopilotExpanded ? 'w-[400px] xl:w-[450px]' : 'w-[50px]'}
                `}>
                     <AIChatPanel 
                        isExpanded={isCopilotExpanded} 
                        onToggle={() => setIsCopilotExpanded(!isCopilotExpanded)}
                        onReferenceClick={handleCopilotCitationClick} 
                    />
                </div>

                {/* Mobile Chat Overlay */}
                <div className={`
                    md:hidden w-full flex flex-col z-40 transition-transform duration-300 absolute inset-0
                    bg-white
                    ${showMobileChat ? 'translate-y-0' : 'translate-y-full'}
                `}>
                     {showMobileChat && (
                         <>
                            {/* Chat Header for Mobile */}
                            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
                                <span className="font-bold text-slate-800">AI 助手</span>
                                <button onClick={() => setShowMobileChat(false)} className="p-2 text-slate-500">
                                    <ChevronLeftIcon className="w-5 h-5 -rotate-90" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <AIChatPanel 
                                    isExpanded={true} 
                                    hideToggle={true}
                                    onReferenceClick={handleCopilotCitationClick} 
                                />
                            </div>
                         </>
                     )}
                </div>
            </div>

            {/* Mobile Floating Action Button (FAB) for Chat */}
            {!showMobileChat && !showMobileDetail && (
                <button 
                    onClick={() => setShowMobileChat(true)}
                    className="md:hidden absolute bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-xl shadow-indigo-500/40 flex items-center justify-center text-white z-30 transition-transform active:scale-95 animate-in zoom-in"
                >
                    <SparklesIcon className="w-7 h-7" />
                </button>
            )}
        </div>
    );
};
