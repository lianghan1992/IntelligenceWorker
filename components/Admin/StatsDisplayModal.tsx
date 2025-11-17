import React, { useMemo } from 'react';
import { LivestreamTask } from '../../types';
import { CloseIcon, ServerIcon } from '../icons';

interface StatsDisplayModalProps {
    task: LivestreamTask;
    onClose: () => void;
}

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="grid grid-cols-3 gap-4 py-2 px-3 hover:bg-gray-50 rounded-md">
        <dt className="text-sm font-medium text-gray-600 col-span-1">{label}:</dt>
        <dd className="text-sm text-gray-800 col-span-2 text-left break-words">{children}</dd>
    </div>
);

export const StatsDisplayModal: React.FC<StatsDisplayModalProps> = ({ task, onClose }) => {
    const stats = useMemo(() => {
        if (!task.stats_json || (typeof task.stats_json === 'object' && Object.keys(task.stats_json).length === 0)) {
            return null;
        }
        try {
            if (typeof task.stats_json === 'string') {
                return JSON.parse(task.stats_json);
            }
            return task.stats_json; // It's already an object
        } catch (error) {
            console.error("Failed to parse stats_json:", error);
            return { error: "无法解析状态信息", raw: String(task.stats_json) };
        }
    }, [task.stats_json]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl transform transition-all animate-in zoom-in-95">
                <header className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-teal-100 text-teal-600 rounded-lg flex-shrink-0">
                            <ServerIcon className="w-6 h-6" />
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="text-lg font-bold text-gray-900">任务状态详情</h2>
                            <p className="text-sm text-gray-500 truncate" title={task.task_name}>{task.task_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-6">
                    {!stats ? (
                        <p className="text-gray-500 text-center py-10">没有可用的状态信息。</p>
                    ) : (
                        <dl className="space-y-1 font-mono">
                            {Object.entries(stats).map(([key, value]) => (
                                <DetailRow key={key} label={key}>
                                    {typeof value === 'boolean' ? (value ? '是' : '否') : String(value)}
                                </DetailRow>
                            ))}
                        </dl>
                    )}
                </main>

                <footer className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors">
                        关闭
                    </button>
                </footer>
            </div>
        </div>
    );
};