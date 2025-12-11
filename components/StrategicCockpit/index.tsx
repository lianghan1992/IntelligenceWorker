
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { SystemSource, InfoItem, ApiPoi } from '../../types';
import { lookCategories } from './data';
import { StrategicCompass } from './StrategicCompass';
import { FocusPoints } from './FocusPoints';
import { FocusPointManagerModal } from '../Dashboard/FocusPointManagerModal';
import { IntelligenceCenter } from './IntelligenceCenter';
import { EvidenceTrail } from './EvidenceTrail';
import { getUserPois, searchArticlesFiltered } from '../../api';
import { ChevronLeftIcon, MenuIcon, ViewGridIcon } from '../icons';

// --- Main Component ---
export const StrategicCockpit: React.FC<{ subscriptions: SystemSource[] }> = ({ subscriptions }) => {
    // Left navigation state
    const [selectedLook, setSelectedLook] = useState('all');
    const [selectedSubLook, setSelectedSubLook] = useState<string | null>(null);
    
    // Active query state for API calls
    const [activeQuery, setActiveQuery] = useState<{ 
        type: 'sublook' | 'poi' | 'search', 
        value: string, 
        label: string,
        // Optional filters
        dateStart?: string,
        dateEnd?: string
    }>({ 
        type: 'sublook', 
        value: '*', 
        label: '所有情报' 
    });

    // Pagination State (Moved out of pagination object to control effect triggers)
    const [page, setPage] = useState(1);
    const [paginationMeta, setPaginationMeta] = useState({ totalPages: 1, total: 0 });

    // Mobile View State: 'nav' (Compass) -> 'list' (IntelligenceCenter) -> 'detail' (EvidenceTrail)
    const [mobileView, setMobileView] = useState<'nav' | 'list' | 'detail'>('nav');

    // Desktop/Laptop Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Data fetching and display state
    const [articles, setArticles] = useState<InfoItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Detail view state
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);
    
    // Focus points state
    const [isFocusPointModalOpen, setIsFocusPointModalOpen] = useState(false);
    const [pois, setPois] = useState<ApiPoi[]>([]);
    const [isLoadingPois, setIsLoadingPois] = useState(true);

    // Responsive Logic: Auto-collapse sidebar on smaller screens when an article is selected
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1536) {
                setIsSidebarOpen(true);
            } else if (selectedArticle && window.innerWidth < 1280) {
                setIsSidebarOpen(false);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [selectedArticle]);

    // FETCH ARTICLES
    // Bug Fix: Decompose activeQuery dependencies to prevent unnecessary re-fetches when object reference changes but content is same.
    // Also ensures clicking an article (which updates selectedArticle) does not trigger this effect.
    useEffect(() => {
        let isMounted = true;
        const fetchArticles = async () => {
            setIsLoading(true);
            // Only clear articles if we are explicitly on page 1 (new search)
            if (page === 1) {
                setArticles([]); 
            }
            setError(null);

            try {
                const limit = 20;
                const params: any = {
                    query_text: activeQuery.value,
                    page: page,
                    limit: limit,
                    similarity_threshold: 0.35,
                    publish_date_start: activeQuery.dateStart,
                    publish_date_end: activeQuery.dateEnd
                };
                
                const response = await searchArticlesFiltered(params);
                
                if (isMounted) {
                    const calculatedTotalPages = Math.ceil(response.total / limit) || 1;
                    setArticles(response.items || []);
                    setPaginationMeta({ totalPages: calculatedTotalPages, total: response.total });
                }

            } catch (err: any) {
                if (isMounted) setError(err.message || '获取情报失败');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchArticles();

        return () => { isMounted = false; };
    }, [activeQuery.value, activeQuery.type, activeQuery.dateStart, activeQuery.dateEnd, page]);


    const handleNavChange = (type: 'sublook' | 'poi', value: string, label: string) => {
        // Reset page to 1 only on navigation change
        setPage(1); 
        setActiveQuery({ type, value, label });
        setSelectedArticle(null); 
        setMobileView('list'); 
        
        if (window.innerWidth >= 768 && window.innerWidth < 1536) {
             setIsSidebarOpen(true);
        }
    };

    const handleSearch = (keyword: string) => {
        if (!keyword.trim()) return;
        setPage(1);
        setActiveQuery(prev => ({
            type: 'search',
            value: keyword,
            label: `搜索: ${keyword}`,
            // Clear date filters on quick search
            dateStart: undefined,
            dateEnd: undefined
        }));
        setSelectedArticle(null);
        setMobileView('list');
    };

    // New handler for advanced search from EvidenceTrail
    const handleAdvancedSearch = (keywords: string, startDate?: string, endDate?: string) => {
        setPage(1);
        setActiveQuery({
            type: 'search',
            value: keywords,
            label: `检索: ${keywords || '全部'}`,
            dateStart: startDate,
            dateEnd: endDate
        });
        // Note: We don't necessarily need to clear selectedArticle here if we want to keep viewing it,
        // but typically a new search implies a new context.
        setSelectedArticle(null);
        setMobileView('list');
        if (window.innerWidth >= 768 && window.innerWidth < 1536) {
             setIsSidebarOpen(true);
        }
    };

    const handleArticleSelect = (article: InfoItem) => {
        setSelectedArticle(article);
        setMobileView('detail');
        if (window.innerWidth >= 768 && window.innerWidth < 1536) {
            setIsSidebarOpen(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= paginationMeta.totalPages) {
            setPage(newPage);
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

    const backToNav = () => setMobileView('nav');
    const backToList = () => {
        setMobileView('list');
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] md:p-4 overflow-hidden relative font-sans">
            <div className="flex-1 flex gap-0 md:gap-4 min-h-0 overflow-hidden relative md:static">
                
                {/* Left Sidebar */}
                <aside className={`
                    flex-shrink-0 flex flex-col bg-slate-50/90 backdrop-blur-xl md:bg-white md:rounded-[20px] md:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] md:border border-slate-200/60
                    absolute inset-0 z-20 md:static md:z-auto transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                    ${mobileView === 'nav' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${isSidebarOpen ? 'md:w-[260px] lg:w-[280px] md:opacity-100' : 'md:w-0 md:opacity-0 md:overflow-hidden md:p-0 md:border-0'}
                `}>
                    <div className="md:hidden px-6 pt-6 pb-2 flex items-center justify-between">
                         <h2 className="text-xl font-extrabold text-slate-800">AI情报洞察</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-4 md:px-4">
                        <div className="flex items-center justify-between px-4 mb-4">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">情报罗盘</h2>
                        </div>
                        
                        <StrategicCompass
                            categories={lookCategories}
                            selectedLook={selectedLook}
                            setSelectedLook={setSelectedLook}
                            selectedSubLook={selectedSubLook}
                            setSelectedSubLook={setSelectedSubLook}
                            onSubCategoryClick={(value, label) => handleNavChange('sublook', value, label)}
                            activeQuery={activeQuery}
                        />
                        <div className="my-4 border-t border-slate-100 mx-4"></div>
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
                 <main className="flex-1 flex gap-0 md:gap-4 min-w-0 relative w-full md:static transition-all duration-500">
                    
                    {/* List View (Middle Column) */}
                    <div className={`
                        w-full md:w-[340px] lg:w-[380px] xl:w-[400px] flex-shrink-0 flex flex-col bg-white md:rounded-[20px] shadow-xl md:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border-r md:border border-slate-200/60 overflow-hidden
                        absolute inset-0 z-20 md:static md:z-auto transition-transform duration-300 ease-out
                        ${mobileView === 'list' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                    `}>
                        <IntelligenceCenter
                            title={activeQuery.label}
                            articles={articles}
                            isLoading={isLoading}
                            error={error}
                            selectedArticleId={selectedArticle?.id || null}
                            onSelectArticle={handleArticleSelect}
                            currentPage={page}
                            totalPages={paginationMeta.totalPages}
                            totalItems={paginationMeta.total}
                            onPageChange={handlePageChange}
                            isSidebarOpen={isSidebarOpen}
                            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                            onSearch={handleSearch}
                            onBackToNav={backToNav}
                        />
                    </div>
                    
                    {/* Detail View (Right Column) */}
                    <div className={`
                        flex-1 flex flex-col min-w-0 bg-white md:rounded-[20px] shadow-xl md:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] md:border border-slate-200/60 overflow-hidden
                        absolute inset-0 z-30 md:static md:z-auto transition-transform duration-300 ease-out
                        ${mobileView === 'detail' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                    `}>
                         <div className="md:hidden px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white flex-shrink-0 shadow-sm z-10">
                            <button onClick={backToList} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors"><ChevronLeftIcon className="w-5 h-5 text-slate-600"/></button>
                            <h3 className="font-bold text-slate-800">情报详情</h3>
                        </div>
                         <EvidenceTrail
                            selectedArticle={selectedArticle}
                            onSearch={handleAdvancedSearch}
                        />
                    </div>
                </main>
            </div>

            {isFocusPointModalOpen && <FocusPointManagerModal onClose={handleModalClose} />}
             <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
            `}</style>
        </div>
    );
};
