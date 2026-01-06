
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, BrainIcon, ChevronDownIcon, 
    CheckCircleIcon, PlayIcon, DocumentTextIcon, StopIcon
} from '../icons';
import { getPromptDetail, streamChatCompletions } from '../../api/stratify';
import { PPTStage, ChatMessage, PPTData } from './types';

interface CopilotSidebarProps {
    stage: PPTStage;
    setStage: (s: PPTStage) => void;
    history: ChatMessage[];
    setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    data: PPTData;
    setData: React.Dispatch<React.SetStateAction<PPTData>>;
    isLlmActive: boolean;
    setIsLlmActive: (b: boolean) => void;
    activePageIndex: number;
    setActivePageIndex: (n: number) => void;
    onReset: () => void;
}

// --- Helper: Try to parse incomplete JSON for real-time updates ---
const tryParsePartialJson = (jsonStr: string) => {
    try {
        let cleanStr = jsonStr.replace(/```json|```/g, '').trim();
        const openBraces = (cleanStr.match(/{/g) || []).length;
        const closeBraces = (cleanStr.match(/}/g) || []).length;
        const openBrackets = (cleanStr.match(/\[/g) || []).length;
        const closeBrackets = (cleanStr.match(/]/g) || []).length;
        for (let i = 0; i < (openBrackets - closeBrackets); i++) cleanStr += ']';
        for (let i = 0; i < (openBraces - closeBraces); i++) cleanStr += '}';
        return JSON.parse(cleanStr);
    } catch (e) {
        return null;
    }
};

