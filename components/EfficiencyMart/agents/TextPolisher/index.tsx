
import React, { useState } from 'react';
import { SparklesIcon, DocumentTextIcon, ArrowRightIcon, RefreshIcon } from '../../../icons';
import { streamChatCompletions, getPromptDetail } from '../../../../api/stratify';

const TextPolisher: React.FC = () => {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [mode, setMode] = useState<'concise' | 'professional' | 'creative'>('professional');

    const handlePolish = async () => {
        if (!input.trim() || isProcessing) return;
        setIsProcessing(true);
        setOutput('');

        try {
            // Default model, ideal for fast text processing
            let model = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free";
            
            // Construct prompt based on mode
            let systemInstruction = "You are an expert editor. Polish the user's text.";
            if (mode === 'concise') systemInstruction += " Make it concise, direct, and remove redundancy.";
            if (mode === 'professional') systemInstruction += " Make it formal, professional, and suitable for business reports.";
            if (mode === 'creative') systemInstruction += " Make it engaging, vivid, and creative.";

            await streamChatCompletions({
                model,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: input }
                ],
                stream: true
            }, (chunk) => {
                if (chunk.content) {
                    setOutput(prev => prev + chunk.content);
                }
            });

        } catch (e) {
            setOutput("处理出错，请重试。");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#f8fafc]">
            {/* Input Area */}
            <div className="flex-1 flex flex-col p-6 border-r border-slate-200 bg-white">
                <div className="mb-4 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4 text-indigo-500" />
                        原文输入
                    </h3>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        {(['concise', 'professional', 'creative'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                    mode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {m === 'concise' ? '精简' : m === 'professional' ? '专业' : '创意'}
                            </button>
                        ))}
                    </div>
                </div>
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="请输入需要润色或重写的文本内容..."
                    className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed transition-all"
                />
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={handlePolish}
                        disabled={!input.trim() || isProcessing}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                        {isProcessing ? '润色中...' : '开始润色'}
                    </button>
                </div>
            </div>

            {/* Output Area */}
            <div className="flex-1 flex flex-col p-6 bg-indigo-50/30">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <ArrowRightIcon className="w-4 h-4 text-indigo-500" />
                        润色结果
                    </h3>
                </div>
                <div className="flex-1 bg-white border border-indigo-100 rounded-xl p-6 shadow-sm overflow-y-auto">
                    {output ? (
                        <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {output}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <SparklesIcon className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-xs">AI 润色后的内容将显示在这里</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TextPolisher;
