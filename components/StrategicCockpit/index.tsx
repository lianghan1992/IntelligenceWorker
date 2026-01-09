
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SystemSource, InfoItem, User } from '../../types';
import { lookCategories } from './data';
import { StrategicCompass } from './StrategicCompass';
import { IntelligenceCenter } from './IntelligenceCenter';
import { EvidenceTrail } from './EvidenceTrail';
import { AIChatPanel } from './AIChatPanel';
import { searchArticlesFiltered, getArticlesByTags } from '../../api';

interface StrategicCockpitProps {
    subscriptions: SystemSource[];
    user?: User; 
}

export const StrategicCockpit: React.FC<StrategicCockpitProps> = ({ subscriptions, user }) => {
    // --- State Management ---
    
    // Navigation & Query
    const [selectedLook, setSelectedLook] = useState('new_tech'); 
    const [selectedSubLook, setSelectedSubLook] = useState<string | null>(null);
    const [activeQuery, setActiveQuery] = useState<{ type: 'tag' | 'search', value: string, label: string }>({ 
        type: 'tag', 
        value: '新技术', // Default tag
        label: '新技术' 
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
            // Default to first category tag
            setActiveQuery({ type: 'tag', value: defaultCat.label, label: defaultCat.label });
        }
    }, []);

    // Fetch Articles Logic
    const fetchArticles = useCallback(async (
        queryValue: string, 
        queryType: 'tag' | 'search', 
        page: number = 1
    ) => {
        setIsLoading(true);
        if (page === 1) setArticles([]); 
        setError(null);

        try {
            const limit = 20;
            let response;

            if (queryType === 'search') {
                // General search
                response = await searchArticlesFiltered({ 
                    keyword: queryValue, 
                    page, 
                    limit 
                });
            } else {
                // Tag based search
                response = await getArticlesByTags({
                    tags: [queryValue],
                    page,
                    size: limit
                });
            }
            
            const calculatedTotalPages = Math.ceil(response.total / limit) || 1;
            setArticles(response.items || []);
            setPagination({ page: response.page, totalPages: calculatedTotalPages, total: response.total });

            // Auto-select first article on desktop if none selected
            if (window.innerWidth >= 1024 && page === 1 && response.items?.length > 0) {
                setSelectedArticle(response.items[0]);
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || '获取情报失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Effect to trigger search when query changes
    useEffect(() => {
        if (activeQuery.value) {
            fetchArticles(activeQuery.value, activeQuery.type, 1);
        }
    }, [activeQuery, fetchArticles]);

    // Handlers
    const handleNavChange = (value: string, label: string) => {
        // When clicking nav items, we treat the label as the tag
        setActiveQuery({ type: 'tag', value: label, label: label });
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
            fetchArticles(activeQuery.value, activeQuery.type, newPage);
        }
    };

    const handleCopilotCitationClick = (item: InfoItem) => {
        setSelectedArticle(item);
        setMobileTab('detail'); 
    };

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] font-sans overflow-hidden text-slate-800">
            
            {/* --- Main 3-Column Layout --- */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* 1. Left Column: Intelligence List & Nav */}
                <div className={`
                    w-full md:w-[360px] flex-shrink-0 bg-white/50 backdrop-blur-sm border-r border-slate-200 flex flex-col z-20 transition-transform duration-300 absolute md:static inset-0 h-full
                    ${mobileTab === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    {/* Integrated Nav Header inside Left Column */}
                    <div className="p-4 border-b border-slate-200/60">
                        <StrategicCompass
                            categories={lookCategories}
                            selectedLook={selectedLook}
                            setSelectedLook={setSelectedLook}
                            selectedSubLook={selectedSubLook}
                            setSelectedSubLook={setSelectedSubLook}
                            onSubCategoryClick={(value, label) => handleNavChange(value, label)}
                            activeQuery={activeQuery}
                        />
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
                        onSearch={handleSearch}
                        isSidebarOpen={true}
                    />
                </div>

                {/* 2. Middle Column: Detail View */}
                <div className={`
                    flex-1 bg-white/30 flex flex-col min-w-0 transition-transform duration-300 absolute md:static inset-0 z-10 md:z-0
                    ${mobileTab === 'detail' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                     <EvidenceTrail selectedArticle={selectedArticle} />
                </div>

                {/* 3. Right Column: AI Chat (Fixed width) */}
                <div className={`
                    w-full md:w-[400px] xl:w-[420px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col z-30 transition-transform duration-300 absolute md:static inset-0
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
