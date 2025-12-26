
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PPTData } from './index';
import { streamChatCompletions, getPromptDetail, parseLlmJson } from '../../../api/stratify';
import { ChatMessage } from './index';
import { 
    SparklesIcon, DocumentTextIcon, RefreshIcon, CheckIcon, 
    ArrowRightIcon, BrainIcon, ChevronRightIcon, PencilIcon,
    CloseIcon, ChevronLeftIcon, PhotoIcon, ViewGridIcon, CodeIcon
} from '../../icons';

interface Step3ComposeProps {
    topic: string;
    pages: PPTData['pages'];
    history: ChatMessage[]; // 接收历史记录
    onUpdatePages: (newPages: PPTData['pages']) => void;
    onFinish: () => void;
}

const PROMPT_ID = "c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2";

export const Step3Compose: React.FC<Step3ComposeProps> = ({ topic, pages, history, onUpdatePages, onFinish }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [editingContent, setEditingContent] = useState<string | null>(null);
    const [reasoning, setReasoning] = useState<Record<number, string>>({});
    const reasoningScrollRef = useRef<HTMLDivElement>(null);

    // 使用 Ref 追踪最新的 pages 状态，防止闭包陷阱
    const pagesRef = useRef(pages);
    useEffect(() => {
        pagesRef.current = pages;
    }, [pages]);

    // 自动滚动思考过程
    useEffect(() => {
        if (reasoningScrollRef.current) {
            reasoningScrollRef.current.scrollTop = reasoningScrollRef.current.scrollHeight;
        }
    }, [reasoning, activeIdx]);

    // 单页生成逻辑
    const generatePageContent = useCallback(async (idx: number, force = false) => {
        const page = pagesRef.current[idx];
        if (!page || (page.content && !force) || page.isGenerating) return;

        // 清空该页之前的思考内容
        setReasoning(prev => ({ ...prev, [idx]: '' }));

        // 标记开始生成
        const updatedStart = [...pagesRef.current];
        updatedStart[idx] = { ...page, content: '', isGenerating: true };
        onUpdatePages(updatedStart);

        try {
            const prompt = await getPromptDetail(PROMPT_ID);
            const userInstruction = prompt.content
                .replace('{{ page_index }}', String(idx + 1))
                .replace('{{ page_title }}', page.title)
                .replace('{{ page_summary }}', page.summary);
            
            // 关键：基于历史上下文构建本次生成的 Messages
            // 我们保留 Step 2 的完整历史（包含系统提示、资料、大纲生成过程），然后添加本页的生成指令
            const requestMessages = [
                ...history, 
                { role: 'user', content: userInstruction }
            ];

            let accumulatedText = '';
            
            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: requestMessages,
                stream: true
            }, (data) => {
                // 收集思考过程
                if (data.reasoning) {
                    setReasoning(prev => ({ ...prev, [idx]: (prev[idx] || '') + data.reasoning }));
                }
                // 收集正文内容并实时解析
                if (data.content) {
                    accumulatedText += data.content;
                    const parsed = parseLlmJson<{ content: string }>(accumulatedText);
                    if (parsed && parsed.content) {
                        const nextPages = [...pagesRef.current];
                        // 仅更新内容，保持 isGenerating 为 true
                        nextPages[idx] = { ...nextPages[idx], content: parsed.content };
                        onUpdatePages(nextPages);
                    }
                }
            }, () => {
                // 完成
                const nextPages = [...pagesRef.current];
                nextPages[idx] = { ...nextPages[idx], isGenerating: false };
                onUpdatePages(nextPages);
            }, (err) => {
                // 错误处理
                const nextPages = [...pagesRef.current];
                nextPages[idx] = { ...nextPages[idx], isGenerating: false, content: `生成失败: ${err.message}` };
                onUpdatePages(nextPages);
            });

        } catch (e) {
            const nextPages = [...pagesRef.current];
            nextPages[idx] = { ...nextPages[idx], isGenerating: false };
            onUpdatePages(nextPages);
        }
    }, [history, onUpdatePages]); // 添加 history 依赖

    // --- 顺序生成控制逻辑 ---
    useEffect(() => {
        // 1. 检查是否已有页面正在生成
        const isAnyGenerating = pages.some(p => p.isGenerating);
        if (isAnyGenerating) return;

        // 2. 找到第一个没有内容的页面
        const nextIdx = pages.findIndex(p => !p.content);
        
        // 3. 如果存在这样的页面，自动切换过去并开始生成
        if (nextIdx !== -1) {
            setActiveIdx(nextIdx); // 自动聚焦到正在生成的页面
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
            {/* Left Column (1/3): Navigator & Thinking Rail */}
            <div className="w-1/3 flex flex-col bg-white overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex-shrink-0">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <ViewGridIcon className="w-5 h-5 text-indigo-600" /> 报告内容大纲
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">AI 将结合历史资料按顺序为您撰写内容。</p>
                </div>

                {/* Page Navigator */}
                <div className="flex-shrink-0 max-h-[35%] overflow-y-auto p-4 space-y-2 bg-slate-50/50 border-b border-slate-100 custom-scrollbar">
                    {pages.map((page, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`
                                group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border-2
                                ${activeIdx === idx ? 'bg-white border-indigo-200 shadow-sm' : 'border-transparent hover:bg-white hover:shadow-sm'}
                            `}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${activeIdx === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${activeIdx === idx ? 'text-indigo-900' : 'text-slate-700'}`}>{page.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {page.isGenerating ? (
                                        <span className="text-[9px] text-blue-500 animate-pulse font-bold flex items-center gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> 撰写中...</span>
                                    ) : page.content ? (
                                        <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1"><CheckIcon className="w-3 h-3"/> 已完成</span>
                                    ) : (
                                        <span className="text-[9px] text-slate-400">待开始</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Thinking Stream */}
                <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
                    <div className="px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
                        <div className="flex items-center gap-2 text-xs font-black text-indigo-600">
                            <BrainIcon className={`w-4 h-4 ${activePage?.isGenerating ? 'animate-pulse' : ''}`} /> 
                            第 {activeIdx + 1} 页：深度思考引擎
                        </div>
                    </div>
                    <div 
                        ref={reasoningScrollRef}
                        className="flex-1 overflow-y-auto p-6 text-xs font-mono text-slate-500 leading-relaxed custom-scrollbar whitespace-pre-wrap"
                    >
                        {reasoning[activeIdx] ? (
                            <>
                                {reasoning[activeIdx]}
                                {activePage?.isGenerating && <span className="inline-block w-1.5 h-3 ml-1 align-middle bg-indigo-500 animate-blink"></span>}
                            </>
                        ) : activePage?.isGenerating ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-40">
                                <RefreshIcon className="w-8 h-8 animate-spin mb-2" />
                                <p>正在启动深度思考...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-8">
                                <SparklesIcon className="w-10 h-10 mb-2" />
                                <p>本页内容已生成完毕。</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column (2/3): Content Editor / Live Preview */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                {activePage ? (
                    <>
                        <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm flex-shrink-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                    <DocumentTextIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{activePage.title}</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                        {activePage.isGenerating ? 'AI 正在撰写高信息密度稿件...' : '内容已就绪，支持手动微调'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => generatePageContent(activeIdx, true)}
                                    disabled={activePage.isGenerating}
                                    className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 rounded-xl transition-all shadow-sm disabled:opacity-50"
                                    title="重新生成此页"
                                >
                                    <RefreshIcon className={`w-5 h-5 ${activePage.isGenerating ? 'animate-spin' : ''}`} />
                                </button>
                                
                                {editingContent === null ? (
                                    <button 
                                        onClick={() => setEditingContent(activePage.content)}
                                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
                                    >
                                        <PencilIcon className="w-4 h-4" /> 手动微调
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleSaveEdit}
                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                                    >
                                        <CheckIcon className="w-4 h-4" /> 保存修改
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                            <div className="max-w-4xl mx-auto">
                                {editingContent !== null ? (
                                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
                                        <div className="bg-slate-900 px-4 py-2 flex items-center gap-2 text-[10px] font-mono text-indigo-300">
                                            <CodeIcon className="w-3 h-3" /> MARKDOWN_EDITOR_V1.0
                                        </div>
                                        <textarea 
                                            value={editingContent}
                                            onChange={e => setEditingContent(e.target.value)}
                                            className="w-full h-full min-h-[600px] p-8 text-base border-none outline-none focus:ring-0 font-mono leading-relaxed bg-[#0f172a] text-slate-200"
                                            placeholder="在此处编辑 Markdown 内容..."
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-12 min-h-[800px] animate-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                                        {/* Paper Texture Decor */}
                                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
                                        
                                        {activePage.content ? (
                                            <article 
                                                className="prose prose-indigo max-w-none 
                                                    prose-h3:text-indigo-600 prose-h3:font-black prose-h3:text-2xl prose-h3:mb-8 prose-h3:pb-4 prose-h3:border-b-2 prose-h3:border-slate-100
                                                    prose-h4:text-slate-800 prose-h4:font-bold prose-h4:mt-8
                                                    prose-p:text-slate-700 prose-p:leading-8 prose-p:text-lg
                                                    prose-li:text-slate-600 prose-li:leading-7
                                                    prose-strong:text-slate-900 prose-strong:font-black"
                                                dangerouslySetInnerHTML={{ 
                                                    __html: window.marked ? window.marked.parse(activePage.content) : activePage.content 
                                                }}
                                            />
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center gap-6 text-slate-300 py-32">
                                                <div className="relative">
                                                    <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin"></div>
                                                    <SparklesIcon className="w-10 h-10 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                                </div>
                                                <div className="text-center space-y-2">
                                                    <p className="text-xl font-black text-slate-800">AI 正在深度创作中...</p>
                                                    <p className="text-sm font-medium">请留意左侧的思考过程，内容即将呈现</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sticky Action Footer */}
                        <div className="p-6 border-t border-slate-100 bg-white/80 backdrop-blur-md flex justify-between items-center flex-shrink-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-2">
                                    {pages.map((p, i) => (
                                        <div key={i} className={`w-3 h-3 rounded-full border-2 border-white ${p.content ? 'bg-emerald-500' : p.isGenerating ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'}`} />
                                    ))}
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Progress: {pages.filter(p => p.content).length} / {pages.length} Pages Compiled
                                </span>
                            </div>
                            <button 
                                onClick={onFinish}
                                disabled={!allDone}
                                className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                下一步：视觉样式渲染 <ChevronRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <DocumentTextIcon className="w-20 h-20 mb-4 opacity-10" />
                        <p className="font-bold">请选择左侧页面查看详情</p>
                    </div>
                )}
            </div>
            
            <style>{`
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                .animate-blink { animation: blink 1s infinite; }
            `}</style>
        </div>
    );
};
