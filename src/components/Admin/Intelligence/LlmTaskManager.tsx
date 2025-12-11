
import React, { useState, useEffect, useCallback } from 'react';
import { getSpiderSources, createIntelLlmTask, getIntelLlmTasks, downloadIntelLlmTaskReport } from '../../../api/intelligence';
import { getMe } from '../../../api/auth';
import { SpiderSource, IntelLlmTask } from '../../../types';
import { SparklesIcon, RefreshIcon, DownloadIcon, ClockIcon, CheckCircleIcon, ShieldExclamationIcon, PlayIcon } from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const StatusBadge: React.FC<{ status: string; progress: number }> = ({ status, progress }) => {
    switch (status) {
        case 'completed': 
            return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1"><CheckCircleIcon className="w-3 h-3"/> 完成</span>;
        case 'analyzing': 
            return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1"><PlayIcon className="w-3 h-3 animate-pulse"/> 分析中 {progress}%</span>;
        case 'failed': 
            return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1"><ShieldExclamationIcon className="w-3 h-3"/> 失败</span>;
        default: 
            return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 flex items-center gap-1"><ClockIcon className="w-3 h-3"/> 等待中</span>;
    }
};

export const LlmTaskManager: React.FC = () => {
    // Form State
    const [description, setDescription] = useState('');
    const [timeRange, setTimeRange] = useState('');
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [needSummary, setNeedSummary] = useState(false);
    
    // Data State
    const [sources, setSources] = useState<SpiderSource[]>([]);
    const [tasks, setTasks] = useState<IntelLlmTask[]>([]);
    const [userUuid, setUserUuid] = useState<string>('');
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        const init = async () => {
            try {
                // Get Current User ID
                const user = await getMe();
                setUserUuid(user.id);

                // Get Sources
                const srcRes = await getSpiderSources();
                setSources(srcRes);

                // Get Tasks
                fetchTasks();
            } catch (e) {
                console.error("Initialization failed", e);
            }
        };
        init();
    }, []);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const res = await getIntelLlmTasks({ page: 1, page_size: 50 }); // Fetch last 50 tasks
            setTasks(res.items || []);
        } catch (e) {
            console.error("Failed to fetch tasks", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!description.trim() || !userUuid) return;
        setIsCreating(true);
        try {
            await createIntelLlmTask({
                user_uuid: userUuid,
                description,
                time_range: timeRange || undefined,
                source_uuids: selectedSources.length > 0 ? selectedSources : undefined,
                need_summary: needSummary
            });
            
            // Reset Form
            setDescription('');
            setTimeRange('');
            setNeedSummary(false);
            setSelectedSources([]);
            
            // Refresh list
            fetchTasks();
        } catch (e) {
            alert("任务创建失败，请稍后重试");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDownload = async (task: IntelLlmTask) => {
        setIsDownloading(task.uuid);
        try {
            const blob = await downloadIntelLlmTaskReport(task.uuid);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${task.uuid.slice(0, 8)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert("下载失败");
        } finally {
            setIsDownloading(null);
        }
    };

    const toggleSource = (uuid: string) => {
        setSelectedSources(prev => 
            prev.includes(uuid) ? prev.filter(id => id !== uuid) : [...prev, uuid]
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Create Task Panel */}
            <div className="bg-white border-b border-gray-200 p-6 shadow-sm z-10 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-600" />
                    新建 LLM 智能分析任务
                </h3>
                
                <div className="space-y-4">
                    {/* Main Description */}
                    <div>
                        <input 
                            type="text" 
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-base shadow-inner"
                            placeholder="输入分析意图 (例如: '整理问界汽车近期发布的新技术')"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Time Range */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">时间范围 (可选)</label>
                            <input 
                                type="text" 
                                className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm focus:border-purple-500 outline-none"
                                placeholder="e.g. 2024-01 或 2024-01,2024-03"
                                value={timeRange}
                                onChange={e => setTimeRange(e.target.value)}
                            />
                        </div>

                        {/* Summary Toggle */}
                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg w-full border border-transparent hover:border-gray-200 transition-all">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                    checked={needSummary}
                                    onChange={e => setNeedSummary(e.target.checked)}
                                />
                                <span className="text-sm font-medium text-gray-700">生成智能综述 (Summary)</span>
                            </label>
                        </div>
                    </div>

                    {/* Source Selection (Simplified) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">数据来源 (可选，默认全部)</label>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar p-1">
                            {sources.map(src => (
                                <button
                                    key={src.uuid}
                                    onClick={() => toggleSource(src.uuid)}
                                    className={`px-3 py-1 text-xs rounded-full border transition-all ${
                                        selectedSources.includes(src.uuid) 
                                            ? 'bg-purple-100 text-purple-700 border-purple-200 font-bold' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {src.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button 
                            onClick={handleCreate}
                            disabled={isCreating || !description.trim()}
                            className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl shadow-md hover:bg-purple-700 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isCreating ? <Spinner /> : <SparklesIcon className="w-4 h-4" />}
                            开始分析
                        </button>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700">任务列表</h3>
                    <button onClick={fetchTasks} className="p-2 text-gray-500 hover:bg-white rounded-lg transition-colors">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3">任务描述</th>
                                <th className="px-6 py-3">状态</th>
                                <th className="px-6 py-3">创建时间</th>
                                <th className="px-6 py-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tasks.length === 0 ? (
                                <tr><td colSpan={4} className="py-8 text-center text-gray-400">暂无任务</td></tr>
                            ) : (
                                tasks.map(task => (
                                    <tr key={task.uuid} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 max-w-md truncate" title={task.description}>
                                            {task.description}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={task.status} progress={task.progress} />
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono">
                                            {new Date(task.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {task.status === 'completed' && (
                                                <button 
                                                    onClick={() => handleDownload(task)}
                                                    disabled={isDownloading === task.uuid}
                                                    className="text-purple-600 hover:text-purple-800 font-bold text-xs flex items-center gap-1 ml-auto disabled:opacity-50"
                                                >
                                                    {isDownloading === task.uuid ? <Spinner /> : <DownloadIcon className="w-3.5 h-3.5" />}
                                                    下载报告
                                                </button>
                                            )}
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
