
import React, { useState, useEffect, useCallback } from 'react';
import { GenericPoint, GenericTask } from '../../types';
import { createGenericPoint, updateGenericPoint, getGenericSources, getGenericPoints, getGenericTasks } from '../../api';
import { PlusIcon, RefreshIcon, ServerIcon, ClockIcon, CheckCircleIcon, ShieldExclamationIcon, PlayIcon, StopIcon } from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PointCard: React.FC<{ point: GenericPoint; onEdit: (p: GenericPoint) => void; onToggle: (p: GenericPoint) => void }> = ({ point, onEdit, onToggle }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
        <div>
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-800 text-lg">{point.point_name}</h4>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${point.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {point.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ServerIcon className="w-3 h-3"/> {point.source_name}</p>
            <p className="text-xs text-blue-600 truncate mb-3" title={point.point_url}>{point.point_url}</p>
            <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded w-fit">
                <ClockIcon className="w-3 h-3" /> {point.cron_schedule}
            </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-50">
            <button onClick={() => onToggle(point)} className={`p-1.5 rounded-lg transition-colors ${point.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                {point.is_active ? <StopIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
            </button>
            <button onClick={() => onEdit(point)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                编辑
            </button>
        </div>
    </div>
);

const TaskRow: React.FC<{ task: GenericTask }> = ({ task }) => (
    <tr className="bg-white border-b hover:bg-gray-50">
        <td className="px-6 py-4 font-medium text-gray-900">{task.source_name}</td>
        <td className="px-6 py-4">{task.point_name}</td>
        <td className="px-6 py-4">
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">{task.task_type}</span>
        </td>
        <td className="px-6 py-4">
            <span className="font-mono text-xs text-gray-500">{task.stage}</span>
        </td>
        <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate" title={task.detail_info}>{task.detail_info}</td>
        <td className="px-6 py-4 text-xs text-gray-400">{new Date(task.start_time).toLocaleString()}</td>
    </tr>
);

export const GenericCrawlerManager: React.FC = () => {
    const [points, setPoints] = useState<GenericPoint[]>([]);
    const [tasks, setTasks] = useState<GenericTask[]>([]);
    const [sources, setSources] = useState<{ source_name: string }[]>([]);
    const [isLoadingPoints, setIsLoadingPoints] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    
    // Task Pagination
    const [taskPage, setTaskPage] = useState(1);
    const [taskTotal, setTaskTotal] = useState(0);

    // Edit Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState<GenericPoint | null>(null);
    const [formData, setFormData] = useState({
        source_name: '',
        point_name: '',
        point_url: '',
        cron_schedule: '0 */6 * * *',
    });

    const fetchPoints = useCallback(async () => {
        setIsLoadingPoints(true);
        try {
            const allPoints: GenericPoint[] = [];
            // Ideally backend supports getting all, but based on API doc we might need to filter by source?
            // "GET /api/crawler/generic/points?source_name=..."
            // Let's first get sources then iterate if needed, or assume backend supports no param for all
            const s = await getGenericSources();
            setSources(s);
            
            // Fetch points for each source (or all if backend supports empty query)
            // Trying empty first
            try {
                const res = await getGenericPoints(''); 
                if (res) allPoints.push(...res);
            } catch {
                // If empty query fails, iterate sources
                for (const src of s) {
                    const res = await getGenericPoints(src.source_name);
                    if (res) allPoints.push(...res);
                }
            }
            setPoints(allPoints);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingPoints(false);
        }
    }, []);

    const fetchTasks = useCallback(async () => {
        setIsLoadingTasks(true);
        try {
            const res = await getGenericTasks({ page: taskPage, limit: 10 });
            setTasks(res.items);
            setTaskTotal(res.total);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingTasks(false);
        }
    }, [taskPage]);

    useEffect(() => {
        fetchPoints();
    }, [fetchPoints]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleSavePoint = async () => {
        try {
            if (editingPoint) {
                await updateGenericPoint(editingPoint.id, formData);
            } else {
                await createGenericPoint(formData);
            }
            setIsModalOpen(false);
            setEditingPoint(null);
            fetchPoints();
        } catch (e) {
            alert('保存失败');
        }
    };

    const handleTogglePoint = async (point: GenericPoint) => {
        try {
            await updateGenericPoint(point.id, { is_active: !point.is_active });
            fetchPoints();
        } catch (e) {
            alert('操作失败');
        }
    };

    const openCreateModal = () => {
        setEditingPoint(null);
        setFormData({ source_name: '', point_name: '', point_url: '', cron_schedule: '0 */6 * * *' });
        setIsModalOpen(true);
    };

    const openEditModal = (point: GenericPoint) => {
        setEditingPoint(point);
        setFormData({
            source_name: point.source_name,
            point_name: point.point_name,
            point_url: point.point_url,
            cron_schedule: point.cron_schedule
        });
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 overflow-hidden bg-gray-50/50">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <ServerIcon className="w-6 h-6 text-indigo-600"/> 通用爬虫管理 (Generic Crawler)
                </h3>
                <div className="flex gap-2">
                    <button onClick={fetchPoints} className="p-2 text-gray-500 bg-white border rounded-lg shadow-sm hover:text-indigo-600"><RefreshIcon className={`w-5 h-5 ${isLoadingPoints?'animate-spin':''}`}/></button>
                    <button onClick={openCreateModal} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-sm hover:bg-indigo-700 transition-colors">
                        <PlusIcon className="w-4 h-4"/> 新建采集点
                    </button>
                </div>
            </div>

            {/* Points Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {points.map(p => (
                    <PointCard key={p.id} point={p} onEdit={openEditModal} onToggle={handleTogglePoint} />
                ))}
            </div>

            {/* Tasks Table */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mt-4">
                <div className="p-4 border-b bg-gray-50/80 backdrop-blur-sm flex justify-between items-center">
                    <h4 className="font-bold text-gray-700">近期任务执行记录</h4>
                    <button onClick={fetchTasks} className="p-1.5 text-gray-400 hover:text-indigo-600"><RefreshIcon className={`w-4 h-4 ${isLoadingTasks?'animate-spin':''}`}/></button>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">来源</th>
                                <th className="px-6 py-3">采集点</th>
                                <th className="px-6 py-3">任务类型</th>
                                <th className="px-6 py-3">当前阶段</th>
                                <th className="px-6 py-3">详情</th>
                                <th className="px-6 py-3">开始时间</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoadingTasks ? <tr><td colSpan={6} className="text-center py-10"><Spinner /></td></tr> : 
                             tasks.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">暂无任务</td></tr> :
                             tasks.map(t => <TaskRow key={t.id} task={t} />)
                            }
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="p-3 border-t bg-gray-50 flex justify-between items-center px-6">
                    <span className="text-xs text-gray-500">共 {taskTotal} 条记录</span>
                    <div className="flex gap-2">
                        <button disabled={taskPage <= 1} onClick={() => setTaskPage(p => p - 1)} className="px-3 py-1 bg-white border rounded text-xs disabled:opacity-50">上一页</button>
                        <span className="text-xs font-medium self-center">{taskPage}</span>
                        <button disabled={tasks.length < 10} onClick={() => setTaskPage(p => p + 1)} className="px-3 py-1 bg-white border rounded text-xs disabled:opacity-50">下一页</button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">{editingPoint ? '编辑采集点' : '新建采集点'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">来源名称</label>
                                <input type="text" value={formData.source_name} onChange={e => setFormData({...formData, source_name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="例如：盖世汽车" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">采集点名称</label>
                                <input type="text" value={formData.point_name} onChange={e => setFormData({...formData, point_name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="例如：行业资讯" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">目标 URL</label>
                                <input type="url" value={formData.point_url} onChange={e => setFormData({...formData, point_url: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Crontab 频率</label>
                                <input type="text" value={formData.cron_schedule} onChange={e => setFormData({...formData, cron_schedule: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0 */6 * * *" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg text-sm font-bold">取消</button>
                            <button onClick={handleSavePoint} className="px-4 py-2 text-white bg-indigo-600 rounded-lg text-sm font-bold">保存</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
