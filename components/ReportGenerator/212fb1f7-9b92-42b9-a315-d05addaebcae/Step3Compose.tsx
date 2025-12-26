
import React, { useState, useEffect, useCallback } from 'react';
import { PPTData } from './index';
import { streamChatCompletions, getPromptDetail, parseLlmJson } from '../../../api/stratify';
import { 
    SparklesIcon, DocumentTextIcon, RefreshIcon, CheckIcon, 
    ArrowRightIcon, BrainIcon, ChevronRightIcon, PencilIcon,
    CloseIcon, ChevronLeftIcon, PhotoIcon
} from '../../icons';

interface Step3ComposeProps {
    topic: string;
    pages: PPTData['pages'];
    onUpdatePages: (newPages: PPTData['pages']) => void;
    onFinish: () => void;
}

const PROMPT_ID = "c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2";

export const Step3Compose: React.FC<Step3ComposeProps> = ({ topic, pages, onUpdatePages, onFinish }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [editingContent, setEditingContent] = useState<string | null>(null);
    const [reasoning, setReasoning] = useState<Record<number, string>>({});

    const generatePageContent = useCallback(async (idx: number) => {
        const page = pages[idx];
        if (!page || page.content) return;

        // Mark as generating
        const updatedStart = [...pages];
        updatedStart[idx] = { ...page, isGenerating: true };
        onUpdatePages(updatedStart);

        try {
            const prompt = await getPromptDetail(PROMPT_ID);
            const userPrompt = prompt.content
                .replace('{{ page_index }}', String(idx + 1))
                .replace('{{ page_title }}', page.title)
                .replace('{{ page_summary }}', page.summary);

            let accumulatedText = '';
            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: [{ role: 'user', content: userPrompt }],
                stream: true
            }, (data) => {
                if (data.reasoning) {
                    setReasoning(prev => ({ ...prev, [idx]: (prev[idx] || '') + data.reasoning }));
                }
                if (data.content) {
                    accumulatedText += data.content;
                    const parsed = parseLlmJson<{ content: string }>(accumulatedText);
                    if (parsed) {
                        const newPages = [...pages];
                        newPages[idx] = { ...newPages[idx], content: parsed.content };
                        onUpdatePages(newPages);
                    }
                }
            }, () => {
                const newPages = [...pages];
                newPages[idx] = { ...newPages[idx], isGenerating: false };
                onUpdatePages(newPages);
            }, (err) => {
                const newPages = [...pages];
                newPages[idx] = { ...newPages[idx], isGenerating: false, content: `生成失败: ${err.message}` };
                onUpdatePages(newPages);
            });

        } catch (e) {
            const newPages = [...pages];
            newPages[idx] = { ...newPages[idx], isGenerating: false };
            onUpdatePages(newPages);
        }
    }, [pages, onUpdatePages]);

    // Initial Trigger for all pages (or sequentially)
    useEffect(() => {
        pages.forEach((p, i) => {
            if (!p.content && !p.isGenerating) {
                generatePageContent(i);
            }
        });
    }, []);

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
            {/* Left Sidebar: Page Selection */}
            <div className="w-1/4 flex flex-col bg-white">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4 text-indigo-600" /> 内容章节
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {pages.map((page, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`
                                group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2
                                ${activeIdx === idx ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'border-transparent hover:bg-slate-50'}
                            `}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${activeIdx === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${activeIdx === idx ? 'text-indigo-900' : 'text-slate-700'}`}>{page.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    {page.isGenerating ? (
                                        <span className="text-[10px] text-blue-500 animate-pulse font-bold">正在创作中...</span>
                                    ) : page.content ? (
                                        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><CheckIcon className="w-3 h-3"/> 已生成</span>
                                    ) : (
                                        <span className="text-[10px] text-slate-400">等待中</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <button 
                        onClick={onFinish}
                        disabled={!allDone}
                        className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        下一步：样式渲染 <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Right Content Editor / Viewer */}
            <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden relative">
                {activePage ? (
                    <>
                        <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">第 {activeIdx + 1} 页：{activePage.title}</h3>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => generatePageContent(activeIdx)}
                                    disabled={activePage.isGenerating}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                    title="重新生成此页"
                                >
                                    <RefreshIcon className={`w-5 h-5 ${activePage.isGenerating ? 'animate-spin' : ''}`} />
                                </button>
                                {editingContent === null ? (
                                    <button 
                                        onClick={() => setEditingContent(activePage.content)}
                                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                                    >
                                        <PencilIcon className="w-4 h-4" /> 手动微调
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleSaveEdit}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                                    >
                                        <CheckIcon className="w-4 h-4" /> 保存修改
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar flex flex-col items-center">
                            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 p-12 min-h-[800px] animate-in zoom-in-95 duration-500">
                                {editingContent !== null ? (
                                    <textarea 
                                        value={editingContent}
                                        onChange={e => setEditingContent(e.target.value)}
                                        className="w-full h-full min-h-[600px] bg-slate-50 rounded-xl p-8 text-base border-none outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono leading-relaxed"
                                        placeholder="在此处编辑 Markdown 内容..."
                                    />
                                ) : activePage.isGenerating && !activePage.content ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-6 text-slate-300">
                                        <div className="relative">
                                            <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin"></div>
                                            <SparklesIcon className="w-10 h-10 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <p className="text-xl font-black text-slate-800">AI 正在深度创作中...</p>
                                            <p className="text-sm font-medium">基于行业知识库为您构建专业论据</p>
                                        </div>
                                    </div>
                                ) : (
                                    <article 
                                        className="prose prose-indigo max-w-none prose-h3:text-indigo-600 prose-h3:font-black prose-p:text-slate-700 prose-li:text-slate-600"
                                        dangerouslySetInnerHTML={{ 
                                            __html: window.marked ? window.marked.parse(activePage.content) : activePage.content 
                                        }}
                                    />
                                )}
                            </div>

                            {/* Thinking Stream Overlay (Bottom Right) */}
                            {activePage.isGenerating && reasoning[activeIdx] && (
                                <div className="fixed bottom-6 right-6 w-96 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-4 text-white animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
                                    <div className="flex items-center gap-2 text-xs font-black text-indigo-400 mb-2 uppercase tracking-widest">
                                        <BrainIcon className="w-4 h-4 animate-pulse" /> AI 思考中...
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-300 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar-dark whitespace-pre-wrap opacity-80">
                                        {reasoning[activeIdx]}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <DocumentTextIcon className="w-20 h-20 mb-4 opacity-10" />
                        <p className="font-bold">请选择左侧页面查看详情</p>
                    </div>
                )}
            </div>
        </div>
    );
};
