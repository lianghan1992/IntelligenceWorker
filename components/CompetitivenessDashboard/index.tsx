import React, { useState, useMemo, useEffect, ReactNode, useCallback } from 'react';
import { NewTechForecast, CompetitivenessView, CompetitivenessEntity, CompetitivenessModule, BackfillJob, SystemStatus } from '../../types';
import { techDimensions, mockTechForecasts, mockAIAnalyses, mockTechDimensionAnalyses, mockBrandAnalyses } from './data';
import { 
    ChevronDownIcon, UsersIcon, BrainIcon, CloseIcon, PlusIcon, DocumentTextIcon, CheckIcon, 
    ClockIcon, QuestionMarkCircleIcon, SparklesIcon, RefreshIcon, SearchIcon, PencilIcon, TrashIcon,
    ServerIcon, DatabaseIcon, ViewGridIcon, PlayIcon, StopIcon, LightBulbIcon, ChevronLeftIcon, ChevronRightIcon
} from '../icons';
import { getEntities, createEntity, updateEntity, deleteEntity, getModules, createModule, getBackfillJobs, createBackfillJob, startBackfillJob, pauseBackfillJob, getSystemStatus, queryData } from '../../api';

// --- Reusable Components ---
const Spinner: React.FC<{ size?: string }> = ({ size = 'h-8 w-8' }) => (
    <div className="flex justify-center items-center h-full">
        <svg className={`animate-spin text-blue-600 ${size}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const ViewContainer: React.FC<{ title: string; onRefresh?: () => void; isLoading?: boolean; children: ReactNode; rightHeader?: ReactNode }> = ({ title, onRefresh, isLoading, children, rightHeader }) => (
    <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            <div className="flex items-center gap-2">
                {rightHeader}
                {onRefresh && (
                    <button onClick={onRefresh} className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
            {children}
        </div>
    </div>
);

// ===================================================================================
// 1. FORECAST VIEW (Preserved from original Tech Dashboard)
// ===================================================================================

const getStatusChipStyle = (status: 'confirmed' | 'rumored') => {
    return status === 'confirmed'
        ? { text: '已证实', icon: CheckIcon, className: 'text-green-800' }
        : { text: '传闻中', icon: QuestionMarkCircleIcon, className: 'text-amber-800' };
};

const ForecastChip: React.FC<{ forecast: NewTechForecast; onSourceClick: () => void }> = ({ forecast, onSourceClick }) => {
    const statusInfo = getStatusChipStyle(forecast.status);
    const tagBaseStyle = "px-2 py-1 bg-white/60 backdrop-blur-sm border border-black/10 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm";

    return (
        <div className="relative rounded-xl border border-gray-200/80 shadow-sm overflow-hidden bg-slate-200 group transition-all duration-300 hover:shadow-md h-full">
            <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-300 to-blue-600"
                style={{ width: `${forecast.confidence * 100}%` }}
            ></div>
            <div className="relative h-full flex flex-col justify-between p-2.5">
                <p className="font-bold text-gray-900 text-sm leading-tight [text-shadow:0_1px_1px_rgba(255,255,255,0.8)]">
                    {forecast.techName}
                </p>
                <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                         <span className={`${tagBaseStyle} ${statusInfo.className}`}>
                             <statusInfo.icon className="w-3.5 h-3.5" />
                             {statusInfo.text}
                         </span>
                         <div 
                            className={`${tagBaseStyle} text-gray-700`}
                            title={`首次披露: ${forecast.firstDisclosedAt}\n最新更新: ${forecast.lastUpdatedAt}`}
                         >
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>{forecast.lastUpdatedAt}</span>
                        </div>
                    </div>
                    <button 
                        onClick={onSourceClick} 
                        className={`${tagBaseStyle} text-gray-700 hover:bg-white/90 hover:text-blue-600 transition-colors`}
                    >
                        <DocumentTextIcon className="w-3.5 h-3.5"/>
                        <span>信源</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const SourceModal: React.FC<{ forecast: NewTechForecast; onClose: () => void }> = ({ forecast, onClose }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
            <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">情报来源</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><CloseIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-6">
                <p className="text-sm text-gray-600 mb-2">以下信息支撑了对 <strong className="text-gray-800">{forecast.brand} {forecast.model}</strong> 的 <strong className="text-gray-800">"{forecast.techName}"</strong> 技术预测：</p>
                <div className="bg-gray-50 border p-4 rounded-lg">
                    <p className="font-semibold text-gray-800">{forecast.sourceArticle}</p>
                    <a href={forecast.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                        查看原文 &rarr;
                    </a>
                </div>
            </div>
        </div>
    </div>
);

const ForecastView: React.FC = () => {
    const [forecastFilters, setForecastFilters] = useState<Record<string, boolean>>({});
    const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
    const [selectedForecastForSource, setSelectedForecastForSource] = useState<NewTechForecast | null>(null);

    const forecastBrands = useMemo(() => Array.from(new Set(mockTechForecasts.map(f => f.brand))), []);

    const groupedForecasts = useMemo(() => {
        const enabledBrands = Object.entries(forecastFilters).filter(([_, v]) => v).map(([k, _]) => k);
        const filtered = enabledBrands.length > 0 ? mockTechForecasts.filter(f => enabledBrands.includes(f.brand)) : mockTechForecasts;

        return filtered.reduce((acc, forecast) => {
            if (!acc[forecast.brand]) acc[forecast.brand] = {};
            if (!acc[forecast.brand][forecast.model]) acc[forecast.brand][forecast.model] = [];
            acc[forecast.brand][forecast.model].push(forecast);
            return acc;
        }, {} as Record<string, Record<string, NewTechForecast[]>>);
    }, [forecastFilters]);
    
    useEffect(() => {
        const initialFilters: Record<string, boolean> = {};
        forecastBrands.forEach(brand => initialFilters[brand] = true);
        setForecastFilters(initialFilters);
        setExpandedBrands(new Set(forecastBrands));
    }, [forecastBrands]);
    
    const toggleBrandExpansion = (brand: string) => {
        setExpandedBrands(prev => {
            const newSet = new Set(prev);
            if (newSet.has(brand)) newSet.delete(brand); else newSet.add(brand);
            return newSet;
        });
    };

    const handleForecastFilterChange = (brand: string) => {
        setForecastFilters(prev => ({...prev, [brand]: !prev[brand]}));
    };
    
    const handleOpenSourceModal = (forecast: NewTechForecast) => {
        setSelectedForecastForSource(forecast);
        setIsSourceModalOpen(true);
    };

    return (
      <div className="h-full flex flex-col p-6">
        <div className="p-4 bg-white rounded-lg border flex items-center gap-4 mb-4 flex-shrink-0">
            <span className="font-semibold text-sm text-gray-700">筛选车企:</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
                {forecastBrands.map(brand => (
                    <label key={brand} className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={forecastFilters[brand] || false} onChange={() => handleForecastFilterChange(brand)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                        <span className="text-sm text-gray-800">{brand}</span>
                    </label>
                ))}
            </div>
        </div>
        <div className="overflow-auto space-y-4 flex-1">
            <div className="grid grid-cols-[240px_repeat(6,minmax(200px,1fr))] gap-px bg-gray-200 border border-gray-200 sticky top-0 z-10">
                    <div className="p-3 text-left font-semibold text-gray-600 bg-gray-50/80 backdrop-blur-sm">车型</div>
                    {techDimensions.map(dim => <div key={dim.key} className="p-3 text-left font-semibold text-gray-600 bg-gray-50/80 backdrop-blur-sm">{dim.label}</div>)}
            </div>
            {Object.entries(groupedForecasts).map(([brand, models]) => (
                <div key={brand} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                    <button onClick={() => toggleBrandExpansion(brand)} className="w-full flex justify-between items-center p-4 bg-gray-50/50 hover:bg-gray-100/70">
                        <h3 className="font-bold text-lg text-gray-900">{brand}</h3>
                        <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${expandedBrands.has(brand) ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedBrands.has(brand) && (
                        <div>
                            {mockBrandAnalyses[brand] && (
                                <div className="p-4">
                                    <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
                                        <h4 className="font-bold text-base text-slate-800 flex items-center gap-2 mb-2">
                                            <BrainIcon className="w-5 h-5 text-slate-500" />
                                            AI 品牌战略洞察
                                        </h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">{mockBrandAnalyses[brand]}</p>
                                    </div>
                                </div>
                            )}
                            <div className="divide-y divide-gray-100">
                                {Object.entries(models).map(([model, forecasts]) => (
                                    <div key={model} className="grid grid-cols-[240px_repeat(6,minmax(200px,1fr))] items-stretch">
                                        <div className="p-4 border-r border-gray-100 flex flex-col justify-start">
                                            <div className='flex-1'>
                                                <h4 className="font-semibold text-gray-800 text-xl">{model}</h4>
                                                {mockAIAnalyses[model] && (
                                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                        <h5 className="font-semibold text-sm text-blue-800 flex items-center gap-1.5 mb-2">
                                                            <LightBulbIcon className="w-4 h-4 text-blue-500" />
                                                            AI一句话点评
                                                        </h5>
                                                        <p className="text-xs text-blue-700 leading-relaxed">{mockAIAnalyses[model]}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {techDimensions.map(dim => {
                                            const forecastsForCell = forecasts.filter(f => f.techDimensionKey === dim.key);
                                            const dimensionSummary = mockTechDimensionAnalyses[`${brand.toLowerCase()}-${dim.key}`];
                                            return (
                                                <div key={dim.key} className="p-2 border-r border-gray-100 last:border-r-0 h-full">
                                                    <div className="flex flex-col gap-2 h-full">
                                                        {dimensionSummary && (
                                                            <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
                                                                <p className="text-xs text-purple-800 leading-relaxed flex items-start gap-1.5">
                                                                    <SparklesIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-purple-500" />
                                                                    <span>{dimensionSummary}</span>
                                                                </p>
                                                            </div>
                                                        )}
                                                        {forecastsForCell.map(forecast => (
                                                            <ForecastChip key={forecast.id} forecast={forecast} onSourceClick={() => handleOpenSourceModal(forecast)} />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
        {isSourceModalOpen && selectedForecastForSource && (
            <SourceModal 
                forecast={selectedForecastForSource}
                onClose={() => setIsSourceModalOpen(false)}
            />
        )}
      </div>
    );
};

// ===================================================================================
// 2. ENTITY MANAGER VIEW
// ===================================================================================
const EntityManager: React.FC = () => {
    return (
         <ViewContainer title="实体管理">
            <div className="text-center py-20 bg-gray-100 rounded-lg border-2 border-dashed">
                <p className="text-gray-500">实体管理界面正在开发中。</p>
                <p className="text-sm text-gray-400 mt-2">将实现实体的创建、读取、更新和删除功能。</p>
            </div>
        </ViewContainer>
    );
};

// ===================================================================================
// 3. MODULE MANAGER VIEW
// ===================================================================================
const ModuleManager: React.FC = () => {
     return (
         <ViewContainer title="模块管理">
            <div className="text-center py-20 bg-gray-100 rounded-lg border-2 border-dashed">
                <p className="text-gray-500">模块管理界面正在开发中。</p>
                <p className="text-sm text-gray-400 mt-2">将实现分析模块的创建和列表展示。</p>
            </div>
        </ViewContainer>
    );
};

// ===================================================================================
// 4. DATA QUERY VIEW
// ===================================================================================
const DataQueryView: React.FC = () => {
    const [params, setParams] = useState({ data_table: 'cdash_data_technology', entity_types: 'car_brand', limit: 10 });
    const [results, setResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);

    const handleQuery = useCallback(async (newPage = 1) => {
        setIsLoading(true);
        setError('');
        setPage(newPage);
        try {
            const queryBody = {
                entity_types: params.entity_types.split(',').map(s => s.trim()).filter(Boolean),
                data_table: params.data_table
            };
            const queryParams = { 
                limit: params.limit,
                offset: (newPage - 1) * params.limit
            };
            const data = await queryData(queryParams, queryBody);
            setResults(data);
        } catch (e: any) {
            setError(e.message || '查询失败');
        } finally {
            setIsLoading(false);
        }
    }, [params]);

    const headers = useMemo(() => {
        if (results?.data?.length > 0) {
            return Object.keys(results.data[0]);
        }
        return [];
    }, [results]);

    const totalPages = useMemo(() => {
        if (!results || !results.limit) return 1;
        return Math.ceil(results.total / results.limit) || 1;
    }, [results]);

     return (
        <ViewContainer title="数据查询">
            <div className="space-y-4 p-4 bg-white rounded-lg border mb-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">数据表</label>
                    <input value={params.data_table} onChange={e => setParams({...params, data_table: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">实体类型 (逗号分隔)</label>
                    <input value={params.entity_types} onChange={e => setParams({...params, entity_types: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">数量限制</label>
                    <input value={params.limit} onChange={e => setParams({...params, limit: Number(e.target.value)})} type="number" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3" />
                </div>
                <button onClick={() => handleQuery(1)} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg disabled:bg-blue-300">
                    {isLoading ? '查询中...' : '查询'}
                </button>
            </div>

            <div className="flex-1 bg-white rounded-lg border overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    {isLoading ? <Spinner /> 
                    : error ? <div className="p-4 text-red-600">错误: {error}</div>
                    : !results || results.data.length === 0 ? <div className="p-4 text-gray-500">查询结果将显示在这里。</div>
                    : (
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                <tr>
                                    {headers.map(header => (
                                        <th key={header} scope="col" className="px-6 py-3">{header.replace(/_/g, ' ')}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.data.map((item: any) => (
                                    <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                        {headers.map(header => (
                                            <td key={header} className="px-6 py-4 max-w-xs truncate" title={String(item[header])}>
                                                {item[header] === null ? <span className="text-gray-400">null</span> : String(item[header])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {results && results.total > 0 && (
                     <div className="flex-shrink-0 p-3 border-t border-gray-200 flex justify-between items-center text-sm">
                        <span className="text-gray-600 font-medium">共 {results.total} 条</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleQuery(page - 1)} disabled={page <= 1 || isLoading} className="p-1.5 rounded-md border bg-white hover:bg-gray-50 disabled:opacity-50">
                                <ChevronLeftIcon className="w-4 h-4 text-gray-600"/>
                            </button>
                            <span className="text-gray-600">
                                第 {page} / {totalPages} 页
                            </span>
                            <button onClick={() => handleQuery(page + 1)} disabled={page >= totalPages || isLoading} className="p-1.5 rounded-md border bg-white hover:bg-gray-50 disabled:opacity-50">
                                <ChevronRightIcon className="w-4 h-4 text-gray-600"/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </ViewContainer>
    );
};

// ===================================================================================
// 5. BACKFILL JOBS MANAGER VIEW
// ===================================================================================
const BackfillJobsManager: React.FC = () => {
    return (
         <ViewContainer title="回溯任务管理">
            <div className="text-center py-20 bg-gray-100 rounded-lg border-2 border-dashed">
                <p className="text-gray-500">回溯任务管理界面正在开发中。</p>
                <p className="text-sm text-gray-400 mt-2">将实现回溯任务的创建、启动、暂停和状态监控。</p>
            </div>
        </ViewContainer>
    );
};

// ===================================================================================
// 6. SYSTEM STATUS VIEW
// ===================================================================================
const SystemStatusView: React.FC = () => {
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const statusRes = await getSystemStatus();
            setStatus(statusRes);
        } catch (error: any) {
            setError(error.message || '获取系统状态失败');
            console.error("Failed to fetch system status", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [fetchData]);

    const getStatusIndicator = (s: string) => {
        const lower = s.toLowerCase();
        if (lower === 'healthy' || lower === 'connected') return 'bg-green-500';
        return 'bg-red-500';
    }
    
    return (
         <ViewContainer title="系统状态" onRefresh={fetchData} isLoading={isLoading}>
            {isLoading && !status ? <Spinner /> : error ? (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
            ) : status ? (
                <div className="bg-white p-6 rounded-lg border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                    {Object.entries(status).map(([key, value]) => (
                        <div key={key}>
                            <p className="text-sm font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                            <div className="flex items-center gap-2 mt-1">
                                { (key === 'status' || key === 'database_status') && (
                                    <span className={`w-2.5 h-2.5 rounded-full ${getStatusIndicator(String(value))}`}></span>
                                )}
                                <p className="text-lg font-semibold text-gray-800">{String(value)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : <p>未能加载系统状态。</p>}
        </ViewContainer>
    );
};

// ===================================================================================
// MAIN COMPONENT & NAVIGATION
// ===================================================================================

export const CompetitivenessDashboard: React.FC = () => {
    const [subView, setSubView] = useState<CompetitivenessView>('forecast');

    const navItems: { view: CompetitivenessView; label: string; icon: React.FC<any> }[] = [
        { view: 'forecast', label: '新技术预测', icon: BrainIcon },
        { view: 'entities', label: '实体管理', icon: UsersIcon },
        { view: 'modules', label: '模块管理', icon: ViewGridIcon },
        { view: 'data_query', label: '数据查询', icon: DatabaseIcon },
        { view: 'backfill_jobs', label: '回溯任务', icon: RefreshIcon },
        { view: 'system_status', label: '系统状态', icon: ServerIcon },
    ];

    const renderSubView = () => {
        switch (subView) {
            case 'forecast': return <ForecastView />;
            case 'entities': return <EntityManager />;
            case 'modules': return <ModuleManager />;
            case 'data_query': return <DataQueryView />;
            case 'backfill_jobs': return <BackfillJobsManager />;
            case 'system_status': return <SystemStatusView />;
            default: return <ForecastView />;
        }
    }

    return (
        <div className="h-full flex bg-gray-50/50">
            <aside className="w-56 bg-white border-r flex-shrink-0">
                <nav className="p-2 mt-4 space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.view}
                            onClick={() => setSubView(item.view)}
                            className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                subView === item.view
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 overflow-hidden flex flex-col">
                {renderSubView()}
            </main>
        </div>
    );
};