
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnalysisTemplate, AnalysisResult } from '../../../types';
import { createAnalysisTemplate, getAnalysisTemplates, updateAnalysisTemplate, deleteAnalysisTemplate, getAnalysisResults } from '../../../api/intelligence';
import { getMe } from '../../../api/auth';
import { SparklesIcon, PlusIcon, TrashIcon, RefreshIcon, CodeIcon, CheckIcon, CloseIcon, LightningBoltIcon, EyeIcon, FilterIcon } from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

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
                            {template.is_active ? 'ACTIVE' : 'PAUSED'}
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
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [resultPage, setResultPage] = useState(1);
    const [resultTotal, setResultTotal] = useState(0);
    const [hideEmptyResults, setHideEmptyResults] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getMe().then(u => setUserUuid(u.id));
    }, []);

    const fetchTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            // Admin can see all templates or filter by user? For now let's show all or user's
            const res = await getAnalysisTemplates({}); 
            setTemplates(res);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchResults = useCallback(async () => {
        setIsLoading(true);
        try {
            // 调试模式：恢复 user_uuid 过滤，以确保能获取到当前用户的测试数据
            // 如果后端不需要 user_uuid 也能返回所有数据，可以再次移除
            const params: any = { 
                page: resultPage, 
                page_size: 50 
            };
            if (userUuid) {
                params.user_uuid = userUuid;
            }

            const res = await getAnalysisResults(params);
            setResults(res.items || []);
            setResultTotal(res.total);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [resultPage, userUuid]);

    useEffect(() => {
        if (view === 'templates') fetchTemplates();
        else fetchResults();
    }, [view, fetchTemplates, fetchResults]);

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

    // 调试模式：暂时禁用“是否为空”的智能判断，总是返回 false，让数据展示出来
    const isResultEmpty = (json: any) => {
        // DEBUG: Force show all
        return false;
    };

    const filteredResults = useMemo(() => {
        if (!hideEmptyResults) return results;
        return results.filter(r => !isResultEmpty(r.result_json));
    }, [results, hideEmptyResults]);

    // 调试模式：直接展示原始数据，不进行 JSON 解析或美化
    const renderResultContent = (json: any) => {
        let displayStr = '';
        if (typeof json === 'object') {
            displayStr = JSON.stringify(json, null, 2);
        } else {
            displayStr = String(json);
        }
        
        return (
            <pre className="text-[10px] font-mono bg-slate-50 p-2 rounded border border-slate-200 overflow-x-auto max-w-lg max-h-40 whitespace-pre-wrap break-all text-slate-600">
                {displayStr}
            </pre>
        );
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden relative">
            {/* Toolbar */}
            <div className="p-4 border-b bg-gradient-to-r from-white to-slate-50 flex justify-between items-center z-10">
                <div className="flex gap-4 items-center">
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
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer hover:text-indigo-600 transition-colors select-none">
                            <input 
                                type="checkbox" 
                                checked={hideEmptyResults} 
                                onChange={e => setHideEmptyResults(e.target.checked)} 
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-300"
                            />
                            仅显示有数据的条目 (调试中)
                        </label>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => view === 'templates' ? fetchTemplates() : fetchResults()} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border rounded-lg hover:shadow-sm transition-all">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {view === 'templates' && (
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                        >
                            <PlusIcon className="w-4 h-4" /> 新建模版
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-slate-50/50 p-6 custom-scrollbar relative z-0">
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
                                        <th className="px-6 py-4 w-48">模版 / 模型</th>
                                        <th className="px-6 py-4">文章标题</th>
                                        <th className="px-6 py-4 w-1/3">原始数据 (Raw)</th>
                                        <th className="px-6 py-4 w-32">时间</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredResults.map(r => (
                                        <tr key={r.uuid} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-bold text-slate-800 text-sm mb-1">{r.template_name || 'Unknown Template'}</div>
                                                <div className="text-[10px] text-purple-600 font-mono bg-purple-50 px-2 py-0.5 rounded w-fit border border-purple-100 inline-flex items-center gap-1">
                                                    <LightningBoltIcon className="w-3 h-3"/>
                                                    {r.model_used || 'default'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top font-medium text-slate-900 max-w-xs">
                                                <div className="line-clamp-2" title={r.article_title || r.article_uuid}>
                                                    {r.article_title || r.article_uuid}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1 font-mono">{r.article_uuid.slice(0, 8)}...</div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                {renderResultContent(r.result_json)}
                                            </td>
                                            <td className="px-6 py-4 align-top text-xs font-mono text-slate-400 whitespace-nowrap">
                                                {new Date(r.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredResults.length === 0 && !isLoading && (
                                        <tr><td colSpan={4} className="text-center py-20 text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <EyeIcon className="w-10 h-10 mb-2 opacity-20"/>
                                                <p>暂无符合条件的分析结果</p>
                                                <p className="text-xs mt-1 text-slate-400">(raw count: {results.length})</p>
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
                                <button disabled={results.length < 20} onClick={() => setResultPage(p => p + 1)} className="px-3 py-1 border rounded text-xs hover:bg-slate-50 disabled:opacity-50">下一页</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Drawer (Slide-in from Right) */}
            {isCreateModalOpen && <CreateTemplateDrawer onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateTemplate} />}
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
