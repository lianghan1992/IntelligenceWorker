
import React, { useState, useEffect, useCallback } from 'react';
import { SpiderSource, SpiderPoint } from '../../../types';
import { getSpiderPoints, exportBatchSearchArticles } from '../../../api/intelligence';
import { CloseIcon, PlusIcon, TrashIcon, DownloadIcon, ServerIcon, SearchIcon, CalendarIcon, BrainIcon } from '../../icons';

interface BatchSearchExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    sources: SpiderSource[];
}

interface SearchTask {
    id: string;
    name: string;
    keywords: string;
    start_date: string;
    end_date: string;
    source_uuid: string;
    point_uuid: string;
    use_vector_search: boolean;
    similarity_threshold: number;
    limit: number;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TaskFormRow: React.FC<{
    task: SearchTask;
    index: number;
    sources: SpiderSource[];
    onChange: (id: string, field: string, value: any) => void;
    onRemove: (id: string) => void;
}> = ({ task, index, sources, onChange, onRemove }) => {
    const [points, setPoints] = useState<SpiderPoint[]>([]);
    const [isLoadingPoints, setIsLoadingPoints] = useState(false);

    useEffect(() => {
        if (task.source_uuid) {
            setIsLoadingPoints(true);
            getSpiderPoints(task.source_uuid)
                .then(setPoints)
                .catch(() => setPoints([]))
                .finally(() => setIsLoadingPoints(false));
        } else {
            setPoints([]);
        }
    }, [task.source_uuid]);

    return (
        <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative group">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => onRemove(task.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
            
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                检索任务 #{index + 1}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">任务名称 <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        value={task.name}
                        onChange={e => onChange(task.id, 'name', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. 竞品分析"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">关键词 (空格=AND, |=OR) <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            value={task.keywords}
                            onChange={e => onChange(task.id, 'keywords', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. 小米|华为 汽车"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">时间范围</label>
                    <div className="flex gap-2 items-center">
                        <input 
                            type="date" 
                            value={task.start_date}
                            onChange={e => onChange(task.id, 'start_date', e.target.value)}
                            className="flex-1 bg-white border border-gray-300 rounded-lg px-2 py-2 text-xs outline-none" 
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                            type="date" 
                            value={task.end_date}
                            onChange={e => onChange(task.id, 'end_date', e.target.value)}
                            className="flex-1 bg-white border border-gray-300 rounded-lg px-2 py-2 text-xs outline-none" 
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">数据来源 (可选)</label>
                    <div className="relative">
                        <ServerIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <select 
                            value={task.source_uuid} 
                            onChange={e => {
                                onChange(task.id, 'source_uuid', e.target.value);
                                onChange(task.id, 'point_uuid', ''); // reset point
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-2 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">全部来源</option>
                            {sources.map(s => <option key={s.uuid} value={s.uuid}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">采集点 (可选)</label>
                    <select 
                        value={task.point_uuid} 
                        onChange={e => onChange(task.id, 'point_uuid', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                        disabled={!task.source_uuid}
                    >
                        <option value="">{isLoadingPoints ? '加载中...' : '全部采集点'}</option>
                        {points.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={task.use_vector_search} 
                        onChange={e => onChange(task.id, 'use_vector_search', e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 w-4 h-4"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                        <BrainIcon className="w-3.5 h-3.5" /> 启用向量增强检索
                    </div>
                </label>
                
                <div className="h-4 w-px bg-slate-200"></div>

                {task.use_vector_search && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">相似度阈值:</span>
                        <input 
                            type="number" 
                            min="0.1" max="1.0" step="0.1" 
                            value={task.similarity_threshold}
                            onChange={e => onChange(task.id, 'similarity_threshold', parseFloat(e.target.value))}
                            className="w-16 border border-gray-200 rounded px-1 py-0.5 text-xs text-center outline-none focus:border-indigo-400"
                        />
                    </div>
                )}

                <div className="flex-1"></div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">最大条数:</span>
                    <input 
                        type="number" 
                        min="1" max="5000" step="50" 
                        value={task.limit}
                        onChange={e => onChange(task.id, 'limit', parseInt(e.target.value))}
                        className="w-20 border border-gray-200 rounded px-2 py-1 text-xs text-center outline-none focus:border-indigo-400 font-mono"
                    />
                </div>
            </div>
        </div>
    );
};

export const BatchSearchExportModal: React.FC<BatchSearchExportModalProps> = ({ isOpen, onClose, sources }) => {
    const [tasks, setTasks] = useState<SearchTask[]>([{
        id: crypto.randomUUID(),
        name: '',
        keywords: '',
        start_date: '',
        end_date: '',
        source_uuid: '',
        point_uuid: '',
        use_vector_search: true,
        similarity_threshold: 0.6,
        limit: 100
    }]);
    const [isExporting, setIsExporting] = useState(false);

    const handleAddTask = () => {
        setTasks(prev => [...prev, {
            id: crypto.randomUUID(),
            name: '',
            keywords: '',
            start_date: '',
            end_date: '',
            source_uuid: '',
            point_uuid: '',
            use_vector_search: true,
            similarity_threshold: 0.6,
            limit: 100
        }]);
    };

    const handleRemoveTask = (id: string) => {
        if (tasks.length === 1) return;
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const handleTaskChange = (id: string, field: string, value: any) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleExport = async () => {
        // Validate
        const invalidTasks = tasks.filter(t => !t.name.trim() || !t.keywords.trim());
        if (invalidTasks.length > 0) {
            alert('请完善所有检索任务的名称和关键词');
            return;
        }

        setIsExporting(true);
        try {
            // Prepare payload
            const queries = tasks.map(t => ({
                name: t.name,
                keywords: t.keywords,
                start_date: t.start_date || undefined,
                end_date: t.end_date || undefined,
                source_uuid: t.source_uuid || undefined,
                point_uuid: t.point_uuid || undefined,
                use_vector_search: t.use_vector_search,
                similarity_threshold: t.similarity_threshold,
                limit: t.limit
            }));

            const blob = await exportBatchSearchArticles({ queries });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `batch_search_export_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            onClose();
        } catch (e: any) {
            alert(`导出失败: ${e.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <DownloadIcon className="w-6 h-6 text-indigo-600" />
                            批量高级检索导出
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">创建多个并行的检索任务，系统将自动合并结果为 CSV 报表</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                    <div className="space-y-4">
                        {tasks.map((task, idx) => (
                            <TaskFormRow 
                                key={task.id} 
                                task={task} 
                                index={idx} 
                                sources={sources} 
                                onChange={handleTaskChange}
                                onRemove={handleRemoveTask}
                            />
                        ))}
                    </div>
                    
                    <button 
                        onClick={handleAddTask}
                        className="w-full mt-6 py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <div className="p-1 bg-slate-200 rounded-full group-hover:bg-indigo-200 text-white transition-colors">
                            <PlusIcon className="w-4 h-4" />
                        </div>
                        添加新的检索任务
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-slate-100 bg-white flex justify-between items-center flex-shrink-0">
                    <div className="text-xs text-slate-400 font-medium">
                        共 {tasks.length} 个任务配置
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            disabled={isExporting}
                            className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleExport}
                            disabled={isExporting}
                            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-70 flex items-center gap-2 transition-all active:scale-95"
                        >
                            {isExporting ? <Spinner /> : <DownloadIcon className="w-4 h-4" />}
                            {isExporting ? '正在生成报表...' : '开始批量导出'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
