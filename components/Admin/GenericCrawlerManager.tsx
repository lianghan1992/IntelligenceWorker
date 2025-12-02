
import React, { useState, useEffect, useCallback } from 'react';
import { GenericPoint, GenericTask } from '../../types';
import { createGenericPoint, updateGenericPoint, getGenericSources, getGenericPoints, getGenericTasks } from '../../api';
import { PlusIcon, RefreshIcon, ServerIcon, ClockIcon, PlayIcon, StopIcon, GearIcon, ViewListIcon } from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Sub-components ---
const PointCard: React.FC<{ point: GenericPoint; onEdit: (p: GenericPoint) => void; onToggle: (p: GenericPoint) => void }> = ({ point, onEdit, onToggle }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-indigo-200 group">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h4 className="font-bold text-slate-800 text-base">{point.point_name}</h4>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <ServerIcon className="w-3 h-3"/> {point.source_name}
                </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${point.is_active ? 'bg-green-500' : 'bg-slate-300'}`}></div>
        </div>
        
        <p className="text-xs text-blue-600 truncate bg-blue-50 px-2 py-1 rounded border border-blue-100 mb-3 font-mono" title={point.point_url}>{point.point_url}</p>
        
        <div className="flex justify-between items-center border-t border-slate-50 pt-3 mt-auto">
            <div className="flex items-center gap-1 text-xs text-slate-400">
                <ClockIcon className="w-3 h-3" /> {point.cron_schedule}
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onToggle(point)} className={`p-1.5 rounded-lg transition-colors ${point.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                    {point.is_active ? <StopIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                </button>
                <button onClick={() => onEdit(point)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <GearIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
);

export const GenericCrawlerManager: React.FC = () => {
    const [activeView, setActiveView] = useState<'points' | 'tasks'>('points');
    const [points, setPoints] = useState<GenericPoint[]>([]);
    const [tasks, setTasks] = useState<GenericTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Pagination for Tasks
    const [taskPage, setTaskPage] = useState(1);
    const [taskTotal, setTaskTotal] = useState(0);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState<GenericPoint | null>(null);
    const [formData, setFormData] = useState({ source_name: '', point_name: '', point_url: '', cron_schedule: '0 */6 * * *' });

    const fetchPoints = useCallback(async () => {
        setIsLoading(true);
        try {
            const sources = await getGenericSources();
            const allPoints: GenericPoint[] = [];
            for (const src of sources) {
                const res = await getGenericPoints(src.source_name);
                if (res) allPoints.push(...res);
            }
            setPoints(allPoints);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, []);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getGenericTasks({ page: taskPage, limit: 15 });
            setTasks(res.items);
            setTaskTotal(res.total);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [taskPage]);

    useEffect(() => {
        if (activeView === 'points') fetchPoints();
        else fetchTasks();
    }, [activeView, fetchPoints, fetchTasks]);

    const handleSavePoint = async () => {
        try {
            if (editingPoint) await updateGenericPoint(editingPoint.id, formData);
            else await createGenericPoint(formData);
            setIsModalOpen(false);
            fetchPoints();
        } catch (e) { alert('保存失败'); }
    };

    const handleTogglePoint = async (point: GenericPoint) => {
        try {
            await updateGenericPoint(point.id, { is_active: !point.is_active });
            fetchPoints();
        } catch (e) { alert('操作失败'); }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex gap-4">
                    <button onClick={() => setActiveView('points')} className={`text-sm font-bold flex items-center gap-2 pb-2 border-b-2 transition-all ${activeView === 'points' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        <GearIcon className="w-4 h-4" /> 采集点配置
                    </button>
                    <button onClick={() => setActiveView('tasks')} className={`text-sm font-bold flex items-center gap-2 pb-2 border-b-2 transition-all ${activeView === 'tasks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        <ViewListIcon className="w-4 h-4" /> 任务监控
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => activeView === 'points' ? fetchPoints() : fetchTasks()} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`} /></button>
                    {activeView === 'points' && (
                        <button onClick={() => { setEditingPoint(null); setFormData({ source_name: '', point_name: '', point_url: '', cron_schedule: '0 */6 * * *' }); setIsModalOpen(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition-colors">
                            <PlusIcon className="w-3 h-3" /> 新建
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/50 p-6 custom-scrollbar">
                {activeView === 'points' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {points.map(p => <PointCard key={p.id} point={p} onEdit={(pt) => { setEditingPoint(pt); setFormData({source_name:pt.source_name, point_name:pt.point_name, point_url:pt.point_url, cron_schedule:pt.cron_schedule}); setIsModalOpen(true); }} onToggle={handleTogglePoint} />)}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3">来源 / 采集点</th>
                                    <th className="px-6 py-3">类型</th>
                                    <th className="px-6 py-3">阶段</th>
                                    <th className="px-6 py-3">详情</th>
                                    <th className="px-6 py-3">开始时间</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {tasks.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3">
                                            <div className="font-bold text-slate-800">{t.point_name}</div>
                                            <div className="text-xs text-slate-400">{t.source_name}</div>
                                        </td>
                                        <td className="px-6 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">{t.task_type}</span></td>
                                        <td className="px-6 py-3 text-slate-700 font-medium">{t.stage}</td>
                                        <td className="px-6 py-3 text-xs font-mono text-slate-500 max-w-xs truncate">{t.detail_info}</td>
                                        <td className="px-6 py-3 text-xs text-slate-400">{new Date(t.start_time).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Pagination controls for tasks */}
                        <div className="p-3 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs text-slate-400">Total {taskTotal}</span>
                            <div className="flex gap-2">
                                <button disabled={taskPage <= 1} onClick={() => setTaskPage(p=>p-1)} className="px-3 py-1 text-xs border rounded hover:bg-slate-50 disabled:opacity-50">Prev</button>
                                <button disabled={tasks.length < 15} onClick={() => setTaskPage(p=>p+1)} className="px-3 py-1 text-xs border rounded hover:bg-slate-50 disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4 text-slate-800">{editingPoint ? '编辑' : '新建'}采集点</h3>
                        <div className="space-y-4">
                            <input type="text" value={formData.source_name} onChange={e => setFormData({...formData, source_name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="来源名称 (e.g. 盖世汽车)" />
                            <input type="text" value={formData.point_name} onChange={e => setFormData({...formData, point_name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="采集点名称 (e.g. 行业资讯)" />
                            <input type="url" value={formData.point_url} onChange={e => setFormData({...formData, point_url: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="https://..." />
                            <input type="text" value={formData.cron_schedule} onChange={e => setFormData({...formData, cron_schedule: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Crontab (e.g. 0 */6 * * *)" />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg text-sm font-bold hover:bg-slate-200">取消</button>
                            <button onClick={handleSavePoint} className="px-4 py-2 text-white bg-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-700">保存</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
