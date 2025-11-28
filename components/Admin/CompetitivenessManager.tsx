
import React, { useState, useEffect, useCallback } from 'react';
import { 
    getCompetitivenessStatus, toggleCompetitivenessService,
    getDimensions, addDimension, getBrands, addBrand,
    batchUpdateSecondaryDimension, analyzeArticleStage1
} from '../../api/competitiveness';
import { CompetitivenessStatus, TechAnalysisTask } from '../../types';
import { 
    ServerIcon, CheckCircleIcon, ShieldExclamationIcon, RefreshIcon, 
    PlayIcon, StopIcon, ViewGridIcon, TagIcon, PlusIcon, SparklesIcon,
    FunnelIcon, ChartIcon, ChevronRightIcon
} from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Sub-View: System Status & Control ---
const StatusControlPanel: React.FC = () => {
    const [status, setStatus] = useState<CompetitivenessStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    const fetchStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getCompetitivenessStatus();
            setStatus(res);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleToggle = async (enable: boolean) => {
        setIsToggling(true);
        try {
            const res = await toggleCompetitivenessService(enable);
            setStatus(prev => prev ? { ...prev, enabled: res.enabled } : null);
        } catch (error) {
            alert('操作失败');
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">服务运行状态</h3>
                <button onClick={fetchStatus} className="p-2 text-gray-500 hover:text-indigo-600 bg-white border rounded-lg shadow-sm">
                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main Switch Card */}
                <div className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-4 transition-all ${status?.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`p-3 rounded-full ${status?.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                        <ServerIcon className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                        <div className="text-sm font-medium text-gray-500">服务总开关</div>
                        <div className={`text-xl font-bold ${status?.enabled ? 'text-green-700' : 'text-gray-700'}`}>
                            {status?.enabled ? '已启用 (Running)' : '已禁用 (Stopped)'}
                        </div>
                    </div>
                    <button 
                        onClick={() => handleToggle(!status?.enabled)}
                        disabled={isToggling || !status}
                        className={`px-6 py-2 rounded-lg font-bold text-white shadow-md transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${status?.enabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isToggling ? <Spinner /> : (status?.enabled ? <StopIcon className="w-4 h-4"/> : <PlayIcon className="w-4 h-4"/>)}
                        {status?.enabled ? '停止服务' : '启动服务'}
                    </button>
                </div>

                {/* Worker Status */}
                <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">后台 Worker</div>
                        <div className="flex items-center gap-2">
                            {status?.worker_enabled ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            ) : (
                                <ShieldExclamationIcon className="w-5 h-5 text-yellow-500" />
                            )}
                            <span className="text-lg font-semibold text-gray-800">{status?.worker_enabled ? '正常工作' : '未就绪'}</span>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-4">
                        负责异步处理文章提取任务。
                    </div>
                </div>

                {/* LLM Provider */}
                <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">LLM 引擎</div>
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-purple-500" />
                            <span className="text-lg font-semibold text-gray-800 uppercase">{status?.llm_provider || 'Unknown'}</span>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-4">
                        当前使用的 AI 模型服务提供商。
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-View: Metadata Management ---
const MetadataManager: React.FC = () => {
    const [dimensions, setDimensions] = useState<string[]>([]);
    const [brands, setBrands] = useState<string[]>([]);
    const [newDimension, setNewDimension] = useState('');
    const [newBrand, setNewBrand] = useState('');
    const [loading, setLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [d, b] = await Promise.all([getDimensions(), getBrands()]);
            setDimensions(d);
            setBrands(b);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddDimension = async () => {
        if (!newDimension.trim()) return;
        try {
            await addDimension(newDimension.trim());
            setNewDimension('');
            loadData();
        } catch (e) {
            alert('添加失败');
        }
    };

    const handleAddBrand = async () => {
        if (!newBrand.trim()) return;
        try {
            await addBrand(newBrand.trim());
            setNewBrand('');
            loadData();
        } catch (e) {
            alert('添加失败');
        }
    };

    return (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 h-full overflow-hidden">
            {/* Dimensions Column */}
            <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <ViewGridIcon className="w-5 h-5 text-indigo-600" />
                        一级技术维度 ({dimensions.length})
                    </h3>
                    <button onClick={loadData} className="p-1 hover:bg-gray-200 rounded"><RefreshIcon className="w-4 h-4 text-gray-500"/></button>
                </div>
                <div className="p-4 border-b bg-white">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newDimension} 
                            onChange={e => setNewDimension(e.target.value)} 
                            placeholder="输入新维度名称..."
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button onClick={handleAddDimension} disabled={!newDimension.trim()} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? <div className="text-center py-4 text-gray-400">加载中...</div> : (
                        <div className="flex flex-wrap gap-2">
                            {dimensions.map(d => (
                                <span key={d} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm border border-indigo-100 font-medium">
                                    {d}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Brands Column */}
            <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <TagIcon className="w-5 h-5 text-blue-600" />
                        车企品牌库 ({brands.length})
                    </h3>
                    <button onClick={loadData} className="p-1 hover:bg-gray-200 rounded"><RefreshIcon className="w-4 h-4 text-gray-500"/></button>
                </div>
                <div className="p-4 border-b bg-white">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newBrand} 
                            onChange={e => setNewBrand(e.target.value)} 
                            placeholder="输入新品牌名称..."
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button onClick={handleAddBrand} disabled={!newBrand.trim()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? <div className="text-center py-4 text-gray-400">加载中...</div> : (
                        <div className="flex flex-wrap gap-2">
                            {brands.map(b => (
                                <span key={b} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-100 font-medium">
                                    {b}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Sub-View: Data Cleaning ---
const DataCleaner: React.FC = () => {
    const [form, setForm] = useState({ old_name: '', new_name: '', tech_dimension: '' });
    const [dimensions, setDimensions] = useState<string[]>([]);
    const [result, setResult] = useState<{ message: string, updated_count: number } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getDimensions().then(setDimensions).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        try {
            const res = await batchUpdateSecondaryDimension({
                old_name: form.old_name,
                new_name: form.new_name,
                tech_dimension: form.tech_dimension || undefined
            });
            setResult(res);
            setForm({ old_name: '', new_name: '', tech_dimension: '' }); // Reset on success
        } catch (error: any) {
            alert('更新失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-amber-50/50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FunnelIcon className="w-5 h-5 text-amber-600" />
                        子维度清洗工具
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">用于将 LLM 提取的非标准子维度名称（如“激光雷达系统”）批量归一化为标准名称（如“LiDAR”）。</p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">旧名称 (Old Name)</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="例如：激光雷达系统"
                            value={form.old_name}
                            onChange={e => setForm({...form, old_name: e.target.value})}
                        />
                    </div>
                    <div className="flex justify-center">
                        <ChevronRightIcon className="w-6 h-6 text-gray-400 rotate-90 md:rotate-0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">新名称 (New Name)</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="例如：LiDAR"
                            value={form.new_name}
                            onChange={e => setForm({...form, new_name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">限定一级维度 (可选)</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                            value={form.tech_dimension}
                            onChange={e => setForm({...form, tech_dimension: e.target.value})}
                        >
                            <option value="">全部维度</option>
                            {dimensions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !form.old_name || !form.new_name}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 mt-4"
                    >
                        {loading ? '处理中...' : '执行批量更新'}
                    </button>
                </form>

                {result && (
                    <div className="p-4 bg-green-50 text-green-700 border-t border-green-100 flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>{result.message} (影响 {result.updated_count} 条记录)</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Sub-View: Analysis Debugger ---
const AnalysisDebugger: React.FC = () => {
    const [input, setInput] = useState({
        article_id: '',
        title: '',
        content: ''
    });
    const [result, setResult] = useState<TechAnalysisTask[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        if (!input.article_id && !input.content) {
            setError('请至少提供 Article ID 或 Content');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            // If only ID is provided, backend will likely fetch content from DB. 
            // If content is provided, backend uses it directly.
            const res = await analyzeArticleStage1(input);
            setResult(res);
        } catch (e: any) {
            setError(e.message || '分析请求失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-600" />
                    Stage 1 分析调试
                </h3>
                <p className="text-sm text-gray-500 mt-1">手动触发 LLM 提取，验证文章解析逻辑与 Prompt 效果。</p>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                {/* Input Panel */}
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Article ID (UUID)</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                            placeholder="Optional if content is provided"
                            value={input.article_id}
                            onChange={e => setInput({...input, article_id: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Article Title</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="文章标题"
                            value={input.title}
                            onChange={e => setInput({...input, title: e.target.value})}
                        />
                    </div>
                    <div className="flex-1 flex flex-col">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Article Content</label>
                        <textarea 
                            className="flex-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono resize-none focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="在此粘贴文章全文进行测试..."
                            value={input.content}
                            onChange={e => setInput({...input, content: e.target.value})}
                        ></textarea>
                    </div>
                    <button 
                        onClick={handleAnalyze} 
                        disabled={loading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50"
                    >
                        {loading ? 'AI 分析中...' : '运行 Stage 1 提取'}
                    </button>
                </div>

                {/* Output Panel */}
                <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 p-4 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-2 text-gray-400 text-xs uppercase font-bold tracking-wider">
                        <span>Analysis Result (JSON)</span>
                        {result && <span className="text-green-400">{result.length} Items Found</span>}
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar bg-black/50 rounded-lg p-2">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-purple-400 animate-pulse">Processing...</div>
                        ) : error ? (
                            <div className="text-red-400 font-mono text-sm">{error}</div>
                        ) : result ? (
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        ) : (
                            <div className="text-gray-600 font-mono text-xs text-center mt-20">Waiting for input...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Layout ---
export const CompetitivenessManager: React.FC = () => {
    const [tab, setTab] = useState<'status' | 'meta' | 'cleaning' | 'debug'>('status');

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header Tabs */}
            <div className="bg-white border-b px-6 pt-6 pb-0 flex-shrink-0">
                <h1 className="text-2xl font-extrabold text-slate-800 mb-6">竞争力中台管理</h1>
                <div className="flex gap-8 overflow-x-auto">
                    {[
                        { id: 'status', label: '服务监控', icon: ChartIcon },
                        { id: 'meta', label: '元数据管理', icon: ViewGridIcon },
                        { id: 'cleaning', label: '数据清洗', icon: FunnelIcon },
                        { id: 'debug', label: '分析调试', icon: SparklesIcon },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id as any)}
                            className={`pb-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
                                tab === item.id 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden relative">
                {tab === 'status' && <StatusControlPanel />}
                {tab === 'meta' && <MetadataManager />}
                {tab === 'cleaning' && <DataCleaner />}
                {tab === 'debug' && <AnalysisDebugger />}
            </div>
        </div>
    );
};
