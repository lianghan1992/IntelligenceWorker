
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PPTData, ChatMessage } from './index';
import { streamChatCompletions, getPromptDetail, parseLlmJson } from '../../../api/stratify';
import { ViewGridIcon, RefreshIcon, CheckIcon, PencilIcon, ChevronRightIcon, DocumentTextIcon, BrainIcon } from '../../icons';

interface Step3ComposeProps {
    pages: PPTData['pages'];
    history: ChatMessage[];
    onUpdatePages: (newPages: PPTData['pages']) => void;
    onHistoryUpdate: (newHistory: ChatMessage[]) => void;
    onLlmStatusChange: (isActive: boolean) => void;
    onFinish: () => void;
}

const PROMPT_ID = "c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2";

export const Step3Compose: React.FC<Step3ComposeProps> = ({ pages, history, onUpdatePages, onHistoryUpdate, onLlmStatusChange, onFinish }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [editingContent, setEditingContent] = useState<string | null>(null);
    const pagesRef = useRef(pages);
    useEffect(() => { pagesRef.current = pages; }, [pages]);

    const generatePageContent = useCallback(async (idx: number, force = false) => {
        const page = pagesRef.current[idx];
        if (!page || (page.content && !force) || page.isGenerating) return;

        onLlmStatusChange(true);
        const updatedStart = [...pagesRef.current];
        updatedStart[idx] = { ...page, content: '', isGenerating: true };
        onUpdatePages(updatedStart);

        try {
            const prompt = await getPromptDetail(PROMPT_ID);
            const userInstruction = prompt.content
                .replace('{{ page_index }}', String(idx + 1))
                .replace('{{ page_title }}', page.title)
                .replace('{{ page_summary }}', page.summary);
            
            const requestMessages = [...history, { role: 'user', content: userInstruction, hidden: true }];
            let accumulatedText = '', accumulatedReasoning = '';
            
            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: requestMessages,
                stream: true
            }, (data) => {
                if (data.reasoning) accumulatedReasoning += data.reasoning;
                if (data.content) {
                    accumulatedText += data.content;
                    const parsed = parseLlmJson<{ content: string }>(accumulatedText);
                    if (parsed?.content) {
                        const nextPages = [...pagesRef.current];
                        nextPages[idx] = { ...nextPages[idx], content: parsed.content };
                        onUpdatePages(nextPages);
                    }
                }
            }, () => {
                onLlmStatusChange(false);
                const nextPages = [...pagesRef.current];
                nextPages[idx] = { ...nextPages[idx], isGenerating: false };
                onUpdatePages(nextPages);
                // 同步进度到左侧聊天
                onHistoryUpdate([...history, { role: 'assistant', content: `✅ 第 ${idx + 1} 页《${page.title}》已撰写完成。`, reasoning: accumulatedReasoning }]);
            }, (err) => {
                onLlmStatusChange(false);
                const nextPages = [...pagesRef.current];
                nextPages[idx] = { ...nextPages[idx], isGenerating: false, content: `生成失败: ${err.message}` };
                onUpdatePages(nextPages);
            });
        } catch (e) { onLlmStatusChange(false); }
    }, [history, onUpdatePages, onHistoryUpdate]);

    useEffect(() => {
        const isAnyGenerating = pages.some(p => p.isGenerating);
        if (isAnyGenerating) return;
        const nextIdx = pages.findIndex(p => !p.content);
        if (nextIdx !== -1) {
            setActiveIdx(nextIdx);
            generatePageContent(nextIdx);
        }
    }, [pages, generatePageContent]);

    const activePage = pages[activeIdx];
    const allDone = pages.every(p => p.content && !p.isGenerating);

    return (
        <div className="flex h-full bg-white overflow-hidden">
            {/* Page Navigator Side */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-slate-200 bg-slate-50 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                    目录导航
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {pages.map((p, i) => (
                        <div key={i} onClick={() => setActiveIdx(i)} className={`p-3 rounded-xl cursor-pointer transition-all border ${activeIdx === i ? 'bg-white border-indigo-200 shadow-sm' : 'border-transparent hover:bg-white'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${activeIdx === i ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate">{p.title}</p>
                                    <div className="mt-1">
                                        {p.isGenerating ? <span className="text-[9px] text-blue-500 animate-pulse">撰写中...</span> : p.content ? <span className="text-[9px] text-emerald-600">已完成</span> : <span className="text-[9px] text-slate-300">待开始</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                {activePage ? (
                    <>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                            <h3 className="font-bold text-slate-800 text-lg truncate flex-1">{activePage.title}</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingContent(activePage.content)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center gap-1">
                                    <PencilIcon className="w-3.5 h-3.5" /> 编辑
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] p-10 relative">
                                {activePage.content ? (
                                    <article className="prose prose-indigo max-w-none" dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(activePage.content) : activePage.content }} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4 mt-20">
                                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center animate-pulse"><DocumentTextIcon className="w-8 h-8 text-indigo-200" /></div>
                                        <p>AI 正在全力撰写本章节内容...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                            <button onClick={onFinish} disabled={!allDone} className="px-10 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center gap-2">
                                下一步：视觉渲染 <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </>
                ) : <div className="flex-1 flex items-center justify-center text-slate-300">请选择章节查看内容</div>}
            </div>
        </div>
    );
};
