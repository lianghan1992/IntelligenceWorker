import React, { useState } from 'react';
import { CloseIcon } from '../icons';
import { LivestreamPrompt } from '../../types';

interface PromptEditModalProps {
  prompt: LivestreamPrompt;
  onClose: () => void;
  onSave: () => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const PromptEditModal: React.FC<PromptEditModalProps> = ({ prompt, onClose, onSave }) => {
    const [content, setContent] = useState(prompt.content);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setIsLoading(true);
        setError('');
        // FIX: updateLivestreamPrompt is deprecated and has been removed from the API.
        // This feature is no longer available.
        setTimeout(() => {
            setError('编辑提示词的功能已被移除。');
            setIsLoading(false);
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">编辑提示词</h3>
                        <p className="text-sm text-gray-500 truncate">{prompt.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className="w-full h-full p-4 bg-gray-50 border border-gray-300 rounded-lg resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} disabled={isLoading} className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100">
                        取消
                    </button>
                    <button onClick={handleSave} disabled={isLoading || content === prompt.content} className="py-2 px-4 w-28 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center">
                        {isLoading ? <Spinner /> : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );
};
