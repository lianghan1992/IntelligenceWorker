import React, { useState, useEffect } from 'react';
import { CloseIcon } from '../icons';
import { getTaskSummary } from '../../api';

interface ManuscriptDisplayModalProps {
  taskId: string;
  taskName: string;
  onClose: () => void;
}

export const ManuscriptDisplayModal: React.FC<ManuscriptDisplayModalProps> = ({ taskId, taskName, onClose }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchManuscript = async () => {
            setIsLoading(true);
            setError('');
            try {
                const response = await getTaskSummary(taskId);
                setContent(response || '文稿内容为空。');
            } catch (err: any) {
                setError(err.message || `加载原始文稿失败`);
                setContent('');
            } finally {
                setIsLoading(false);
            }
        };
        fetchManuscript();
    }, [taskId]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-xl animate-in fade-in-0 zoom-in-95">
                <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">原始文稿</h3>
                        <p className="text-sm text-gray-500 truncate">{taskName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-gray-900 text-white p-4">
                    {isLoading ? (
                        <p className="text-gray-400 animate-pulse">正在加载文稿...</p>
                    ) : error ? (
                        <p className="text-red-400">错误: {error}</p>
                    ) : (
                        <pre className="text-sm whitespace-pre-wrap font-mono break-words">{content}</pre>
                    )}
                </div>
                <div className="px-6 py-4 bg-white border-t flex justify-end rounded-b-2xl">
                    <button onClick={onClose} className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100">
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};
