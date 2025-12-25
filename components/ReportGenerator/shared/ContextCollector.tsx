
import React, { useState } from 'react';
import { SparklesIcon, DocumentTextIcon } from '../../icons';

interface ContextCollectorProps {
    onStart: (input: string, context?: any) => void;
    isProcessing: boolean;
}

export const ContextCollector: React.FC<ContextCollectorProps> = ({ onStart, isProcessing }) => {
    const [input, setInput] = useState('');

    const handleSubmit = () => {
        if (!input.trim() || isProcessing) return;
        onStart(input, {});
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in duration-500">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200 mb-6">
                        <SparklesIcon className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 mb-3">
                        开始您的 AI 分析任务
                    </h2>
                    <p className="text-slate-500 text-lg">
                        请输入您的研究主题或指令，AI 将自动执行后续流程。
                    </p>
                </div>

                <div className="bg-white p-2 rounded-[24px] shadow-2xl shadow-indigo-100/50 border border-slate-200">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="在此输入分析主题，例如：'分析 2024 年中国新能源汽车出海趋势'..."
                        className="w-full h-40 p-6 text-lg bg-transparent border-none outline-none resize-none placeholder:text-slate-300 text-slate-700"
                        disabled={isProcessing}
                    />
                    <div className="flex justify-between items-center px-4 pb-4 pt-2 border-t border-slate-100">
                        <div className="flex gap-2">
                            {/* Future: Add file upload here */}
                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="添加参考文档 (Coming Soon)">
                                <DocumentTextIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!input.trim() || isProcessing}
                            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isProcessing ? '启动中...' : '开始生成'}
                            {!isProcessing && <SparklesIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
