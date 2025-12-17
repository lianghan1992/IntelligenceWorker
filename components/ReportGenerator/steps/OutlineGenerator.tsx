
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrainIcon, CheckIcon, RefreshIcon, DocumentTextIcon } from '../../icons';
import { StratifyOutline } from '../../../types';
import { streamGenerate, parseLlmJson } from '../../../api/stratify';
import { extractThoughtAndJson } from '../utils';

export const OutlineGenerator: React.FC<{
    taskId: string;
    topic: string;
    scenario: string;
    onConfirm: (outline: StratifyOutline, sessionId: string | null) => void;
}> = ({ taskId, topic, scenario, onConfirm }) => {
    const [streamContent, setStreamContent] = useState('');
    const [reasoningStream, setReasoningStream] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);
    
    // Revision State
    const [revisionInput, setRevisionInput] = useState('');
    const [isRevising, setIsRevising] = useState(false);
    
    const hasStarted = useRef(false);
    const thoughtBottomRef = useRef<HTMLDivElement>(null);

    const { thought: extractedThought, jsonPart } = useMemo(() => extractThoughtAndJson(streamContent), [streamContent]);
    const displayThought = reasoningStream || extractedThought;

    const outlineData = useMemo(() => {
        if (!jsonPart) return null;
        try {
            const parsed = parseLlmJson<{title: string, pages: any[]}>(jsonPart);
            if (parsed && parsed.title && Array.isArray(parsed.pages)) {
                return parsed;
            }
            // Simple fallback for streaming JSON
            let title = '生成中...';
            const titleMatch = jsonPart.match(/"title"\s*:\s*"(?<title>(?:[^"\\]|\\.)*?)"/);
            if (titleMatch && titleMatch.groups?.title) title = titleMatch.groups.title;

            const pages: { title: string, content: string }[] = [];
            const pagesSection = jsonPart.indexOf('"pages"');
            if (pagesSection > -1) {
                const pageRegex = /{\s*(?:"title"\s*:\s*"(?<t1>(?:[^"\\]|\\.)*?)"\s*,\s*"(?:content|summary)"\s*:\s*"(?<c1>(?:[^"\\]|\\.)*?)"|"(?:content|summary)"\s*:\s*"(?<c2>(?:[^"\\]|\\.)*?)"\s*,\s*"title"\s*:\s*"(?<t2>(?:[^"\\]|\\.)*?)")\s*}/g;
                let match;
                while ((match = pageRegex.exec(jsonPart.slice(pagesSection))) !== null) {
                    if (match.groups) {
                        const t = match.groups.t1 || match.groups.t2;
                        const c = match.groups.c1 || match.groups.c2;
                        if (t && c) pages.push({ title: t.replace(/\\"/g, '"'), content: c.replace(/\\"/g, '"') });
                    }
                }
            }
            return { title, pages };
        } catch (e) { return null; }
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
        
        streamGenerate(
            {
                prompt_name: promptName,
                variables: vars,
                scenario,
                session_id: activeSessionId || undefined 
            },
            (chunk) => setStreamContent(prev => prev + chunk),
            () => { setIsGenerating(false); setIsRevising(false); },
            (err) => { console.error(err); setIsGenerating(false); setIsRevising(false); },
            (sid) => { if(sid && !sessionId) setSessionId(sid); },
            (chunk) => setReasoningStream(prev => prev + chunk)
        );
    };

    const handleRevise = () => {
        if (!revisionInput.trim() || !jsonPart || !sessionId) return;
        setIsRevising(true);
        startStream('02_revise_outline', { user_revision_request: revisionInput }, sessionId);
        setRevisionInput('');
    };

    useEffect(() => {
        if (thoughtBottomRef.current) thoughtBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [displayThought]);

    const handleConfirm = () => {
        if (outlineData && outlineData.pages.length > 0) {
            onConfirm(outlineData, sessionId);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
            
            {/* Left: Interactive Document Outline */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight leading-snug">
                            {outlineData?.title || <span className="opacity-30 italic">正在规划报告结构...</span>}
                        </h2>
                        <div className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">Generated Structure</div>
                    </div>
                    {isGenerating && (
                        <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                            <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                            生成中
                        </div>
                    )}
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    {outlineData?.pages.map((page: any, idx: number) => (
                        <div key={idx} className="group flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all duration-200">
                            <div className="flex-shrink-0 w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-sm font-bold text-slate-400 shadow-sm group-hover:text-indigo-600 group-hover:border-indigo-100">
                                {String(idx + 1).padStart(2, '0')}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-indigo-700 transition-colors">{page.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{page.content}</p>
                            </div>
                        </div>
                    ))}
                    
                    {isGenerating && (
                        <div className="p-4 rounded-xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-400 gap-2 h-24">
                            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></span>
                            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></span>
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-slate-100 bg-white/80 backdrop-blur z-10">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                value={revisionInput}
                                onChange={(e) => setRevisionInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleRevise()}
                                placeholder="输入修改建议 (e.g. '增加竞品对比章节')"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-24 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-inner"
                                disabled={isGenerating}
                            />
                            <button 
                                onClick={handleRevise}
                                disabled={isGenerating || !revisionInput.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                            >
                                修改
                            </button>
                        </div>
                        <button 
                            onClick={handleConfirm}
                            disabled={isGenerating || !outlineData || outlineData.pages.length === 0}
                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:shadow-none transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <CheckIcon className="w-4 h-4"/>
                            确认并生成
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Thought Process (Collapsible/Optional on Mobile) */}
            <div className="w-full md:w-80 flex-shrink-0 flex flex-col bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden h-[300px] md:h-auto">
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
                    <BrainIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Reasoning</span>
                </div>
                <div className="flex-1 p-5 overflow-y-auto custom-scrollbar-dark font-mono text-xs text-slate-300 leading-relaxed bg-[#0f172a]">
                    <div className="whitespace-pre-wrap">
                        {displayThought ? displayThought : <span className="opacity-30 italic">等待推理信号...</span>}
                        {isGenerating && <span className="typing-cursor ml-1"></span>}
                    </div>
                    <div ref={thoughtBottomRef} />
                </div>
            </div>
        </div>
    );
};
