
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SystemSource, InfoItem, User } from '../../types';
import { lookCategories } from './data';
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
    const [selectedLook, setSelectedLook] = useState('all'); 
    const [selectedSubLook, setSelectedSubLook] = useState<string | null>(null);
    const [activeQuery, setActiveQuery] = useState<{ type: 'tag' | 'search' | 'all', value: string, label: string }>({ 
        type: 'all', 
        value: '', // No value needed for 'all'
        label: '全部情报' 
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

    // Initialize Default View - Ensuring 'all' is selected if it exists
    useEffect(() => {
        if (lookCategories.some(c => c.key === 'all')) {
            setSelectedLook('all');
            setActiveQuery({ type: 'all', value: '', label: '全部情报' });
        } else {
             // Fallback to first category if 'all' is missing
            const defaultCat = lookCategories[0];
            if (defaultCat) {
                setSelectedLook(defaultCat.key);
                setActiveQuery({ type: 'tag', value: defaultCat.label, label: defaultCat.label });
            }
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
                // General search
                response = await searchArticlesFiltered({ 
                    keyword: queryValue, 
                    page, 
                    limit 
                });
            } else if (queryType === 'all') {
                 // Fetch all articles without filters
                 response = await searchArticlesFiltered({ 
                    page, 
                    limit 
                });
            } else {
                // Tag based search (New API Requirement)
                // queryValue here is the tag name e.g. "新技术"
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
        // Trigger fetch if type is 'all' OR if there is a value for other types
        if (activeQuery.type === 'all' || activeQuery.value) {
            fetchArticles(activeQuery.value, activeQuery.type as any, 1);
        }
    }, [activeQuery, fetchArticles]);

    // Handlers
    const handleNavChange = (value: string, label: string) => {
        // When clicking nav items
        if (value === '全部') {
             setActiveQuery({ type: 'all', value: '', label: '全部情报' });
        } else {
             // For other categories, treat label as the tag
             setActiveQuery({ type: 'tag', value: label, label: label });
        }
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
            fetchArticles(activeQuery.value, activeQuery.type as any, newPage);
        }
    };

    const handleCopilotCitationClick = (item: InfoItem) => {
        setSelectedArticle(item);
        setMobileTab('detail'); 
    };

    return (
        <div className="h-full flex flex-col bg-slate-100 font-sans overflow-hidden">
            
            {/* --- Main 3-Column Layout --- */}
            <div className="flex-1 flex overflow-hidden relative md:p-3 md:gap-3">
                
                {/* 1. Left Column: Intelligence List */}
                <div className={`
                    w-full md:w-[400px] flex-shrink-0 flex flex-col z-10 transition-transform duration-300 absolute md:static inset-0 h-full
                    bg-white md:rounded-2xl md:border border-slate-200 md:shadow-sm overflow-hidden
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
                        // Compass Props
                        categories={lookCategories}
                        selectedLook={selectedLook}
                        setSelectedLook={setSelectedLook}
                        selectedSubLook={selectedSubLook}
                        setSelectedSubLook={setSelectedSubLook}
                        onSubCategoryClick={(value, label) => handleNavChange(value, label)}
                        activeQuery={activeQuery as { type: string; value: string }}
                    />
                </div>

                {/* 2. Middle Column: Detail View */}
                <div className={`
                    flex-1 flex flex-col min-w-0 transition-transform duration-300 absolute md:static inset-0 z-20 md:z-0
                    bg-white md:rounded-2xl md:border border-slate-200 md:shadow-sm overflow-hidden
                    ${mobileTab === 'detail' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                     <EvidenceTrail 
                        selectedArticle={selectedArticle} 
                        onBack={() => setMobileTab('list')}
                    />
                </div>

                {/* 3. Right Column: AI Chat (Fixed) */}
                <div className={`
                    w-full md:w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col z-30 transition-transform duration-300 absolute md:static inset-0
                    bg-white md:rounded-2xl md:border border-slate-200 md:shadow-sm overflow-hidden
                    ${mobileTab === 'chat' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                     <AIChatPanel onReferenceClick={handleCopilotCitationClick} />
                </div>
            </div>

            {/* --- Mobile Bottom Navigation --- */}
            {mobileTab !== 'detail' && (
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
            )}
        </div>
    );
};
