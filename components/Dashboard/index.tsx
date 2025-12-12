
import React, { useState, useEffect, useMemo } from 'react';
import { User, InfoItem, View, ApiPoi, SystemSource } from '../../types';
import { DashboardWidgets } from './DashboardWidgets';
import { FireIcon, BookmarkIcon } from './icons';
import { FocusPointManagerModal } from './FocusPointManagerModal';
import { TodaysEvents } from './TodaysEvents';
import { RecentDeepDives } from './RecentDeepDives';
import { getUserPois, searchArticlesFiltered, searchSemanticSegments } from '../../api';
import { LazyLoadModule } from './LazyLoadModule';
import { GearIcon, SearchIcon, PlusIcon, SparklesIcon } from '../icons';

// --- 1. AI Daily Briefing (Enhanced) ---
interface DailyBriefingProps {
    user: User;
    onManageFocusPoints: () => void;
}

const DailyBriefing: React.FC<DailyBriefingProps> = ({ user, onManageFocusPoints }) => {
    const [briefing, setBriefing] = useState<{ title: string; content: React.ReactNode; highlight: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generateBriefing = async () => {
            setIsLoading(true);
            try {
                const today = new Date();
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`;

                // Use parallel requests for efficiency
                const [pois, articlesRes] = await Promise.all([
                    getUserPois(),
                    // Check general activity
                    searchArticlesFiltered({ publish_date_start: dateStr, query_text: '*', limit: 1, page: 1 })
                ]);

                const totalToday = articlesRes.total;
                const hour = today.getHours();
                const greeting = hour < 11 ? '早上好' : hour < 13 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

                if (pois.length === 0) {
                    setBriefing({
                        title: `${greeting}，${user.username}`,
                        highlight: "暂无关注点",
                        content: <>今日全网新增情报 <strong className="text-indigo-600">{totalToday}</strong> 条。您尚未设置关注点，建议立即配置以获取个性化简报。</>
                    });
                } else {
                    // Check activity for the top priority POI using semantic search for accuracy
                    const topPoi = pois[0];
                    const topPoiCountRes = await searchSemanticSegments({ 
                        start_date: dateStr, 
                        query_text: topPoi.content, 
                        page_size: 1,
                        similarity_threshold: 0.35
                    });
                    
                    setBriefing({
                        title: `${greeting}，${user.username}`,
                        highlight: topPoiCountRes.total > 0 ? `“${topPoi.content}” 有新动态` : "今日重点关注",
                        content: <>
                            平台今日为您捕获 <strong className="text-indigo-600">{totalToday}</strong> 条行业情报。
                            {topPoiCountRes.total > 0 
                                ? <>其中您关注的 <strong className="text-slate-800">{topPoi.content}</strong> 相关话题热度较高，建议优先查阅。</>
                                : <>您关注的领域暂无重大突发，建议浏览下方推荐的深度研报。</>
                            }
                        </>
                    });
                }
            } catch (error) {
                console.error("Briefing error", error);
                setBriefing({ title: `你好，${user.username}`, highlight: "系统消息", content: "晨报生成服务暂时不可用，请稍后刷新。" });
            } finally {
                setIsLoading(false);
            }
        };

        generateBriefing();
    }, [user]);

    if (isLoading) return (
        <div className="h-full w-full bg-white rounded-2xl border border-slate-100 p-6 shadow-sm animate-pulse">
            <div className="h-8 w-48 bg-slate-100 rounded mb-4"></div>
            <div className="h-4 w-full bg-slate-100 rounded mb-2"></div>
            <div className="h-4 w-2/3 bg-slate-100 rounded"></div>
        </div>
    );

    return (
        <div className="h-full w-full bg-gradient-to-br from-white to-indigo-50/50 rounded-2xl border border-indigo-100 p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <BookmarkIcon className="w-32 h-32 text-indigo-600" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-center">
                <h2 className="text-2xl font-extrabold text-slate-800 mb-2 tracking-tight">
                    {briefing?.title}
                </h2>
                <div className="inline-block mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wide border border-indigo-200">
                        {briefing?.highlight}
                    </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base max-w-2xl">
                    {briefing?.content}
                    {briefing?.highlight === "暂无关注点" && (
                        <button onClick={onManageFocusPoints} className="ml-2 text-indigo-600 font-bold hover:underline">
                            去设置 &rarr;
                        </button>
                    )}
                </p>
            </div>
        </div>
    );
};

// --- Main Dashboard Component ---
interface DashboardProps {
    user: User;
    subscriptions: SystemSource[];
    onNavigate: (view: View) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, subscriptions, onNavigate }) => {
    const [isFocusPointModalOpen, setIsFocusPointModalOpen] = useState(false);

    const handleFocusPointModalClose = () => {
        setIsFocusPointModalOpen(false);
    };

    return (
        <div className="min-h-full bg-[#f8fafc] w-full overflow-x-hidden">
            {/* Fluid Container for Full Width experience */}
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
                
                {/* 1. Top Section: Metrics & Briefing */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Metrics (Full Width on Mobile/Tablet, Top Row on Desktop) */}
                    <div className="xl:col-span-12">
                        <DashboardWidgets />
                    </div>
                    
                    {/* Briefing (2/3 width on Desktop) */}
                    <div className="xl:col-span-8 h-full min-h-[180px]">
                        <DailyBriefing 
                            user={user} 
                            onManageFocusPoints={() => setIsFocusPointModalOpen(true)}
                        />
                    </div>

                    {/* Quick Actions / System Status (1/3 width) */}
                    <div className="xl:col-span-4 flex flex-col gap-4">
                        {/* Example Quick Action Card */}
                        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-center items-start hover:border-indigo-300 transition-colors group cursor-pointer" onClick={() => onNavigate('ai')}>
                            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white mb-3 shadow-md group-hover:scale-110 transition-transform">
                                <SparklesIcon className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">AI 报告生成器</h3>
                            <p className="text-slate-500 text-sm mt-1">输入一句话主题，一键生成专业研报。</p>
                        </div>
                        
                        <div className="flex gap-4 h-1/2">
                             <button onClick={() => onNavigate('dives')} className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col items-center justify-center gap-2 group">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-100 transition-colors"><PlusIcon className="w-5 h-5"/></div>
                                <span className="text-xs font-bold text-slate-600">上传文档</span>
                             </button>
                             <button onClick={() => onNavigate('cockpit')} className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col items-center justify-center gap-2 group">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full group-hover:bg-indigo-100 transition-colors"><SearchIcon className="w-5 h-5"/></div>
                                <span className="text-xs font-bold text-slate-600">情报检索</span>
                             </button>
                        </div>
                    </div>
                </div>

                {/* 2. Content Grid: Events & Docs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <LazyLoadModule placeholder={<div className="h-64 bg-slate-100 rounded-2xl animate-pulse"/>}>
                        <TodaysEvents onNavigate={onNavigate} />
                    </LazyLoadModule>
                    
                    <LazyLoadModule placeholder={<div className="h-64 bg-slate-100 rounded-2xl animate-pulse"/>}>
                        <RecentDeepDives onNavigate={onNavigate} />
                    </LazyLoadModule>
                </div>

            </div>

            {isFocusPointModalOpen && (
                <FocusPointManagerModal onClose={handleFocusPointModalClose} />
            )}
        </div>
    );
};
