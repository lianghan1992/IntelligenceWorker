
import React, { useState, useEffect } from 'react';
import { RssIcon, VideoCameraIcon, ChartIcon, DocumentTextIcon, ActivityIcon, LightningIcon, ChipIcon } from '../icons';
import { getDashboardOverview, getDeepInsightTasksStats, getLivestreamTasks, getIntelligenceStats } from '../../api';

// --- Animated Counter ---
const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
    const [display, setDisplay] = useState(0);
    
    useEffect(() => {
        let start = 0;
        const end = value;
        if (start === end) return;

        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out
            
            setDisplay(Math.floor(start + (end - start) * ease));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [value]);

    return <span>{display.toLocaleString()}</span>;
};

// --- Crystal Vital Card ---
const VitalCard: React.FC<{
    title: string;
    value: number;
    label: string;
    icon: React.FC<any>;
    color: 'indigo' | 'purple' | 'blue' | 'emerald';
    trend?: string;
    loading: boolean;
}> = ({ title, value, label, icon: Icon, color, trend, loading }) => {
    
    const theme = {
        indigo: { 
            gradient: 'from-indigo-500 to-violet-500', 
            iconBg: 'bg-indigo-50', 
            iconColor: 'text-indigo-600',
            shadow: 'shadow-indigo-500/10',
            ring: 'ring-indigo-500/20'
        },
        purple: { 
            gradient: 'from-purple-500 to-fuchsia-500', 
            iconBg: 'bg-purple-50', 
            iconColor: 'text-purple-600',
            shadow: 'shadow-purple-500/10',
            ring: 'ring-purple-500/20'
        },
        blue: { 
            gradient: 'from-blue-500 to-cyan-500', 
            iconBg: 'bg-blue-50', 
            iconColor: 'text-blue-600',
            shadow: 'shadow-blue-500/10',
            ring: 'ring-blue-500/20'
        },
        emerald: { 
            gradient: 'from-emerald-500 to-teal-500', 
            iconBg: 'bg-emerald-50', 
            iconColor: 'text-emerald-600',
            shadow: 'shadow-emerald-500/10',
            ring: 'ring-emerald-500/20'
        },
    }[color];

    return (
        <div className={`
            relative overflow-hidden bg-white/60 backdrop-blur-xl rounded-[24px] p-6 
            border border-white/60 shadow-lg ${theme.shadow}
            hover:-translate-y-1 hover:shadow-xl transition-all duration-500 group
        `}>
            {/* Glass Reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-50 pointer-events-none"></div>
            
            {/* Animated Glow Blob */}
            <div className={`
                absolute -right-10 -top-10 w-32 h-32 rounded-full bg-gradient-to-br ${theme.gradient} opacity-10 blur-2xl 
                group-hover:scale-150 group-hover:opacity-20 transition-all duration-700
            `}></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3.5 rounded-2xl ${theme.iconBg} ${theme.iconColor} shadow-inner`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-white/50 shadow-sm backdrop-blur-md">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 tracking-wide">{trend}</span>
                        </div>
                    )}
                </div>
                
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tight drop-shadow-sm">
                        {loading ? (
                            <div className="h-10 w-32 bg-slate-200/50 rounded-lg animate-pulse"></div>
                        ) : (
                            <AnimatedCounter value={value} />
                        )}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mt-2 truncate opacity-80 group-hover:opacity-100 transition-opacity">
                        {label}
                    </p>
                </div>
            </div>
        </div>
    );
};

export const DashboardWidgets: React.FC = () => {
    const [stats, setStats] = useState({
        articlesTotal: 0,
        activeSources: 0,
        kbItems: 0,
        docsProcessed: 0,
        liveTasks: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                // Parallel fetch of fast statistical endpoints (No vector search)
                const [intelRes, kbRes, docRes, liveRes] = await Promise.all([
                    getIntelligenceStats().catch(() => ({ articles: 0, active_points: 0 })),
                    getDashboardOverview().catch(() => ({ kb_total: 0 })),
                    getDeepInsightTasksStats().catch(() => ({ completed: 0 })),
                    getLivestreamTasks({ status: 'recording', limit: 1 }).catch(() => ({ total: 0 })) // Check live count
                ]);

                setStats({
                    articlesTotal: intelRes.articles || 0,
                    activeSources: intelRes.active_points || 0,
                    kbItems: kbRes.kb_total || 0,
                    docsProcessed: docRes.completed || 0,
                    liveTasks: liveRes.total || 0
                });
            } catch (error) {
                console.error("Stats load failed", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <VitalCard 
                title="Intelligence Core"
                value={stats.articlesTotal}
                label={`覆盖 ${stats.activeSources} 个活跃情报源`}
                icon={ActivityIcon}
                color="blue"
                loading={isLoading}
            />
            <VitalCard 
                title="Knowledge Base"
                value={stats.kbItems}
                label="已结构化技术参数与事实"
                icon={ChipIcon}
                color="indigo"
                loading={isLoading}
            />
            <VitalCard 
                title="Deep Insight"
                value={stats.docsProcessed}
                label="已重构行业深度研报 (PDF)"
                icon={DocumentTextIcon}
                color="purple"
                loading={isLoading}
            />
            <VitalCard 
                title="Live Monitor"
                value={stats.liveTasks}
                label="当前正在进行的实时任务"
                icon={LightningIcon}
                color="emerald"
                trend={stats.liveTasks > 0 ? "LIVE" : undefined}
                loading={isLoading}
            />
        </div>
    );
};
