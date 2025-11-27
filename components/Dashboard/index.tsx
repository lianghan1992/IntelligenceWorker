
import React, { useState, useEffect } from 'react';
import { User, Subscription, View } from '../../types';
import { DashboardWidgets } from './DashboardWidgets';
import { TodaysEvents } from './TodaysEvents';
import { RecentDeepDives } from './RecentDeepDives';
import { SubscriptionManager } from './SubscriptionManager';
import { 
    SparklesIcon, SearchIcon, ChartIcon, VideoCameraIcon, DocumentTextIcon, 
    ArrowRightIcon
} from '../icons';

// --- Dynamic Background Component ---
const DynamicBackground: React.FC = () => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50">
        <style>{`
            @keyframes float-slow {
                0% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
                100% { transform: translate(0, 0) scale(1); }
            }
            @keyframes float-medium {
                0% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(-30px, 40px) scale(1.1); }
                66% { transform: translate(20px, -30px) scale(0.9); }
                100% { transform: translate(0, 0) scale(1); }
            }
            @keyframes float-fast {
                0% { transform: translate(0, 0) rotate(0deg); }
                50% { transform: translate(10px, 20px) rotate(5deg); }
                100% { transform: translate(0, 0) rotate(0deg); }
            }
            .animate-float-slow { animation: float-slow 20s infinite ease-in-out; }
            .animate-float-medium { animation: float-medium 15s infinite ease-in-out; }
            .animate-float-fast { animation: float-fast 10s infinite ease-in-out; }
        `}</style>
        
        {/* Moving Gradient Blobs */}
        <div className="absolute top-[-10%] left-[10%] w-[40vw] h-[40vw] bg-indigo-200/30 rounded-full blur-[100px] animate-float-slow mix-blend-multiply"></div>
        <div className="absolute top-[20%] right-[-5%] w-[35vw] h-[35vw] bg-purple-200/30 rounded-full blur-[100px] animate-float-medium mix-blend-multiply animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[30%] w-[50vw] h-[50vw] bg-blue-100/40 rounded-full blur-[120px] animate-float-slow mix-blend-multiply animation-delay-4000"></div>
        
        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.4]" 
             style={{ 
                 backgroundImage: `linear-gradient(to right, rgba(99, 102, 241, 0.03) 1px, transparent 1px), 
                                   linear-gradient(to bottom, rgba(99, 102, 241, 0.03) 1px, transparent 1px)`,
                 backgroundSize: '40px 40px' 
             }}>
        </div>
    </div>
);

// --- Hero Component ---
const CommandHero: React.FC<{ user: User }> = ({ user }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hour = time.getHours();
    const greeting = hour < 11 ? '早安' : hour < 13 ? '午安' : hour < 18 ? '下午好' : '晚上好';
    
    return (
        <div className="relative overflow-hidden rounded-[24px] bg-white/40 backdrop-blur-md border border-white/60 shadow-sm p-8 md:p-10 group hover:shadow-md transition-all duration-500">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-3 opacity-80">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-widest">Intelligence Command Center</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">
                        {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{user.username}</span>
                    </h1>
                    <p className="text-slate-600 text-sm font-medium max-w-lg leading-relaxed">
                        系统正在实时监控全网数据。今日高价值情报流转正常，AI 引擎已就绪。
                    </p>
                </div>

                <div className="text-right hidden md:block">
                    <div className="flex flex-col items-end">
                        <div className="text-6xl font-black text-slate-800/80 font-mono tracking-tighter leading-none tabular-nums">
                            {time.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1 mr-1">
                            {time.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Quick Action Tile ---
const QuickActionTile: React.FC<{ 
    icon: React.FC<any>, 
    label: string, 
    subLabel?: string, 
    color: string, 
    onClick: () => void 
}> = ({ icon: Icon, label, subLabel, color, onClick }) => {
    
    const colorStyles: Record<string, string> = {
        purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
        blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
        indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
        cyan: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white',
    };

    return (
        <button 
            onClick={onClick}
            className="group relative flex items-center p-4 w-full bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden"
        >
            <div className={`p-3 rounded-xl transition-colors duration-300 ${colorStyles[color] || colorStyles.indigo}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="ml-4 flex-1">
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{label}</h3>
                {subLabel && <p className="text-xs text-slate-500 mt-0.5">{subLabel}</p>}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                <ArrowRightIcon className="w-4 h-4 text-slate-400" />
            </div>
        </button>
    );
};

// --- Main Dashboard ---
interface DashboardProps {
    user: User;
    subscriptions: Subscription[];
    onNavigate: (view: View) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, subscriptions, onNavigate }) => {
    return (
        <div className="relative min-h-full w-full font-sans text-slate-900 pb-20">
            {/* 1. Dynamic Background Layer */}
            <DynamicBackground />

            <div className="relative z-10 max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                
                {/* 2. Hero Section */}
                <div className="animate-in slide-in-from-top-4 duration-700">
                    <CommandHero user={user} />
                </div>

                {/* 3. System Vitals */}
                <div className="animate-in slide-in-from-bottom-4 duration-700 delay-100">
                    <DashboardWidgets />
                </div>

                {/* 4. Main Layout Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in slide-in-from-bottom-8 duration-1000 delay-200">
                    
                    {/* Left Column (Operations) - Wider to accommodate content */}
                    <div className="xl:col-span-9 flex flex-col gap-6">
                        {/* Operational Panels Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[480px]">
                            <TodaysEvents onNavigate={onNavigate} />
                            <RecentDeepDives onNavigate={onNavigate} />
                        </div>
                        
                        {/* Subscription Manager (Full Width of Left Col) */}
                        <div className="bg-white/60 backdrop-blur-xl rounded-[24px] border border-white/60 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <SubscriptionManager />
                        </div>
                    </div>

                    {/* Right Column (Quick Access) - Narrower, cleaner */}
                    <div className="xl:col-span-3 flex flex-col gap-4">
                        <div className="flex items-center justify-between px-1 mb-1">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Access</h2>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            <QuickActionTile 
                                icon={SparklesIcon}
                                label="AI 报告生成"
                                subLabel="一键生成行业研报"
                                color="purple"
                                onClick={() => onNavigate('ai')}
                            />
                            <QuickActionTile 
                                icon={SearchIcon}
                                label="情报检索"
                                subLabel="全网资讯深度搜索"
                                color="blue"
                                onClick={() => onNavigate('cockpit')}
                            />
                            <QuickActionTile 
                                icon={ChartIcon}
                                label="竞争力看板"
                                subLabel="参数级竞品对标"
                                color="indigo"
                                onClick={() => onNavigate('techboard')}
                            />
                            <QuickActionTile 
                                icon={DocumentTextIcon}
                                label="上传文档"
                                subLabel="PDF 转知识库"
                                color="cyan"
                                onClick={() => onNavigate('dives')}
                            />
                        </div>

                        {/* Decorative "AI Status" Box - Purely Visual, minimal footprint */}
                        <div className="mt-auto p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden shadow-xl group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/10">
                                    <SparklesIcon className="w-5 h-5 text-indigo-300" />
                                </div>
                                <h3 className="font-bold text-lg">Auto Insight</h3>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    AI 引擎正在后台持续学习与索引。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
