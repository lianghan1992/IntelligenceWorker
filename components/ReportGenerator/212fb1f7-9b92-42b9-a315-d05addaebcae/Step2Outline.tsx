
import React, { useState, useEffect, useRef } from 'react';
import { StratifyOutline } from '../../../types';
import { streamChatCompletions, getPromptDetail, parseLlmJson } from '../../../api/stratify';
import { 
    SparklesIcon, ViewGridIcon, RefreshIcon, CheckIcon, 
    ArrowRightIcon, BrainIcon, ChevronDownIcon, CloseIcon, 
    TrashIcon, PencilIcon, PlusIcon
} from '../../icons';

interface Step2OutlineProps {
    topic: string;
    referenceMaterials: string;
    onConfirm: (outline: StratifyOutline) => void;
}

const PROMPT_ID = "38c86a22-ad69-4c4a-acd8-9c15b9e92600";

export const Step2Outline: React.FC<Step2OutlineProps> = ({ topic, referenceMaterials, onConfirm }) => {
    const [outline, setOutline] = useState<StratifyOutline | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [reasoning, setReasoning] = useState('');
    const [showReasoning, setShowReasoning] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    
    const hasInitialRun = useRef(false);

    const runLlm = async (userInput: string, isUpdate = false) => {
        setIsStreaming(true);
        setReasoning('');
        let accumulatedText = '';
        
        try {
            const prompt = await getPromptDetail(PROMPT_ID);
            // Replace placeholders in initial prompt
            let finalSystemPrompt = prompt.content
                .replace('{{markdown_content}}', topic)
                .replace('{{reference_materials}}', referenceMaterials);
            
            const messages = [
                { role: 'system', content: finalSystemPrompt },
                { role: 'user', content: isUpdate ? userInput : "请基于上述资料生成报告大纲。" }
            ];

            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages,
                stream: true
            }, (data) => {
                if (data.reasoning) {
                    setReasoning(prev => prev + data.reasoning!);
                    setShowReasoning(true);
                }
                if (data.content) {
                    accumulatedText += data.content;
                    const parsed = parseLlmJson<StratifyOutline>(accumulatedText);
                    if (parsed && parsed.pages) setOutline(parsed);
                }
            }, () => {
                setIsStreaming(false);
            }, (err) => {
                setIsStreaming(false);
                alert('大纲生成失败: ' + err.message);
            });

        } catch (e) {
            setIsStreaming(false);
            console.error(e);
        }
    };

    useEffect(() => {
        if (!hasInitialRun.current) {
            hasInitialRun.current = true;
            runLlm('');
        }
    }, []);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isStreaming) return;
        runLlm(chatInput, true);
        setChatInput('');
    };

    const handleManualEdit = (idx: number, key: 'title' | 'content', value: string) => {
        if (!outline) return;
        const newPages = [...outline.pages];
        newPages[idx] = { ...newPages[idx], [key]: value };
        setOutline({ ...outline, pages: newPages });
    };

    return (
        <div className="h-full flex divide-x divide-slate-200">
            {/* Left: Chat / Reasoning Side */}
            <div className="w-1/3 flex flex-col bg-white">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-indigo-600" /> 交互式微调
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">您可以通过对话要求 AI 修改大纲结构、增删内容或调整侧重点。</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
                    {reasoning && (
                        <div className="animate-in fade-in slide-in-from-left-4">
                            <div className="flex items-center gap-2 text-xs font-black text-indigo-600 mb-3 bg-indigo-50/50 w-fit px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                                <BrainIcon className={`w-4 h-4 ${isStreaming ? 'animate-pulse' : ''}`} /> 深度思考引擎
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs font-mono text-slate-500 leading-relaxed shadow-sm whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
                                {reasoning}
                                {isStreaming && <span className="inline-block w-1 h-3 ml-1 bg-indigo-500 animate-blink"></span>}
                            </div>
                        </div>
                    )}
                    
                    {!reasoning && !isStreaming && (
                        <div className="text-center py-20">
                            <div className="w-12 h-12 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-sm border border-slate-100 text-slate-300 mb-4">
                                <SparklesIcon className="w-6 h-6" />
                            </div>
                            <p className="text-sm text-slate-400">输入指令，例如：“增加两页财务分析”</p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-white">
                    <form onSubmit={handleSendMessage} className="relative">
                        <textarea 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="提出您的修改要求..."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 outline-none transition-all resize-none h-24 shadow-inner font-medium"
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage(e))}
                        />
                        <button 
                            type="submit"
                            disabled={!chatInput.trim() || isStreaming}
                            className="absolute right-3 bottom-3 p-2 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-all active:scale-95 shadow-lg"
                        >
                            <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Right: Live Outline Preview & Manual Edit */}
            <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <ViewGridIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{outline?.title || '正在规划报告大纲...'}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{outline?.pages.length || 0} 页面架构已就绪</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => outline && onConfirm(outline)}
                        disabled={!outline || isStreaming}
                        className="px-8 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        确认并生成详情 <CheckIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                    {outline ? outline.pages.map((page, idx) => (
                        <div 
                            key={idx} 
                            className={`group relative bg-white rounded-2xl border transition-all duration-300 p-6 flex gap-6 ${editingIdx === idx ? 'border-indigo-400 ring-4 ring-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:shadow-xl'}`}
                        >
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                {idx + 1}
                            </div>
                            
                            <div className="flex-1 space-y-3">
                                {editingIdx === idx ? (
                                    <>
                                        <input 
                                            value={page.title}
                                            onChange={e => handleManualEdit(idx, 'title', e.target.value)}
                                            className="w-full text-lg font-bold text-slate-800 border-b border-indigo-200 focus:border-indigo-500 outline-none pb-1"
                                            autoFocus
                                        />
                                        <textarea 
                                            value={page.content}
                                            onChange={e => handleManualEdit(idx, 'content', e.target.value)}
                                            className="w-full text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border-none outline-none resize-none h-20 focus:ring-1 focus:ring-indigo-500"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingIdx(null)} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm">完成修改</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h4 className="text-lg font-bold text-slate-800">{page.title}</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">{page.content}</p>
                                    </>
                                )}
                            </div>

                            {editingIdx !== idx && (
                                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => setEditingIdx(idx)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600"></div>
                            <p className="text-sm font-bold animate-pulse">正在解析报告架构，请稍候...</p>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                .animate-blink { animation: blink 1s infinite; }
            `}</style>
        </div>
    );
};
