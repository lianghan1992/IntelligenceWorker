
import React, { useState, useEffect, useCallback } from 'react';
import { getSourcesAndPoints, toggleSource, toggleIntelligencePoint, runCrawler, runGenericPoint } from '../../api';
import { SourceWithPoints, CrawlerPoint } from '../../types';
import { 
    ServerIcon, RefreshIcon, PlayIcon, 
    GlobeIcon, ClockIcon, ExternalLinkIcon,
    ChevronDownIcon, ChevronRightIcon,
    StopIcon, LightningBoltIcon
} from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const getTypeBadge = (type: string) => {
    switch (type) {
        case 'manual': return { text: '手动配置', bg: 'bg-blue-100 text-blue-700 border-blue-200' };
        case 'generic': return { text: '通用爬虫', bg: 'bg-purple-100 text-purple-700 border-purple-200' };
        case 'mixed': return { text: '混合模式', bg: 'bg-orange-100 text-orange-700 border-orange-200' };
        default: return { text: type, bg: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
};

const IntelligenceOverview: React.FC = () => {
    const [data, setData] = useState<SourceWithPoints[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
    const [processingSource, setProcessingSource] = useState<string | null>(null);
    const [processingPoint, setProcessingPoint] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSourcesAndPoints();
            setData(res);
            // Default expand all
            setExpandedSources(new Set(res.map(s => s.source_name)));
        } catch (e) {
            console.error("Failed to load overview", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleExpand = (sourceName: string) => {
        setExpandedSources(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sourceName)) newSet.delete(sourceName);
            else newSet.add(sourceName);
            return newSet;
        });
    };

    const handleRunSource = async (e: React.MouseEvent, sourceName: string) => {
        e.stopPropagation();
        if (processingSource) return;
        setProcessingSource(sourceName);
        try {
            await runCrawler(sourceName);
            alert(`已触发 "${sourceName}" 的立即采集任务。`);
        } catch (e: any) {
            alert(`启动失败: ${e.message}`);
        } finally {
            setProcessingSource(null);
        }
    };

    const handleToggleSource = async (e: React.MouseEvent, sourceName: string, enable: boolean) => {
        e.stopPropagation();
        if (processingSource) return;
        setProcessingSource(sourceName);
        try {
            await toggleSource(sourceName, enable);
            // Optimistic update
            setData(prev => prev.map(s => {
                if (s.source_name === sourceName) {
                    return { ...s, points: s.points.map(p => ({ ...p, is_active: enable })) };
                }
                return s;
            }));
        } catch (e: any) {
            alert(`操作失败: ${e.message}`);
        } finally {
            setProcessingSource(null);
        }
    };

    const handleTogglePoint = async (point: CrawlerPoint) => {
        if (processingPoint) return;
        setProcessingPoint(point.id);
        try {
            await toggleIntelligencePoint(point.id, !point.is_active);
            // Optimistic update
            setData(prev => prev.map(s => {
                if (s.source_name === point.source_name) {
                    return {
                        ...s,
                        points: s.points.map(p => p.id === point.id ? { ...p, is_active: !p.is_active } : p)
                    };
                }
                return s;
            }));
        } catch (e: any) {
            alert(`操作失败: ${e.message}`);
        } finally {
            setProcessingPoint(null);
        }
    };

    const handleRunPoint = async (point: CrawlerPoint) => {
        if (processingPoint || point.type !== 'generic') return;
        setProcessingPoint(point.id);
        try {
            await runGenericPoint(point.id);
            alert(`已触发 "${point.point_name}" 的立即采集任务。`);
        } catch (e: any) {
            alert(`启动失败: ${e.message}`);
        } finally {
            setProcessingPoint(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Minimal Header */}
            <div className="px-6 py-3 border-b border-slate-200 bg-white sticky top-0 z-10 flex justify-end items-center shadow-sm">
                <button 
                    onClick={fetchData} 
                    className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm group text-slate-400"
                    title="刷新数据"
                >
                    <RefreshIcon className={`w-4 h-4 group-hover:text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                {isLoading && data.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-slate-400">正在加载数据配置...</p>
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                        <ServerIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>暂无情报源配置</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data.map(source => {
                            const isExpanded = expandedSources.has(source.source_name);
                            const activePointsCount = source.points.filter(p => p.is_active).length;
                            const typeInfo = getTypeBadge(source.source_type);
                            
                            return (
                                <div key={source.source_name} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                                    {/* Source Header */}
                                    <div 
                                        className="px-5 py-4 bg-slate-50/50 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => toggleExpand(source.source_name)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-1 rounded-full transition-transform duration-200 ${isExpanded ? 'rotate-90 bg-slate-200 text-slate-600' : 'text-slate-400'}`}>
                                                <ChevronRightIcon className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-base font-bold text-slate-800">{source.source_name}</h3>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${typeInfo.bg}`}>{typeInfo.text}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                    <span>共 {source.points.length} 个采集点</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span className={activePointsCount > 0 ? 'text-green-600 font-medium' : 'text-slate-400'}>
                                                        {activePointsCount} 运行中
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                            <button 
                                                onClick={(e) => handleRunSource(e, source.source_name)}
                                                disabled={processingSource === source.source_name}
                                                className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                                            >
                                                {processingSource === source.source_name ? <Spinner /> : <PlayIcon className="w-3.5 h-3.5" />}
                                                立即运行
                                            </button>
                                            <div className="h-4 w-px bg-slate-200"></div>
                                            <button 
                                                onClick={(e) => handleToggleSource(e, source.source_name, true)}
                                                className="text-xs font-medium text-slate-500 hover:text-green-600 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                                            >
                                                全开
                                            </button>
                                            <button 
                                                onClick={(e) => handleToggleSource(e, source.source_name, false)}
                                                className="text-xs font-medium text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                            >
                                                全关
                                            </button>
                                        </div>
                                    </div>

                                    {/* Points Table */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                                                    <tr>
                                                        <th className="px-6 py-3 font-medium w-1/4">采集点名称</th>
                                                        <th className="px-6 py-3 font-medium w-1/3">目标 URL</th>
                                                        <th className="px-6 py-3 font-medium w-1/6">频率 (Cron)</th>
                                                        <th className="px-6 py-3 font-medium text-center w-24">状态</th>
                                                        <th className="px-6 py-3 font-medium text-right w-32">操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {source.points.map(point => (
                                                        <tr key={point.id} className="hover:bg-slate-50/80 transition-colors group">
                                                            <td className="px-6 py-3.5">
                                                                <div className="flex items-center gap-2">
                                                                    <GlobeIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                                                    <span className="font-medium text-slate-700">{point.point_name}</span>
                                                                    {point.type === 'generic' && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 rounded border border-purple-100">G</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3.5">
                                                                <a 
                                                                    href={point.point_url} 
                                                                    target="_blank" 
                                                                    rel="noreferrer" 
                                                                    className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors max-w-[300px] truncate"
                                                                    title={point.point_url}
                                                                >
                                                                    <span className="truncate">{point.point_url}</span>
                                                                    <ExternalLinkIcon className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                                                                </a>
                                                            </td>
                                                            <td className="px-6 py-3.5">
                                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-600 font-mono text-xs">
                                                                    <ClockIcon className="w-3 h-3 text-slate-400" />
                                                                    {point.cron_schedule}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3.5 text-center">
                                                                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${point.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                                    {point.is_active ? '运行中' : '已暂停'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3.5 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {/* Run Button (Only for Generic) */}
                                                                    {point.type === 'generic' && (
                                                                        <button 
                                                                            onClick={() => handleRunPoint(point)}
                                                                            disabled={processingPoint === point.id}
                                                                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                                            title="立即采集"
                                                                        >
                                                                            {processingPoint === point.id ? <Spinner /> : <LightningBoltIcon className="w-4 h-4"/>}
                                                                        </button>
                                                                    )}
                                                                    <button 
                                                                        onClick={() => handleTogglePoint(point)}
                                                                        disabled={processingPoint === point.id}
                                                                        className={`p-1.5 rounded-lg transition-colors ${
                                                                            point.is_active 
                                                                                ? 'text-red-500 hover:bg-red-50' 
                                                                                : 'text-green-600 hover:bg-green-50'
                                                                        }`}
                                                                        title={point.is_active ? "暂停" : "启用"}
                                                                    >
                                                                        {processingPoint === point.id ? <Spinner /> : point.is_active ? <StopIcon className="w-4 h-4"/> : <PlayIcon className="w-4 h-4"/>}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export const IntelligenceDashboard: React.FC = () => {
    // Only "Overview" is enabled for now as requested
    const [mainView, setMainView] = useState<'overview'>('overview');

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 pt-4 pb-0 flex-shrink-0 z-10 sticky top-0">
                <div className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setMainView('overview')}
                        className={`
                            pb-3 px-2 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap
                            ${mainView === 'overview' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                        `}
                    >
                        <ServerIcon className={`w-5 h-5 ${mainView === 'overview' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        数据概览
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
                {mainView === 'overview' && <IntelligenceOverview />}
            </div>
        </div>
    );
};
