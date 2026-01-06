
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PPTData, ChatMessage } from './types';
import { streamChatCompletions, getPromptDetail } from '../../api/stratify';
import { RefreshIcon, CheckIcon, DocumentTextIcon, BrainIcon } from '../icons';

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
    const [activeIdx, setActiveIdx] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const pagesRef = useRef(pages);
    const lastHistoryLen = useRef(history.length);

    useEffect(() => { pagesRef.current = pages; }, [pages]);

    // AI 生成逻辑
    const generatePageContent = useCallback(async (idx: number, force = false, overrideInstruction?: string) => {
        const page = pagesRef.current[idx];
        if (!page || (page.content && !force && !overrideInstruction) || page.isGenerating) return;

        onLlmStatusChange(true);
        onStreamingUpdate({ role: 'assistant', content: `正在撰写第 ${idx + 1} 页：${page.title}...`, reasoning: '' });
        
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
            
            // 如果是修改指令，注入上下文
            const userInstruction = overrideInstruction 
                ? `【当前内容】:\n${page.content}\n\n【用户修改要求】:\n${overrideInstruction}\n\n请输出修改后的完整 Markdown 内容。`
                : baseInstruction;

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
                    const partialContent = extractStreamingContent(accumulatedText);
                    if (partialContent) {
                        const nextPages = [...pagesRef.current];
                        nextPages[idx] = { ...nextPages[idx], content: partialContent };
                        onUpdatePages(nextPages);
                    }
                }
                onStreamingUpdate({ 
                    role: 'assistant', 
                    content: accumulatedText.includes('"content"') ? `正在输出第 ${idx + 1} 页内容...` : `正在构思第 ${idx + 1} 页内容...`, 
                    reasoning: accumulatedReasoning 
                });
            }, () => {
                onLlmStatusChange(false);
                onStreamingUpdate(null);
                const nextPages = [...pagesRef.current];
                nextPages[idx] = { ...nextPages[idx], isGenerating: false };
                onUpdatePages(nextPages);
                
                onHistoryUpdate([...history, { 
                    role: 'assistant', 
                    content: `✅ 第 ${idx + 1} 页创作已完成。`, 
                    reasoning: accumulatedReasoning 
                }]);
            }, (err) => {
                onLlmStatusChange(false);
                onStreamingUpdate(null);
                const nextPages = [...pagesRef.current];
                nextPages[idx] = { ...nextPages[idx], isGenerating: false };
                onUpdatePages(nextPages);
            });
        } catch (e) { 
            onLlmStatusChange(false);
            onStreamingUpdate(null);
        }
    }, [history, onUpdatePages, onHistoryUpdate, onLlmStatusChange, onStreamingUpdate]);

    // 监听历史记录触发修改请求
    useEffect(() => {
        if (history.length > lastHistoryLen.current) {
            const lastMsg = history[history.length - 1];
            if (lastMsg.role === 'user') {
                generatePageContent(activeIdx, true, lastMsg.content);
            }
            lastHistoryLen.current = history.length;
        }
    }, [history, activeIdx, generatePageContent]);

    // 自动触发未完成的页面生成
    useEffect(() => {
        const isAnyGenerating = pages.some(p => p.isGenerating);
        if (isAnyGenerating) return;
        const nextIdx = pages.findIndex(p => !p.content);
        if (nextIdx !== -1) {
            setActiveIdx(nextIdx);
            generatePageContent(nextIdx);
        }
    }, [pages, generatePageContent]);

    const handleManualEdit = (val: string) => {
        const nextPages = [...pages];
        nextPages[activeIdx] = { ...nextPages[activeIdx], content: val };
        onUpdatePages(nextPages);
    };

    const activePage = pages[activeIdx];
    const allDone = pages.every(p => p.content && !p.isGenerating);

    return (
        <div className="flex h-full bg-white overflow-hidden">
            {/* Left Nav */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-slate-200 bg-slate-50 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                    目录导航
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {pages.map((p, i) => (
                        <div key={i} onClick={() => { setActiveIdx(i); setIsEditing(false); }} className={`p-3 rounded-xl cursor-pointer transition-all border ${activeIdx === i ? 'bg-white border-indigo-200 shadow-sm' : 'border-transparent hover:bg-white'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${activeIdx === i ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate">{p.title}</p>
                                    <div className="mt-1">
                                        {p.isGenerating ? <span className="text-[9px] text-blue-500 animate-pulse">正在生成...</span> : p.content ? <span className="text-[9px] text-emerald-600">已就绪</span> : <span className="text-[9px] text-slate-300">待处理</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Editor/Preview */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                {activePage ? (
                    <>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <h3 className="font-black text-slate-800 text-base truncate uppercase tracking-tight">{activePage.title}</h3>
                                {activePage.content && (
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-400 font-mono">
                                        {activePage.content.length} CHARS
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${!isEditing ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        预览模式
                                    </button>
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${isEditing ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        编辑源码
                                    </button>
                                </div>
                                <button onClick={() => generatePageContent(activeIdx, true)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100">
                                    <RefreshIcon className={`w-4 h-4 ${activePage.isGenerating ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/30 flex justify-center">
                            <div className="w-full max-w-3xl bg-white rounded-sm shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-200 min-h-[1000px] p-16 relative animate-in zoom-in-95 duration-500">
                                {/* 虚拟纸面质感 */}
                                <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
                                
                                {isEditing ? (
                                    <textarea 
                                        value={activePage.content}
                                        onChange={e => handleManualEdit(e.target.value)}
                                        className="w-full h-full min-h-[800px] resize-none border-none outline-none font-mono text-sm leading-relaxed text-slate-600 bg-transparent placeholder:text-slate-200"
                                        placeholder="在此处输入或修改 Markdown 内容..."
                                        spellCheck={false}
                                    />
                                ) : activePage.content || activePage.isGenerating ? (
                                    <article className="prose prose-indigo max-w-none relative z-10
                                        prose-h3:text-2xl prose-h3:font-black prose-h3:text-slate-800 prose-h3:border-b-2 prose-h3:border-indigo-100 prose-h3:pb-4 prose-h3:mb-8
                                        prose-h4:text-lg prose-h4:font-bold prose-h4:text-indigo-600 prose-h4:mt-8
                                        prose-p:text-slate-600 prose-p:leading-8 prose-p:text-justify
                                        prose-strong:text-slate-900 prose-strong:font-bold
                                        prose-li:text-slate-600 prose-li:my-1
                                        prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl
                                    ">
                                        <div dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(activePage.content) : activePage.content }} />
                                        {activePage.isGenerating && (
                                            <div className="flex items-center gap-2 mt-6 text-indigo-400 font-bold text-xs animate-pulse">
                                                <BrainIcon className="w-4 h-4" /> 深度创作中...
                                            </div>
                                        )}
                                    </article>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4 opacity-50">
                                        <DocumentTextIcon className="w-16 h-16" />
                                        <p className="font-black text-xs uppercase tracking-[0.2em]">Awaiting Content Generator</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center px-8">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                自动保存至工作区
                            </p>
                            <button onClick={onFinish} disabled={!allDone} className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-95">
                                下一步：视觉渲染 <CheckIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                ) : <div className="flex-1 flex items-center justify-center text-slate-300">请选择章节查看内容</div>}
            </div>
        </div>
    );
};
