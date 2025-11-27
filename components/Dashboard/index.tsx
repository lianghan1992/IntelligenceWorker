
import React, { useState, useEffect } from 'react';
import { User, View, Subscription } from '../../types';
import { SubscriptionManager } from './SubscriptionManager';
import { TodaysEvents } from './TodaysEvents';
import { getDashboardOverview } from '../../api';
import { 
    SparklesIcon, PlusIcon, SearchIcon, 
    ChartIcon, RssIcon, BoltIcon, 
    ChevronRightIcon,
    GlobeIcon
} from '../icons';

// --- Visual Components ---

const Greeting: React.FC<{ username: string }> = ({ username }) => {
    const hour = new Date().getHours();
    const greeting = hour < 11 ? '早安' : hour < 13 ? '午安' : hour < 18 ? '下午好' : '晚上好';
    
    return (
        <div className="mb-8 relative z-10">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-800">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 animate-gradient-x">
                    {greeting},
                </span> 
                <br className="md:hidden" />
                <span className="md:ml-4">{username}</span>
            </h1>
            <p className="mt-2 text-slate-500 text-lg font-medium flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                系统全域感知中 · 准备就绪
            </p>
        </div>
    );
};

const StatOrb: React.FC<{ label: string; value: string | number; icon: any; delay: string }> = ({ label, value, icon: Icon, delay }) => (
    <div 
        className={`relative group flex flex-col items-center justify-center p-6 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:scale-105 hover:bg-white/80 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards`}
        style={{ animationDelay: delay }}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-[2.5rem] pointer-events-none"></div>
        <div className="w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center shadow-inner text-indigo-600 group-hover:text-indigo-500 group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-7 h-7" />
        </div>
        <span className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 transition-colors">
            {value}
        </span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</span>
    </div>
);

const ActionCard: React.FC<{ 
    title: string; 
    desc: string; 
    icon: any; 
    color: string; 
    onClick: () => void;
    bgGradient: string;
}> = ({ title, desc, icon: Icon, color, onClick, bgGradient }) => (
    <button 
        onClick={onClick}
        className="group relative w-full text-left p-6 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border border-white/50"
    >
        <div className={`absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${bgGradient}`}></div>
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm opacity-0 group-hover:opacity-20 transition-opacity"></div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className={`w-12 h-12 rounded-2xl bg-white/90 shadow-sm flex items-center justify-center ${color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{desc}</p>
            </div>
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-slate-800">
                <ChevronRightIcon className="w-6 h-6" />
            </div>
        </div>
    </button>
);

// --- Main Dashboard ---

interface DashboardProps {
    user: User;
    subscriptions: Subscription[];
    onNavigate: (view: View) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
    const [overview, setOverview] = useState({
        totalArticles: 0,
        kbTotal: 0,
        avgReliability: 0
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getDashboardOverview();
                setOverview({
                    totalArticles: data.processed_article_count || 0,
                    kbTotal: data.kb_total || 0,
                    avgReliability: data.kb_reliability_avg || 0
                });
            } catch (e) {
                console.error("Failed to load dashboard stats", e);
            }
        };
        loadData();
    }, []);

    return (
        <div className="min-h-full bg-[#f4f7fc] overflow-x-hidden selection:bg-indigo-500/20">
            {/* Animated Background Mesh */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-purple-200/30 rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-20%] w-[60vw] h-[60vw] bg-blue-200/30 rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-indigo-200/30 rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 max-w-[1920px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
                
                <Greeting username={user.username} />

                {/* --- Top Section: Stats & Quick Actions --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
                    
                    {/* Stats Orbs */}
                    <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <StatOrb 
                            label="全网情报" 
                            value={overview.totalArticles.toLocaleString()} 
                            icon={GlobeIcon}
                            delay="0ms"
                        />
                        <StatOrb 
                            label="知识构建" 
                            value={overview.kbTotal.toLocaleString()} 
                            icon={ChartIcon}
                            delay="100ms"
                        />
                        <StatOrb 
                            label="信源质量" 
                            value={overview.avgReliability.toFixed(1)} 
                            icon={BoltIcon}
                            delay="200ms"
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ActionCard 
                            title="AI 报告生成" 
                            desc="一键生成行业深度研报" 
                            icon={SparklesIcon} 
                            color="text-purple-600"
                            bgGradient="from-purple-100/80 to-pink-100/80"
                            onClick={() => onNavigate('ai')}
                        />
                        <ActionCard 
                            title="上传文档" 
                            desc="解析私有PDF构建知识库" 
                            icon={PlusIcon} 
                            color="text-blue-600"
                            bgGradient="from-blue-100/80 to-cyan-100/80"
                            onClick={() => onNavigate('dives')}
                        />
                        <div className="sm:col-span-2">
                             <button 
                                onClick={() => onNavigate('cockpit')}
                                className="w-full h-full min-h-[100px] bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 flex items-center justify-between hover:bg-white/80 transition-all shadow-sm group"
                             >
                                 <div className="flex items-center gap-4">
                                     <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                         <SearchIcon className="w-6 h-6" />
                                     </div>
                                     <div className="text-left">
                                         <h3 className="text-lg font-bold text-slate-800">进入情报驾驶舱</h3>
                                         <p className="text-sm text-slate-500">全景搜索与竞品分析</p>
                                     </div>
                                 </div>
                                 <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/30">
                                     <ChevronRightIcon className="w-5 h-5" />
                                 </div>
                             </button>
                        </div>
                    </div>
                </div>

                {/* --- Middle Section: Subscription Network & Timeline --- */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    
                    {/* Left: Subscription Network (User Request) */}
                    <div className="xl:col-span-2 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-12 duration-700 fill-mode-backwards" style={{ animationDelay: '300ms' }}>
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <RssIcon className="w-6 h-6 text-indigo-500" />
                                订阅源矩阵
                            </h2>
                            <span className="text-sm font-medium text-slate-400 bg-white/50 px-3 py-1 rounded-full backdrop-blur">
                                实时接入管理
                            </span>
                        </div>
                        
                        {/* Integrated Subscription Manager */}
                        <SubscriptionManager />
                    </div>

                    {/* Right: Live Timeline */}
                    <div className="xl:col-span-1 h-full min-h-[500px] animate-in fade-in slide-in-from-bottom-12 duration-700 fill-mode-backwards" style={{ animationDelay: '400ms' }}>
                        <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 p-6 h-full shadow-xl shadow-indigo-900/5 flex flex-col">
                            <TodaysEvents onNavigate={onNavigate} />
                        </div>
                    </div>

                </div>
            </div>
            
            <style>{`
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 8s ease infinite;
                }
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 10s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    );
};