
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

// --- Hero Component ---
const CommandHero: React.FC<{ user: User }> = ({ user }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const hour = time.getHours();
    const greeting = hour < 11 ? '早安' : hour < 13 ? '午安' : hour < 18 ? '下午好' : '晚上好';
    const dateStr = time.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="relative overflow-hidden rounded-[32px] bg-white border border-white/60 shadow-xl p-8 md:p-10 mb-8 group">
            {/* Background Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-purple-50 opacity-80"></div>
            <div className="absolute top-[-50%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/30 to-cyan-200/30 rounded-full blur-[80px] animate-pulse"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 rounded-full bg-white/80 border border-indigo-100 text-[10px] font-bold text-indigo-600 uppercase tracking-widest shadow-sm backdrop-blur-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            System Online
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{dateStr}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">
                        {greeting}, {user.username}
                    </h1>
                    <p className="text-slate-500 text-sm font-medium max-w-xl">
                        全域情报系统运行正常。今日新增 <span className="text-indigo-600 font-bold">24</span> 条高价值资讯，
                        <span className="text-purple-600 font-bold mx-1">3</span> 场发布会正在监控中。
                    </p>
                </div>

                <div className="text-right hidden md:block">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Local Time</div>
                    <div className="text-5xl font-black text-slate-800 font-mono tracking-tighter leading-none">
                        {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Quick Action Button ---
const QuickAction: React.FC<{ 
    icon: React.FC<any>, 
    label: string, 
    desc: string, 
    color: 'indigo' | 'purple' | 'blue' | 'cyan',
    onClick: () => void 
}> = ({ icon: Icon, label, desc, color, onClick }) => {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
        purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
        blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
        cyan: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white',
    };

    return (
        <button 
            onClick={onClick}
            className="group relative p-5 bg-white rounded-[20px] border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left w-full overflow-hidden"
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-xl transition-colors duration-300 ${colors[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <ArrowRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">{label}</h3>
            <p className="text-xs text-slate-500 font-medium">{desc}</p>
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
        <div className="min-h-full bg-[#f8fafc] w-full overflow-x-hidden font-sans relative">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[120px] opacity-50 animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-100/40 rounded-full blur-[120px] opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                
                {/* 1. Hero Section */}
                <CommandHero user={user} />

                {/* 2. System Vitals */}
                <div className="animate-in slide-in-from-bottom-4 duration-700">
                    <DashboardWidgets />
                </div>

                {/* 3. Main Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-1000">
                    
                    {/* Left Column: Operations (8 cols) */}
                    <div className="xl:col-span-8 flex flex-col gap-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
                            <TodaysEvents onNavigate={onNavigate} />
                            <RecentDeepDives onNavigate={onNavigate} />
                        </div>
                        
                        {/* Subscription Manager */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-[24px] border border-white/60 p-6 shadow-sm">
                            <SubscriptionManager />
                        </div>
                    </div>

                    {/* Right Column: Quick Actions & Status (4 cols) */}
                    <div className="xl:col-span-4 flex flex-col gap-6">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Quick Access</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <QuickAction 
                                icon={SparklesIcon}
                                label="AI 报告生成"
                                desc="一键生成行业研报"
                                color="purple"
                                onClick={() => onNavigate('ai')}
                            />
                            <QuickAction 
                                icon={SearchIcon}
                                label="情报检索"
                                desc="全网资讯深度搜索"
                                color="blue"
                                onClick={() => onNavigate('cockpit')}
                            />
                            <QuickAction 
                                icon={ChartIcon}
                                label="竞争力看板"
                                desc="参数级竞品对标"
                                color="indigo"
                                onClick={() => onNavigate('techboard')}
                            />
                            <QuickAction 
                                icon={DocumentTextIcon}
                                label="上传文档"
                                desc="PDF 转知识库"
                                color="cyan"
                                onClick={() => onNavigate('dives')}
                            />
                        </div>

                        {/* Mini Status Module */}
                        <div className="mt-auto bg-slate-900 rounded-[24px] p-6 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/20">
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-lg mb-4">Platform Status</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                                        <span className="text-slate-400">API Latency</span>
                                        <span className="text-emerald-400 font-mono font-bold">24ms</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                                        <span className="text-slate-400">Crawler Nodes</span>
                                        <span className="text-blue-400 font-mono font-bold">Online</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-slate-400">AI Engine</span>
                                        <span className="text-purple-400 font-mono font-bold">Idle</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
