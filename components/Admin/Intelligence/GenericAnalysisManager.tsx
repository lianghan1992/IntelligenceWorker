
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnalysisTemplate, AnalysisResult } from '../../../types';
import { createAnalysisTemplate, getAnalysisTemplates, updateAnalysisTemplate, deleteAnalysisTemplate, getAnalysisResults, getSpiderArticleDetail } from '../../../api/intelligence';
import { getMe } from '../../../api/auth';
import { SparklesIcon, PlusIcon, TrashIcon, RefreshIcon, CodeIcon, CheckIcon, CloseIcon, LightningBoltIcon, EyeIcon, FilterIcon, DocumentTextIcon, ClockIcon, ShieldExclamationIcon } from '../../icons';
import { ArticleDetailModal } from './ArticleDetailModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return '-';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = e - s;
    if (isNaN(diff) || diff < 0) return '-';
    
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
};

// --- JSON 美化组件 ---
const JsonView: React.FC<{ data: any; level?: number }> = ({ data, level = 0 }) => {
    if (data === null || data === undefined) return <span className="text-gray-400 italic">null</span>;
    
    if (typeof data !== 'object') {
        const isBool = typeof data === 'boolean';
        const isNumber = typeof data === 'number';
        const colorClass = isBool ? 'text-purple-600 font-bold' : isNumber ? 'text-blue-600 font-mono' : 'text-slate-700';
        return <span className={`${colorClass} break-all`}>{String(data)}</span>;
    }

    const isArray = Array.isArray(data);
    const isEmpty = Object.keys(data).length === 0;
    
    if (isEmpty) return <span className="text-gray-400 text-xs italic">{'<empty>'}</span>;

    return (
        <div className={`text-sm ${level > 0 ? 'ml-3 pl-3 border-l-2 border-slate-100' : ''}`}>
            {Object.entries(data).map(([key, value]) => (
                <div key={key} className="my-2">
                    <span className="font-bold text-slate-500 mr-2 text-xs uppercase tracking-wide bg-slate-50 px-1.5 py-0.5 rounded select-none">{key}</span>
                    <div className="mt-1">
                        <JsonView data={value} level={level + 1} />
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- 结果查看弹窗 ---
const ResultViewerModal: React.FC<{ title: string; content: any; fullItem: any; onClose: () => void }> = ({ title, content, fullItem, onClose }) => {
    let displayContent = content;
    let isRawFallback = false;

    if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
        displayContent = fullItem;
        isRawFallback = true;
    } else if (typeof content === 'string') {
        try {
            displayContent = JSON.parse(content);
        } catch (e) {
            // 保持原样
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <SparklesIcon className="w-5 h-5"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg leading-tight">{title || '分析结果详情'}</h3>
                            {isRawFallback && <p className="text-xs text-orange-600 mt-1 font-mono">⚠️ 未检测到结构化结果，显示原始记录</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        <CloseIcon className="w-6 h-6"/>
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-8 bg-white custom-scrollbar">
                    <div className="max-w-3xl mx-auto">
                        <JsonView data={displayContent} />
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end">
                     <button onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 font-bold rounded-xl transition-colors shadow-sm">关闭</button>
                </div>
            </div>
        </div>
    );
};

const TemplateCard: React.FC<{ template: AnalysisTemplate; onDelete: () => void; onToggle: () => void }> = ({ template, onDelete, onToggle }) => {
    return (
        <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group relative overflow-hidden h-full flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-purple-500"></div>
            <div>
                <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-slate-800 text-base line-clamp-1">{template.name}</h4>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onToggle}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${template.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                        >
                            {template.is_active ? '启用' : '暂停'}
                        </button>
                        <button onClick={onDelete} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <p className="text-xs text-slate-500 line-clamp-3 mb-4 font-mono leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                    {template.prompt_template}
                </p>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-400">
                <LightningBoltIcon className="w-3.5 h-3.5 text-purple-500" />
                <span className="font-mono">{template.target_model || 'glm-4.5-flash'}</span>
            </div>
        </div>
    );
};

export const GenericAnalysisManager: React.FC = () => {
    const [view, setView] = useState<'templates' | 'results'>('templates');
    const [userUuid, setUserUuid] = useState('');
    
    // Template State
    const [templates, setTemplates] = useState<AnalysisTemplate[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Result State
    const [results, setResults] = useState<any[]>([]); // Use any[] to handle flexible backend response
    const [resultPage, setResultPage] = useState(1);
    const [resultTotal, setResultTotal] = useState(0);
    const [filterTemplateId, setFilterTemplateId] = useState('');
    const [viewingItem, setViewingItem] = useState<any | null>(null);
    const [detailArticleUuid, setDetailArticleUuid] = useState<string | null>(null);

    // Article Cache (uuid -> Article Detail)
    const [articleCache, setArticleCache] = useState<Record<string, any>>({});
    
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getMe().then(u => setUserUuid(u.id));
    }, []);

    const fetchTemplates = useCallback(async () => {
        // Load templates even if not in template view, for the filter dropdown
        try {
            const res = await getAnalysisTemplates({}); 
            setTemplates(res);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchResults = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: any = { 
                page: resultPage, 
                page_size: 50,
                template_uuid: filterTemplateId || undefined
            };

            const res: any = await getAnalysisResults(params);
            
            let rawItems: any[] = [];
            let total = 0;

            if (Array.isArray(res)) {
                rawItems = res;
                total = res.length;
            } else if (res && typeof res === 'object') {
                if (Array.isArray(res.items)) {
                    rawItems = res.items;
                    total = res.total || res.items.length;
                } else if (Array.isArray(res.data)) {
                    rawItems = res.data;
                    total = res.total || res.data.length;
                }
            }

            console.log("API Response Items:", rawItems);

            const processedItems = rawItems.map(item => ({
                ...item,
                // Prioritize 'result' field as per user instruction, fallback to others
                result_json: item.result || item.result_json || item.data || item.output || {},
                uuid: item.uuid || item.id,
                article_uuid: item.article_uuid || item.article_id, // Normalize ID
                template_name: item.template_name || 'Unknown Template',
                username: item.username || item.user_name || item.user_uuid || 'Unknown User',
                model_used: item.model_used || 'default',
                status: item.status || (Object.keys(item.result || item.result_json || {}).length > 0 ? 'completed' : 'pending'),
                duration: calculateDuration(item.created_at, item.completed_at || item.end_time)
            }));

            setResults(processedItems);
            setResultTotal(total);
        } catch (e) {
            console.error("GenericAnalysisManager fetchResults error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [resultPage, filterTemplateId]);

    // Fetch Article Details Effect
    useEffect(() => {
        if (results.length === 0) return;

        // Find articles we haven't fetched yet
        const idsToFetch = Array.from(new Set(
            results
                .map(r => r.article_uuid)
                .filter(id => id && !articleCache[id])
        ));

        if (idsToFetch.length === 0) return;

        const loadDetails = async () => {
            // Fetch concurrently
            const promises = idsToFetch.map(async (id) => {
                try {
                    const detail = await getSpiderArticleDetail(id);
                    return { id, detail };
                } catch (e) {
                    // console.error(`Failed to fetch article ${id}`, e);
                    return { id, detail: { title: 'Unknown Article (Load Failed)', uuid: id } };
                }
            });

            const fetchedItems = await Promise.all(promises);
            
            setArticleCache(prev => {
                const next = { ...prev };
                fetchedItems.forEach(item => {
                    if (item) next[item.id] = item.detail;
                });
                return next;
            });
        };

        loadDetails();
    }, [results]); // Intentionally don't dep on articleCache to avoid loops

    // Initial Load
    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    useEffect(() => {
        if (view === 'results') {
            fetchResults();
        }
    }, [view, fetchResults]);

    const handleCreateTemplate = async (data: any) => {
        try {
            await createAnalysisTemplate({ ...data, user_uuid: userUuid });
            setIsCreateModalOpen(false);
            fetchTemplates();
        } catch (e) {
            alert('创建失败');
        }
    };

    const handleToggleTemplate = async (template: AnalysisTemplate) => {
        try {
            await updateAnalysisTemplate(template.uuid, { is_active: !template.is_active });
            fetchTemplates();
        } catch (e) {
            alert('更新失败');
        }
    };

    const handleDeleteTemplate = async (uuid: string) => {
        if(!confirm('确定删除此模版吗？')) return;
        try {
            await deleteAnalysisTemplate(uuid);
            fetchTemplates();
        } catch (e) {
            alert('删除失败');
        }
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden relative">
            {/* Toolbar */}
            <div className="p-4 border-b bg-gradient-to-r from-white to-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 z-10">
                <div className="flex gap-4 items-center w-full sm:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setView('templates')}
                            className={`text-sm font-bold px-4 py-1.5 rounded-md transition-all ${view === 'templates' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            模版管理
                        </button>
                        <button 
                            onClick={() => setView('results')}
                            className={`text-sm font-bold px-4 py-1.5 rounded-md transition-all ${view === 'results' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            分析结果
                        </button>
                    </div>

                    {view === 'results' && (
                        <div className="flex items-center gap-2">
                             <select 
                                value={filterTemplateId}
                                onChange={(e) => { setFilterTemplateId(e.target.value); setResultPage(1); }}
                                className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none shadow-sm"
                            >
                                <option value="">所有模版</option>
                                {templates.map(t => <option key={t.uuid} value={t.uuid}>{t.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button onClick={() => view === 'templates' ? fetchTemplates() : fetchResults()} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border rounded-lg hover:shadow-sm transition-all">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {view === 'templates' && (
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95 whitespace-nowrap"
                        >
                            <PlusIcon className="w-4 h-4" /> 新建模版
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-slate-50/50 p-4 md:p-6 custom-scrollbar relative z-0">
                {view === 'templates' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {templates.map(t => (
                            <TemplateCard 
                                key={t.uuid} 
                                template={t} 
                                onDelete={() => handleDeleteTemplate(t.uuid)} 
                                onToggle={() => handleToggleTemplate(t)}
                            />
                        ))}
                        {templates.length === 0 && !isLoading && (
                            <div className="col-span-full text-center py-20 text-slate-400">
                                <SparklesIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>暂无分析模版</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="overflow-auto flex-1 custom-scrollbar">
                            <table className="w-full text-sm text-left text-slate-500">
                                <thead className="text-xs text-slate-700 uppercase bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 w-40">模板名称</th>
                                        <th className="px-6 py-4 w-32">用户名称</th>
                                        <th className="px-6 py-4">文章标题</th>
                                        <th className="px-6 py-4 w-20 text-center">结果</th>
                                        <th className="px-6 py-4 w-24 text-right">耗时</th>
                                        <th className="px-6 py-4 w-40 text-right">创建时间</th>
                                        <th className="px-6 py-4 w-40 text-right">结束时间</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {results.map(r => {
                                        // Retrieve title from cache or fallback
                                        const cachedArticle = articleCache[r.article_uuid];
                                        const displayTitle = cachedArticle ? cachedArticle.title : (r.article_title && r.article_title !== 'Unknown Article' ? r.article_title : r.article_uuid);
                                        const isCompleted = r.status === 'completed' || r.status === 'success';
                                        
                                        return (
                                            <tr key={r.uuid} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 align-top">
                                                    <div className="font-bold text-slate-800 text-sm mb-1 truncate" title={r.template_name}>{r.template_name}</div>
                                                    <div className="text-[10px] text-purple-600 font-mono bg-purple-50 px-2 py-0.5 rounded w-fit border border-purple-100 inline-flex items-center gap-1">
                                                        <LightningBoltIcon className="w-3 h-3"/>
                                                        {r.model_used || 'default'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top text-xs text-slate-600">
                                                    <div className="truncate max-w-[120px]" title={r.username}>
                                                        {r.username}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top font-medium text-slate-900">
                                                    <button 
                                                        onClick={() => setDetailArticleUuid(r.article_uuid)}
                                                        className="text-left line-clamp-2 hover:text-indigo-600 hover:underline transition-colors w-full" 
                                                        title={displayTitle}
                                                    >
                                                        {displayTitle}
                                                    </button>
                                                    {!cachedArticle && <div className="text-[10px] text-slate-400 mt-1 animate-pulse">Loading info...</div>}
                                                </td>
                                                <td className="px-6 py-4 align-top text-center">
                                                    {isCompleted ? (
                                                        <button 
                                                            onClick={() => setViewingItem(r)}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                                            title="查看分析结果"
                                                        >
                                                            <EyeIcon className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <div className="p-2 text-orange-400 cursor-help" title="分析中 / 等待中">
                                                            <ClockIcon className="w-5 h-5 animate-pulse" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 align-top text-xs text-slate-500 font-mono text-right">
                                                    {r.duration}
                                                </td>
                                                <td className="px-6 py-4 align-top text-xs font-mono text-slate-400 whitespace-nowrap text-right">
                                                    {new Date(r.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 align-top text-xs font-mono text-slate-400 whitespace-nowrap text-right">
                                                    {r.completed_at ? new Date(r.completed_at).toLocaleString() : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {results.length === 0 && !isLoading && (
                                        <tr><td colSpan={7} className="text-center py-20 text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <EyeIcon className="w-10 h-10 mb-2 opacity-20"/>
                                                <p>暂无数据</p>
                                            </div>
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {resultTotal > 0 && (
                            <div className="p-4 border-t flex justify-end gap-2 bg-white flex-shrink-0">
                                <button disabled={resultPage <= 1} onClick={() => setResultPage(p => p - 1)} className="px-3 py-1 border rounded text-xs hover:bg-slate-50 disabled:opacity-50">上一页</button>
                                <span className="text-xs self-center px-2">{resultPage}</span>
                                <button disabled={results.length < 50} onClick={() => setResultPage(p => p + 1)} className="px-3 py-1 border rounded text-xs hover:bg-slate-50 disabled:opacity-50">下一页</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Drawer (Slide-in from Right) */}
            {isCreateModalOpen && <CreateTemplateDrawer onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateTemplate} />}
            
            {/* Result Modal */}
            {viewingItem && (
                <ResultViewerModal 
                    title={
                        articleCache[viewingItem.article_uuid]?.title || 
                        viewingItem.article_title || 
                        '分析结果'
                    } 
                    content={viewingItem.result_json} 
                    fullItem={viewingItem}
                    onClose={() => setViewingItem(null)} 
                />
            )}

            {/* Article Detail Modal */}
            {detailArticleUuid && (
                <ArticleDetailModal 
                    articleUuid={detailArticleUuid} 
                    onClose={() => setDetailArticleUuid(null)} 
                />
            )}
        </div>
    );
};

const CreateTemplateDrawer: React.FC<{ onClose: () => void; onSave: (data: any) => void }> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [prompt, setPrompt] = useState('请分析以下文章是否涉及新能源电池技术：\n标题：{{title}}\n链接：{{url}}\n内容：{{content}}');
    const [schema, setSchema] = useState('{\n  "type": "object",\n  "properties": {\n    "is_tech": { "type": "boolean" },\n    "tech_name": { "type": "string" }\n  }\n}');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const parsedSchema = JSON.parse(schema);
            
            onSave({
                name,
                prompt_template: prompt,
                output_schema: parsedSchema,
                target_model: 'glm-4.5-flash',
                is_active: true
            });
        } catch (e) {
            alert('JSON 格式错误或提交失败');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex justify-end pointer-events-none">
            {/* Drawer Container */}
            <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col pointer-events-auto border-l border-indigo-100 animate-in slide-in-from-right duration-300">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-indigo-600" /> 新建分析模版
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500"><CloseIcon className="w-5 h-5"/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">模版名称</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" placeholder="e.g. 新能源技术识别" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Prompt 模版</label>
                        <div className="relative">
                            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono h-40 resize-none transition-shadow" />
                            <div className="absolute top-2 right-2 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 font-bold opacity-80">支持 {`{{title}}`}, {`{{url}}`}, {`{{content}}`}</div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">系统会自动将文章信息注入到变量位置。</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">输出 Schema (JSON Schema)</label>
                        <textarea value={schema} onChange={e => setSchema(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono h-48 bg-slate-50 transition-shadow" />
                        <p className="text-xs text-gray-400 mt-1">定义期望模型返回的 JSON 结构。</p>
                    </div>
                </div>

                <div className="p-5 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 rounded-xl text-slate-600 font-bold text-sm hover:bg-gray-100 transition-colors">取消</button>
                    <button onClick={handleSubmit} disabled={isSubmitting || !name} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50 hover:shadow-lg active:scale-95">
                        {isSubmitting ? <Spinner /> : <CheckIcon className="w-4 h-4"/>} 保存模版
                    </button>
                </div>
            </div>
        </div>
    );
};
