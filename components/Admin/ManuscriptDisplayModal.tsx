import React, { useState, useEffect, useMemo } from 'react';
import { CloseIcon } from '../icons';
import { getTaskManuscript } from '../../api';

// Add type declaration for marked
declare global {
  interface Window {
    marked?: {
      parse(markdownString: string): string;
    };
  }
}

interface ManuscriptDisplayModalProps {
  taskId: string;
  taskName: string;
  onClose: () => void;
}

export const ManuscriptDisplayModal: React.FC<ManuscriptDisplayModalProps> = ({ taskId, taskName, onClose }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [copyStatus, setCopyStatus] = useState('一键复制');

    useEffect(() => {
        const fetchManuscript = async () => {
            setIsLoading(true);
            setError('');
            try {
                const response = await getTaskManuscript(taskId);
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
    
    const handleCopy = () => {
        if (content) {
            navigator.clipboard.writeText(content);
            setCopyStatus('已复制!');
            setTimeout(() => setCopyStatus('一键复制'), 2000);
        }
    };

    const manuscriptHtml = useMemo(() => {
        if (isLoading || error || !content) {
            return '';
        }

        if (window.marked && typeof window.marked.parse === 'function') {
            // The raw manuscript looks like structured text, wrapping in a code block is best
            const wrappedContent = '```\n' + content + '\n```';
            return window.marked.parse(wrappedContent);
        }
        
        // Fallback to a simple pre-formatted block if marked.js is not available
        console.error("marked.js is not loaded or is not a function. Falling back to pre-formatted text.");
        const escapedContent = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return `<pre style="white-space: pre-wrap; word-wrap: break-word;">${escapedContent}</pre>`;
    }, [content, isLoading, error]);

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
                <div className="flex-1 overflow-y-auto bg-gray-50/70 p-6">
                    {isLoading ? (
                        <p className="text-center p-8 text-gray-500 animate-pulse">正在加载文稿...</p>
                    ) : error ? (
                        <p className="text-center p-8 text-red-500">错误: {error}</p>
                    ) : (
                        <article
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: manuscriptHtml }}
                        />
                    )}
                </div>
                <div className="px-6 py-4 bg-white border-t flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={handleCopy} disabled={!content || isLoading} className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50">
                        {copyStatus}
                    </button>
                    <button onClick={onClose} className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200">
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};