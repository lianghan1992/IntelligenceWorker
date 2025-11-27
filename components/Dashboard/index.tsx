
import React, { useState, useEffect } from 'react';
import { User, Subscription, View } from '../../types';
import { DashboardWidgets } from './DashboardWidgets';
import { TodaysEvents } from './TodaysEvents';
import { RecentDeepDives } from './RecentDeepDives';
import { SubscriptionManager } from './SubscriptionManager';
import { 
    SparklesIcon, SearchIcon, PlusIcon, RssIcon, 
    ChartIcon, VideoCameraIcon, DocumentTextIcon, 
    ArrowRightIcon, ClockIcon
} from '../icons';

// --- Greeting Component ---
const WelcomeHero: React.FC<{ user: User }> = ({ user }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const hour = time.getHours();
    const greeting = hour < 11 ? '早安' : hour < 13 ? '午安' : hour < 18 ? '下午好' : '晚上好';
    const dateStr = time.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 p-8 md:p-12 shadow-2xl border border-slate-700/50 group">
            {/* Animated Background Elements */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 text-indigo-300 text-sm font-bold uppercase tracking-widest mb-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        System Online
                        <span className="text-slate-500">|</span>
                        {dateStr}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
                        {greeting}, {user.username}
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base max-w-xl leading-relaxed">
                        欢迎回到情报指挥中心。全域感知系统正在运行，实时追踪行业动态、竞争态势与前沿技术。
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-xs font-mono">
                        <div className="text-slate-400 text-[10px] uppercase">Server Time</div>
                        <div className="text-lg font-bold">{time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Quick Action Dock ---
const QuickAction: React.FC<{ 
    icon: React.FC<any>, 
    label: string, 
    desc: string, 
    color: string,
    onClick: () => void 
}> = ({ icon: Icon, label, desc, color, onClick }) => (
    <button 
        onClick={onClick}
        className="group relative flex flex-col items-start p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 hover:-translate-y-1 overflow-hidden w-full text-left"
    >
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
        
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10 text-white mb-3 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{label}</h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
        
        <div className="mt-4 flex items-center text-xs font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
            立即开始 <ArrowRightIcon className="w-3 h-3 ml-1" />
        </div>
    </button>
);

// --- Main Dashboard ---
interface DashboardProps {
    user: User;
    subscriptions: Subscription[];
    onNavigate: (view: View) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, subscriptions, onNavigate }) => {
    
    return (
        <div className="min-h-full bg-[#f8fafc] w-full overflow-x-hidden font-sans">
            <div className="max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                
                {/* 1. Hero Section */}
                <WelcomeHero user={user} />

                {/* 2. System Vitals (Cross-Service Stats) */}
                <DashboardWidgets />

                {/* 3. The Grid (Main Workspace) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    
                    {/* Left Column: Activity Streams (8 cols) */}
                    <div className="xl:col-span-8 flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                            {/* Live Events Module */}
                            <div className="flex flex-col h-full min-h-[300px]">
                                <TodaysEvents onNavigate={onNavigate} />
                            </div>
                            {/* Deep Dives Module */}
                            <div className="flex flex-col h-full min-h-[300px]">
                                <RecentDeepDives onNavigate={onNavigate} />
                            </div>
                        </div>
                        
                        {/* Subscriptions (Full Width in this column) */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                            <SubscriptionManager />
                        </div>
                    </div>

                    {/* Right Column: Command Dock (4 cols) */}
                    <div className="xl:col-span-4 flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">快速操作</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 xl:grid-cols-1 gap-4">
                            <QuickAction 
                                icon={SparklesIcon}
                                label="AI 报告生成"
                                desc="一键生成行业研报"
                                color="from-purple-500 to-pink-500"
                                onClick={() => onNavigate('ai')}
                            />
                            <QuickAction 
                                icon={SearchIcon}
                                label="情报检索"
                                desc="全网资讯深度搜索"
                                color="from-blue-500 to-cyan-500"
                                onClick={() => onNavigate('cockpit')}
                            />
                            <QuickAction 
                                icon={ChartIcon}
                                label="竞争力看板"
                                desc="参数级竞品对标"
                                color="from-indigo-500 to-violet-500"
                                onClick={() => onNavigate('techboard')}
                            />
                            <QuickAction 
                                icon={DocumentTextIcon}
                                label="上传文档"
                                desc="PDF 转知识库"
                                color="from-emerald-500 to-teal-500"
                                onClick={() => onNavigate('dives')}
                            />
                        </div>

                        {/* Mini Status Card */}
                        <div className="mt-auto bg-slate-900 rounded-2xl p-5 text-white relative overflow-hidden group cursor-default">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
                            <h3 className="font-bold text-lg relative z-10">平台运行正常</h3>
                            <div className="mt-4 space-y-2 relative z-10 text-sm text-slate-400">
                                <div className="flex justify-between">
                                    <span>API Latency</span>
                                    <span className="text-green-400 font-mono">45ms</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Crawler Nodes</span>
                                    <span className="text-blue-400 font-mono">Active</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>AI Engine</span>
                                    <span className="text-purple-400 font-mono">Online</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
