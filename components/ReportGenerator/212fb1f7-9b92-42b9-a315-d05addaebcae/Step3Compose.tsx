
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PPTData } from './index';
import { streamChatCompletions, getPromptDetail, parseLlmJson } from '../../../api/stratify';
import { ChatMessage } from './index';
import { 
    SparklesIcon, DocumentTextIcon, RefreshIcon, CheckIcon, 
    ArrowRightIcon, BrainIcon, ChevronRightIcon, PencilIcon,
    CloseIcon, ChevronLeftIcon, PhotoIcon, ViewGridIcon, CodeIcon, UserIcon, ChevronDownIcon
} from '../../icons';

interface Step3ComposeProps {
    topic: string;
    pages: PPTData['pages'];
    history: ChatMessage[];
    onUpdatePages: (newPages: PPTData['pages']) => void;
    onFinish: () => void;
}

const PROMPT_ID = "c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2";

// --- Reusing MessageBubble from Step2 for consistency ---
const MessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
    const isUser = msg.role === 'user';
    const [showReasoning, setShowReasoning] = useState(true);

    if (msg.hidden) return null;

    return (
        <div className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-slate-900 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                {isUser ? <UserIcon className="w-4 h-4"/> : <SparklesIcon className="w-4 h-4"/>}
            </div>
            <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isUser ? 'bg-slate-900 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                }`}>
                    {msg.role === 'assistant' && msg.reasoning && (
                        <div className="mb-3">
                            <button 
                                onClick={() => setShowReasoning(!showReasoning)}
                                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors mb-2"
                            >
                                <BrainIcon className="w-3 h-3" />
                                <span>深度思考</span>
                                <ChevronDownIcon className={`w-3 h-3 transition-transform ${showReasoning ? 'rotate-180' : ''}`} />
                            </button>
                            {showReasoning && (
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs font-mono text-slate-500 whitespace-pre-wrap mb-2">
                                    {msg.reasoning}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
            </div>
        </div>
    );
};

export const Step3Compose: React.FC<Step3ComposeProps> = ({ topic, pages, history, onUpdatePages, onFinish }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [editingContent, setEditingContent] = useState<string | null>(null);
    
    // Local chat state to show progress, synced with prop history technically but for UI we might append status
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(history);
    const [currentGeneratingMsg, setCurrentGeneratingMsg] = useState<ChatMessage | null>(null);
    
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const pagesRef = useRef(pages);

    useEffect(() => {
        pagesRef.current = pages;
    }, [pages]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages, currentGeneratingMsg]);

    const generatePageContent = useCallback(async (idx: number, force = false) => {
        const page = pagesRef.current[idx];
        if (!page || (page.content && !force) || page.isGenerating) return;

        // 1. Mark Page as Generating
        const updatedStart = [...pagesRef.current];
        updatedStart[idx] = { ...page, content: '', isGenerating: true };
        onUpdatePages(updatedStart);

        // 2. Set UI State for Streaming Message
        setCurrentGeneratingMsg({
            role: 'assistant',
            content: `正在撰写第 ${idx + 1} 页：${page.title} ...`,
            reasoning: '',
            hidden: false
        });

        try {
            const prompt = await getPromptDetail(PROMPT_ID);
            const userInstruction = prompt.content
                .replace('{{ page_index }}', String(idx + 1))
                .replace('{{ page_title }}', page.title)
                .replace('{{ page_summary }}', page.summary);
            
            // Build Context: Global History + Specific Instruction for this page
            // We do NOT add the instruction to visible history to avoid clutter, 
            // but we add it to the payload.
            const requestMessages = [
                ...history, 
                { role: 'user', content: userInstruction } // Hidden prompt
            ];

            let accumulatedText = '';
            let accumulatedReasoning = '';
            
            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: requestMessages,
                stream: true
            }, (data) => {
                if (data.reasoning) {
                    accumulatedReasoning += data.reasoning;
                }
                if (data.content) {
                    accumulatedText += data.content;
                    const parsed = parseLlmJson<{ content: string }>(accumulatedText);
                    if (parsed && parsed.content) {
                        const nextPages = [...pagesRef.current];
                        nextPages[idx] = { ...nextPages[idx], content: parsed.content };
                        onUpdatePages(nextPages);
                    }
                }
                // Update UI Bubble
                setCurrentGeneratingMsg(prev => ({
                    ...prev!,
                    reasoning: accumulatedReasoning,
                    content: `正在撰写第 ${idx + 1} 页：${page.title} ...\n\n` + (accumulatedText.length > 50 ? '正在生成详细论据...' : '')
                }));

            }, () => {
                // Done
                const nextPages = [...pagesRef.current];
                nextPages[idx] = { ...nextPages[idx], isGenerating: false };
                onUpdatePages(nextPages);
                
                // Finalize Message in Chat
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `✅ 第 ${idx + 1} 页 “${page.title}” 撰写完成。`,
                    reasoning: accumulatedReasoning,
                    hidden: false
                }]);
                setCurrentGeneratingMsg(null);

            }, (err) => {
                const nextPages = [...pagesRef.current];
                nextPages[idx] = { ...nextPages[idx], isGenerating: false, content: `生成失败: ${err.message}` };
                onUpdatePages(nextPages);
                setCurrentGeneratingMsg(null);
            });

        } catch (e) {
            const nextPages = [...pagesRef.current];
            nextPages[idx] = { ...nextPages[idx], isGenerating: false };
            onUpdatePages(nextPages);
            setCurrentGeneratingMsg(null);
        }
    }, [history, onUpdatePages]);

    // Sequential Trigger
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

    const handleSaveEdit = () => {
        if (editingContent !== null) {
            const newPages = [...pages];
            newPages[activeIdx].content = editingContent;
            onUpdatePages(newPages);
            setEditingContent(null);
        }
    };

    return (
        <div className="h-full flex divide-x divide-slate-200">
            {/* Left Column (1/3): Chat & Status */}
            <div className="w-1/3 flex flex-col bg-slate-50/50">
                <div className="p-4 border-b border-slate-200 bg-white shadow-sm flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800">AI 创作助手</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={chatScrollRef}>
                    {chatMessages.map((msg, idx) => (
                        <MessageBubble key={idx} msg={msg} />
                    ))}
                    {currentGeneratingMsg && (
                        <div className="flex gap-3 mb-6 animate-pulse">
                             <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600">
                                <SparklesIcon className="w-4 h-4"/>
                            </div>
                            <div className="max-w-[85%]">
                                <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm text-sm text-slate-700">
                                    <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold text-xs">
                                        <BrainIcon className="w-3 h-3 animate-spin" />
                                        <span>深度思考中...</span>
                                    </div>
                                    <p className="whitespace-pre-wrap">{currentGeneratingMsg.reasoning || "正在分析上下文..."}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column (2/3): Content Workspace */}
            <div className="flex-1 flex bg-white overflow-hidden">
                
                {/* 2a. Left Sidebar of Right Col: Page Navigator */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
                     <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <ViewGridIcon className="w-4 h-4"/> 目录导航
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {pages.map((page, idx) => (
                            <div 
                                key={idx}
                                onClick={() => setActiveIdx(idx)}
                                className={`
                                    group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                                    ${activeIdx === idx ? 'bg-white border-indigo-200 shadow-sm' : 'border-transparent hover:bg-white hover:border-slate-100'}
                                `}
                            >
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${activeIdx === idx ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-bold truncate ${activeIdx === idx ? 'text-indigo-900' : 'text-slate-600'}`}>{page.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {page.isGenerating ? (
                                            <span className="text-[9px] text-blue-500 font-bold flex items-center gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> 撰写中</span>
                                        ) : page.content ? (
                                            <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1"><CheckIcon className="w-3 h-3"/> 已完成</span>
                                        ) : (
                                            <span className="text-[9px] text-slate-400">待开始</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2b. Main Content Area: Editor/Preview */}
                <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                    {activePage ? (
                        <>
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                                <h3 className="font-bold text-slate-800 text-lg truncate flex-1">{activePage.title}</h3>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button 
                                        onClick={() => generatePageContent(activeIdx, true)}
                                        disabled={activePage.isGenerating}
                                        className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg hover:bg-indigo-50 transition-colors"
                                        title="重新生成"
                                    >
                                        <RefreshIcon className={`w-4 h-4 ${activePage.isGenerating ? 'animate-spin' : ''}`} />
                                    </button>
                                    {editingContent === null ? (
                                        <button 
                                            onClick={() => setEditingContent(activePage.content)}
                                            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center gap-1"
                                        >
                                            <PencilIcon className="w-3.5 h-3.5" /> 编辑
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleSaveEdit}
                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1"
                                        >
                                            <CheckIcon className="w-3.5 h-3.5" /> 保存
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                                <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] p-10 relative">
                                    {/* Paper Texture */}
                                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
                                    
                                    {editingContent !== null ? (
                                        <textarea 
                                            value={editingContent}
                                            onChange={e => setEditingContent(e.target.value)}
                                            className="w-full h-full min-h-[500px] resize-none outline-none font-mono text-sm text-slate-700 leading-relaxed bg-transparent"
                                            autoFocus
                                        />
                                    ) : activePage.content ? (
                                        <article 
                                            className="prose prose-indigo max-w-none 
                                                prose-h3:text-indigo-600 prose-h3:font-black prose-h3:text-xl prose-h3:mt-0
                                                prose-p:text-slate-600 prose-p:leading-7
                                                prose-li:text-slate-600"
                                            dangerouslySetInnerHTML={{ 
                                                __html: window.marked ? window.marked.parse(activePage.content) : activePage.content 
                                            }}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4 mt-20">
                                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center animate-pulse">
                                                <SparklesIcon className="w-8 h-8 text-indigo-200" />
                                            </div>
                                            <p>等待 AI 生成内容...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
                                <span className="text-xs text-slate-400 font-medium">Step 3 of 4: Content Generation</span>
                                <button 
                                    onClick={onFinish}
                                    disabled={!allDone}
                                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                >
                                    下一步：视觉渲染 <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-300">
                            <p>请选择左侧页面</p>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                .animate-blink { animation: blink 1s infinite; }
            `}</style>
        </div>
    );
};
