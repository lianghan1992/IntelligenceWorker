
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PPTData, ChatMessage } from './index';
import { streamChatCompletions, getPromptDetail } from '../../api/stratify';
import { RefreshIcon, ChevronRightIcon, BrainIcon } from '../icons';

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
            const prompt = await getPromptDetail(PROMPT_ID).catch(() => ({ 
                content: "请生成页面内容的JSON，包含content字段 (Markdown)。\nTitle: {{ page_title }}\nSummary: {{ page_summary }}",
                channel_code: "openai",
                model_id: "gpt-4o"
            }));

            const baseInstruction = prompt.content
                .replace('{{ page_index }}', String(idx + 1))
                .replace('{{ page_title }}', page.title)
                .replace('{{ page_summary }}', page.summary);
            
            const userInstruction = overrideInstruction 
                ? `【当前内容】:\n${page.content}\n\n【用户修改要求】:\n${overrideInstruction}\n\n请输出修改后的完整 Markdown 内容。`
                : baseInstruction;

            const requestMessages = [...history, { role: 'user', content: userInstruction, hidden: true }];
            let accumulatedText = '', accumulatedReasoning = '';
            
            // Construct model ID correctly
            const modelName = (prompt as any).channel_code ? `${(prompt as any).channel_code}@${(prompt as any).model_id}` : 'gpt-4o';

            await streamChatCompletions({
                model: modelName,
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

    useEffect(() => {
        if (history.length > lastHistoryLen.current) {
            const lastMsg = history[history.length - 1];
            if (lastMsg.role === 'user') {
                generatePageContent(activeIdx, true, lastMsg.content);
            }
            lastHistoryLen.current = history.length;
        }
    }, [history, activeIdx, generatePageContent]);

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
            <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                    目录导航
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {pages.map((p, i) => (
                        <div key={i} onClick={() => { setActiveIdx(i); setIsEditing(false); }} className={`p-3 rounded-lg cursor-pointer transition-all border ${activeIdx === i ? 'bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-50' : 'border-transparent hover:bg-white'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${activeIdx === i ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-bold truncate ${activeIdx === i ? 'text-indigo-900' : 'text-slate-700'}`}>{p.title}</p>
                                    <div className="mt-1">
                                        {p.isGenerating ? <span className="text-[9px] text-blue-500 animate-pulse">正在生成...</span> : p.content ? <span className="text-[9px] text-emerald-600">已就绪</span> : <span className="text-[9px] text-slate-300">待处理</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                {activePage ? (
                    <>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 text-base truncate uppercase tracking-tight">{activePage.title}</h3>
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
                                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!isEditing ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        预览模式
                                    </button>
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isEditing ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        编辑源码
                                    </button>
                                </div>
                                <button onClick={() => generatePageContent(activeIdx, true)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100">
                                    <RefreshIcon className={`w-4 h-4 ${activePage.isGenerating ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-slate-50/30 flex justify-center">
                            <div className="w-full max-w-3xl bg-white rounded-lg shadow-sm border border-slate-200 min-h-[800px] p-10 relative animate-in zoom-in-95 duration-300">
                                {isEditing ? (
                                    <textarea 
                                        value={activePage.content}
                                        onChange={e => handleManualEdit(e.target.value)}
                                        className="w-full h-full min-h-[600px] resize-none border-none outline-none font-mono text-sm leading-relaxed text-slate-600 bg-transparent placeholder:text-slate-200"
                                        placeholder="在此处输入或修改 Markdown 内容..."
                                        spellCheck={false}
                                    />
                                ) : activePage.content || activePage.isGenerating ? (
                                    <article className="prose prose-indigo max-w-none relative z-10
                                        prose-h3:text-xl prose-h3:font-bold prose-h3:text-slate-800 prose-h3:border-b prose-h3:border-slate-100 prose-h3:pb-3 prose-h3:mb-6
                                        prose-h4:text-base prose-h4:font-bold prose-h4:text-indigo-600 prose-h4:mt-6
                                        prose-p:text-slate-600 prose-p:leading-7 prose-p:text-justify prose-p:mb-4
                                        prose-strong:text-slate-800 prose-strong:font-bold
                                        prose-li:text-slate-600 prose-li:my-1
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
                                        <p className="font-bold text-xs uppercase tracking-[0.2em]">等待内容生成...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end items-center px-8">
                            <button onClick={onFinish} disabled={!allDone} className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center gap-2">
                                下一步：视觉渲染 <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </>
                ) : <div className="flex-1 flex items-center justify-center text-slate-300">请选择章节查看内容</div>}
            </div>
        </div>
    );
};
