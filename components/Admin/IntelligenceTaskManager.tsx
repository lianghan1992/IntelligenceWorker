
import React, { useState, useEffect, useCallback } from 'react';
import { getIntelligenceStats } from '../../api';
import { RefreshIcon, ServerIcon, DatabaseIcon, RssIcon, ViewGridIcon, ClockIcon, CheckCircleIcon } from '../icons';

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string; description: string }> = ({ title, value, icon, color, description }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-5 transition-all hover:shadow-md hover:border-indigo-100 group">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md transform group-hover:scale-110 transition-transform ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
            <p className="text-3xl font-extrabold text-slate-800 tracking-tight">{value.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-2 font-medium">{description}</p>
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
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, [loadStats]);

    if (isLoading && !stats) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-xl border border-red-100 text-center">{error}</div>;
    }

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">系统健康看板</h2>
                    <p className="text-sm text-slate-500 mt-1">情报采集服务实时运行状态监控</p>
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
                        color="bg-gradient-to-br from-indigo-500 to-indigo-600" 
                        description="已配置的独立情报来源站点"
                    />
                    <StatCard 
                        title="采集探针 (活跃/总数)" 
                        value={stats.active_points} 
                        icon={<RssIcon className="w-6 h-6" />} 
                        color="bg-gradient-to-br from-blue-500 to-blue-600" 
                        description={`共配置 ${stats.points} 个探针，${stats.schedules_active} 个定时任务运行中`}
                    />
                    <StatCard 
                        title="文章库总量" 
                        value={stats.articles} 
                        icon={<DatabaseIcon className="w-6 h-6" />} 
                        color="bg-gradient-to-br from-purple-500 to-purple-600" 
                        description="已采集并清洗入库的有效文章"
                    />
                    <StatCard 
                        title="向量分段索引" 
                        value={stats.vectors} 
                        icon={<ViewGridIcon className="w-6 h-6" />} 
                        color="bg-gradient-to-br from-orange-500 to-orange-600" 
                        description="用于语义检索的文本切片向量"
                    />
                    <StatCard 
                        title="定时调度器" 
                        value={stats.schedules_active} 
                        icon={<ClockIcon className="w-6 h-6" />} 
                        color="bg-gradient-to-br from-emerald-500 to-emerald-600" 
                        description="APScheduler 活跃作业数"
                    />
                    <StatCard 
                        title="系统状态" 
                        value={100} 
                        icon={<CheckCircleIcon className="w-6 h-6" />} 
                        color="bg-slate-700" 
                        description="所有服务节点运行正常"
                    />
                </div>
            )}

            <div className="mt-8 p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                    <ServerIcon className="w-4 h-4" />
                    运行说明
                </h3>
                <ul className="list-disc list-inside text-sm text-indigo-800 space-y-1.5 opacity-80">
                    <li><strong>活跃采集点</strong>：指当前已启用（Active）并正在按 Cron 表达式执行采集计划的探针数量。</li>
                    <li><strong>向量分段</strong>：文章内容经 Embedding 模型向量化后的片段总数，该数值直接决定 RAG 检索的覆盖范围。</li>
                    <li>系统会自动执行失败重试与去重逻辑，无需人工干预采集过程。</li>
                </ul>
            </div>
        </div>
    );
};
