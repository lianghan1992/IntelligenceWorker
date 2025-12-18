
import React, { useState, useEffect, useCallback } from 'react';
import { GenericPoint, GenericTask } from '../../types';
import { createGenericPoint, updateGenericPoint, getSourcesAndPoints, getGenericTasks } from '../../api';
import { PlusIcon, RefreshIcon, ServerIcon, ClockIcon, PlayIcon, StopIcon, GearIcon, ViewListIcon } from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Sub-components ---
/**
 * Fix: Use point.name and point.url as they are standard on SpiderPoint which GenericPoint extends.
 */
const PointCard: React.FC<{ point: GenericPoint; onEdit: (p: GenericPoint) => void; onToggle: (p: GenericPoint) => void }> = ({ point, onEdit, onToggle }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-indigo-200 group flex flex-col h-full">
        <div className="flex justify-between items-start mb-3">
            <div>
                <h4 className="font-bold text-slate-800 text-base line-clamp-1" title={point.name}>{point.name}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <ServerIcon className="w-3.5 h-3.5"/> {point.source_name}
                </div>
            </div>
            <div className={`w-2.5 h-2.5 rounded-full ${point.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></div>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-2 mb-4 border border-slate-100">
            <p className="text-xs text-slate-600 truncate font-mono" title={point.url}>{point.url}</p>
        </div>
        
        <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
                <ClockIcon className="w-3.5 h-3.5" /> {point.cron_schedule}
            </div>
            <div className="flex gap-2">
                <button onClick={() => onToggle(point)} className={`p-1.5 rounded-lg transition-colors ${point.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`} title={point.is_active ? "暂停" : "启用"}>
                    {point.is_active ? <StopIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                </button>
                <button onClick={() => onEdit(point)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="编辑">
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
            // Get all sources and their points
            const sources = await getSourcesAndPoints();
            const allPoints: GenericPoint[] = [];
            
            // Filter for generic points
            for (const src of sources) {
                if (src.points) {
                    for (const p of src.points) {
                        if (p.mode === 'generic' || p.type === 'generic') {
                             // Map IntelligencePointPublic to GenericPoint
                             // Fix: Removed non-existent properties 'point_name', 'point_url', 'created_at', and 'updated_at' to match GenericPoint type definition.
                             allPoints.push({
                                 id: p.id,
                                 uuid: p.uuid || p.id,
                                 source_uuid: p.source_uuid || src.uuid || src.id,
                                 source_name: p.source_name || src.source_name,
                                 name: p.name || p.point_name || 'Unnamed',
                                 url: p.url || p.point_url || '',
                                 cron_schedule: p.cron_schedule,
                                 is_active: p.is_active,
                                 last_crawled_at: p.last_crawled_at,
                                 initial_pages: p.initial_pages,
                                 list_hint: p.list_hint || p.extra_hint,
                                 list_filters: p.list_filters || p.url_filters
                             });
                        }
                    }
                }
            }
            setPoints(allPoints);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, []);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getGenericTasks({ page: taskPage, limit: 15 });
            setTasks(res.items.map((t: any) => ({
                id: t.id,
                source_name: t.source_name,
                point_name: t.point_name,
                url: t.url,
                task_type: t.task_type,
                stage: t.stage || '',
                detail_info: t.detail_info || '',
                start_time: t.start_time,
                end_time: t.end_time,
                created_at: t.created_at
            })));
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
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex gap-6">
                    <button onClick={() => setActiveView('points')} className={`text-sm font-bold flex items-center gap-2 pb-2 border-b-2 transition-all ${activeView === 'points' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        <GearIcon className="w-4 h-4" /> 采集点配置
                    </button>
                    <button onClick={() => setActiveView('tasks')} className={`text-sm font-bold flex items-center gap-2 pb-2 border-b-2 transition-all ${activeView === 'tasks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        <ViewListIcon className="w-4 h-4" /> 任务监控
                    </button>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => activeView === 'points' ? fetchPoints() : fetchTasks()} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors shadow-sm">
                        <RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`} />
                    </button>
                    {activeView === 'points' && (
                        <button onClick={() => { setEditingPoint(null); setFormData({ source_name: '', point_name: '', point_url: '', cron_schedule: '0 */6 * * *' }); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition-all hover:-translate-y-0.5">
                            <PlusIcon className="w-3.5 h-3.5" /> 新建
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/50 p-6 custom-scrollbar">
                {activeView === 'points' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {points.map(p => <PointCard key={p.id} point={p} onEdit={(pt) => { setEditingPoint(pt); setFormData({source_name:pt.source_name || '', point_name:pt.name || '', point_url:pt.url || '', cron_schedule:pt.cron_schedule}); setIsModalOpen(true); }} onToggle={handleTogglePoint} />)}
                        {points.length === 0 && !isLoading && (
                            <div className="col-span-full text-center py-20 text-slate-400">暂无配置</div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-gray-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">来源 / 采集点</th>
                                    <th className="px-6 py-4">类型</th>
                                    <th className="px-6 py-4">阶段</th>
                                    <th className="px-6 py-4">详情</th>
                                    <th className="px-6 py-4">开始时间</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {tasks.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{t.point_name}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{t.source_name}</div>
                                        </td>
                                        <td className="px-6 py-4"><span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100">{t.task_type}</span></td>
                                        <td className="px-6 py-4 font-medium text-slate-700">{t.stage}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-500 max-w-xs truncate" title={t.detail_info}>{t.detail_info}</td>
                                        <td className="px-6 py-4 text-xs text-slate-400 tabular-nums">{t.start_time ? new Date(t.start_time).toLocaleString() : '-'}</td>
                                    </tr>
                                ))}
                                {tasks.length === 0 && !isLoading && (
                                    <tr><td colSpan={5} className="text-center py-10 text-slate-400">暂无任务记录</td></tr>
                                )}
                            </tbody>
                        </table>
                        {/* Pagination controls for tasks */}
                        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white">
                            <span className="text-xs text-slate-400">共 {taskTotal} 条记录</span>
                            <div className="flex gap-2">
                                <button disabled={taskPage <= 1} onClick={() => setTaskPage(p=>p-1)} className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors">上一页</button>
                                <span className="text-xs font-medium px-2 py-1.5">{taskPage}</span>
                                <button disabled={tasks.length < 15} onClick={() => setTaskPage(p=>p+1)} className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors">下一页</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-white/20">
                        <h3 className="text-lg font-bold mb-6 text-slate-800 flex items-center gap-2">
                            <GearIcon className="w-5 h-5 text-indigo-600" />
                            {editingPoint ? '编辑' : '新建'}采集点
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">来源名称</label>
                                <input type="text" value={formData.source_name} onChange={e => setFormData({...formData, source_name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" placeholder="e.g. 盖世汽车" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">采集点名称</label>
                                <input type="text" value={formData.point_name} onChange={e => setFormData({...formData, point_name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" placeholder="e.g. 行业资讯" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">目标 URL</label>
                                <input type="url" value={formData.point_url} onChange={e => setFormData({...formData, point_url: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" placeholder="https://..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">CRON 表达式</label>
                                <input type="text" value={formData.cron_schedule} onChange={e => setFormData({...formData, cron_schedule: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow font-mono" placeholder="e.g. 0 */6 * * *" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">取消</button>
                            <button onClick={handleSavePoint} className="px-5 py-2.5 text-white bg-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md transition-all hover:scale-[1.02]">保存配置</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