// --- Thinking Component ---
const ThinkingBlock: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isStreaming && isExpanded && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [content, isStreaming, isExpanded]);

    if (!content) return null;

    return (
        <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/50 overflow-hidden shadow-sm">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100/50 transition-colors"
            >
                <BrainIcon className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse' : ''}`} />
                <span>深度思考过程 {isStreaming ? '...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="px-3 pb-3">
                    <div 
                        ref={scrollRef}
                        className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar border-l-2 border-indigo-200 pl-3 italic"
                    >
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
};

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
    stage, setStage, history, setHistory, data, setData, 
    isLlmActive, setIsLlmActive, activePageIndex, setActivePageIndex, onReset
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoGenMode, setAutoGenMode] = useState<'text' | 'html' | null>(null);

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, stage, isLlmActive]);

    // --- Core Logic: Generate Outline ---
    const runOutlineGeneration = async (userPromptText: string, isRefinement: boolean) => {
        setIsLlmActive(true);
        const contextMessages = isRefinement ? history.map(m => ({ role: m.role, content: m.content })) : []; 
        const apiMessages = [
            { role: 'system', content: `You are an expert presentation outline generator. Output STRICT JSON: { "title": "...", "pages": [ { "title": "...", "content": "Brief summary..." }, ... ] }` },
            ...contextMessages,
            { role: 'user', content: userPromptText }
        ];

        setHistory(prev => [...prev, { role: 'assistant', content: '', reasoning: '' }]);
        let accumulatedContent = '';
        let accumulatedReasoning = '';

        try {
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600"); 
            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`, 
                messages: apiMessages,
                stream: true
            }, (chunk) => {
                if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                if (chunk.content) accumulatedContent += chunk.content;
                setHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { ...newHistory[newHistory.length - 1], reasoning: accumulatedReasoning, content: accumulatedContent };
                    return newHistory;
                });
                if (accumulatedContent.trim().startsWith('{')) {
                    const partialOutline = tryParsePartialJson(accumulatedContent);
                    if (partialOutline?.pages) {
                        setData(prev => ({ ...prev, topic: partialOutline.title || prev.topic, outline: partialOutline }));
                        if (stage === 'collect') setStage('outline');
                    }
                }
            });
            // Final parse
            const jsonStr = accumulatedContent.replace(/```json|```/g, '').trim();
            const parsedOutline = JSON.parse(jsonStr);
            if (parsedOutline.pages) {
                setData(prev => ({ ...prev, topic: parsedOutline.title, outline: parsedOutline }));
                if (stage === 'collect') setStage('outline');
                setHistory(prev => {
                    const h = [...prev];
                    h[h.length - 1].content = `大纲已生成：**${parsedOutline.title}**。\n请确认结构，或直接输入修改意见。确认无误后请点击右侧“确认并生成”。`;
                    return h;
                });
            }
        } catch (e) {
            setHistory(prev => [...prev, { role: 'assistant', content: "生成出错，请重试。" }]);
        } finally {
            setIsLlmActive(false);
        }
    };

    // --- Core Logic: Serial Generation (Text or HTML) ---
    // This effect acts as the "Sequencer"
    useEffect(() => {
        if (stage !== 'compose' || isLlmActive || !autoGenMode) return;

        const processQueue = async () => {
            // 1. Find next pending item based on mode
            const pages = data.pages;
            let targetIdx = -1;

            if (autoGenMode === 'text') {
                targetIdx = pages.findIndex(p => !p.content);
            } else if (autoGenMode === 'html') {
                targetIdx = pages.findIndex(p => !p.html);
            }

            // 2. If no pending items, finish mode
            if (targetIdx === -1) {
                setAutoGenMode(null);
                setHistory(prev => [...prev, { 
                    role: 'assistant', 
                    content: autoGenMode === 'text' 
                        ? "所有页面的内容底稿已生成完毕！\n您可以点击某一页进行查看，在下方对话框输入修改意见。\n\n确认无误后，请点击“生成幻灯片”开始排版。" 
                        : "所有页面的可视化幻灯片已渲染完成！" 
                }]);
                return;
            }

            // 3. Start Generation for targetIdx
            setActivePageIndex(targetIdx);
            setIsLlmActive(true);
            
            const currentPage = pages[targetIdx];
            const taskName = autoGenMode === 'text' ? '撰写内容' : '渲染页面';
            
            // Add chat message
            setHistory(prev => [...prev, { 
                role: 'assistant', 
                content: `正在${taskName} (第 ${targetIdx + 1}/${pages.length} 页)：**${currentPage.title}**...`, 
                reasoning: '' 
            }]);

            // Mark page as generating
            setData(prev => {
                const newPages = [...prev.pages];
                newPages[targetIdx] = { ...newPages[targetIdx], isGenerating: true };
                return { ...prev, pages: newPages };
            });

            try {
                let promptId = "";
                let systemMsg = "";
                let userMsg = "";

                if (autoGenMode === 'text') {
                    promptId = "c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2"; // Compose Prompt
                    const promptDetail = await getPromptDetail(promptId);
                    // Simple replacement
                    userMsg = promptDetail.content
                        .replace('{{ page_index }}', String(targetIdx + 1))
                        .replace('{{ page_title }}', currentPage.title)
                        .replace('{{ page_summary }}', currentPage.summary);
                } else {
                    promptId = "14920b9c-604f-4066-bb80-da7a47b65572"; // HTML Prompt
                    const promptDetail = await getPromptDetail(promptId);
                    systemMsg = promptDetail.content;
                    userMsg = `Title: ${currentPage.title}\nContent:\n${currentPage.content}`;
                }

                // Need model info from prompt usually, assuming getter returns it
                // For simplicity here, we assume we fetch prompt detail or use defaults
                const promptDetail = await getPromptDetail(promptId); 
                const modelStr = `${promptDetail.channel_code}@${promptDetail.model_id}`;

                let accContent = '';
                let accReasoning = '';

                await streamChatCompletions({
                    model: modelStr,
                    messages: systemMsg 
                        ? [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }]
                        : [{ role: 'user', content: userMsg }],
                    stream: true
                }, (chunk) => {
                    if (chunk.reasoning) accReasoning += chunk.reasoning;
                    if (chunk.content) accContent += chunk.content;

                    // Update Chat UI
                    setHistory(prev => {
                        const h = [...prev];
                        h[h.length - 1].reasoning = accReasoning;
                        // Don't spam content in chat, just show reasoning
                        return h;
                    });

                    // Update Canvas Data Real-time
                    setData(prev => {
                        const newPages = [...prev.pages];
                        if (autoGenMode === 'text') {
                            newPages[targetIdx].content = accContent;
                        } else {
                            // Extract HTML if needed or stream raw
                            const cleanHtml = accContent.replace(/^```html?\s*/i, '').replace(/```$/, '').trim();
                            newPages[targetIdx].html = cleanHtml;
                        }
                        return { ...prev, pages: newPages };
                    });
                });

                // Finalize Page State
                setData(prev => {
                    const newPages = [...prev.pages];
                    newPages[targetIdx].isGenerating = false;
                    return { ...prev, pages: newPages };
                });

                // Update chat to done
                setHistory(prev => {
                    const h = [...prev];
                    h[h.length - 1].content = `✅ 第 ${targetIdx + 1} 页 **${currentPage.title}** 生成完成。`;
                    return h;
                });

            } catch (e) {
                console.error(e);
                setHistory(prev => [...prev, { role: 'assistant', content: `❌ 第 ${targetIdx + 1} 页生成失败。` }]);
                 setData(prev => {
                    const newPages = [...prev.pages];
                    newPages[targetIdx].isGenerating = false;
                    return { ...prev, pages: newPages };
                });
            } finally {
                setIsLlmActive(false); 
                // Effect will re-run and pick up next page
            }
        };

        processQueue();
    }, [stage, isLlmActive, autoGenMode, data.pages]);

    // --- Logic: Modification ---
    const handleModification = async (instruction: string) => {
        setIsLlmActive(true);
        const targetIdx = activePageIndex;
        const page = data.pages[targetIdx];
        
        setHistory(prev => [...prev, { role: 'assistant', content: `收到。正在根据意见重新撰写第 ${targetIdx + 1} 页...`, reasoning: '' }]);
        
        // Clear current content/html to show regen effect
        setData(prev => {
            const newPages = [...prev.pages];
            newPages[targetIdx] = { ...newPages[targetIdx], isGenerating: true, content: '', html: undefined };
            return { ...prev, pages: newPages };
        });

        try {
             const promptDetail = await getPromptDetail("c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2"); // Text Gen Prompt
             // Inject user instruction
             const userMsg = `Previous Content: ${page.content}\nUser Feedback: ${instruction}\n\nPlease rewrite the slide content for "${page.title}" incorporating the feedback.`;

             let accContent = '';
             let accReasoning = '';

             await streamChatCompletions({
                model: `${promptDetail.channel_code}@${promptDetail.model_id}`,
                messages: [{ role: 'user', content: userMsg }],
                stream: true
            }, (chunk) => {
                if (chunk.reasoning) accReasoning += chunk.reasoning;
                if (chunk.content) accContent += chunk.content;
                
                setHistory(prev => {
                    const h = [...prev];
                    h[h.length - 1].reasoning = accReasoning;
                    return h;
                });
                
                setData(prev => {
                    const newPages = [...prev.pages];
                    newPages[targetIdx].content = accContent;
                    return { ...prev, pages: newPages };
                });
            });

            setData(prev => {
                const newPages = [...prev.pages];
                newPages[targetIdx].isGenerating = false;
                return { ...prev, pages: newPages };
            });
            
            setHistory(prev => {
                const h = [...prev];
                h[h.length - 1].content = `✅ 第 ${targetIdx + 1} 页已更新。`;
                return h;
            });

        } catch (e) {
            setHistory(prev => [...prev, { role: 'assistant', content: "修改失败，请重试。" }]);
        } finally {
            setIsLlmActive(false);
        }
    };

    // --- Handlers ---
    const handleSend = async () => {
        if (!input.trim() || isLlmActive) return;
        const val = input;
        setInput('');
        setHistory(prev => [...prev, { role: 'user', content: val }]);

        if (stage === 'collect') {
            await runOutlineGeneration(val, false);
        } else if (stage === 'outline') {
            await runOutlineGeneration(`Update outline based on: ${val}`, true);
        } else if (stage === 'compose') {
            if (autoGenMode) {
                setHistory(prev => [...prev, { role: 'assistant', content: "请等待当前生成队列完成。" }]);
            } else {
                // Modification Mode
                await handleModification(val);
            }
        }
    };

    // Check if we should show the "Generate HTML" button
    const allTextReady = data.pages.length > 0 && data.pages.every(p => !!p.content);
    const hasHtml = data.pages.some(p => !!p.html);

    // Watch for stage change to trigger initial text generation
    useEffect(() => {
        if (stage === 'compose' && !autoGenMode && !allTextReady && !isLlmActive) {
            setAutoGenMode('text');
        }
    }, [stage, allTextReady, autoGenMode, isLlmActive]);

    const renderChatBubbles = () => (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" ref={scrollRef}>
            {history.filter(m => !m.hidden).map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`
                        max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm border
                        ${msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-sm border-indigo-600' 
                            : 'bg-white text-slate-700 border-slate-200 rounded-tl-sm'
                        }
                    `}>
                        {msg.role === 'assistant' && msg.reasoning && (
                            <ThinkingBlock 
                                content={msg.reasoning} 
                                isStreaming={isLlmActive && i === history.length - 1} 
                            />
                        )}
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                </div>
            ))}
             {history.length === 0 && (
                <div className="mt-20 text-center text-slate-400 px-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                        <SparklesIcon className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="font-bold text-slate-700 mb-2">AI 研报助手</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        请输入您的研报主题，我将为您进行深度思考，并构建专业的分析框架。
                    </p>
                </div>
            )}

            {/* Action Buttons inside Chat */}
            {stage === 'compose' && allTextReady && !autoGenMode && !hasHtml && (
                <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4">
                    <button 
                        onClick={() => setAutoGenMode('html')}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                        <PlayIcon className="w-3 h-3" /> 开始生成幻灯片 (HTML)
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] border-r border-slate-200">
            {/* Header */}
            <div className="h-16 px-5 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200">
                        <SparklesIcon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800 tracking-tight text-sm">Auto Insight</span>
                </div>
                <button onClick={onReset} className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors px-2 py-1 hover:bg-slate-100 rounded-md">
                    重置
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                {renderChatBubbles()}

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-200 z-20 flex-shrink-0">
                    <div className="relative shadow-sm rounded-xl">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder={stage === 'collect' ? "输入研报主题..." : (autoGenMode ? "正在生成中..." : "输入修改意见，如：把本页标题改为...")}
                            className="w-full bg-slate-50 text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-xl pl-4 pr-12 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            disabled={isLlmActive}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isLlmActive}
                            className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:bg-slate-300 shadow-sm"
                        >
                            {isLlmActive ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                        </button>
                    </div>
                    {stage === 'compose' && !autoGenMode && (
                        <p className="text-[10px] text-center text-slate-400 mt-2">
                           当前为第 {activePageIndex + 1} 页。输入指令即可修改本页内容。
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
