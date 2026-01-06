
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SystemSource, InfoItem, ApiPoi, User } from '../../types';
import { lookCategories } from './data';
import { StrategicCompass } from './StrategicCompass';
import { IntelligenceCenter } from './IntelligenceCenter';
import { EvidenceTrail } from './EvidenceTrail';
import { AIChatPanel } from './AIChatPanel';
import { searchArticlesFiltered, searchSemanticSegments, getArticlesByTags } from '../../api';

interface StrategicCockpitProps {
    subscriptions: SystemSource[];
    user?: User; 
}

export const StrategicCockpit: React.FC<StrategicCockpitProps> = ({ subscriptions, user }) => {
    // --- State Management ---
    
    // Navigation & Query
    const [selectedLook, setSelectedLook] = useState('new_tech'); // Default to first new category
    const [selectedSubLook, setSelectedSubLook] = useState<string | null>(null);
    const [activeQuery, setActiveQuery] = useState<{ type: 'sublook' | 'poi' | 'search', value: string, label: string }>({ 
        type: 'sublook', 
        value: '*', 
        label: '最新情报' 
    });

    // Content Data
    const [articles, setArticles] = useState<InfoItem[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);
    const selectedArticleRef = useRef<InfoItem | null>(null);

    // Layout State for Mobile
    const [mobileTab, setMobileTab] = useState<'list' | 'detail' | 'chat'>('list');

    useEffect(() => {
        selectedArticleRef.current = selectedArticle;
    }, [selectedArticle]);

    // Initialize Default View
    useEffect(() => {
        const defaultCat = lookCategories[0];
        if (defaultCat) {
            setSelectedLook(defaultCat.key);
            if (defaultCat.children.length > 0) {
                const sub = defaultCat.children[0];
                setSelectedSubLook(sub.key);
                setActiveQuery({ type: 'sublook', value: sub.keywords, label: sub.label });
            } else {
                 // Fallback for no children - use category keywords
                 setActiveQuery({ type: 'sublook', value: defaultCat.keywords || defaultCat.label, label: defaultCat.label });
            }
        }
    }, []);

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

            if (queryValue === '*') {
                const params: any = { page, limit };
                const articleResponse = await searchArticlesFiltered(params);
                response = { items: articleResponse.items, total: articleResponse.total };
                currentPage = articleResponse.page;
            } else {
                // Use tag search/semantic search
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
        if (activeQuery.value) {
            fetchArticles(activeQuery.value, selectedLook, activeQuery.type, activeQuery.label, 1);
        }
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
        setMobileTab('detail'); 
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] font-sans overflow-hidden">
            
            {/* --- Top Navigation Bar (Simplified & Centered) --- */}
            <header className="flex-shrink-0 bg-white border-b border-slate-200 z-20 px-6 h-18 flex items-center justify-between">
                 <div className="flex-1 overflow-hidden">
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
            </header>

            {/* --- Main 3-Column Layout (Beautified) --- */}
            <div className="flex-1 flex overflow-hidden relative bg-slate-50">
                
                {/* 1. Left Column: Intelligence List */}
                <div className={`
                    w-full md:w-[380px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col z-10 transition-transform duration-300 absolute md:static inset-0 h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)]
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
                        isSidebarOpen={true}
                    />
                </div>

                {/* 2. Middle Column: Detail View */}
                <div className={`
                    flex-1 bg-slate-50 flex flex-col min-w-0 transition-transform duration-300 absolute md:static inset-0 z-20 md:z-0
                    ${mobileTab === 'detail' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                    <div className="h-full p-0 md:p-4 lg:p-6 overflow-hidden">
                        <div className="h-full bg-white rounded-none md:rounded-2xl border-0 md:border border-slate-200 shadow-sm overflow-hidden relative">
                             <EvidenceTrail selectedArticle={selectedArticle} />
                        </div>
                    </div>
                </div>

                {/* 3. Right Column: AI Chat (Fixed) */}
                <div className={`
                    w-full md:w-[400px] xl:w-[450px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col z-30 transition-transform duration-300 absolute md:static inset-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]
                    ${mobileTab === 'chat' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                     <AIChatPanel onReferenceClick={handleCopilotCitationClick} />
                </div>
            </div>

            {/* --- Mobile Bottom Navigation --- */}
            <div className="md:hidden flex-shrink-0 h-14 bg-white border-t border-slate-200 flex justify-around items-center z-40 relative shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={() => setMobileTab('list')}
                    className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'list' ? 'text-indigo-600' : 'text-slate-400'}`}
                >
                    <span className="text-xs font-bold mt-1">列表</span>
                </button>
                <button 
                    onClick={() => setMobileTab('detail')}
                    className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'detail' ? 'text-indigo-600' : 'text-slate-400'}`}
                    disabled={!selectedArticle}
                >
                    <span className="text-xs font-bold mt-1">正文</span>
                </button>
                <button 
                    onClick={() => setMobileTab('chat')}
                    className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'chat' ? 'text-indigo-600' : 'text-slate-400'}`}
                >
                    <span className="text-xs font-bold mt-1">AI助手</span>
                </button>
            </div>
        </div>
    );
};
