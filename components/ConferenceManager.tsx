import React, { useState, useEffect, useCallback } from 'react';
import { BililiveStream } from '../types';
import {
    getAllBililiveStreams,
    addBililiveStream,
    startBililiveStream,
    stopBililiveStream,
    deleteBililiveStream,
} from '../api';
import { ConfirmationModal } from './ConfirmationModal';
import { PlusIcon, TrashIcon, PlayIcon, StopIcon, CloseIcon } from './icons';

const Spinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-gray-500" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const AddStreamModal: React.FC<{
    onClose: () => void;
    onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!url.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            await addBililiveStream(url);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || '添加失败，请检查URL或服务状态。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">添加Bilibili直播间监控</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                    <div>
                        <label htmlFor="stream-url" className="block text-sm font-medium text-gray-700 mb-1">直播间 URL</label>
                        <input
                            id="stream-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://live.bilibili.com/..."
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                    <button onClick={handleSubmit} disabled={!url.trim() || isLoading} className="py-2 px-6 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center min-w-[80px]">
                        {isLoading ? <Spinner className="h-5 w-5 text-white" /> : '添加'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ConferenceManager: React.FC = () => {
    const [streams, setStreams] = useState<BililiveStream[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState<string | null>(null); // Track stream ID being mutated
    const [error, setError] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [streamToDelete, setStreamToDelete] = useState<BililiveStream | null>(null);

    const loadStreams = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getAllBililiveStreams();
            setStreams(data);
        } catch (err: any) {
            setError(err.message || '无法加载直播间列表');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStreams();
    }, [loadStreams]);

    const handleToggleListen = async (stream: BililiveStream) => {
        setIsMutating(stream.id);
        setError('');
        try {
            const updatedStream = stream.listening
                ? await stopBililiveStream(stream.id)
                : await startBililiveStream(stream.id);
            setStreams(prev => prev.map(s => s.id === stream.id ? updatedStream : s));
        } catch (err: any) {
            setError(`操作失败: ${err.message}`);
        } finally {
            setIsMutating(null);
        }
    };

    const handleDelete = async () => {
        if (!streamToDelete) return;
        setIsMutating(streamToDelete.id);
        setError('');
        try {
            await deleteBililiveStream(streamToDelete.id);
            setStreamToDelete(null);
            await loadStreams();
        } catch (err: any) {
            setError(`删除失败: ${err.message}`);
        } finally {
            setIsMutating(null);
        }
    };
    
    const StatusBadge: React.FC<{ active: boolean; activeText: string; inactiveText: string; color: 'green' | 'blue' | 'yellow' }> = 
    ({ active, activeText, inactiveText, color }) => {
        const colors = {
            green: 'bg-green-100 text-green-800',
            blue: 'bg-blue-100 text-blue-800',
            yellow: 'bg-yellow-100 text-yellow-800',
        };
        const dotColors = {
            green: 'bg-green-500',
            blue: 'bg-blue-500',
            yellow: 'bg-yellow-500',
        }
        return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${active ? colors[color] : 'bg-gray-100 text-gray-700'}`}>
                {active && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[color]}`}></span>}
                {active ? activeText : inactiveText}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">直播监控管理</h2>
                <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                    <PlusIcon className="w-5 h-5" />
                    <span>添加直播间</span>
                </button>
            </div>
            
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">主播/直播间</th>
                            <th className="px-6 py-3">平台</th>
                            <th className="px-6 py-3">直播状态</th>
                            <th className="px-6 py-3">监听状态</th>
                            <th className="px-6 py-3">录制状态</th>
                            <th className="px-6 py-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={6} className="text-center py-10"><Spinner className="h-8 w-8 text-gray-400 mx-auto" /></td></tr>}
                        {!isLoading && streams.map(stream => {
                            const isTaskMutating = isMutating === stream.id;
                            return (
                                <tr key={stream.id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-800">{stream.host_name}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-xs" title={stream.room_name}>{stream.room_name}</div>
                                        <a href={stream.live_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">访问链接</a>
                                    </td>
                                    <td className="px-6 py-4 font-semibold">{stream.platform_cn_name}</td>
                                    <td className="px-6 py-4"><StatusBadge active={stream.status} activeText="直播中" inactiveText="离线" color="green" /></td>
                                    <td className="px-6 py-4"><StatusBadge active={stream.listening} activeText="监听中" inactiveText="已停止" color="blue" /></td>
                                    <td className="px-6 py-4"><StatusBadge active={stream.recording} activeText="录制中" inactiveText="未录制" color="yellow" /></td>
                                    <td className="px-6 py-4">
                                        {isTaskMutating ? <Spinner className="h-5 w-5 text-blue-500" /> : (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleToggleListen(stream)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md" title={stream.listening ? '停止监听' : '开始监听'}>
                                                    {stream.listening ? <StopIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => setStreamToDelete(stream)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md" title="删除监控">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && <AddStreamModal onClose={() => setIsAddModalOpen(false)} onSuccess={loadStreams} />}
            {streamToDelete && <ConfirmationModal title="确认删除监控" message={`您确定要删除对 "${streamToDelete.host_name}" 的直播间监控吗？`} onConfirm={handleDelete} onCancel={() => setStreamToDelete(null)} />}
        </div>
    );
};