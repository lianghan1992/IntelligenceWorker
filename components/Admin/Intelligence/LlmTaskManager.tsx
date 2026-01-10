
import React, { useState, useEffect, useCallback } from 'react';
import { getSpiderSources, createIntelLlmTask, getIntelLlmTasks, downloadIntelLlmTaskReport } from '../../../api/intelligence';
import { getMe } from '../../../api/auth';
import { SpiderSource, IntelLlmTask } from '../../../types';
import { SparklesIcon, RefreshIcon, DownloadIcon, ClockIcon, CheckCircleIcon, ShieldExclamationIcon, PlayIcon, QuestionMarkCircleIcon } from '../../icons';

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
    const [startMonth, setStartMonth] = useState('');
    const [endMonth, setEndMonth] = useState('');
    
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [needSummary, setNeedSummary] = useState(false);
    
    // Debug/About State
    const [showAbout, setShowAbout] = useState(false);
    
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
                setSources(srcRes.items);

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
            // Construct time range string (e.g., "2024-01" or "2024-01,2024-03")
            const timeRangeParts = [startMonth, endMonth].filter(Boolean);
            const timeRange = timeRangeParts.length > 0 ? timeRangeParts.join(',') : undefined;

            await createIntelLlmTask({
                user_id: userUuid, // Fixed: use user_id to match backend
                description,
                time_range: timeRange,
                source_ids: selectedSources.length > 0 ? selectedSources : undefined, // Fixed: use source_ids to match backend
                need_summary: needSummary
            });
            
            // Reset Form
            setDescription('');
            setStartMonth('');
            setEndMonth('');
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
        setIsDownloading(task.id);
        try {
            const blob = await downloadIntelLlmTaskReport(task.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${task.id.slice(0, 8)}.csv`;
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
        <div className="flex flex-col h-full bg-slate-50/50 relative">
            {/* Create Task Panel */}
            <div className="bg-white border-b border-gray-200 p-6 shadow-sm z-10 flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-purple-600" />
                        新建 LLM 智能分析任务
                    </h3>
                    <button 
                        onClick={() => setShowAbout(true)} 
                        className="text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
                        title="查看版本信息"
                    >
                        <QuestionMarkCircleIcon className="w-4 h-4" /> 关于
                    </button>
                </div>
                
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
                        {/* Time Range - Replaced single input with Start/End Month Pickers */}
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">起始月份</label>
                                <input 
                                    type="month" 
                                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm focus:border-purple-500 outline-none h-[38px] transition-colors cursor-pointer"
                                    value={startMonth}
                                    onChange={e => setStartMonth(e.target.value)}
                                />
                            </div>
                            <div className="text-gray-400 pb-2 font-bold">-</div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">结束月份</label>
                                <input 
                                    type="month" 
                                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm focus:border-purple-500 outline-none h-[38px] transition-colors cursor-pointer"
                                    value={endMonth}
                                    onChange={e => setEndMonth(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Summary Toggle */}
                        <div className="flex items-center">
                            {/* Added mt-6 to align with the inputs (label height + gap) */}
                            <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg w-full border border-transparent hover:border-gray-200 transition-all h-[38px] mt-6">
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
                                    key={src.id}
                                    onClick={() => toggleSource(src.id)}
                                    className={`px-3 py-1 text-xs rounded-full border transition-all ${
                                        selectedSources.includes(src.id) 
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
                                <th className="px-6 py-3">时间范围</th>
                                <th className="px-6 py-3">状态</th>
                                <th className="px-6 py-3">创建时间</th>
                                <th className="px-6 py-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tasks.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-gray-400">暂无任务</td></tr>
                            ) : (
                                tasks.map(task => (
                                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 max-w-md truncate" title={task.description}>
                                            {task.description}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                            {task.time_range || '-'}
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
                                                    disabled={isDownloading === task.id}
                                                    className="text-purple-600 hover:text-purple-800 font-bold text-xs flex items-center gap-1 ml-auto disabled:opacity-50"
                                                >
                                                    {isDownloading === task.id ? <Spinner /> : <DownloadIcon className="w-3.5 h-3.5" />}
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

            {/* About Modal */}
            {showAbout && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-gray-100">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <QuestionMarkCircleIcon className="w-6 h-6" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-800 mb-6">关于 Auto Insight</h4>
                        <div className="space-y-3 text-sm text-gray-600 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="flex justify-between">
                                <span>版本号:</span>
                                <span className="font-mono font-bold text-indigo-600">0.0.1</span>
                            </p>
                            <p className="flex justify-between">
                                <span>更新日期:</span>
                                <span className="font-mono">2025.12.12 15:05</span>
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowAbout(false)} 
                            className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md active:scale-95"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
