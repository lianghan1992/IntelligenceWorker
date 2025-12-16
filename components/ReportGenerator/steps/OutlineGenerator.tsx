
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrainIcon, CheckIcon } from '../../icons';
import { StratifyOutline } from '../../../types';
import { streamGenerate, parseLlmJson } from '../../../api/stratify';
import { extractThoughtAndJson } from '../utils';

export const OutlineGenerator: React.FC<{
    taskId: string;
    topic: string;
    scenario: string;
    // Removed: precedingThought (We want a fresh start logic visually, though passed data helps)
    // We don't pass initialSessionId here anymore because Step 1 was disposable.
    // This component creates the MAIN session.
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

    // 解析 JSON (大纲)
    const outlineData = useMemo(() => {
        if (!jsonPart) return null;
        try {
            const parsed = parseLlmJson<{title: string, pages: any[]}>(jsonPart);
            if (parsed && parsed.title && Array.isArray(parsed.pages)) {
                return parsed;
            }
            // 简单的流式兼容 (JSON 不完整时)
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

    // Initial Generation - Starts the "Main Session"
    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        
        // Pass the original topic as user_input again to start a FRESH session context
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
            (sid) => { 
                // Capture the session ID created by the backend on the first turn
                if(sid && !sessionId) setSessionId(sid); 
            },
            (chunk) => setReasoningStream(prev => prev + chunk)
        );
    };

    const handleRevise = () => {
        if (!revisionInput.trim() || !jsonPart || !sessionId) return;
        setIsRevising(true);
        // Use the established session ID for revision
        startStream('02_revise_outline', { 
            // current_outline is implicit in history, but we can pass it if prompt requires
            // prompt 02_revise_outline usually relies on conversation history, but passing jsonPart helps robustness
            user_revision_request: revisionInput 
        }, sessionId);
        setRevisionInput('');
    };

    // Auto-scroll thought
    useEffect(() => {
        if (thoughtBottomRef.current) thoughtBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [displayThought]);

    const handleConfirm = () => {
        if (outlineData && outlineData.pages.length > 0) {
            onConfirm(outlineData, sessionId);
        }
    };

    return (
        <div className="h-full flex flex-col max-w-5xl mx-auto px-0 md:px-4 w-full">
            {/* Thinking Panel */}
            <div className="flex-shrink-0 bg-[#1e1e1e] rounded-t-none md:rounded-t-2xl border-y md:border border-slate-700 overflow-hidden shadow-lg flex flex-col max-h-[150px] md:max-h-[25vh]">
                <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <BrainIcon className="w-3.5 h-3.5 text-indigo-400" />
                        AI 思考与架构
                    </div>
                    {isGenerating && <div className="text-[10px] text-green-400 animate-pulse">● Live</div>}
                </div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed code-scrollbar">
                    <div className="text-green-400 mb-1">// Current Logic:</div>
                    <div className="whitespace-pre-wrap">
                        {displayThought ? displayThought : (isGenerating && "正在连接推理模型...")}
                        {isGenerating && <span className="typing-cursor"></span>}
                    </div>
                    <div ref={thoughtBottomRef} />
                </div>
            </div>

            {/* Outline Preview & Action */}
            <div className="flex-1 bg-white border-x-0 md:border-x border-b border-slate-200 rounded-b-none md:rounded-b-2xl shadow-sm p-4 md:p-6 overflow-hidden flex flex-col relative">
                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <div className="mb-4 md:mb-6 text-center">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                            {outlineData?.title || <span className="opacity-30">正在拟定标题...</span>}
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {outlineData?.pages.map((page: any, idx: number) => (
                            <div key={idx} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors animate-in slide-in-from-bottom-2 fade-in">
                                <div className="flex-shrink-0 w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm">
                                    {idx + 1}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm mb-1">{page.title}</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">{page.content}</p>
                                </div>
                            </div>
                        ))}
                        {isGenerating && (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-3 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                <span className="text-xs animate-pulse">正在构建章节结构...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Revision & Confirm Bar */}
                <div className="mt-4 pt-4 border-t border-slate-100 bg-white flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                            type="text" 
                            value={revisionInput}
                            onChange={(e) => setRevisionInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleRevise()}
                            placeholder="例如：请增加一个关于'市场竞争格局'的章节..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            disabled={isGenerating}
                        />
                        <button 
                            onClick={handleRevise}
                            disabled={isGenerating || !revisionInput.trim()}
                            className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 hover:text-slate-800 disabled:opacity-50 transition-colors text-sm flex-shrink-0 w-full sm:w-auto flex justify-center items-center"
                        >
                            {isRevising ? <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin"></div> : "修改大纲"}
                        </button>
                    </div>
                    
                    <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 sm:gap-0">
                        <div className="text-xs text-slate-400">
                            {isGenerating ? "生成中..." : `共 ${outlineData?.pages.length || 0} 个章节`}
                        </div>
                        <button 
                            onClick={handleConfirm}
                            disabled={isGenerating || !outlineData || outlineData.pages.length === 0}
                            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {isGenerating ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckIcon className="w-4 h-4"/>}
                            确认大纲并生成正文
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
