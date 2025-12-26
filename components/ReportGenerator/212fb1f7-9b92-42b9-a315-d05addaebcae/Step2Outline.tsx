
import React, { useState, useEffect, useRef } from 'react';
import { StratifyOutline } from '../../../types';
import { streamChatCompletions, getPromptDetail, parseLlmJson } from '../../../api/stratify';
import { fetchJinaReader } from '../../../api/intelligence';
import { 
    SparklesIcon, ViewGridIcon, RefreshIcon, CheckIcon, 
    ArrowRightIcon, BrainIcon, ChevronDownIcon, CloseIcon, 
    TrashIcon, PencilIcon, PlusIcon, GlobeIcon, PuzzleIcon, DocumentTextIcon,
    PhotoIcon, CloudIcon
} from '../../icons';
import { KnowledgeSearchModal } from '../5e99897c-6d91-4c72-88e5-653ea162e52b/KnowledgeSearchModal';

interface Step2OutlineProps {
    topic: string;
    referenceMaterials: string;
    onConfirm: (outline: StratifyOutline) => void;
}

interface Attachment {
    id: string;
    type: 'file' | 'web';
    content: string;
    name: string;
}

export const Step2Outline: React.FC<Step2OutlineProps> = ({ topic, referenceMaterials, onConfirm }) => {
    const [outline, setOutline] = useState<StratifyOutline | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [reasoning, setReasoning] = useState('');
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    
    // 附件相关状态
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isKMOpen, setIsKMOpen] = useState(false);
    const [isFetchingWeb, setIsFetchingWeb] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [showWebInput, setShowWebInput] = useState(false);

    const hasInitialRun = useRef(false);
    const reasoningScrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 自动滚动思考过程
    useEffect(() => {
        if (reasoningScrollRef.current) {
            reasoningScrollRef.current.scrollTop = reasoningScrollRef.current.scrollHeight;
        }
    }, [reasoning]);

    const runLlm = async (userInput: string, isUpdate = false) => {
        setIsStreaming(true);
        setReasoning('');
        let accumulatedText = '';
        
        try {
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600");
            let finalSystemPrompt = prompt.content
                .replace('{{markdown_content}}', topic)
                .replace('{{reference_materials}}', referenceMaterials);
            
            const messages = [
                { role: 'system', content: finalSystemPrompt },
                { role: 'user', content: isUpdate ? userInput : "请基于上述资料生成报告大纲。" }
            ];

            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages,
                stream: true
            }, (data) => {
                if (data.reasoning) {
                    setReasoning(prev => prev + data.reasoning!);
                }
                if (data.content) {
                    accumulatedText += data.content;
                    // 实时解析 JSON。parseLlmJson 内部支持模糊匹配括号，能实现较好的流式解析体验
                    const parsed = parseLlmJson<StratifyOutline>(accumulatedText);
                    if (parsed && parsed.pages && parsed.pages.length > 0) {
                        setOutline(parsed);
                    }
                }
            }, () => {
                setIsStreaming(false);
            }, (err) => {
                setIsStreaming(false);
                alert('大纲生成失败: ' + err.message);
            });

        } catch (e) {
            setIsStreaming(false);
            console.error(e);
        }
    };

    useEffect(() => {
        if (!hasInitialRun.current) {
            hasInitialRun.current = true;
            runLlm('');
        }
    }, []);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!chatInput.trim() && attachments.length === 0) || isStreaming) return;
        
        let finalInput = chatInput;
        if (attachments.length > 0) {
            const extra = attachments.map((a, i) => `[补充参考资料 ${i+1}: ${a.name}]\n${a.content}`).join('\n\n');
            finalInput += `\n\n请参考以下新提供的资料对大纲进行调整：\n${extra}`;
        }

        runLlm(finalInput, true);
        setChatInput('');
        setAttachments([]);
    };

    const handleManualEdit = (idx: number, key: 'title' | 'content', value: string) => {
        if (!outline) return;
        const newPages = [...outline.pages];
        newPages[idx] = { ...newPages[idx], [key]: value };
        setOutline({ ...outline, pages: newPages });
    };

    // 工具集成逻辑
    const handleAddUrl = async () => {
        if (!urlInput.trim()) return;
        setIsFetchingWeb(true);
        try {
            const content = await fetchJinaReader(urlInput);
            setAttachments(prev => [...prev, { id: crypto.randomUUID(), name: `网页: ${urlInput.substring(0, 30)}...`, content, type: 'web' }]);
            setUrlInput('');
            setShowWebInput(false);
        } catch (e) {
            alert('抓取失败，请检查URL');
        } finally {
            setIsFetchingWeb(false);
        }
    };

    const handleKMSelect = (items: { title: string; content: string }[]) => {
        const newItems = items.map(i => ({ id: crypto.randomUUID(), name: `知识库: ${i.title}`, content: i.content, type: 'file' as const }));
        setAttachments(prev => [...prev, ...newItems]);
        setIsKMOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setAttachments(prev => [...prev, { id: crypto.randomUUID(), name: `文件: ${file.name}`, content, type: 'file' }]);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="h-full flex divide-x divide-slate-200">
            {/* Left: Chat / Reasoning Side */}
            <div className="w-1/3 flex flex-col bg-white">
                <div className="p-6 border-b border-slate-100 flex-shrink-0">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-indigo-600" /> 交互式微调
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">您可以上传资料或直接对话要求 AI 修改结构。</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar" ref={reasoningScrollRef}>
                    {reasoning && (
                        <div className="animate-in fade-in slide-in-from-left-4">
                            <div className="flex items-center gap-2 text-xs font-black text-indigo-600 mb-3 bg-indigo-50/50 w-fit px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                                <BrainIcon className={`w-4 h-4 ${isStreaming ? 'animate-pulse' : ''}`} /> 深度思考引擎
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs font-mono text-slate-500 leading-relaxed shadow-sm whitespace-pre-wrap">
                                {reasoning}
                                {isStreaming && <span className="inline-block w-1 h-3 ml-1 bg-indigo-500 animate-blink"></span>}
                            </div>
                        </div>
                    )}
                    
                    {!reasoning && !isStreaming && (
                        <div className="text-center py-20">
                            <div className="w-12 h-12 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-sm border border-slate-100 text-slate-300 mb-4">
                                <SparklesIcon className="w-6 h-6" />
                            </div>
                            <p className="text-sm text-slate-400">输入指令，例如：“增加两页财务分析”</p>
                        </div>
                    )}
                </div>

                {/* Input Area with Tools */}
                <div className="p-6 border-t border-slate-100 bg-white space-y-4">
                    {/* Attachment Chips */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {attachments.map(a => (
                                <div key={a.id} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100 animate-in zoom-in">
                                    <span className="truncate max-w-[100px]">{a.name}</span>
                                    <button onClick={() => setAttachments(prev => prev.filter(i => i.id !== a.id))}><CloseIcon className="w-3 h-3"/></button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowWebInput(!showWebInput)} className={`p-2 rounded-xl transition-all ${showWebInput ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:text-indigo-600'}`} title="抓取网页"><GlobeIcon className="w-4 h-4"/></button>
                        <button onClick={() => setIsKMOpen(true)} className="p-2 bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-xl transition-all" title="从知识库引用"><PuzzleIcon className="w-4 h-4"/></button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-xl transition-all" title="上传本地文档"><CloudIcon className="w-4 h-4"/></button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    </div>

                    {showWebInput && (
                        <div className="flex gap-2 animate-in slide-in-from-top-2">
                            <input 
                                value={urlInput} 
                                onChange={e => setUrlInput(e.target.value)} 
                                placeholder="输入 URL..." 
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
                            />
                            <button onClick={handleAddUrl} disabled={isFetchingWeb} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                                {isFetchingWeb ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <CheckIcon className="w-4 h-4"/>}
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSendMessage} className="relative">
                        <textarea 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="提出您的修改要求..."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 outline-none transition-all resize-none h-24 shadow-inner font-medium"
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage(e))}
                        />
                        <button 
                            type="submit"
                            disabled={(!chatInput.trim() && attachments.length === 0) || isStreaming}
                            className="absolute right-3 bottom-3 p-2 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-all active:scale-95 shadow-lg"
                        >
                            <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Right: Live Outline Preview */}
            <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <ViewGridIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{outline?.title || '正在规划报告大纲...'}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{outline?.pages.length || 0} 页面架构实时同步中</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => outline && onConfirm(outline)}
                        disabled={!outline || isStreaming}
                        className="px-8 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        确认并生成详情 <CheckIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                    {outline ? outline.pages.map((page, idx) => (
                        <div 
                            key={idx} 
                            className={`group relative bg-white rounded-2xl border transition-all duration-300 p-6 flex gap-6 animate-in slide-in-from-bottom-2 ${editingIdx === idx ? 'border-indigo-400 ring-4 ring-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:shadow-xl'}`}
                        >
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                {idx + 1}
                            </div>
                            
                            <div className="flex-1 space-y-3 min-w-0">
                                {editingIdx === idx ? (
                                    <>
                                        <input 
                                            value={page.title}
                                            onChange={e => handleManualEdit(idx, 'title', e.target.value)}
                                            className="w-full text-lg font-bold text-slate-800 border-b border-indigo-200 focus:border-indigo-500 outline-none pb-1"
                                            autoFocus
                                        />
                                        <textarea 
                                            value={page.content}
                                            onChange={e => handleManualEdit(idx, 'content', e.target.value)}
                                            className="w-full text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border-none outline-none resize-none h-20 focus:ring-1 focus:ring-indigo-500"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingIdx(null)} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm">完成修改</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h4 className="text-lg font-bold text-slate-800 truncate">{page.title}</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{page.content}</p>
                                    </>
                                )}
                            </div>

                            {editingIdx !== idx && !isStreaming && (
                                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => setEditingIdx(idx)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600"></div>
                            <p className="text-sm font-bold animate-pulse">正在解析报告架构，请稍候...</p>
                        </div>
                    )}
                </div>
            </div>

            {isKMOpen && <KnowledgeSearchModal isOpen={isKMOpen} onClose={() => setIsKMOpen(false)} onSelect={handleKMSelect} />}
            
            <style>{`
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                .animate-blink { animation: blink 1s infinite; }
            `}</style>
        </div>
    );
};
