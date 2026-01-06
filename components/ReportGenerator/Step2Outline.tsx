
import React, { useState, useEffect, useRef } from 'react';
import { StratifyOutline } from '../../types';
import { streamChatCompletions, getPromptDetail } from '../../api/stratify';
import { CheckIcon, RefreshIcon, BrainIcon, ChevronRightIcon, SparklesIcon, TrashIcon, PlusIcon } from '../icons';
import { ChatMessage } from './types';

interface OutlineWidgetProps {
    topic: string;
    history: ChatMessage[];
    onHistoryUpdate: (newHistory: ChatMessage[]) => void;
    onLlmStatusChange: (isActive: boolean) => void;
    onStreamingUpdate: (msg: ChatMessage | null) => void;
    onConfirm: (outline: StratifyOutline) => void;
}

// Reuse extractor logic
const extractCompletedPages = (jsonStr: string): any[] => {
    try {
        const obj = JSON.parse(jsonStr);
        if (obj.pages && Array.isArray(obj.pages)) return obj.pages;
    } catch(e) {}
    try {
        const pagesStartMatch = jsonStr.match(/"pages"\s*:\s*\[/);
        if (!pagesStartMatch || typeof pagesStartMatch.index === 'undefined') return [];
        const arrayStartIndex = pagesStartMatch.index + pagesStartMatch[0].length;
        const arrayContent = jsonStr.slice(arrayStartIndex);
        // Basic balancing logic omitted for brevity in widget, assume simpler parsing or retry
        // In a real app, use a robust streaming JSON parser
        return []; 
    } catch (e) { return []; }
};

export const Step2Outline: React.FC<OutlineWidgetProps> = ({ 
    topic, history, onHistoryUpdate, onLlmStatusChange, onStreamingUpdate, onConfirm 
}) => {
    const [outline, setOutline] = useState<StratifyOutline | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const hasStartedRef = useRef(false);

    const runLlm = async () => {
        if (isGenerating || hasStartedRef.current) return;
        
        setIsGenerating(true);
        onLlmStatusChange(true);
        hasStartedRef.current = true;

        let accumulatedText = '';
        try {
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600");
            const messages = [
                { role: 'system', content: prompt.content },
                { role: 'user', content: `Topic: ${topic}` } // Simplify context for sidebar
            ];

            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: messages,
                stream: true
            }, (data) => {
                if (data.content) accumulatedText += data.content;
                // Live parse attempt
                try {
                    const parsed = JSON.parse(accumulatedText);
                    if (parsed.pages) setOutline(parsed);
                } catch (e) {
                     // Try regex fallback for partial
                     const titleMatch = accumulatedText.match(/"title"\s*:\s*"(.*?)"/);
                     if (titleMatch) setOutline(prev => ({ title: titleMatch[1], pages: prev?.pages || [] }));
                }
            }, () => {
                setIsGenerating(false);
                onLlmStatusChange(false);
                try {
                    const final = JSON.parse(accumulatedText);
                    setOutline(final);
                    onHistoryUpdate([...history, { role: 'assistant', content: '大纲已生成，请在左侧确认。' }]);
                } catch(e) {}
            });
        } catch (e) {
            setIsGenerating(false);
            onLlmStatusChange(false);
        }
    };

    useEffect(() => {
        runLlm();
    }, []);

    const handleConfirm = () => {
        if (outline) onConfirm(outline);
    };

    return (
        <div className="flex flex-col h-full p-4 space-y-4">
             {/* Header */}
             <div className="flex justify-between items-center text-slate-400">
                 <span className="text-xs font-bold uppercase">Structure</span>
                 <div className="flex gap-2">
                     <button onClick={() => { hasStartedRef.current = false; runLlm(); }} className="p-1 hover:text-white transition-colors"><RefreshIcon className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} /></button>
                 </div>
             </div>

             {/* Tree List */}
             <div className="flex-1 overflow-y-auto custom-scrollbar-dark space-y-2">
                 {outline?.title && (
                     <div className="text-sm font-bold text-white mb-4 px-2">{outline.title}</div>
                 )}
                 
                 {outline?.pages.map((page, idx) => (
                     <div key={idx} className="group flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800 transition-all">
                         <span className="flex-shrink-0 w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-300 mt-0.5">{idx + 1}</span>
                         <div className="flex-1 min-w-0">
                             <div className="text-xs font-bold text-slate-200">{page.title}</div>
                             <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{page.content}</div>
                         </div>
                         <button className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity">
                             <TrashIcon className="w-3.5 h-3.5" />
                         </button>
                     </div>
                 ))}
                 
                 {isGenerating && (
                     <div className="flex items-center gap-2 p-3 text-xs text-indigo-400 animate-pulse">
                         <SparklesIcon className="w-4 h-4" />
                         <span>AI 正在构思章节...</span>
                     </div>
                 )}
             </div>

             {/* Footer Action */}
             <button 
                 onClick={handleConfirm}
                 disabled={!outline || isGenerating}
                 className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
             >
                 <CheckIcon className="w-4 h-4" /> 确认并开始生成
             </button>
        </div>
    );
};
