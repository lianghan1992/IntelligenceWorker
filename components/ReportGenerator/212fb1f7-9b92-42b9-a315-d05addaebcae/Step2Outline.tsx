
import React, { useState, useEffect, useRef } from 'react';
import { StratifyOutline } from '../../../types';
import { streamChatCompletions, getPromptDetail } from '../../../api/stratify';
import { fetchJinaReader } from '../../../api/intelligence';
import { 
    SparklesIcon, ViewGridIcon, CheckIcon, 
    ArrowRightIcon, BrainIcon, CloseIcon, 
    PencilIcon, GlobeIcon, PuzzleIcon, CloudIcon, UserIcon, ChevronDownIcon
} from '../../icons';
import { KnowledgeSearchModal } from '../5e99897c-6d91-4c72-88e5-653ea162e52b/KnowledgeSearchModal';
import { ChatMessage } from './index';

interface Step2OutlineProps {
    history: ChatMessage[];
    onHistoryUpdate: (newHistory: ChatMessage[]) => void;
    onConfirm: (outline: StratifyOutline) => void;
}

const extractCompletedPages = (jsonStr: string): any[] => {
    try {
        const pagesStartMatch = jsonStr.match(/"pages"\s*:\s*\[/);
        if (!pagesStartMatch || typeof pagesStartMatch.index === 'undefined') return [];
        
        const arrayStartIndex = pagesStartMatch.index + pagesStartMatch[0].length;
        const arrayContent = jsonStr.slice(arrayStartIndex);
        
        let balance = 0;
        let objectStartIndex = -1;
        const foundObjects: any[] = [];
        
        for (let i = 0; i < arrayContent.length; i++) {
            const char = arrayContent[i];
            if (char === '{') {
                if (balance === 0) objectStartIndex = i;
                balance++;
            } else if (char === '}') {
                balance--;
                if (balance === 0 && objectStartIndex !== -1) {
                    const objStr = arrayContent.substring(objectStartIndex, i + 1);
                    try {
                        const obj = JSON.parse(objStr);
                        if (obj.title && obj.content) foundObjects.push(obj);
                    } catch (e) {}
                    objectStartIndex = -1;
                }
            }
        }
        return foundObjects;
    } catch (e) { return []; }
};

// --- Sub-Component: Message Bubble ---
const MessageBubble: React.FC<{ msg: ChatMessage; isStreaming?: boolean }> = ({ msg, isStreaming }) => {
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
                                <BrainIcon className={`w-3 h-3 ${isStreaming ? 'animate-pulse' : ''}`} />
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

export const Step2Outline: React.FC<Step2OutlineProps> = ({ history, onHistoryUpdate, onConfirm }) => {
    const [outline, setOutline] = useState<StratifyOutline | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [chatInput, setChatInput] = useState('');
    
    // UI State
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const hasInitialRun = useRef(false);

    // Auto-scroll chat
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [history]);

    const runLlm = async (currentHistory: ChatMessage[]) => {
        setIsStreaming(true);
        let accumulatedText = '';
        let accumulatedReasoning = '';
        
        try {
            // Get prompt config (just to get channel/model)
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600");
            const modelId = `${prompt.channel_code}@${prompt.model_id}`;

            await streamChatCompletions({
                model: modelId,
                messages: currentHistory.map(m => ({ role: m.role, content: m.content })), // Send all, including hidden
                stream: true
            }, (data) => {
                if (data.reasoning) accumulatedReasoning += data.reasoning;
                if (data.content) accumulatedText += data.content;
                
                // Real-time Outline Parsing
                const extractedPages = extractCompletedPages(accumulatedText);
                const titleMatch = accumulatedText.match(/"title"\s*:\s*"(.*?)"/);
                const currentTitle = titleMatch ? titleMatch[1] : (outline?.title || '正在规划...');

                if (extractedPages.length > 0) {
                    setOutline(prev => ({ title: currentTitle, pages: extractedPages }));
                }
            }, () => {
                setIsStreaming(false);
                // Final Parse
                try {
                    let finalJsonStr = accumulatedText.trim();
                    const firstBrace = finalJsonStr.indexOf('{');
                    const lastBrace = finalJsonStr.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                         finalJsonStr = finalJsonStr.substring(firstBrace, lastBrace + 1);
                         const finalObj = JSON.parse(finalJsonStr);
                         setOutline(finalObj);
                    }
                } catch(e) {}

                // Save to history
                const assistantMsg: ChatMessage = { 
                    role: 'assistant', 
                    content: accumulatedText, 
                    reasoning: accumulatedReasoning 
                };
                onHistoryUpdate([...currentHistory, assistantMsg]);
            }, (err) => {
                setIsStreaming(false);
                alert('生成失败: ' + err.message);
            });

        } catch (e) {
            setIsStreaming(false);
        }
    };

    // Initial Trigger
    useEffect(() => {
        if (!hasInitialRun.current && history.length > 0) {
            hasInitialRun.current = true;
            // Check if the last message is from user (meaning we just came from Step 1)
            // and we haven't generated an assistant response yet.
            const lastMsg = history[history.length - 1];
            if (lastMsg.role === 'user') {
                runLlm(history);
            }
        }
    }, []);

    const handleSendMessage = () => {
        if (!chatInput.trim() || isStreaming) return;
        const newMsg: ChatMessage = { role: 'user', content: chatInput };
        const newHistory = [...history, newMsg];
        onHistoryUpdate(newHistory);
        setChatInput('');
        runLlm(newHistory);
    };

    return (
        <div className="h-full flex divide-x divide-slate-200">
            {/* Left: Chat Panel */}
            <div className="w-1/3 flex flex-col bg-slate-50/50">
                <div className="p-4 border-b border-slate-200 bg-white shadow-sm flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800">AI 助手</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={chatScrollRef}>
                    {history.map((msg, idx) => (
                        <MessageBubble key={idx} msg={msg} />
                    ))}
                    {isStreaming && (
                        <div className="flex gap-3 mb-6 animate-pulse">
                             <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600">
                                <SparklesIcon className="w-4 h-4"/>
                            </div>
                            <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm text-sm text-slate-500">
                                <div className="flex items-center gap-2 mb-2">
                                    <BrainIcon className="w-3 h-3 animate-spin" />
                                    <span>思考与规划中...</span>
                                </div>
                                <div className="h-2 w-32 bg-slate-100 rounded mb-2"></div>
                                <div className="h-2 w-20 bg-slate-100 rounded"></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-200">
                    <div className="relative">
                        <textarea 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="输入修改意见，例如：增加关于市场规模的章节..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20 shadow-inner"
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim() || isStreaming}
                            className="absolute right-2 bottom-2 p-2 bg-slate-900 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md"
                        >
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Outline Preview */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shadow-sm">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">{outline?.title || '报告大纲生成中...'}</h2>
                        <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">{outline?.pages.length || 0} PAGES GENERATED</p>
                    </div>
                    <button 
                        onClick={() => outline && onConfirm(outline)}
                        disabled={!outline || isStreaming}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        确认大纲 <CheckIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
                    <div className="max-w-3xl mx-auto space-y-4">
                        {outline ? outline.pages.map((page, idx) => (
                            <div key={idx} className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex gap-5">
                                <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 text-base mb-1 truncate">{page.title}</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{page.content}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-20">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4 animate-pulse">
                                    <ViewGridIcon className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-slate-400 text-sm">AI 正在构建大纲架构...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                .animate-blink { animation: blink 1s infinite; }
            `}</style>
        </div>
    );
};
