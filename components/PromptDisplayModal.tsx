import React from 'react';
import { CloseIcon } from './icons';
import { Prompt } from '../types';

interface PromptDisplayModalProps {
  prompt: Prompt | null;
  title: string;
  onClose: () => void;
}

export const PromptDisplayModal: React.FC<PromptDisplayModalProps> = ({ prompt, title, onClose }) => {
    if (!prompt) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500 truncate">{prompt.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">描述</label>
                        <p className="mt-1 p-2 bg-gray-100 rounded-lg text-gray-800 text-sm">
                            {prompt.description}
                        </p>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-700">提示词内容</label>
                        <pre className="mt-1 w-full p-4 bg-gray-900 text-gray-200 border border-gray-700 rounded-lg whitespace-pre-wrap font-mono text-xs max-h-[50vh] overflow-auto">
                            {prompt.prompt}
                        </pre>
                    </div>
                </div>
                
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-300">
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};
