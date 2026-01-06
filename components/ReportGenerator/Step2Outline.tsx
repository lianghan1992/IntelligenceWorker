
import React, { useState, useEffect, useRef } from 'react';
import { StratifyOutline } from '../../types';
import { streamChatCompletions, getPromptDetail } from '../../api/stratify';
import { ViewGridIcon, CheckIcon, RefreshIcon, BrainIcon, ChevronRightIcon } from '../icons';
import { ChatMessage } from './types';

interface Step2OutlineProps {
    topic: string;
    history: ChatMessage[];
    onHistoryUpdate: (newHistory: ChatMessage[]) => void;
    onLlmStatusChange: (isActive: boolean) => void;
    onStreamingUpdate: (msg: ChatMessage | null) => void;
    onConfirm: (outline: StratifyOutline) => void;
}

const extractCompletedPages = (jsonStr: string): any[] => {
    try {
        // Try simple parse first
        const obj = JSON.parse(jsonStr);
        if (obj.pages && Array.isArray(obj.pages)) return obj.pages;
    } catch(e) {}

    try {
        const pagesStartMatch = jsonStr.match(/"pages"\s*:\s*\[/);
        if (!pagesStartMatch || typeof pagesStartMatch.index === 'undefined') return [];
        const arrayStartIndex = pagesStartMatch.index + pagesStartMatch[0].length;
        const arrayContent = jsonStr.slice(arrayStartIndex);
        
        let balance = 0, objectStartIndex = -1, foundObjects: any[] = [];
        for (let i = 0; i < arrayContent.length; i++) {
            const char = arrayContent[i];
            if (char === '{') {
                if (balance === 0) objectStartIndex = i;
                balance++;
            } else if (char === '}') {
                balance--;
                if (balance === 0 && objectStartIndex !== -1) {
                    const objStr = arrayContent.substring(objectStartIndex, i + 1);
                    try {
                        const obj = JSON.parse(objStr);
                        if (obj.title) foundObjects.push(obj);
                    } catch (e) {}
                    objectStartIndex = -1;
                }
            }
        }
        return foundObjects;
    } catch (e) { return []; }
};

export const Step2Outline: React.FC<Step2OutlineProps> = ({ topic, history, onHistoryUpdate, onLlmStatusChange, onStreamingUpdate, onConfirm }) => {
    const [outline, setOutline] = useState<StratifyOutline | null>(null);
    const lastProcessedLen = useRef(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressReasoning, setProgressReasoning] = useState('');

    const runLlm = async (currentHistory: ChatMessage[]) => {
        setIsGenerating(true);
        onLlmStatusChange(true);
        onStreamingUpdate({ role: 'assistant', content: '', reasoning: '' });
        
        let accumulatedText = '', accumulatedReasoning = '';
        try {
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600");
            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: currentHistory.map(m => ({ role: m.role, content: m.content })),
                stream: true
            }, (data) => {
                if (data.reasoning) {
                    accumulatedReasoning += data.reasoning;
                    setProgressReasoning(data.reasoning);
                }
                if (data.content) accumulatedText += data.content;

                // 实时解析右侧大纲预览
                const pages = extractCompletedPages(accumulatedText);
                const titleMatch = accumulatedText.match(/"title"\s*:\s*"(.*?)"/);
                if (pages.length > 0 || titleMatch) {
                    setOutline({ title: titleMatch ? titleMatch[1] : topic, pages });
                }
            }, () => {
                setIsGenerating(false);
                onLlmStatusChange(false);
                const finalMsg: ChatMessage = { 
                    role: 'assistant', 
                    content: accumulatedText, 
                    reasoning: accumulatedReasoning 
                };
                onHistoryUpdate([...currentHistory, finalMsg]);
                onStreamingUpdate(null);
            }, (err) => {
                setIsGenerating(false);
                onLlmStatusChange(false);
                onStreamingUpdate(null);
                alert('生成失败: ' + err.message);
            });
        } catch (e) { 
            setIsGenerating(false);
            onLlmStatusChange(false);
            onStreamingUpdate(null);
        }
    };

    // Auto-start if it's the first run
    useEffect(() => {
        if (history.length > 0 && lastProcessedLen.current === 0) {
             const lastMsg = history[history.length - 1];
             if (lastMsg.role === 'user') {
                 runLlm(history);
                 lastProcessedLen.current = history.length;
             }
        } else if (history.length > lastProcessedLen.current) {
             const lastMsg = history[history.length - 1];
             if (lastMsg.role === 'user') {
                 runLlm(history);
             }
             lastProcessedLen.current = history.length;
        }
    }, [history]);

    const handleRegenerate = () => {
        setOutline(null);
        // Resend the last user message logic or just trigger runLlm with same history
        // Ideally should remove last assistant message if any, but simplified here:
        runLlm(history); 
    };

    return (
        <div className="h-full flex gap-8 p-8 max-w-6xl mx-auto">
            
            {/* Left: Logic Chain Visualization (Tree) */}
            <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                {/* Dotted Grid Background */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                <div className="p-6 border-b border-slate-100 bg-white/80 backdrop-blur z-10 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">架构蓝图</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Logic Tree Visualization</p>
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={handleRegenerate}
                            disabled={isGenerating}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        >
                            <RefreshIcon className={`w-5 h-5 ${isGenerating?'animate-spin':''}`} />
                        </button>
                        <button 
                            onClick={() => outline && onConfirm(outline)}
                            disabled={!outline || isGenerating}
                            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            <CheckIcon className="w-4 h-4" /> 确认架构
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
                    {/* Root Node */}
                    <div className="flex items-center gap-4 mb-8 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-900/20 z-10 relative">
                            <BrainIcon className="w-6 h-6 text-white" />
                            {isGenerating && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></span>}
                        </div>
                        <div className="bg-slate-100 px-4 py-3 rounded-2xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Root Topic</span>
                            <span className="font-bold text-slate-800 text-lg">{topic}</span>
                        </div>
                    </div>

                    {/* Tree Branches */}
                    <div className="ml-6 border-l-2 border-dashed border-slate-200 pl-8 space-y-6 pb-10">
                        {!outline?.pages.length && isGenerating && (
                             <div className="flex items-center gap-3 text-slate-400 animate-pulse">
                                 <div className="w-6 h-0.5 bg-slate-200"></div>
                                 <span className="text-sm font-medium">正在规划章节结构...</span>
                             </div>
                        )}
                        
                        {outline?.pages.map((page, idx) => (
                            <div key={idx} className="relative group animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                {/* Horizontal Connector */}
                                <div className="absolute -left-8 top-6 w-8 h-0.5 bg-slate-200 group-hover:bg-indigo-200 transition-colors"></div>
                                <div className="absolute -left-[34px] top-[22px] w-2 h-2 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors"></div>

                                {/* Node Card */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-default relative overflow-hidden group-hover:scale-[1.01] duration-300">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-indigo-100 bg-indigo-600 px-1.5 py-0.5 rounded">P{idx + 1}</span>
                                            <h4 className="font-bold text-slate-800">{page.title}</h4>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed pl-1">{page.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: AI Reasoning Log (Transparent/Minimal) */}
            {isGenerating && (
                <div className="w-80 bg-slate-50/50 rounded-3xl border border-slate-100 p-6 flex flex-col shadow-inner overflow-hidden">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-indigo-400 animate-spin" />
                        AI Thinking Process
                    </h4>
                    <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] text-slate-500 leading-loose space-y-2 opacity-80">
                        {progressReasoning ? progressReasoning : 'Initializing logic engine...'}
                    </div>
                </div>
            )}
        </div>
    );
};
