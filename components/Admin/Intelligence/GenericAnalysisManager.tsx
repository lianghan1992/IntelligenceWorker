
import React, { useState, useEffect, useCallback } from 'react';
import { AnalysisTemplate, AnalysisResult } from '../../../types';
import { createAnalysisTemplate, getAnalysisTemplates, updateAnalysisTemplate, deleteAnalysisTemplate, getAnalysisResults } from '../../../api/intelligence';
import { getMe } from '../../../api/auth';
import { SparklesIcon, PlusIcon, TrashIcon, RefreshIcon, CodeIcon, CheckIcon, CloseIcon, LightningBoltIcon } from '../../icons';

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
    
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getMe().then(u => setUserUuid(u.id));
    }, []);

    const fetchTemplates = useCallback(async () => {
        if (!userUuid) return;
        setIsLoading(true);
        try {
            const res = await getAnalysisTemplates({ user_uuid: userUuid });
            setTemplates(res);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [userUuid]);

    const fetchResults = useCallback(async () => {
        if (!userUuid) return;
        setIsLoading(true);
        try {
            const res = await getAnalysisResults({ user_uuid: userUuid, page: resultPage, page_size: 20 });
            setResults(res.items || []);
            setResultTotal(res.total);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [userUuid, resultPage]);

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

    return (
        <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden relative">
            {/* Toolbar */}
            <div className="p-4 border-b bg-gradient-to-r from-white to-slate-50 flex justify-between items-center z-10">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setView('templates')}
                        className={`text-sm font-bold px-4 py-2 rounded-lg transition-all ${view === 'templates' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        模版管理
                    </button>
                    <button 
                        onClick={() => setView('results')}
                        className={`text-sm font-bold px-4 py-2 rounded-lg transition-all ${view === 'results' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        分析结果
                    </button>
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
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 w-48">模版 / 模型</th>
                                    <th className="px-6 py-4">文章标题</th>
                                    <th className="px-6 py-4 w-1/3">分析结果 (JSON)</th>
                                    <th className="px-6 py-4 w-32">时间</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {results.map(r => (
                                    <tr key={r.uuid} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 align-top">
                                            <div className="font-bold text-slate-800">{r.template_name || 'Unknown'}</div>
                                            <div className="text-[10px] text-purple-600 font-mono mt-1 bg-purple-50 px-1.5 py-0.5 rounded w-fit border border-purple-100">
                                                {r.model_used}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top font-medium text-slate-900">
                                            {r.article_title || r.article_uuid}
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <pre className="text-xs font-mono bg-slate-50 p-2 rounded border border-slate-200 overflow-x-auto max-w-md max-h-32 custom-scrollbar">
                                                {JSON.stringify(r.result_json, null, 2)}
                                            </pre>
                                        </td>
                                        <td className="px-6 py-4 align-top text-xs font-mono text-slate-400">
                                            {new Date(r.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {results.length === 0 && !isLoading && (
                                    <tr><td colSpan={4} className="text-center py-10 text-gray-400">暂无分析结果</td></tr>
                                )}
                            </tbody>
                        </table>
                        {resultTotal > 0 && (
                            <div className="p-4 border-t flex justify-end gap-2 bg-white">
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
