
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrainIcon } from '../../../../icons';
import { StratifyOutline } from '../../../../../types';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';

// Helper to extract partial JSON data from stream
const tryParseStreamingJson = (jsonString: string): { title?: string, pages: any[] } | null => {
    try {
        // 1. Try full parse first
        return JSON.parse(jsonString);
    } catch (e) {
        // 2. Regex fallback for partial stream
        const result: { title?: string, pages: any[] } = { pages: [] };
        
        // Extract Title
        const titleMatch = jsonString.match(/"title"\s*:\s*"(.*?)"/);
        if (titleMatch) result.title = titleMatch[1];

        // Extract Pages (Robust regex to handle multiline content)
        // Matches objects like { "title": "...", "content": "..." }
        const pageRegex = /{\s*"title"\s*:\s*"(.*?)"\s*,\s*"(?:content|summary)"\s*:\s*"(.*?)"/g;
        let match;
        // Reset lastIndex because we might be reusing regex object (though here it's literal)
        while ((match = pageRegex.exec(jsonString)) !== null) {
            result.pages.push({
                title: match[1],
                content: match[2]
            });
        }
        
        if (result.title || result.pages.length > 0) return result;
        return null;
    }
};

export const OutlineStep: React.FC<{
    taskId: string;
    topic: string;
    scenario: string;
    onConfirm: (outline: StratifyOutline, sessionId: string | null) => void;
}> = ({ taskId, topic, scenario, onConfirm }) => {
    const [streamContent, setStreamContent] = useState('');
    const [reasoningStream, setReasoningStream] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);
    const [revisionInput, setRevisionInput] = useState('');
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    
    const hasStarted = useRef(false);

    const { thought: extractedThought, jsonPart } = useMemo(() => extractThoughtAndJson(streamContent), [streamContent]);
    const displayThought = reasoningStream || extractedThought;

    const outlineData = useMemo(() => {
        if (!jsonPart) return null;
        // Use the new partial parser
        const partialData = tryParseStreamingJson(jsonPart);
        if (partialData) {
             return {
                 title: partialData.title || '正在生成标题...',
                 pages: partialData.pages
             } as StratifyOutline;
        }
        return null;
    }, [jsonPart]);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        startStream('01_generate_outline', { user_input: topic }, null);
    }, [topic, scenario]);

    const startStream = (promptName: string, vars: any, activeSessionId: string | null) => {
        setIsGenerating(true);
        setStreamContent(''); 
        setReasoningStream('');
        setIsThinkingOpen(true);
        
        streamGenerate(
            { prompt_name: promptName, variables: vars, scenario, session_id: activeSessionId || undefined },
            (chunk) => {
                setStreamContent(prev => {
                    const next = prev + chunk;
                    const { jsonPart } = extractThoughtAndJson(next);
                    // Close modal earlier if we detect valid JSON structure start
                    if (jsonPart && jsonPart.trim().startsWith('{')) setIsThinkingOpen(false);
                    return next;
                });
            },
            () => { setIsGenerating(false); setIsThinkingOpen(false); },
            () => { setIsGenerating(false); setIsThinkingOpen(false); },
            (sid) => { if(sid && !sessionId) setSessionId(sid); },
            (chunk) => setReasoningStream(prev => prev + chunk)
        );
    };

    const handleRevise = () => {
        if (!revisionInput.trim() || !jsonPart || !sessionId) return;
        startStream('02_revise_outline', { user_revision_request: revisionInput }, sessionId);
        setRevisionInput('');
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
            <ReasoningModal isOpen={isThinkingOpen} onClose={() => setIsThinkingOpen(false)} content={displayThought} status="AI 正在规划大纲..." />
            <div className="flex-1 flex flex-col bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative">
                <div className="p-8 border-b border-slate-50 bg-white flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            {outlineData?.title || <span className="opacity-30">正在规划报告结构...</span>}
                        </h2>
                        <div className="text-[10px] font-black text-indigo-500 mt-2 uppercase tracking-[0.2em]">Strategy Framework</div>
                    </div>
                    <button onClick={() => setIsThinkingOpen(true)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all"><BrainIcon className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                    {outlineData?.pages.map((page: any, idx: number) => (
                        <div key={idx} className="group flex gap-6 p-6 rounded-3xl border border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex-shrink-0 w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-lg font-black text-slate-300 group-hover:text-indigo-600 group-hover:scale-110 transition-all">
                                {idx + 1}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800 text-lg mb-2">{page.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{page.content}</p>
                            </div>
                        </div>
                    ))}
                    {isGenerating && <div className="h-20 bg-slate-50 rounded-3xl animate-pulse flex items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-widest">AI Agent Processing...</div>}
                </div>

                <div className="p-6 bg-white border-t border-slate-50 flex gap-4">
                    <input 
                        className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={revisionInput}
                        onChange={e => setRevisionInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !isGenerating && handleRevise()}
                        placeholder="输入微调意见..."
                        disabled={isGenerating}
                    />
                    <button 
                        onClick={handleRevise}
                        disabled={isGenerating || !revisionInput.trim()}
                        className="px-6 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-50"
                    >
                        修改
                    </button>
                    <button 
                        onClick={() => outlineData && onConfirm(outlineData, sessionId)}
                        disabled={isGenerating || !outlineData}
                        className="px-10 bg-slate-900 text-white font-bold rounded-2xl hover:bg-indigo-600 transition-all disabled:opacity-50"
                    >
                        确认大纲
                    </button>
                </div>
            </div>
        </div>
    );
};
