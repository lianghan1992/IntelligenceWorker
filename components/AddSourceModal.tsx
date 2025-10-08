
import React, { useState } from 'react';
import { CloseIcon } from './icons';
// FiX: Corrected path to api.ts to resolve module not found error.
import { processUrlToInfoItem } from '../api';
import { InfoItem } from '../types';

interface AddSourceModalProps {
  onClose: () => void;
  // Fix: Changed type to `InfoItem` to match the data structure returned by `processUrlToInfoItem` and expected by App.tsx's handler.
  onAdd: (newItem: InfoItem) => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const AddSourceModal: React.FC<AddSourceModalProps> = ({ onClose, onAdd }) => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            const newItem = await processUrlToInfoItem(url, setFeedback);
            onAdd(newItem);
        } catch (err: any) {
            setError(err.message || '发生未知错误，请重试。');
        } finally {
            setIsLoading(false);
            setFeedback('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">添加自定义情报源</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        输入您希望追踪的公开信息源URL。AI将自动读取、分析并为您生成结构化情报。
                    </p>
                    <div>
                        <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-1">
                            情报源URL
                        </label>
                        <input
                            type="url"
                            id="url-input"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/auto-news"
                            className="w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            disabled={isLoading}
                        />
                    </div>
                    {feedback && (
                        <div className="mt-4 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg animate-pulse">
                            {feedback}
                        </div>
                    )}
                     {error && (
                        <div className="mt-4 text-sm text-red-700 bg-red-100 p-3 rounded-lg">
                            <strong>错误:</strong> {error}
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-2xl">
                    <button 
                        onClick={onClose}
                        className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
                        disabled={isLoading}
                    >
                        取消
                    </button>
                     <button 
                        onClick={handleSubmit}
                        disabled={!url.trim() || isLoading}
                        className="py-2 px-4 w-28 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? <Spinner /> : '添加'}
                    </button>
                </div>
            </div>
        </div>
    );
};
