
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SystemSource, InfoItem, User, View } from '../../types';
import { lookCategories } from './data';
import { IntelligenceCenter } from './IntelligenceCenter';
import { EvidenceTrail } from './EvidenceTrail';
import { AIChatPanel } from './AIChatPanel';
import { searchArticlesFiltered, getArticlesByTags } from '../../api';
import { 
    ViewListIcon, DocumentTextIcon, SparklesIcon, MenuIcon, 
    LogoIcon, CloseIcon, EyeIcon, ChartIcon, DiveIcon, 
    VideoCameraIcon, CubeIcon, UserIcon, ArrowRightIcon, GearIcon
} from '../icons';

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
    const [mobileTab, setMobileTab] = useState<string>('list');
    const [isGlobalMenuOpen, setIsGlobalMenuOpen] = useState(false);

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

            // ⚡️ 核心优化：首次进入或切换分类时，默认选中第一篇文章展示 (仅在桌面端)
            // 移动端优先展示列表，不自动选中，避免触发 EvidenceTrail 的内容加载和状态混乱
            const isDesktop = window.innerWidth >= 768;
            if (page === 1 && items.length > 0 && isDesktop) {
                // 使用函数式更新检查当前状态，避免依赖闭包中的 stale value
                setSelectedArticle(prev => prev ? prev : items[0]);
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || '获取情报失败');
        } finally {
            setIsLoading(false);
        }
    }, []); // Explicitly empty deps to prevent re-creation on state changes

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
        setSelectedArticle(null); // Reset selection to trigger auto-select first from new list (on desktop)
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
        // ⚡️ 用户主动点击某篇文章后，不再自动收起 AI Copilot，保持常驻
        // setIsCopilotExpanded(false); 
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchArticles(activeQuery.value, activeQuery.type as any, newPage);
        }
    };

    const handleCopilotCitationClick = (item: InfoItem) => {
        setSelectedArticle(item);
        setMobileTab('detail'); 
        // 引用跳转时也不收起 Copilot
        // setIsCopilotExpanded(false);
    };

    const handleGlobalNavigate = (view: View) => {
        if (onNavigate) {
            onNavigate(view);
            setIsGlobalMenuOpen(false);
        }
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

                {/* 3. Right Column: AI Copilot (Dynamic Width) - Desktop Only Container */}
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

                {/* Mobile Copilot Overlay (Always Full) - Conditional Render to prevent auto-scroll hijack */}
                <div className={`
                    md:hidden w-full flex flex-col z-30 transition-transform duration-300 absolute inset-0
                    bg-white
                    ${mobileTab === 'chat' ? 'translate-x-0' : 'translate-x-full'}
                `}>
                     {mobileTab === 'chat' && (
                        <AIChatPanel 
                            isExpanded={true} 
                            hideToggle={true}
                            onReferenceClick={handleCopilotCitationClick} 
                        />
                     )}
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden flex-shrink-0 h-16 bg-white border-t border-slate-200 flex justify-around items-center z-40 relative shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-1">
                <button onClick={() => setMobileTab('list')} className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'list' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <ViewListIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold">情报列表</span>
                </button>
                <button onClick={() => setMobileTab('detail')} disabled={!selectedArticle} className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'detail' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <DocumentTextIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold">正文详情</span>
                </button>
                <button onClick={() => setMobileTab('chat')} className={`flex flex-col items-center justify-center w-full h-full ${mobileTab === 'chat' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <SparklesIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold">AI助手</span>
                </button>
                <button onClick={() => setIsGlobalMenuOpen(true)} className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-indigo-600">
                    <MenuIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold">更多</span>
                </button>
            </div>

            {/* Mobile Global Navigation Drawer (Replacing Header) */}
            {isGlobalMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex flex-col">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsGlobalMenuOpen(false)}></div>
                    
                    {/* Drawer Content */}
                    <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-[32px] shadow-2xl animate-in slide-in-from-bottom-full duration-300 flex flex-col max-h-[85vh]">
                        <div className="p-2 flex justify-center">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                        </div>

                        <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-100">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                                    {user?.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{user?.username}</h3>
                                    <p className="text-xs text-slate-400">{user?.email}</p>
                                </div>
                             </div>
                             <button onClick={() => setIsGlobalMenuOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                                <CloseIcon className="w-5 h-5"/>
                             </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 custom-scrollbar">
                            <button onClick={() => handleGlobalNavigate('cockpit')} className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-indigo-700">
                                <EyeIcon className="w-8 h-8"/>
                                <span className="font-bold text-sm">情报洞察</span>
                            </button>
                            <button onClick={() => handleGlobalNavigate('techboard')} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-50">
                                <ChartIcon className="w-8 h-8"/>
                                <span className="font-bold text-sm">竞争力看板</span>
                            </button>
                            <button onClick={() => handleGlobalNavigate('dives')} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-50">
                                <DiveIcon className="w-8 h-8"/>
                                <span className="font-bold text-sm">深度洞察</span>
                            </button>
                            <button onClick={() => handleGlobalNavigate('events')} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-50">
                                <VideoCameraIcon className="w-8 h-8"/>
                                <span className="font-bold text-sm">发布会</span>
                            </button>
                            <button onClick={() => handleGlobalNavigate('ai')} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-50">
                                <SparklesIcon className="w-8 h-8"/>
                                <span className="font-bold text-sm">AI报告</span>
                            </button>
                            <button onClick={() => handleGlobalNavigate('marketplace')} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-50">
                                <CubeIcon className="w-8 h-8"/>
                                <span className="font-bold text-sm">效率集市</span>
                            </button>
                            {user?.email === '326575140@qq.com' && (
                                <button onClick={() => handleGlobalNavigate('admin')} className="col-span-2 p-3 bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-sm">
                                    <GearIcon className="w-5 h-5"/> 后台管理
                                </button>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
                             <button onClick={() => { if(onShowProfile) onShowProfile(); setIsGlobalMenuOpen(false); }} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 flex items-center justify-center gap-2">
                                <UserIcon className="w-4 h-4"/> 个人资料
                             </button>
                             <button onClick={onLogout} className="w-full py-3 bg-red-50 border border-red-100 rounded-xl text-sm font-bold text-red-600 flex items-center justify-center gap-2">
                                <ArrowRightIcon className="w-4 h-4"/> 退出登录
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
