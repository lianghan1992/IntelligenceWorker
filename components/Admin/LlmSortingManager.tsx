
import React, { useState, useEffect, useCallback } from 'react';
import { LlmSearchRequest, LlmSearchTaskItem } from '../../types';
import { createLlmSearchTask, getLlmSearchTasks, getSourceNames } from '../../api';
import { SparklesIcon, RefreshIcon, ChartIcon, ClockIcon, CheckCircleIcon } from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const LlmSortingManager: React.FC = () => {
    const [query, setQuery] = useState('');
    const [tasks, setTasks] = useState<LlmSearchTaskItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getLlmSearchTasks({ page: 1, limit: 20 });
            setTasks(res.items || []);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const handleCreate = async () => {
        if (!query.trim()) return;
        setIsCreating(true);
        try {
            await createLlmSearchTask({ query_text: query });
            setQuery('');
            fetchTasks();
        } catch (e) { alert('创建失败'); } finally { setIsCreating(false); }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-white to-purple-50/30">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                    <SparklesIcon className="w-6 h-6 text-purple-600" /> 新建 LLM 分析任务
                </h3>
                <div className="flex gap-4">
                    <input 
                        type="text" 
                        value={query} 
                        onChange={e => setQuery(e.target.value)} 
                        placeholder="输入分析指令 (e.g. 提取所有关于固态电池的新闻并按时间排序)..." 
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-5 py-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all shadow-sm text-base"
                    />
                    <button onClick={handleCreate} disabled={isCreating || !query} className="px-8 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95">
                        {isCreating ? <Spinner /> : <SparklesIcon className="w-5 h-5"/>} 开始分析
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 custom-scrollbar">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h4 className="font-bold text-slate-600 text-sm uppercase tracking-wide flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" /> 任务历史
                    </h4>
                    <button onClick={fetchTasks} className="text-slate-400 hover:text-purple-600 p-2 hover:bg-white rounded-lg transition-colors">
                        <RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/>
                    </button>
                </div>
                
                <div className="space-y-4">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-purple-200 group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="font-bold text-slate-800 text-base max-w-3xl line-clamp-2 leading-relaxed">{task.prompt_text}</div>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">ID: {task.id.slice(0,8)}</span>
                            </div>
                            <div className="flex items-center gap-6 text-xs text-slate-500 mt-2 pt-3 border-t border-slate-50">
                                <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5 text-slate-400"/> {new Date(task.created_at).toLocaleString()}</span>
                                <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded"><ChartIcon className="w-3.5 h-3.5 text-blue-500"/> 已处理: <strong className="text-slate-700">{task.processed_count}</strong></span>
                                <span className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded text-green-700 border border-green-100"><CheckCircleIcon className="w-3.5 h-3.5"/> 命中: <strong>{task.matched_count}</strong></span>
                            </div>
                        </div>
                    ))}
                    
                    {tasks.length === 0 && !isLoading && (
                        <div className="text-center py-20 text-slate-400">暂无历史任务</div>
                    )}
                </div>
            </div>
        </div>
    );
};
