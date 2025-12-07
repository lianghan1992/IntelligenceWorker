
import React, { useState, useEffect, useCallback } from 'react';
import { SpiderSource, SpiderPoint } from '../../../types';
import { getSpiderSources, getSpiderPoints, createSpiderPoint, runSpiderPoint } from '../../../api/intelligence';
import { ServerIcon, RssIcon, PlusIcon, PlayIcon, RefreshIcon, ClockIcon } from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const SourceConfig: React.FC = () => {
    const [sources, setSources] = useState<SpiderSource[]>([]);
    const [selectedSource, setSelectedSource] = useState<SpiderSource | null>(null);
    const [points, setPoints] = useState<SpiderPoint[]>([]);
    const [isLoadingSources, setIsLoadingSources] = useState(false);
    const [isLoadingPoints, setIsLoadingPoints] = useState(false);
    const [runningPointId, setRunningPointId] = useState<string | null>(null);

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPointData, setNewPointData] = useState({ source_name: '', point_name: '', point_url: '', cron_schedule: '0 */4 * * *' });
    const [isCreating, setIsCreating] = useState(false);

    const fetchSources = useCallback(async () => {
        setIsLoadingSources(true);
        try {
            const res = await getSpiderSources();
            setSources(res);
            if (res.length > 0 && !selectedSource) {
                setSelectedSource(res[0]);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoadingSources(false); }
    }, [selectedSource]);

    const fetchPoints = useCallback(async () => {
        if (!selectedSource) return;
        setIsLoadingPoints(true);
        try {
            const res = await getSpiderPoints(selectedSource.source_name);
            setPoints(res);
        } catch (e) { console.error(e); }
        finally { setIsLoadingPoints(false); }
    }, [selectedSource]);

    useEffect(() => { fetchSources(); }, [fetchSources]);
    useEffect(() => { fetchPoints(); }, [fetchPoints]);

    const handleRunPoint = async (pointId: string) => {
        setRunningPointId(pointId);
        try {
            const res = await runSpiderPoint(pointId);
            if (res.ok) alert(`采集任务已触发，处理了 ${res.processed} 页`);
        } catch (e) { alert('触发失败'); }
        finally { setRunningPointId(null); }
    };

    const handleCreate = async () => {
        if (!newPointData.source_name || !newPointData.point_name || !newPointData.point_url) return;
        setIsCreating(true);
        try {
            await createSpiderPoint(newPointData);
            setShowCreateModal(false);
            setNewPointData({ source_name: '', point_name: '', point_url: '', cron_schedule: '0 */4 * * *' });
            fetchSources(); // Refresh sources in case a new one was created
            if (selectedSource?.source_name === newPointData.source_name) {
                fetchPoints();
            }
        } catch (e) { alert('创建失败'); }
        finally { setIsCreating(false); }
    };

    return (
        <div className="flex h-full gap-6">
            {/* Left: Sources List */}
            <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <ServerIcon className="w-4 h-4 text-indigo-600"/> 情报源
                    </h3>
                    <button onClick={fetchSources} className="p-1 hover:bg-gray-200 rounded text-gray-500"><RefreshIcon className="w-4 h-4"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sources.map(src => (
                        <button
                            key={src.id}
                            onClick={() => setSelectedSource(src)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedSource?.id === src.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-600'}`}
                        >
                            {src.source_name}
                        </button>
                    ))}
                    {sources.length === 0 && !isLoadingSources && <div className="text-center text-xs text-gray-400 py-4">暂无数据</div>}
                </div>
                <div className="p-3 border-t">
                    <button 
                        onClick={() => { setNewPointData(prev => ({...prev, source_name: ''})); setShowCreateModal(true); }}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" /> 新建源/点
                    </button>
                </div>
            </div>

            {/* Right: Points Table */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <RssIcon className="w-4 h-4 text-blue-600"/> 
                        {selectedSource ? `${selectedSource.source_name} - 采集点配置` : '采集点配置'}
                    </h3>
                    <button onClick={fetchPoints} className="p-1 hover:bg-gray-200 rounded text-gray-500"><RefreshIcon className="w-4 h-4"/></button>
                </div>
                
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3">采集点名称</th>
                                <th className="px-6 py-3">目标 URL</th>
                                <th className="px-6 py-3">Cron 计划</th>
                                <th className="px-6 py-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!selectedSource ? (
                                <tr><td colSpan={4} className="text-center py-10 text-gray-400">请选择一个情报源查看详情</td></tr>
                            ) : points.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-10 text-gray-400">该源下暂无采集点</td></tr>
                            ) : (
                                points.map(point => (
                                    <tr key={point.id} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{point.point_name}</td>
                                        <td className="px-6 py-4 text-gray-500 truncate max-w-xs" title={point.point_url}>{point.point_url}</td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3" /> {point.cron_schedule}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleRunPoint(point.id)}
                                                disabled={runningPointId === point.id}
                                                className="text-indigo-600 hover:text-indigo-800 font-medium text-xs border border-indigo-200 hover:bg-indigo-50 px-3 py-1 rounded transition-colors disabled:opacity-50"
                                            >
                                                {runningPointId === point.id ? '运行中...' : '立即运行'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">创建采集点</div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">情报源名称 (自动创建或选择)</label>
                                <input 
                                    type="text" 
                                    value={newPointData.source_name} 
                                    onChange={e => setNewPointData({...newPointData, source_name: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="例如：盖世汽车"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">采集点名称</label>
                                <input 
                                    type="text" 
                                    value={newPointData.point_name} 
                                    onChange={e => setNewPointData({...newPointData, point_name: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="例如：行业资讯"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">采集入口 URL</label>
                                <input 
                                    type="url" 
                                    value={newPointData.point_url} 
                                    onChange={e => setNewPointData({...newPointData, point_url: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Cron 调度</label>
                                <input 
                                    type="text" 
                                    value={newPointData.cron_schedule} 
                                    onChange={e => setNewPointData({...newPointData, cron_schedule: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">取消</button>
                            <button onClick={handleCreate} disabled={isCreating} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                {isCreating && <Spinner />} 创建
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
