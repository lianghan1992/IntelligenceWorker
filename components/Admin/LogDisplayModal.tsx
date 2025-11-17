import React, { useState, useEffect } from 'react';
import { CloseIcon } from '../icons';

interface LogDisplayModalProps {
  taskId: string;
  taskName: string;
  onClose: () => void;
}

export const LogDisplayModal: React.FC<LogDisplayModalProps> = ({ taskId, taskName, onClose }) => {
    const [logContent, setLogContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // FIX: getTaskLog is deprecated and has been removed from the API.
        // This feature is no longer available.
        setIsLoading(true);
        setError('');
        setTimeout(() => {
            setError('查看日志的功能已被移除。');
            setLogContent('');
            setIsLoading(false);
        }, 500);
    }, [taskId]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-xl animate-in fade-in-0 zoom-in-95">
                <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">分析日志</h3>
                        <p className="text-sm text-gray-500 truncate">{taskName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-gray-900 text-white p-4">
                    {isLoading ? (
                        <p className="text-gray-400">正在加载日志...</p>
                    ) : error ? (
                        <p className="text-red-400">错误: {error}</p>
                    ) : (
                        <pre className="text-sm whitespace-pre-wrap font-mono break-words">{logContent || '日志内容为空。'}</pre>
                    )}
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end rounded-b-2xl">
                    <button onClick={onClose} className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100">
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};
