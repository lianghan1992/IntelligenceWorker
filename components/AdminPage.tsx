import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getProcessingTasks, getPoints } from '../api';
import { ProcessingTask, ApiProcessingTask, Subscription } from '../types';

const StatusBadge: React.FC<{ status: ProcessingTask['status'] }> = ({ status }) => {
    const details = {
        pending: { text: '待处理', color: 'bg-gray-100 text-gray-800' },
        processing: { text: '处理中', color: 'bg-blue-100 text-blue-800 animate-pulse' },
        completed: { text: '成功', color: 'bg-green-100 text-green-800' },
        failed: { text: '失败', color: 'bg-red-100 text-red-800' },
    };
    const statusInfo = details[status] || details.pending;
    return <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}>{statusInfo.text}</span>;
};

const TaskManagement: React.FC = () => {
    const [tasks, setTasks] = useState<ProcessingTask[]>([]);
    const [pointsMap, setPointsMap] = useState<Map<string, Subscription>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters state
    const [statusFilter, setStatusFilter] = useState(''); // '' for all
    const [sourceFilter, setSourceFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [pointsData, tasksData] = await Promise.all([
                    getPoints(),
                    getProcessingTasks({ status: statusFilter || undefined })
                ]);
                
                const pMap = new Map(pointsData.map(p => [p.id, p]));
                setPointsMap(pMap);
                
                const enhancedTasks = tasksData.items.map((task: ApiProcessingTask) => ({
                    ...task,
                    source_name: pMap.get(task.point_id)?.source_name || '未知',
                    point_name: pMap.get(task.point_id)?.point_name || '未知',
                }));

                setTasks(enhancedTasks);
            } catch (err) {
                setError(err instanceof Error ? err.message : '发生未知错误');
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, [statusFilter]);

    const displayedTasks = useMemo(() => {
        return tasks.filter(task => {
            const sourceMatch = !sourceFilter || task.source_name.toLowerCase().includes(sourceFilter.toLowerCase());
            const startDateMatch = !startDate || new Date(task.created_at) >= new Date(startDate);
            const endDateMatch = !endDate || new Date(task.created_at) <= new Date(endDate + 'T23:59:59');
            return sourceMatch && startDateMatch && endDateMatch;
        });
    }, [tasks, sourceFilter, startDate, endDate]);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">情报采集任务管理</h2>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">任务状态</label>
                        <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">全部</option>
                            <option value="completed">成功</option>
                            <option value="failed">失败</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-700">情报源</label>
                        <input type="text" placeholder="按名称搜索..." value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-700">开始日期</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-700">结束日期</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">情报源</th>
                            <th scope="col" className="px-6 py-3">情报点</th>
                            <th scope="col" className="px-6 py-3">触发时间</th>
                            <th scope="col" className="px-6 py-3">完成时间</th>
                            <th scope="col" className="px-6 py-3">状态</th>
                            <th scope="col" className="px-6 py-3">日志/结果</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedTasks.map((task) => (
                            <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{task.source_name}</td>
                                <td className="px-6 py-4">{task.point_name}</td>
                                <td className="px-6 py-4">{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                                <td className="px-6 py-4">{new Date(task.updated_at).toLocaleString('zh-CN')}</td>
                                <td className="px-6 py-4"><StatusBadge status={task.status} /></td>
                                <td className="px-6 py-4 max-w-sm truncate" title={task.log || '无日志'}>{task.log || 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {isLoading && <div className="text-center p-4">加载中...</div>}
                {error && <div className="text-center p-4 text-red-500">{error}</div>}
                {!isLoading && displayedTasks.length === 0 && <div className="text-center p-10 text-gray-500">暂无符合条件的任务</div>}
            </div>
        </div>
    );
}

export const AdminPage: React.FC = () => {
    return (
        <div className="flex h-full bg-gray-50">
            <main className="flex-1 overflow-y-auto">
                <TaskManagement />
            </main>
        </div>
    );
};