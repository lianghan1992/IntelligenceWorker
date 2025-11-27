
import React, { useState, useEffect } from 'react';
import { RssIcon, VideoCameraIcon, ChartIcon, DocumentTextIcon, ServerIcon } from '../icons';
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

// --- Vital Card ---
const VitalCard: React.FC<{
    title: string;
    value: number;
    label: string;
    icon: React.FC<any>;
    color: 'blue' | 'purple' | 'indigo' | 'emerald';
    trend?: string;
    loading: boolean;
}> = ({ title, value, label, icon: Icon, color, trend, loading }) => {
    
    const theme = {
        blue: { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50', border: 'border-blue-100' },
        purple: { bg: 'bg-purple-500', text: 'text-purple-500', light: 'bg-purple-50', border: 'border-purple-100' },
        indigo: { bg: 'bg-indigo-500', text: 'text-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-100' },
        emerald: { bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-100' },
    }[color];

    return (
        <div className="relative overflow-hidden bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 group">
            {/* Background decoration */}
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-5 group-hover:scale-110 transition-transform duration-500 ${theme.bg}`}></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${theme.light} ${theme.text}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {trend && (
                        <span className="px-2 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            {trend}
                        </span>
                    )}
                </div>
                
                <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                        {loading ? <span className="animate-pulse bg-slate-200 rounded h-8 w-24 block"></span> : <AnimatedCounter value={value} />}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{label}</p>
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
                title="情报总库"
                value={stats.articlesTotal}
                label={`来自 ${stats.activeSources} 个活跃采集点`}
                icon={RssIcon}
                color="blue"
                loading={isLoading}
            />
            <VitalCard 
                title="核心知识库"
                value={stats.kbItems}
                label="结构化技术参数与事实"
                icon={ChartIcon}
                color="indigo"
                loading={isLoading}
            />
            <VitalCard 
                title="深度洞察"
                value={stats.docsProcessed}
                label="已解析行业研报 (PDF)"
                icon={DocumentTextIcon}
                color="purple"
                loading={isLoading}
            />
            <VitalCard 
                title="实时监控"
                value={stats.liveTasks}
                label="当前正在进行的直播任务"
                icon={VideoCameraIcon}
                color="emerald"
                trend={stats.liveTasks > 0 ? "ACTIVE" : undefined}
                loading={isLoading}
            />
        </div>
    );
};
