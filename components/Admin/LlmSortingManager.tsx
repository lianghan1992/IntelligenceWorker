
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LlmSearchRequest, LlmSearchTaskItem } from '../../types';
import { createLlmSearchTask, downloadLlmTaskResult, getSourceNames, getLlmSearchTasks } from '../../api';
import { DownloadIcon, SparklesIcon, RefreshIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, CloseIcon } from '../icons';

const Spinner: React.FC<{ small?: boolean }> = ({ small }) => (
    <svg className={`animate-spin ${small ? 'h-4 w-4' : 'h-5 w-5'} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Custom MultiSelect Component ---
interface MultiSelectProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder = "选择..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    return (
        <div className="relative" ref={containerRef}>
            <div 
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 flex items-center justify-between cursor-pointer min-h-[42px] text-sm hover:bg-gray-100"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-wrap gap-1 max-w-[90%]">
                    {selected.length === 0 ? (
                        <span className="text-gray-500">{placeholder}</span>
                    ) : (
                        <span className="text-gray-800 font-medium">已选择 {selected.length} 个来源</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {selected.length > 0 && (
                        <button 
                            onClick={clearSelection} 
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                        >
                            <CloseIcon className="w-3 h-3" />
                        </button>
                    )}
                    <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>
            
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {options.length === 0 ? (
                        <div className="p-3 text-center text-gray-500 text-xs">无可用选项</div>
                    ) : (
                        <div className="p-1 space-y-0.5">
                            {options.map(option => (
                                <div 
                                    key={option} 
                                    onClick={() => toggleOption(option)}
                                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md cursor-pointer"
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={selected.includes(option)} 
                                        readOnly
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mr-3"
                                    />
                                    {option}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


export const LlmSortingManager: React.FC = () => {
    const [query, setQuery] = useState('');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [availableSources, setAvailableSources] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [tasks, setTasks] = useState<LlmSearchTaskItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);

    useEffect(() => {
        const fetchSources = async () => {
            try {
                const sourceNames = await getSourceNames();
                setAvailableSources(sourceNames);
            } catch (e) {
                console.error("Failed to load source names", e);
            }
        };
        fetchSources();
    }, []);

    const fetchTasks = useCallback(async (page: number = 1) => {
        setIsLoadingTasks(true);
        try {
            const response = await getLlmSearchTasks({ page, limit: pagination.limit });
            setTasks(response.items || []);
            setPagination(prev => ({ ...prev, page, total: response.total }));
        } catch (err: any) {
            console.error("Failed to fetch tasks", err);
        } finally {
            setIsLoadingTasks(false);
        }
    }, [pagination.limit]);

    useEffect(() => {
        fetchTasks(1);
    }, [fetchTasks]);


    const handleSubmit = async () => {
        if (!query.trim()) {
            setError('请输入分析指令');
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        
        const payload: LlmSearchRequest = {
            query_text: query,
            publish_date_start: dateRange.start || undefined,
            publish_date_end: dateRange.end || undefined,
            source_names: selectedSources.length > 0 ? selectedSources : undefined,
        };

        try {
            await createLlmSearchTask(payload);
            // Refresh the list to show the new task
            fetchTasks(1);
            setQuery(''); // Clear input on success
        } catch (err: any) {
            setError(err.message || '任务创建失败');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = async (task: LlmSearchTaskItem) => {
        setDownloadingId(task.id);
        try {
            const blob = await downloadLlmTaskResult(task.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `llm_search_result_${task.id.slice(0, 8)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(`下载失败: ${err.message}`);
        } finally {
            setDownloadingId(null);
        }
    };
    
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="h-full flex flex-col">
            <div className="bg-white p-6 rounded-lg border mb-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-600" />
                    创建分析任务
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分析指令 <span className="text-red-500">*</span></label>
                        <textarea 
                            value={query} 
                            onChange={e => setQuery(e.target.value)} 
                            placeholder="例如：查找所有关于固态电池的新闻，并按发布时间排序..." 
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">时间范围</label>
                            <div className="flex items-center gap-2">
                                <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="bg-gray-50 border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                                <span className="text-gray-500">-</span>
                                <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="bg-gray-50 border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">指定情报源 (可选)</label>
                            <MultiSelect 
                                options={availableSources} 
                                selected={selectedSources} 
                                onChange={setSelectedSources}
                                placeholder="选择情报源..."
                            />
                        </div>
                    </div>

                    {error && <div className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</div>}

                    <div className="flex justify-end">
                        <button 
                            onClick={handleSubmit} 
                            disabled={isProcessing || !query.trim()} 
                            className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-purple-300 flex items-center gap-2 transition-colors"
                        >
                            {isProcessing ? <Spinner /> : <SparklesIcon className="w-5 h-5" />}
                            <span>{isProcessing ? '分析中...' : '开始分拣'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-lg border overflow-hidden flex flex-col shadow-sm">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">任务历史</h3>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">共 {pagination.total} 条</span>
                        <button onClick={() => fetchTasks(1)} className="text-gray-500 hover:text-blue-600">
                             <RefreshIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                     <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">任务ID</th>
                                <th className="px-6 py-3">分析指令摘要</th>
                                <th className="px-6 py-3">创建时间</th>
                                <th className="px-6 py-3">处理总量</th>
                                <th className="px-6 py-3">匹配数量</th>
                                <th className="px-6 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingTasks ? (
                                <tr><td colSpan={6} className="text-center py-10"><div className="flex justify-center items-center"><Spinner small={false} /> <span className="text-gray-500 ml-2">加载中...</span></div></td></tr>
                            ) : tasks.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-400">暂无任务记录</td></tr>
                            ) : (
                                tasks.map(task => (
                                    <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-xs">{task.id.slice(0, 8)}...</td>
                                        <td className="px-6 py-4 max-w-xs truncate" title={task.prompt_text}>{task.prompt_text}</td>
                                        <td className="px-6 py-4">{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                                        {/* FIX: Use correct field processed_count according to API */}
                                        <td className="px-6 py-4">{task.processed_count}</td>
                                        <td className="px-6 py-4 font-semibold text-purple-600">{task.matched_count}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleDownload(task)} 
                                                disabled={downloadingId === task.id}
                                                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50 transition-colors"
                                            >
                                                {downloadingId === task.id ? <Spinner small /> : <DownloadIcon className="w-3 h-3" />}
                                                CSV
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                     </table>
                </div>
                {pagination.total > 0 && (
                    <div className="p-3 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                         <button 
                            onClick={() => fetchTasks(pagination.page - 1)} 
                            disabled={pagination.page <= 1}
                            className="p-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            <ChevronLeftIcon className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-gray-600">第 {pagination.page} / {totalPages} 页</span>
                         <button 
                            onClick={() => fetchTasks(pagination.page + 1)} 
                            disabled={pagination.page >= totalPages}
                            className="p-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
