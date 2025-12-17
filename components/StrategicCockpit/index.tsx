
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { SystemSource, InfoItem, ApiPoi, User } from '../../types';
import { lookCategories } from './data';
import { StrategicCompass } from './StrategicCompass';
import { FocusPoints } from './FocusPoints';
import { FocusPointManagerModal } from '../Dashboard/FocusPointManagerModal';
import { IntelligenceCenter } from './IntelligenceCenter';
import { EvidenceTrail } from './EvidenceTrail';
import { getUserPois, searchArticlesFiltered, searchSemanticSegments, getArticlesByTags } from '../../api';
import { ChevronLeftIcon, MenuIcon, ViewGridIcon, SparklesIcon, RssIcon, BrainIcon, PuzzleIcon, CheckCircleIcon, ArrowRightIcon } from '../icons';
import { CopilotPanel } from './AICopilot/CopilotPanel';
import { VectorSearchPanel } from './VectorSearchPanel';
import { getMe } from '../../api/auth';

// --- Intro Overlay Component ---
const IntroOverlay: React.FC<{
    type: 'copilot' | 'vector';
    onClose: () => void;
}> = ({ type, onClose }) => {
    const config = type === 'copilot' ? {
        title: "构建您的专属情报“核武库”",
        desc: "这不是简单的搜索，而是为您打造的情报加工厂。AI 将以上帝视角审视海量资讯，精准捕获高关联情报，并一键生成结构化综述。导出后，它将成为您私有 AI 最纯净、最丰富的情报原矿！",
        gradient: "from-indigo-600 to-purple-600",
        icon: SparklesIcon,
        btnColor: "bg-indigo-600 hover:bg-indigo-700"
    } : {
        title: "注入高能“数据燃料”",
        desc: "打破文章壁垒，直接穿透至知识的最小原子。通过高维向量技术，毫秒级定位您急需的关键片段。过滤噪声，聚焦核心，为您的每一次 AI 交互提供最精准的事实支撑！",
        gradient: "from-emerald-500 to-teal-600",
        icon: PuzzleIcon,
        btnColor: "bg-emerald-600 hover:bg-emerald-700"
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative">
                <div className={`h-2 w-full bg-gradient-to-r ${config.gradient}`}></div>
                <div className="p-8 text-center">
                    <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${config.gradient} rounded-full flex items-center justify-center shadow-lg mb-6`}>
                        <config.icon className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">
                        {config.title}
                    </h2>
                    <p className="text-slate-600 leading-relaxed mb-8 font-medium">
                        {config.desc}
                    </p>
                    <button 
                        onClick={onClose}
                        className={`w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${config.btnColor}`}
                    >
                        <span>开始体验</span>
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-gradient-to-br from-white/0 to-white/10 rounded-full blur-2xl pointer-events-none"></div>
            </div>
        </div>
    );
};

// --- Main Component ---
interface StrategicCockpitProps {
    subscriptions: SystemSource[];
    user?: User; // Make optional initially to be compatible, but logic will rely on it
}

export const StrategicCockpit: React.FC<StrategicCockpitProps> = ({ subscriptions, user }) => {
    // Left navigation state
    const [selectedLook, setSelectedLook] = useState('all');
    const [selectedSubLook, setSelectedSubLook] = useState<string | null>(null);
    
    // Tools Panel State: 'copilot' (AI Retrieval) | 'vector' (Vector Search) | null
    const [activeTool, setActiveTool] = useState<'copilot' | 'vector' | null>(null);
    const [introType, setIntroType] = useState<'copilot' | 'vector' | null>(null);

    // Active query state for API calls
    const [activeQuery, setActiveQuery] = useState<{ type: 'sublook' | 'poi' | 'search', value: string, label: string }>({ 
        type: 'sublook', 
        value: '*', 
        label: '所有情报' 
    });

    // Mobile View State: 'nav' (Compass) -> 'list' (IntelligenceCenter) -> 'detail' (EvidenceTrail)
    const [mobileView, setMobileView] = useState<'nav' | 'list' | 'detail'>('nav');

    // Desktop/Laptop Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Data fetching and display state
    const [articles, setArticles] = useState<InfoItem[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Detail view state
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);
    const selectedArticleRef = useRef<InfoItem | null>(null);
    
    // Focus points state
    const [isFocusPointModalOpen, setIsFocusPointModalOpen] = useState(false);
    const [pois, setPois] = useState<ApiPoi[]>([]);
    const [isLoadingPois, setIsLoadingPois] = useState(true);
    
    // Internal user state if not passed prop (fallback)
    const [internalUser, setInternalUser] = useState<User | null>(null);
    const currentUser = user || internalUser;

    useEffect(() => {
        if (!user) {
            getMe().then(setInternalUser).catch(console.error);
        }
    }, [user]);

    useEffect(() => {
        selectedArticleRef.current = selectedArticle;
    }, [selectedArticle]);

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

    const fetchArticles = useCallback(async (
        queryValue: string, 
        lookType: string, 
        queryType: string, 
        queryLabel: string, 
        page: number = 1
    ) => {
        setIsLoading(true);
        if (page === 1) {
            setArticles([]); 
        }
        setError(null);

        try {
            const limit = 20;
            let response;

            if (queryType === 'sublook' && (lookType === 'industry' || lookType === 'customer')) {
                const tagResponse = await getArticlesByTags({
                    tags: [queryLabel],
                    page,
                    page_size: limit
                });
                
                response = {
                    items: tagResponse.items as unknown as InfoItem[],
                    total: tagResponse.total,
                    page: tagResponse.page,
                    totalPages: tagResponse.totalPages
                };
            }
            else if (queryValue === '*') {
                const params: any = {
                    page,
                    limit: limit,
                };
                response = await searchArticlesFiltered(params);
            } else {
                response = await searchSemanticSegments({
                    query_text: queryValue,
                    page,
                    page_size: limit,
                    similarity_threshold: 0.35
                });
            }
            
            const calculatedTotalPages = Math.ceil(response.total / limit) || 1;

            setArticles(response.items || []);
            setPagination({ page: response.page, totalPages: calculatedTotalPages, total: response.total });
            
            if (window.innerWidth >= 768) {
                if (page === 1 && response.items && response.items.length > 0 && !selectedArticleRef.current) {
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
    }, []); 


    useEffect(() => {
        fetchArticles(activeQuery.value, selectedLook, activeQuery.type, activeQuery.label, 1);
    }, [activeQuery, selectedLook, fetchArticles]);

    const handleNavChange = (type: 'sublook' | 'poi', value: string, label: string) => {
        setActiveQuery({ type, value, label });
        setSelectedArticle(null); 
        setMobileView('list');
        
        if (window.innerWidth >= 768 && window.innerWidth < 1536) {
             setIsSidebarOpen(true);
        }
    };

    const handleSearch = (keyword: string) => {
        if (!keyword.trim()) return;
        setActiveQuery({
            type: 'search',
            value: keyword,
            label: `搜索: ${keyword}`
        });
        setSelectedArticle(null);
        setMobileView('list');
    };

    const handleArticleSelect = (article: InfoItem) => {
        setSelectedArticle(article);
        setMobileView('detail');
        if (window.innerWidth >= 768 && window.innerWidth < 1536) {
            setIsSidebarOpen(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchArticles(activeQuery.value, selectedLook, activeQuery.type, activeQuery.label, newPage);
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

    // Tool Toggling with Intro Logic
    const toggleTool = (tool: 'copilot' | 'vector') => {
        if (activeTool === tool) {
            setActiveTool(null);
            return;
        }

        const storageKey = tool === 'copilot' ? 'hasSeenIntro_ai' : 'hasSeenIntro_vector';
        const hasSeen = localStorage.getItem(storageKey);

        if (hasSeen) {
            setActiveTool(tool);
        } else {
            setIntroType(tool);
        }
    };

    const handleIntroDismiss = () => {
        if (!introType) return;
        const storageKey = introType === 'copilot' ? 'hasSeenIntro_ai' : 'hasSeenIntro_vector';
        localStorage.setItem(storageKey, 'true');
        setActiveTool(introType);
        setIntroType(null);
    };

    // Callback when clicking a result in Vector Search Panel
    const handleVectorResultSelect = (item: InfoItem) => {
        setSelectedArticle(item);
        setMobileView('detail');
        setActiveTool(null); // Close the panel to show the article
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] md:p-4 overflow-hidden relative font-sans">
            <div className="flex-1 flex gap-0 md:gap-4 min-h-0 overflow-hidden relative md:static">
                
                {/* Left Sidebar - Navigation Drawer */}
                <aside className={`
                    flex-shrink-0 flex flex-col bg-slate-50/90 backdrop-blur-xl md:bg-white md:rounded-[20px] md:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] md:border border-slate-200/60
                    absolute inset-0 z-20 md:static md:z-auto transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden
                    ${mobileView === 'nav' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${isSidebarOpen ? 'md:w-[280px] lg:w-[300px] md:opacity-100' : 'md:w-0 md:opacity-0 md:overflow-hidden md:p-0 md:border-0'}
                `}>
                    <div className="px-4 pt-4 pb-2">
                        <div className="md:hidden flex items-center justify-between mb-4 px-2">
                             <h2 className="text-xl font-extrabold text-slate-800">AI情报洞察</h2>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 md:px-4">
                        <div className="flex items-center justify-between px-4 mb-3 mt-2">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">分类浏览</h2>
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
                    {/* Width adjusted to accommodate the larger right tool rail */}
                    <div className={`
                        w-full md:w-[320px] lg:w-[340px] xl:w-[360px] flex-shrink-0 flex flex-col bg-white md:rounded-[20px] shadow-xl md:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border-r md:border border-slate-200/60 overflow-hidden
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
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.total}
                            onPageChange={handlePageChange}
                            // Toggle props for sidebar control
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
                         {/* Mobile Header for Detail */}
                         <div className="md:hidden px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white flex-shrink-0 shadow-sm z-10">
                            <button onClick={backToList} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors"><ChevronLeftIcon className="w-5 h-5 text-slate-600"/></button>
                            <h3 className="font-bold text-slate-800">情报详情</h3>
                        </div>
                         <EvidenceTrail
                            selectedArticle={selectedArticle}
                        />
                    </div>

                    {/* Right Tool Panel (Squeeze Layout) */}
                    <div 
                        className={`
                            bg-white md:rounded-r-[20px] overflow-hidden flex flex-col transition-all duration-300 ease-in-out border-l border-slate-200/60 shadow-sm z-30 flex-shrink-0
                            ${activeTool ? 'w-[400px] md:w-[450px]' : 'w-0 border-0'}
                        `}
                    >
                        {currentUser && activeTool === 'copilot' && (
                            <CopilotPanel 
                                user={currentUser} 
                                isOpen={true}
                                onClose={() => setActiveTool(null)} 
                            />
                        )}
                        {currentUser && activeTool === 'vector' && (
                            <VectorSearchPanel 
                                isOpen={true}
                                onClose={() => setActiveTool(null)}
                                onSelectResult={handleVectorResultSelect}
                            />
                        )}
                    </div>

                    {/* Right Tool Rail - Widened */}
                    <div className="hidden md:flex flex-col w-20 bg-white border-l border-slate-200/60 md:rounded-r-[20px] items-center py-6 gap-6 z-40 shadow-sm flex-shrink-0">
                        {/* Tool 1: AI Retrieval (Copilot) */}
                        <button 
                            onClick={() => toggleTool('copilot')}
                            className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all duration-200 group w-full ${activeTool === 'copilot' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}`}
                            title="AI 智能检索"
                        >
                            <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${activeTool === 'copilot' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                <SparklesIcon className="w-6 h-6" />
                            </div>
                            <span className="text-[11px] font-bold text-center">AI 检索</span>
                        </button>

                        {/* Tool 2: Vector Search */}
                        <button 
                            onClick={() => toggleTool('vector')}
                            className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all duration-200 group w-full ${activeTool === 'vector' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'}`}
                            title="向量检索"
                        >
                            <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${activeTool === 'vector' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>
                                <PuzzleIcon className="w-6 h-6" />
                            </div>
                            <span className="text-[11px] font-bold text-center">向量检索</span>
                        </button>
                    </div>

                    {/* Intro Overlay */}
                    {introType && (
                        <IntroOverlay type={introType} onClose={handleIntroDismiss} />
                    )}

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
