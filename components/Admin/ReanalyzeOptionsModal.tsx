import React, { useState } from 'react';
import { LivestreamTask } from '../../types';
import { CloseIcon, SparklesIcon } from '../icons';

interface ReanalyzeOptionsModalProps {
    task: LivestreamTask;
    onClose: () => void;
    onConfirm: (action: 'reprocess' | 'resummarize') => void;
    isLoading: boolean;
}

const STAGES = [
    { key: 'resummarize', label: '仅重新生成总结', description: '最快。使用现有文稿，仅重新运行AI总结。' },
    { key: 'reprocess', label: '从头开始完整处理', description: '最慢。将删除现有数据，从视频抽帧开始完整分析。' },
];

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const ReanalyzeOptionsModal: React.FC<ReanalyzeOptionsModalProps> = ({ task, onClose, onConfirm, isLoading }) => {
    const [selectedAction, setSelectedAction] = useState<'reprocess' | 'resummarize'>('resummarize');

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-blue-500" />
                        {/* FIX: The LivestreamTask type uses 'task_name', not 'livestream_name'. */}
                        重新分析: {task.task_name}
                    </h3>
                    <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-700"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">请选择重新分析的模式：</p>
                    <fieldset className="space-y-3">
                        <legend className="sr-only">选择分析模式</legend>
                        {STAGES.map(stage => (
                            <div
                                key={stage.key}
                                onClick={() => !isLoading && setSelectedAction(stage.key as 'reprocess' | 'resummarize')}
                                className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${selectedAction === stage.key ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' : 'bg-white hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center h-5">
                                    <input
                                        id={stage.key}
                                        name="reanalyze-action"
                                        type="radio"
                                        checked={selectedAction === stage.key}
                                        onChange={() => setSelectedAction(stage.key as 'reprocess' | 'resummarize')}
                                        disabled={isLoading}
                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor={stage.key} className="font-medium text-gray-900">{stage.label}</label>
                                    <p className="text-gray-500">{stage.description}</p>
                                </div>
                            </div>
                        ))}
                    </fieldset>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isLoading} className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100">取消</button>
                    <button onClick={() => onConfirm(selectedAction)} disabled={isLoading} className="py-2 px-6 w-36 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center">
                        {isLoading ? <Spinner /> : '确认并开始'}
                    </button>
                </div>
            </div>
        </div>
    );
};