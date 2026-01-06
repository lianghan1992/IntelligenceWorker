
import React, { useState, useEffect, useRef } from 'react';
import { StratifyOutline } from '../../types';
import { streamChatCompletions, getPromptDetail } from '../../api/stratify';
import { CheckIcon, RefreshIcon, SparklesIcon, TrashIcon, PlusIcon } from '../icons';
import { ChatMessage } from './types';

interface OutlineWidgetProps {
    topic: string;
    history: ChatMessage[];
    onHistoryUpdate: (newHistory: ChatMessage[]) => void;
    onLlmStatusChange: (isActive: boolean) => void;
    onStreamingUpdate: (msg: ChatMessage | null) => void;
    onConfirm: (outline: StratifyOutline) => void;
}

export const Step2Outline: React.FC<OutlineWidgetProps> = ({ 
    topic, history, onHistoryUpdate, onLlmStatusChange, onStreamingUpdate, onConfirm 
}) => {
    const [outline, setOutline] = useState<StratifyOutline | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const hasStartedRef = useRef(false);

    // Function to parse outline from stream or final text
    const parseOutline = (text: string) => {
        // 1. Try finding JSON block
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : text;
        
        try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.pages && Array.isArray(parsed.pages)) {
                return parsed;
            }
        } catch (e) {
            // Partial parsing could go here if needed
        }
        return null;
    };

    const runLlm = async () => {
        if (isGenerating || hasStartedRef.current) return;
        
        setIsGenerating(true);
        onLlmStatusChange(true);
        hasStartedRef.current = true; // Prevent double firing
        setOutline(null);

        let accumulatedText = '';
        try {
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600"); // Outline prompt
            
            // Build messages
            const messages = [
                { role: 'system', content: prompt.content },
                { role: 'user', content: `Topic: ${topic}` } 
            ];

            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: messages,
                stream: true
            }, (data) => {
                if (data.content) {
                    accumulatedText += data.content;
                    // Try to parse partial JSON for real-time feedback if possible, 
                    // otherwise just wait. Usually JSON streams are hard to parse partially without a specialized parser.
                    // We can try to extract title early.
                }
            }, () => {
                // Done
                setIsGenerating(false);
                onLlmStatusChange(false);
                
                const finalOutline = parseOutline(accumulatedText);
                if (finalOutline) {
                    setOutline(finalOutline);
                } else {
                    // Fallback or error state
                    alert("未能生成有效的大纲结构，请重试。");
                    hasStartedRef.current = false; // Allow retry
                }
            });
        } catch (e) {
            setIsGenerating(false);
            onLlmStatusChange(false);
            hasStartedRef.current = false;
            console.error("Outline generation failed", e);
        }
    };

    // Auto-run on mount
    useEffect(() => {
        if (topic) {
            runLlm();
        }
    }, [topic]);

    const handleConfirm = () => {
        if (outline) onConfirm(outline);
    };

    const handleAddPage = () => {
        setOutline(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                pages: [...prev.pages, { title: 'New Page', content: 'Description...' }]
            };
        });
    };

    const handleDeletePage = (index: number) => {
        setOutline(prev => {
            if (!prev) return prev;
            const newPages = [...prev.pages];
            newPages.splice(index, 1);
            return { ...prev, pages: newPages };
        });
    };

    return (
        <div className="flex flex-col h-full p-4 space-y-4">
             {/* Header */}
             <div className="flex justify-between items-center text-slate-400 flex-shrink-0">
                 <span className="text-xs font-bold uppercase tracking-wider">Generated Structure</span>
                 <div className="flex gap-2">
                     <button 
                        onClick={() => { hasStartedRef.current = false; runLlm(); }} 
                        disabled={isGenerating}
                        className="p-1 hover:text-white transition-colors disabled:opacity-50"
                        title="重新生成"
                     >
                        <RefreshIcon className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                     </button>
                     {outline && (
                         <button onClick={handleAddPage} className="p-1 hover:text-white transition-colors" title="添加页">
                             <PlusIcon className="w-3.5 h-3.5" />
                         </button>
                     )}
                 </div>
             </div>

             {/* Tree List */}
             <div className="flex-1 overflow-y-auto custom-scrollbar-dark space-y-2">
                 {outline?.title && (
                     <div className="text-sm font-bold text-white mb-4 px-2 border-l-2 border-indigo-500 pl-3">
                        {outline.title}
                     </div>
                 )}
                 
                 {outline ? (
                     outline.pages.map((page, idx) => (
                         <div key={idx} className="group flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800 transition-all">
                             <span className="flex-shrink-0 w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-300 mt-0.5">{idx + 1}</span>
                             <div className="flex-1 min-w-0">
                                 <div className="text-xs font-bold text-slate-200">{page.title}</div>
                                 <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{page.content}</div>
                             </div>
                             <button 
                                onClick={() => handleDeletePage(idx)}
                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1"
                             >
                                 <TrashIcon className="w-3.5 h-3.5" />
                             </button>
                         </div>
                     ))
                 ) : isGenerating ? (
                     <div className="flex flex-col items-center justify-center py-10 space-y-4">
                         <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-xs text-slate-400 animate-pulse">正在规划大纲结构...</p>
                     </div>
                 ) : (
                     <div className="text-center py-10 text-slate-500 text-xs">暂无大纲</div>
                 )}
             </div>

             {/* Footer Action */}
             <div className="flex-shrink-0">
                 <button 
                     onClick={handleConfirm}
                     disabled={!outline || isGenerating}
                     className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:bg-slate-700 flex items-center justify-center gap-2"
                 >
                     <CheckIcon className="w-4 h-4" /> 确认并开始生成内容
                 </button>
             </div>
        </div>
    );
};
