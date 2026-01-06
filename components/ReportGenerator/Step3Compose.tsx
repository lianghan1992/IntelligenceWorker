
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PPTData, ChatMessage } from './types';
import { streamChatCompletions, getPromptDetail } from '../../api/stratify';
import { RefreshIcon, CheckIcon, DocumentTextIcon, BrainIcon, PencilIcon, CloseIcon } from '../icons';

interface Step3ComposeProps {
    pages: PPTData['pages'];
    history: ChatMessage[];
    onUpdatePages: (newPages: PPTData['pages']) => void;
    onHistoryUpdate: (newHistory: ChatMessage[]) => void;
    onLlmStatusChange: (isActive: boolean) => void;
    onStreamingUpdate: (msg: ChatMessage | null) => void;
    onFinish: () => void;
}

const PROMPT_ID = "c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2";

const extractStreamingContent = (rawText: string): string => {
    const match = rawText.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (!match) return '';
    let content = match[1];
    return content
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
};

export const Step3Compose: React.FC<Step3ComposeProps> = ({ pages, history, onUpdatePages, onHistoryUpdate, onLlmStatusChange, onStreamingUpdate, onFinish }) => {
    const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
    const pagesRef = useRef(pages);

    useEffect(() => { pagesRef.current = pages; }, [pages]);

    const generatePageContent = useCallback(async (idx: number, force = false, overrideInstruction?: string) => {
        const page = pagesRef.current[idx];
        if (!page || (page.content && !force && !overrideInstruction) || page.isGenerating) return;

        onLlmStatusChange(true);
        const updatedStart = [...pagesRef.current];
        updatedStart[idx] = { ...page, isGenerating: true };
        if (!overrideInstruction) updatedStart[idx].content = ''; 
        onUpdatePages(updatedStart);

        try {
            const prompt = await getPromptDetail(PROMPT_ID);
            const baseInstruction = prompt.content
                .replace('{{ page_index }}', String(idx + 1))
                .replace('{{ page_title }}', page.title)
                .replace('{{ page_summary }}', page.summary);
            
            const userInstruction = overrideInstruction 
                ? `【当前内容】:\n${page.content}\n\n【用户修改要求】:\n${overrideInstruction}\n\n请输出修改后的完整 Markdown 内容。`
                : baseInstruction;

            const requestMessages = [...history, { role: 'user', content: userInstruction, hidden: true }];
            let accumulatedText = '';
            
            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: requestMessages,
                stream: true
            }, (data) => {
                if (data.content) {
                    accumulatedText += data.content;
                    const partialContent = extractStreamingContent(accumulatedText);
                    if (partialContent) {
                        const nextPages = [...pagesRef.current];
                        nextPages[idx] = { ...nextPages[idx], content: partialContent };
                        onUpdatePages(nextPages);
                    }
                }
            }, () => {
                onLlmStatusChange(false);
                const nextPages = [...pagesRef.current];
                nextPages[idx] = { ...nextPages[idx], isGenerating: false };
                onUpdatePages(nextPages);
            }, (err) => {
                onLlmStatusChange(false);
                const nextPages = [...pagesRef.current];
                nextPages[idx] = { ...nextPages[idx], isGenerating: false };
                onUpdatePages(nextPages);
            });
        } catch (e) { 
            onLlmStatusChange(false);
        }
    }, [history, onUpdatePages, onHistoryUpdate, onLlmStatusChange]);

    // Auto-start generation for all empty pages sequentially or partially in parallel
    useEffect(() => {
        const nextIdx = pages.findIndex(p => !p.content && !p.isGenerating);
        if (nextIdx !== -1) {
             // Simple throttling: Only 1 at a time for stability, or change logic for parallel
             const generatingCount = pages.filter(p => p.isGenerating).length;
             if (generatingCount < 1) {
                 generatePageContent(nextIdx);
             }
        }
    }, [pages, generatePageContent]);

    const handleManualEdit = (idx: number, val: string) => {
        const nextPages = [...pages];
        nextPages[idx] = { ...nextPages[idx], content: val };
        onUpdatePages(nextPages);
    };

    const allDone = pages.every(p => p.content && !p.isGenerating);

    return (
        <div className="h-full flex flex-col">
            <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-slate-100 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">模块建造</h2>
                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">
                        {pages.filter(p => p.content).length} / {pages.length} Modules Built
                    </p>
                </div>
                <button 
                    onClick={onFinish} 
                    disabled={!allDone} 
                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-95"
                >
                    进入渲染工坊 <CheckIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 custom-scrollbar relative">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1600px] mx-auto">
                    {pages.map((page, i) => (
                        <div 
                            key={i} 
                            onClick={() => setFocusedIdx(i)}
                            className={`
                                group relative bg-white rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-[320px]
                                ${focusedIdx === i 
                                    ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-2xl z-10' 
                                    : 'border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1'
                                }
                            `}
                        >
                            {/* Card Header */}
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-black">
                                        {i + 1}
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-sm truncate max-w-[180px]" title={page.title}>{page.title}</h3>
                                </div>
                                {page.isGenerating ? (
                                    <RefreshIcon className="w-4 h-4 text-indigo-500 animate-spin" />
                                ) : page.content ? (
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                ) : (
                                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                )}
                            </div>

                            {/* Card Body (Preview) */}
                            <div className="flex-1 p-5 overflow-hidden relative">
                                {page.content ? (
                                    <div className="prose prose-xs max-w-none text-slate-500 line-clamp-[10] select-none pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                                        <div dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(page.content) : page.content }} />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                                        {page.isGenerating ? (
                                            <>
                                                <BrainIcon className="w-8 h-8 animate-pulse text-indigo-200" />
                                                <span className="text-xs font-bold animate-pulse text-indigo-300">Writing code...</span>
                                            </>
                                        ) : (
                                            <span className="text-xs font-bold uppercase tracking-widest opacity-50">Waiting</span>
                                        )}
                                    </div>
                                )}
                                
                                {/* Overlay on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                                    <span className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                        点击编辑详情
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Focus Editor Modal */}
            {focusedIdx !== null && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">{pages[focusedIdx].title}</h3>
                                <p className="text-xs text-slate-500 mt-1 font-medium">Page {focusedIdx + 1} Content Editor</p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => generatePageContent(focusedIdx, true)}
                                    className="px-4 py-2 bg-white border border-slate-200 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <RefreshIcon className="w-3.5 h-3.5" /> 重写
                                </button>
                                <button onClick={() => setFocusedIdx(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                    <CloseIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 p-8 bg-slate-50/50">
                             <textarea 
                                value={pages[focusedIdx].content}
                                onChange={e => handleManualEdit(focusedIdx, e.target.value)}
                                className="w-full h-full p-6 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono"
                                placeholder="# Markdown content..."
                            />
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-white">
                            <button 
                                onClick={() => setFocusedIdx(Math.max(0, focusedIdx - 1))}
                                disabled={focusedIdx === 0}
                                className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                            >
                                上一页
                            </button>
                            <button 
                                onClick={() => setFocusedIdx(Math.min(pages.length - 1, focusedIdx + 1))}
                                disabled={focusedIdx === pages.length - 1}
                                className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors shadow-lg"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
