
import React, { useState, useEffect, useCallback } from 'react';
import { getIntelligenceStats } from '../../api';
import { RefreshIcon, ServerIcon, DatabaseIcon, RssIcon, ViewGridIcon, ClockIcon, CheckCircleIcon } from '../icons';

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</p>
        </div>
    </div>
);

export const IntelligenceStats: React.FC = () => {
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
        // Auto refresh every 30 seconds
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, [loadStats]);

    if (isLoading && !stats) {
        return <div className="flex justify-center items-center h-full text-slate-400">正在加载系统状态...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-xl border border-red-100 text-center">{error}</div>;
    }

    return (
        <div className="h-full flex flex-col max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">系统健康看板</h2>
                    <p className="text-sm text-slate-500 mt-1">情报采集服务实时运行状态</p>
                </div>
                <button 
                    onClick={loadStats} 
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"
                >
                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    刷新数据
                </button>
            </div>

            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard 
                        title="接入情报源" 
                        value={stats.sources} 
                        icon={<ServerIcon className="w-6 h-6" />} 
                        color="bg-indigo-500" 
                    />
                    <StatCard 
                        title="活跃采集点" 
                        value={stats.active_points} 
                        icon={<RssIcon className="w-6 h-6" />} 
                        color="bg-blue-500" 
                    />
                    <StatCard 
                        title="定时任务运行中" 
                        value={stats.schedules_active} 
                        icon={<ClockIcon className="w-6 h-6" />} 
                        color="bg-emerald-500" 
                    />
                    <StatCard 
                        title="已采集文章总数" 
                        value={stats.articles} 
                        icon={<DatabaseIcon className="w-6 h-6" />} 
                        color="bg-purple-500" 
                    />
                    <StatCard 
                        title="向量索引分段" 
                        value={stats.vectors} 
                        icon={<ViewGridIcon className="w-6 h-6" />} 
                        color="bg-orange-500" 
                    />
                    <StatCard 
                        title="总配置采集点" 
                        value={stats.points} 
                        icon={<CheckCircleIcon className="w-6 h-6" />} 
                        color="bg-slate-500" 
                    />
                </div>
            )}

            <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="font-bold text-blue-800 mb-2">系统运行说明</h3>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                    <li><strong>活跃采集点</strong>：当前已启用并正在按计划执行采集的任务数量。</li>
                    <li><strong>向量索引分段</strong>：已完成嵌入并存入向量数据库的文本片段数量，直接影响语义搜索的效果。</li>
                    <li>系统会自动重试失败的采集任务，无需人工干预。</li>
                </ul>
            </div>
        </div>
    );
};
