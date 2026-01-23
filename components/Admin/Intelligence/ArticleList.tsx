import React, { useState, useEffect, useCallback } from 'react';
import { SpiderArticle, SpiderSource, SpiderPoint } from '../../../types';
import { 
    getSpiderArticles, 
    deleteSpiderArticle, 
    generateArticleHtml, 
    getArticleHtml, 
    downloadArticlePdf,
    triggerAnalysis,
    getSpiderSources, 
    getSpiderPoints,
    exportArticles,
    batchDeleteArticles,
    startBackgroundBatchHtmlGeneration
} from '../../../api/intelligence';
// Added missing ShieldExclamationIcon to the import list below
import { RefreshIcon, DocumentTextIcon, SparklesIcon, EyeIcon, CloseIcon, TrashIcon, PlayIcon, LightningBoltIcon, FilterIcon, DownloadIcon, CalendarIcon, ServerIcon, ShieldExclamationIcon } from '../../icons';
import { ArticleDetailModal } from './ArticleDetailModal';
import { ConfirmationModal } from '../ConfirmationModal';
import { BatchSearchExportModal } from './BatchSearchExportModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const WhiteSpinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const formatBeijingTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
};

const HtmlViewerModal: React.FC<{ articleId: string; onClose: () => void }> = ({ articleId, onClose }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!articleId) return;
        const fetchHtml = async () => {
            setIsLoading(true);
            try {
                const res = await getArticleHtml(articleId);
                setHtmlContent(res.html_content);
            } catch (err: any) {
                const msg = err.message || String(err);
                setError(msg || '获取HTML失败');
            } finally {
                setIsLoading(false);
            }
        };
        fetchHtml();
    }, [articleId]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-indigo-600"/> HTML  预览
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <div className="flex-1 bg-white relative overflow-hidden">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center"><Spinner /></div>
                    ) : error ? (
                        <div className="absolute inset-0 flex items-center justify-center text-red-500">{error}</div>
                    ) : (
                        <iframe 
                            srcDoc={htmlContent || ''} 
                            className="w-full h-full border-none" 
                            title="HTML Preview"
                            sandbox="allow-scripts allow-same-origin"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// Export Options Modal
const ExportOptionsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (compressToken: number) => void;
    isExporting: boolean;
}> = ({ isOpen, onClose, onConfirm, isExporting }) => {
    const [enableCompression, setEnableCompression] = useState(false);
    const [tokenLimit, setTokenLimit] = useState(800000);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <DownloadIcon className="w-5 h-5 text-indigo-600" />
                    导出文章数据
                </h3>
                
                <div className="space-y-4 mb-6">
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        将导出当前筛选条件下的所有文章为 CSV 文件。
                    </p>

                    <div className="border rounded-xl p-4 transition-colors border-slate-200">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                checked={enableCompression} 
                                onChange={e => setEnableCompression(e.target.checked)}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                            />
                            <span className="font-bold text-slate-700 text-sm">启用 LLM 智能压缩</span>
                        </label>
                        
                        {enableCompression && (
                            <div className="mt-3 pl-8 animate-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">目标 Token 上限</label>
                                <input 
                                    type="number" 
                                    value={tokenLimit}
                                    onChange={e => setTokenLimit(Number(e.target.value))}
                                    step={10000}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                />
                                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                    系统将优先保留短文章原文，对长文章进行智能摘要，确保总导出内容不超过此限制，适合直接作为 LLM 上下文使用。
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} disabled={isExporting} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors">取消</button>
                    <button 
                        onClick={() => onConfirm(enableCompression ? tokenLimit : 0)}
                        disabled={isExporting}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2"
                    >
                        {isExporting ? <WhiteSpinner /> : <DownloadIcon className="w-4 h-4" />}
                        {isExporting ? '处理中...' : '开始导出'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Generation Config Modal ---
const GenerationConfigModal: React.FC<{
    isOpen: boolean;
    mode: 'single' | 'batch_selected' | 'background_fill';
    onClose: () => void;
    onConfirm: (config: { provider: string }) => void;
    selectedCount?: number;
}> = ({ isOpen, mode, onClose, onConfirm, selectedCount }) => {
    const [provider, setProvider] = useState('zhipuai');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        setIsLoading(true);
        setTimeout(() => {
            onConfirm({ provider });
            setIsLoading(false);
        }, 100);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-indigo-600" />
                    {mode === 'single' ? '单篇强制重生成 HTML' : mode === 'batch_selected' ? `批量强制重生成 (${selectedCount} 篇)` : '强制重生成所有 HTML'}
                </h3>
                
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">模型提供商 (Provider)</label>
                        <select 
                            value={provider}
                            onChange={e => setProvider(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="zhipuai">智谱 AI (推荐)</option>
                            <option value="siliconflow">SiliconFlow (硅基流动)</option>
                            <option value="openrouter">OpenRouter (海外聚合)</option>
                        </select>
                    </div>
                    
                    <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-100 flex items-start gap-2 leading-relaxed">
                        <ShieldExclamationIcon className="w-4 h-4 shrink-0 mt-0.5" />
                        <span><strong>注意：</strong>此操作将强制重新生成选定内容的 HTML 排版，即使之前已经生成过。这会消耗对应模型的 Token 额度。</span>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} disabled={isLoading} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors">取消</button>
                    <button 
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2"
                    >
                        {isLoading ? <WhiteSpinner /> : <PlayIcon className="w-4 h-4" />}
                        确认启动
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ArticleList: React.FC = () => {
    const [articles, setArticles] = useState<SpiderArticle[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedArticleUuid, setSelectedArticleUuid] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Metadata for Filters
    const [sources, setSources] = useState<SpiderSource[]>([]);
    const [points, setPoints] = useState<SpiderPoint[]>([]);

    // Filter State
    const [filterSource, setFilterSource] = useState('');
    const [filterPoint, setFilterPoint] = useState('');
    const [filterAtomized, setFilterAtomized] = useState(''); // '' | 'true' | 'false'
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    
    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);
    
    // Batch Search Export Modal
    const [isBatchExportModalOpen, setIsBatchExportModalOpen] = useState(false);
    // Export Options Modal
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // Generation Modal
    const [genModalState, setGenModalState] = useState<{ isOpen: boolean; mode: 'single' | 'batch_selected' | 'background_fill'; article?: SpiderArticle }>({ isOpen: false, mode: 'single' });

    // HTML Generation State
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [viewingHtmlId, setViewingHtmlId] = useState<string | null>(null);
    const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);

    // Load Metadata
    useEffect(() => {
        getSpiderSources().then(res => setSources(res.items)).catch(console.error);
    }, []);

    useEffect(() => {
        if (filterSource) {
            getSpiderPoints(filterSource).then(setPoints).catch(console.error);
        } else {
            setPoints([]);
        }
        // Reset point filter if source changes
        setFilterPoint('');
    }, [filterSource]);

    // --- Articles Actions ---
    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSpiderArticles({ 
                page, 
                size: 20, 
                source_id: filterSource || undefined,
                point_id: filterPoint || undefined,
                is_atomized: filterAtomized === '' ? undefined : (filterAtomized === 'true'),
                start_date: filterDateStart ? new Date(filterDateStart).toISOString() : undefined,
                end_date: filterDateEnd ? new Date(filterDateEnd).toISOString() : undefined
            });
            setArticles(res.items);
            setTotal(res.total);
            setSelectedIds(new Set()); 
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [page, filterSource, filterPoint, filterAtomized, filterDateStart, filterDateEnd]);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    const toggleSelect = (id: string) => {
        if (!id) return;
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        const validIds = articles.map(a => a.id).filter(Boolean);
        if (selectedIds.size === articles.length && articles.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(validIds));
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteSpiderArticle(deleteId);
            setArticles(prev => prev.filter(a => a.id !== deleteId));
            setDeleteId(null);
        } catch (e: any) {
            alert('删除失败');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        setIsBatchDeleting(true);
        try {
            await batchDeleteArticles(Array.from(selectedIds));
            setArticles(prev => prev.filter(a => !selectedIds.has(a.id)));
            setSelectedIds(new Set());
            setIsBatchDeleteConfirmOpen(false);
            alert('批量删除成功');
        } catch (e: any) {
            alert(`批量删除失败: ${e.message}`);
        } finally {
            setIsBatchDeleting(false);
        }
    };

    // --- New Generation Handlers ---

    const openGenModal = (mode: 'single' | 'batch_selected' | 'background_fill', article?: SpiderArticle) => {
        setGenModalState({ isOpen: true, mode, article });
    };

    const confirmGeneration = async (config: { provider: string }) => {
        setGenModalState({ ...genModalState, isOpen: false });

        if (genModalState.mode === 'single' && genModalState.article?.id) {
            // Single Generation
            setGeneratingId(genModalState.article.id);
            try {
                await generateArticleHtml(genModalState.article.id, config.provider);
                setArticles(prev => prev.map(a => a.id === genModalState.article!.id ? { ...a, is_atomized: true } : a));
                alert('原子化任务已启动，请稍后刷新查看结果');
            } catch (e: any) {
                alert(`生成失败: ${e.message}`);
            } finally {
                setGeneratingId(null);
            }
        } 
        else if (genModalState.mode === 'batch_selected') {
            // Batch Selected (Loop)
            if (selectedIds.size === 0) return;
            setIsBatchGenerating(true);
            try {
                const ids = Array.from(selectedIds) as string[];
                const promises = ids.map(id => generateArticleHtml(id, config.provider));
                await Promise.all(promises);
                
                setArticles(prev => prev.map(a => selectedIds.has(a.id) ? { ...a, is_atomized: true } : a));
                alert(`已成功为 ${ids.length} 篇文章触发强制重生成任务`);
                setSelectedIds(new Set());
            } catch (e: any) {
                alert('批量触发失败，部分任务可能未启动');
            } finally {
                setIsBatchGenerating(false);
            }
        }
        else if (genModalState.mode === 'background_fill') {
            // Background Batch API (Now forces regenerate for ALL)
            try {
                await startBackgroundBatchHtmlGeneration({
                    provider: config.provider
                });
                alert('全量后台重生成任务已启动');
            } catch (e: any) {
                alert(`启动失败: ${e.message}`);
            }
        }
    };

    const confirmExport = async (compressToken: number) => {
        setIsExporting(true);
        try {
            const blob = await exportArticles({
                source_id: filterSource || undefined,
                point_id: filterPoint || undefined,
                is_atomized: filterAtomized === '' ? undefined : (filterAtomized === 'true'),
                start_date: filterDateStart || undefined, 
                end_date: filterDateEnd || undefined,     
                compress_to_tokens: compressToken > 0 ? compressToken : undefined
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `articles_export_${new Date().toISOString().slice(0,10)}${compressToken > 0 ? '_compressed' : ''}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            setIsExportModalOpen(false);
        } catch (e: any) {
            alert('导出失败: ' + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadPdf = async (article: SpiderArticle) => {
        if (!article.id || pdfDownloadingId === article.id) return;
        setPdfDownloadingId(article.id);
        try {
            const blob = await downloadArticlePdf(article.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${article.title || 'article'}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            const message = e.message || String(e);
            alert(message);
        } finally {
            setPdfDownloadingId(null);
        }
    };

    const handleTriggerAnalysis = async (article: SpiderArticle) => {
        if (!article.id || analyzingId) return;
        setAnalyzingId(article.id);
        try {
            await triggerAnalysis(article.id);
            alert('通用分析任务已触发');
        } catch (e: any) {
            const msg = e.message || String(e);
            alert(msg);
        } finally {
            setAnalyzingId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden shadow-sm">
            {/* Filter Panel */}
            <div className="border-b border-gray-100 bg-gray-50/80 p-4">
                <div className="flex flex-col gap-4">
                    {/* Top Row: Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <FilterIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-bold text-gray-500 uppercase">筛选</span>
                        </div>
                        
                        <select 
                            value={filterSource} 
                            onChange={e => { setFilterSource(e.target.value); setPage(1); }}
                            className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 min-w-[120px] outline-none"
                        >
                            <option value="">所有情报源</option>
                            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>

                        <select 
                            value={filterPoint} 
                            onChange={e => { setFilterPoint(e.target.value); setPage(1); }}
                            className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 min-w-[120px] outline-none"
                            disabled={!filterSource}
                        >
                            <option value="">所有情报点</option>
                            {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>

                        <select 
                            value={filterAtomized} 
                            onChange={e => { setFilterAtomized(e.target.value); setPage(1); }}
                            className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 outline-none"
                        >
                            <option value="">原子化状态 (全部)</option>
                            <option value="true">已原子化</option>
                            <option value="false">未原子化</option>
                        </select>

                        <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>

                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
                            <CalendarIcon className="w-3.5 h-3.5 text-gray-400 ml-1" />
                            <input 
                                type="date" 
                                value={filterDateStart}
                                onChange={e => { setFilterDateStart(e.target.value); setPage(1); }}
                                className="text-xs text-gray-600 outline-none border-none bg-transparent w-24"
                                placeholder="开始日期"
                            />
                            <span className="text-gray-300">-</span>
                            <input 
                                type="date" 
                                value={filterDateEnd}
                                onChange={e => { setFilterDateEnd(e.target.value); setPage(1); }}
                                className="text-xs text-gray-600 outline-none border-none bg-transparent w-24"
                                placeholder="结束日期"
                            />
                        </div>

                        <div className="flex-1"></div>
                        
                        <button 
                            onClick={() => openGenModal('background_fill')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-all shadow-sm"
                        >
                            <ServerIcon className="w-3.5 h-3.5" />
                            后台全量生成 HTML
                        </button>

                        <button 
                            onClick={() => setIsBatchExportModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all shadow-sm"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" />
                            批量高级导出
                        </button>

                        <button 
                            onClick={() => setIsExportModalOpen(true)}
                            disabled={isExporting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm disabled:opacity-50"
                        >
                            {isExporting ? <Spinner /> : <DownloadIcon className="w-3.5 h-3.5" />}
                            导出 CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Article List Header Actions */}
            <div className="p-4 border-b bg-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-700 text-lg flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-indigo-600"/> 采集文章 ({total})
                    </h3>
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                            <span className="text-xs text-gray-500 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200">已选 {selectedIds.size} 项</span>
                            <button 
                                onClick={() => openGenModal('batch_selected')}
                                disabled={isBatchGenerating}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-70"
                            >
                                {isBatchGenerating ? <WhiteSpinner /> : <SparklesIcon className="w-3.5 h-3.5" />}
                                批量原子化
                            </button>
                            <button 
                                onClick={() => setIsBatchDeleteConfirmOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                                批量删除
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={fetchArticles} className="p-2 hover:bg-gray-200 rounded text-gray-500 border bg-white shadow-sm transition-all"><RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/></button>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50/50 p-4 md:p-6 custom-scrollbar">
                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 w-10 text-center">
                                    <input type="checkbox" checked={articles.length > 0 && selectedIds.size === articles.length} onChange={toggleAll} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                                </th>
                                <th className="px-6 py-4 font-bold">文章标题</th>
                                <th className="px-6 py-4 w-48 font-bold">来源 / 频道</th>
                                <th className="px-6 py-4 w-28 text-center font-bold">原子化</th>
                                <th className="px-6 py-4 w-40 font-bold">发布时间</th>
                                <th className="px-6 py-4 w-40 font-bold">采集时间</th>
                                <th className="px-6 py-4 w-40 text-center font-bold">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {articles.length === 0 && !isLoading ? (
                                <tr><td colSpan={7} className="text-center py-20 text-gray-400">暂无文章数据</td></tr>
                            ) : (
                                articles.map(article => (
                                    <tr key={article.id} className={`hover:bg-gray-50 group transition-colors ${selectedIds.has(article.id) ? 'bg-indigo-50/30' : ''}`} onClick={() => toggleSelect(article.id)}>
                                        <td className="p-4 text-center">
                                            <input type="checkbox" checked={selectedIds.has(article.id)} onChange={() => toggleSelect(article.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); if(article.id) setSelectedArticleUuid(article.id); }}
                                                className="text-left hover:text-indigo-600 hover:underline line-clamp-1 max-w-md font-bold text-sm"
                                                title={article.title}
                                            >
                                                {article.title}
                                            </button>
                                            {article.tags && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    {article.tags.split(',').map(tag => (
                                                        <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{tag.trim()}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-700">{article.source_name || 'Unknown'}</span>
                                                <span className="text-[10px] text-gray-400">{article.point_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {generatingId === article.id ? (
                                                <div className="flex justify-center"><Spinner /></div>
                                            ) : article.is_atomized ? (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); if(article.id) setViewingHtmlId(article.id); }}
                                                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    title="查看 HTML"
                                                >
                                                    <EyeIcon className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openGenModal('single', article); }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                                    title="生成 HTML"
                                                >
                                                    <SparklesIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-600 whitespace-nowrap">{formatBeijingTime(article.publish_date).split(' ')[0]}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-600 whitespace-nowrap">{formatBeijingTime(article.created_at).split(' ')[0]}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleTriggerAnalysis(article); }}
                                                    className="text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded p-1.5 transition-colors"
                                                    title="触发通用分析"
                                                >
                                                    {analyzingId === article.id ? <Spinner /> : <LightningBoltIcon className="w-4 h-4" />}
                                                </button>
                                                {article.is_atomized && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDownloadPdf(article); }}
                                                        disabled={pdfDownloadingId === article.id}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1.5 transition-colors disabled:opacity-50"
                                                        title="下载 PDF"
                                                    >
                                                        {pdfDownloadingId === article.id ? <Spinner /> : <DocumentTextIcon className="w-4 h-4" />}
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); if(article.id) setDeleteId(article.id); }}
                                                    className="text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded p-1.5 transition-colors"
                                                    title="删除文章"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {articles.length === 0 && !isLoading ? (
                        <div className="text-center py-12 text-gray-400">暂无文章数据</div>
                    ) : (
                        articles.map(article => (
                            <div key={article.id} className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 relative overflow-hidden ${selectedIds.has(article.id) ? 'ring-2 ring-indigo-500 bg-indigo-50/20' : ''}`} onClick={() => toggleSelect(article.id)}>
                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                    <input type="checkbox" checked={selectedIds.has(article.id)} onChange={() => toggleSelect(article.id)} className="w-5 h-5 text-indigo-600 rounded" />
                                </div>
                                
                                <div onClick={(e) => { e.stopPropagation(); if(article.id) setSelectedArticleUuid(article.id); }} className="cursor-pointer pr-8">
                                    <h4 className="font-bold text-gray-900 text-base leading-snug line-clamp-2">
                                        {article.title}
                                    </h4>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold">{article.source_name || 'Unknown'}</span>
                                        <span className="text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{article.point_name}</span>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-400 font-mono">
                                        发布: {formatBeijingTime(article.publish_date).split(' ')[0]}
                                    </div>
                                </div>
                                
                                <div className="pt-3 border-t border-gray-100 flex justify-between items-center" onClick={e => e.stopPropagation()}>
                                    <div className="flex gap-2">
                                        {article.tags && article.tags.split(',').slice(0,2).map(tag => (
                                            <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tag.trim()}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleTriggerAnalysis(article); }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                            title="触发通用分析"
                                        >
                                            {analyzingId === article.id ? <Spinner /> : <LightningBoltIcon className="w-4 h-4" />}
                                        </button>
                                        {article.is_atomized ? (
                                            <button 
                                                onClick={() => setViewingHtmlId(article.id)}
                                                className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 border border-indigo-100"
                                                title="查看 HTML"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => openGenModal('single', article)}
                                                disabled={generatingId === article.id}
                                                className="p-1.5 rounded-lg text-slate-400 bg-slate-50 hover:text-purple-600 hover:bg-purple-50"
                                                title="生成 HTML"
                                            >
                                                {generatingId === article.id ? <Spinner /> : <SparklesIcon className="w-4 h-4" />}
                                            </button>
                                        )}
                                        
                                        {article.is_atomized && (
                                            <button 
                                                onClick={() => handleDownloadPdf(article)}
                                                disabled={pdfDownloadingId === article.id}
                                                className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 rounded-lg disabled:opacity-50"
                                                title="下载 PDF"
                                            >
                                                {pdfDownloadingId === article.id ? <Spinner /> : <DocumentTextIcon className="w-4 h-4" />}
                                            </button>
                                        )}

                                        <button 
                                            onClick={() => setDeleteId(article.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg"
                                            title="删除"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t bg-white flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                <button 
                    disabled={page <= 1} 
                    onClick={() => setPage(p => p - 1)} 
                    className="px-4 py-2 border rounded-lg bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                    上一页
                </button>
                <span className="text-sm font-medium text-gray-600">第 {page} 页</span>
                <button 
                    disabled={articles.length < 20} 
                    onClick={() => setPage(p => p + 1)} 
                    className="px-4 py-2 border rounded-lg bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                    下一页
                </button>
            </div>

            {selectedArticleUuid && (
                <ArticleDetailModal 
                    articleUuid={selectedArticleUuid} 
                    onClose={() => setSelectedArticleUuid(null)} 
                />
            )}

            {viewingHtmlId && (
                <HtmlViewerModal 
                    articleId={viewingHtmlId} 
                    onClose={() => setViewingHtmlId(null)} 
                />
            )}
            
            {isBatchExportModalOpen && (
                <BatchSearchExportModal 
                    isOpen={isBatchExportModalOpen}
                    onClose={() => setIsBatchExportModalOpen(false)}
                    sources={sources}
                />
            )}

            {isExportModalOpen && (
                <ExportOptionsModal 
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    onConfirm={confirmExport}
                    isExporting={isExporting}
                />
            )}

            <GenerationConfigModal 
                isOpen={genModalState.isOpen}
                mode={genModalState.mode}
                onClose={() => setGenModalState({...genModalState, isOpen: false})}
                onConfirm={confirmGeneration}
                selectedCount={selectedIds.size}
            />

            {deleteId && (
                <ConfirmationModal
                    title="删除文章"
                    message="确定要永久删除这篇文章吗？此操作将同时清除相关的向量数据且不可撤销。"
                    confirmText="确认删除"
                    variant="destructive"
                    isLoading={isDeleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteId(null)}
                />
            )}

            {isBatchDeleteConfirmOpen && (
                <ConfirmationModal
                    title="批量删除"
                    message={`确定要删除选中的 ${selectedIds.size} 篇文章吗？此操作不可撤销。`}
                    confirmText="确认批量删除"
                    variant="destructive"
                    isLoading={isBatchDeleting}
                    onConfirm={handleBatchDelete}
                    onCancel={() => setIsBatchDeleteConfirmOpen(false)}
                />
            )}
        </div>
    );
};
