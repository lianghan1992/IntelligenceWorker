
import React, { useState, useEffect, useCallback } from 'react';
import { getIntelligenceStats } from '../../api';
import { RefreshIcon, ServerIcon, DatabaseIcon, RssIcon, ViewGridIcon, ClockIcon, CheckCircleIcon } from '../icons';

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string; description: string }> = ({ title, value, icon, color, description }) => (
    <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 transition-all hover:shadow-md hover:border-indigo-100 group">
        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center text-white shadow-md transform group-hover:scale-110 transition-transform ${color} flex-shrink-0`}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{title}</p>
            <p className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight truncate">{value.toLocaleString()}</p>
            <p className="text-[10px] lg:text-xs text-slate-400 mt-1 font-medium truncate">{description}</p>
        </div>
    </div>
);

export const IntelligenceStats: React.FC<{ compact?: boolean }> = ({ compact }) => {
    const [stats, setStats] = useState<{ 
        sources: number; 
        points: number; 
        active_points: number; 
        articles: number; 
        vectors: number; 
        schedules_active: number 
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getIntelligenceStats();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取统计数据失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, [loadStats]);

    if (isLoading && !stats) {
        return (
            <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-red-500 bg-red-50 rounded-xl border border-red-100 text-center text-sm">{error}</div>;
    }

    return (
        <div className="w-full">
            {!compact && (
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">系统健康看板</h2>
                    </div>
                    <button 
                        onClick={loadStats} 
                        className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                        title="刷新数据"
                    >
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            )}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
                    <StatCard 
                        title="情报源" 
                        value={stats.sources} 
                        icon={<ServerIcon className="w-5 h-5" />} 
                        color="bg-gradient-to-br from-indigo-500 to-indigo-600" 
                        description="接入站点"
                    />
                    <StatCard 
                        title="活跃探针" 
                        value={stats.active_points} 
                        icon={<RssIcon className="w-5 h-5" />} 
                        color="bg-gradient-to-br from-blue-500 to-blue-600" 
                        description={`总计 ${stats.points}`}
                    />
                    <StatCard 
                        title="文章库" 
                        value={stats.articles} 
                        icon={<DatabaseIcon className="w-5 h-5" />} 
                        color="bg-gradient-to-br from-purple-500 to-purple-600" 
                        description="有效入库"
                    />
                    <StatCard 
                        title="向量索引" 
                        value={stats.vectors} 
                        icon={<ViewGridIcon className="w-5 h-5" />} 
                        color="bg-gradient-to-br from-orange-500 to-orange-600" 
                        description="语义分段"
                    />
                    <StatCard 
                        title="调度器" 
                        value={stats.schedules_active} 
                        icon={<ClockIcon className="w-5 h-5" />} 
                        color="bg-gradient-to-br from-emerald-500 to-emerald-600" 
                        description="运行中作业"
                    />
                    <StatCard 
                        title="健康度" 
                        value={100} 
                        icon={<CheckCircleIcon className="w-5 h-5" />} 
                        color="bg-slate-700" 
                        description="服务正常"
                    />
                </div>
            )}
        </div>
    );
};
