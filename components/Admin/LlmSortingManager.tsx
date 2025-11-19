
import React, { useState, useEffect } from 'react';
import { LlmSearchRequest, LlmTaskRecord, SystemSource } from '../../types';
import { createLlmSearchTask, downloadLlmTaskResult, getSources } from '../../api';
import { DownloadIcon, SparklesIcon, RefreshIcon } from '../icons';

const Spinner: React.FC<{ small?: boolean }> = ({ small }) => (
    <svg className={`animate-spin ${small ? 'h-4 w-4' : 'h-5 w-5'} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const LlmSortingManager: React.FC = () => {
    const [query, setQuery] = useState('');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [availableSources, setAvailableSources] = useState<SystemSource[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [tasks, setTasks] = useState<LlmTaskRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchSources = async () => {
            try {
                const sources = await getSources();
                setAvailableSources(sources);
            } catch (e) {
                console.error("Failed to load sources", e);
            }
        };
        fetchSources();
    }, []);

    const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const options = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedSources(options);
    };

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
            const response = await createLlmSearchTask(payload);
            const newTask: LlmTaskRecord = {
                ...response,
                query_text: query,
                created_at: Date.now()
            };
            setTasks(prev => [newTask, ...prev]);
            // Clear form optionally? User might want to run similar query.
        } catch (err: any) {
            setError(err.message || '任务创建失败');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = async (task: LlmTaskRecord) => {
        setDownloadingId(task.task_id);
        try {
            const blob = await downloadLlmTaskResult(task.task_id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `llm_search_result_${task.task_id.slice(0, 8)}.csv`;
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">指定情报源 (按住Ctrl多选)</label>
                            <select multiple value={selectedSources} onChange={handleSourceChange} className="bg-gray-50 border border-gray-300 rounded-lg p-2 w-full h-[42px] focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                                {availableSources.map(s => <option key={s.id} value={s.source_name}>{s.source_name}</option>)}
                            </select>
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
                    <h3 className="font-bold text-gray-800">任务历史 (本次会话)</h3>
                    <span className="text-xs text-gray-500">共 {tasks.length} 条</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                     <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">任务ID</th>
                                <th className="px-6 py-3">分析指令摘要</th>
                                <th className="px-6 py-3">处理时间</th>
                                <th className="px-6 py-3">处理总量</th>
                                <th className="px-6 py-3">匹配数量</th>
                                <th className="px-6 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-400">暂无任务记录</td></tr>
                            ) : (
                                tasks.map(task => (
                                    <tr key={task.task_id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-xs">{task.task_id.slice(0, 8)}...</td>
                                        <td className="px-6 py-4 max-w-xs truncate" title={task.query_text}>{task.query_text}</td>
                                        <td className="px-6 py-4">{new Date(task.created_at).toLocaleTimeString()}</td>
                                        <td className="px-6 py-4">{task.total_processed}</td>
                                        <td className="px-6 py-4 font-semibold text-purple-600">{task.matched_count}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleDownload(task)} 
                                                disabled={downloadingId === task.task_id}
                                                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50 transition-colors"
                                            >
                                                {downloadingId === task.task_id ? <Spinner small /> : <DownloadIcon className="w-3 h-3" />}
                                                CSV
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                     </table>
                </div>
            </div>
        </div>
    );
};
