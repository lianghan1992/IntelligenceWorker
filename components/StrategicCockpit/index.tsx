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
    const [mobileTab, setMobileTab] = useState<string>('list');

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
            const items = response.items || [];
            setArticles(items);
            setPagination({ page: response.page, totalPages: calculatedTotalPages, total: response.total });

            // ⚡️ 核心优化：首次进入或切换分类时，默认选中第一篇文章展示
            if (page === 1 && items.length > 0 && !selectedArticle) {
                setSelectedArticle(items[0]);
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || '获取情报失败');
        } finally {
            setIsLoading(false);
        }
    }, [selectedArticle]);

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
        setSelectedArticle(null); // Reset selection to trigger auto-select first from new list
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
        // ⚡️ 用户主动点击某篇文章后，收起 AI Copilot 腾出空间
        setIsCopilotExpanded(false);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchArticles(activeQuery.value, activeQuery.type as any, newPage);
        }
    };

    const handleCopilotCitationClick = (item: InfoItem) => {
        setSelectedArticle(item);
        setMobileTab('detail'); 
        setIsCopilotExpanded(false);
    };

    return (
        <div className="h-full flex flex-col bg-slate-100 font-sans overflow-hidden">
            
            <div className="flex-1 flex overflow-hidden relative md:p-3 md:gap-3">
                
                {/* 1. Left Column: Intelligence List (Narrowed to 320px) */}
                <div className={`
                    w-full md:w-[320px] flex-shrink-0 flex flex-col z-10 transition-transform duration-300 absolute md:static inset-0 h-full
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
                        categories={lookCategories}
                        selectedLook={selectedLook}
                        setSelectedLook={setSelectedLook}
                        selectedSubLook={selectedSubLook}
                        setSelectedSubLook={setSelectedSubLook}
                        onSubCategoryClick={(value, label) => handleNavChange(value, label)}
                        activeQuery={activeQuery as { type: string; value: string }}
                    />
                </div>

                {/* 2. Middle Column: Detail View (Auto flex space) */}
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

                {/* 3. Right Column: AI Copilot (Dynamic Width) */}
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

                {/* Mobile Copilot Overlay (Always Full) */}
                <div className={`
                    md:hidden w-full flex flex-col z-30 transition-transform duration-300 absolute inset-0
                    bg-white
                    ${mobileTab === 'chat' ? 'translate-x-0' : 'translate-x-full'}
                `}>
                     <AIChatPanel 
                        isExpanded={true} 
                        hideToggle={true}
                        onReferenceClick={handleCopilotCitationClick} 
                    />
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            {mobileTab !== 'detail' && (
                <div className="md:hidden flex-shrink-0 h-14 bg-white border-t border-slate-200 flex justify-around items-center z-40 relative shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                    <button onClick={() => setMobileTab('list')} className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'list' ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <span className="text-xs font-bold mt-1">列表</span>
                    </button>
                    <button onClick={() => setMobileTab('detail')} disabled={!selectedArticle} className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'detail' ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <span className="text-xs font-bold mt-1">正文</span>
                    </button>
                    <button onClick={() => setMobileTab('chat')} className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'chat' ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <span className="text-xs font-bold mt-1">AI助手</span>
                    </button>
                </div>
            )}
        </div>
    );
};