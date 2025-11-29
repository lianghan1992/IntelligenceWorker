
import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, RssIcon, VideoCameraIcon, ChartIcon, SparklesIcon } from '../icons';
import { searchArticlesFiltered, getTechItems, getDeepInsightTasksStats, getLivestreamTasks } from '../../api';

// --- Animated Number Component ---
const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTimestamp: number | null = null;
        const startValue = displayValue;
        const duration = 1500;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);

            const current = Math.floor(startValue + (value - startValue) * ease);
            setDisplayValue(current);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };

        window.requestAnimationFrame(step);
    }, [value]);

    return <span>{displayValue.toLocaleString()}</span>;
};

const StatCard: React.FC<{ 
    icon: React.ReactNode; 
    title: string; 
    value: number | string; 
    unit?: string;
    description: string; 
    trend?: string;
    gradient: string;
    textColor: string;
    isLoading: boolean;
}> = ({ icon, title, value, unit, description, trend, gradient, textColor, isLoading }) => {
    return (
        <div className={`relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group`}>
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
            
            <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-10 ${textColor} shadow-sm`}>
                        {icon}
                    </div>
                    {trend && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                            {trend}
                        </span>
                    )}
                </div>
                
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                    <div className="flex items-baseline gap-1">
                        <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
                            {isLoading ? (
                                <div className="h-8 w-20 bg-slate-100 rounded animate-pulse"></div>
                            ) : (
                                typeof value === 'number' ? <AnimatedNumber value={value} /> : value
                            )}
                        </div>
                        {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-medium truncate" title={description}>{description}</p>
                </div>
            </div>
        </div>
    );
};

export const DashboardWidgets: React.FC = () => {
    const [stats, setStats] = useState({
        articlesToday: 0,
        kbTotal: 0,
        docsProcessed: 0,
        upcomingEvents: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAllStats = async () => {
            setIsLoading(true);
            try {
                // 并行加载不同微服务的数据
                const now = new Date();
                const todayStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T00:00:00`;

                const [articlesRes, techItems, deepRes, eventsRes] = await Promise.all([
                    // 1. 情报服务：今日文章
                    searchArticlesFiltered({ publish_date_start: todayStart, query_text: '*', limit: 1, page: 1 }).catch(() => ({ total: 0 })),
                    // 2. 竞争力服务：获取技术情报列表并统计数量 (替代旧版 Dashboard API)
                    getTechItems({ limit: 1000 }).catch(() => []),
                    // 3. 深度洞察服务：已处理文档
                    getDeepInsightTasksStats().catch(() => ({ completed: 0 })),
                    // 4. 直播服务：即将开始
                    getLivestreamTasks({ status: 'scheduled', limit: 1 }).catch(() => ({ total: 0 }))
                ]);

                setStats({
                    articlesToday: articlesRes.total || 0,
                    kbTotal: Array.isArray(techItems) ? techItems.length : 0,
                    docsProcessed: deepRes.completed || 0,
                    upcomingEvents: eventsRes.total || 0
                });

            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllStats();
    }, []);
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <StatCard 
                icon={<RssIcon className="w-6 h-6" />}
                title="今日情报"
                value={stats.articlesToday}
                unit="条"
                description="全网实时抓取的新增资讯"
                trend="NEW"
                gradient="from-blue-500 to-indigo-500"
                textColor="text-blue-600"
                isLoading={isLoading}
            />
            <StatCard 
                icon={<ChartIcon className="w-6 h-6" />}
                title="竞争力知识库"
                value={stats.kbTotal}
                unit="项"
                description="AI 结构化提取的技术参数"
                gradient="from-indigo-500 to-purple-500"
                textColor="text-indigo-600"
                isLoading={isLoading}
            />
            <StatCard 
                icon={<DocumentTextIcon className="w-6 h-6" />}
                title="深度洞察"
                value={stats.docsProcessed}
                unit="份"
                description="已完成解析的行业研报"
                gradient="from-purple-500 to-pink-500"
                textColor="text-purple-600"
                isLoading={isLoading}
            />
            <StatCard 
                icon={<VideoCameraIcon className="w-6 h-6" />}
                title="发布会日程"
                value={stats.upcomingEvents}
                unit="场"
                description="即将开始的直播监控任务"
                gradient="from-orange-500 to-red-500"
                textColor="text-orange-600"
                isLoading={isLoading}
            />
        </div>
    );
};
