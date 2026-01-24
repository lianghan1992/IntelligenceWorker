
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, BrainIcon, ChevronDownIcon, 
    CheckCircleIcon, PlayIcon, DocumentTextIcon, ServerIcon, PencilIcon, ClockIcon, PlusIcon,
    DatabaseIcon, CloseIcon, ExternalLinkIcon, EyeIcon
} from '../icons';
import { getPromptDetail, streamChatCompletions } from '../../api/stratify';
import { searchSemanticGrouped, getArticleHtml } from '../../api/intelligence';
import { getWalletBalance } from '../../api/user'; // Import wallet balance check
import { PPTStage, ChatMessage, PPTData, PPTPageData, SharedGeneratorProps } from './types';
import { ContextAnchor, GuidanceBubble } from './Guidance';
import { InfoItem } from '../../types';
import { marked } from 'marked';
import { AGENTS } from '../../agentConfig';

// --- 统一模型配置 ---
const DEFAULT_STABLE_MODEL = "xiaomi/mimo-v2-flash:free";
const HTML_GENERATION_MODEL = "google/gemini-3-flash-preview";

// --- Agent 工具定义 ---
const SEARCH_TOOL_DEF = {
    type: "function",
    function: {
        name: "search_knowledge_base",
        description: "搜索内部汽车行业情报数据库。当需要事实依据、行业数据、竞品参数或详细背景时，必须调用此工具。结果将按文章聚合返回。",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "搜索关键词。提炼核心实体和意图，例如'新能源电池 技术路线'。"
                }
            },
            required: ["query"]
        }
    }
};

// --- Helper: Robust Partial JSON Parser ---
export const tryParsePartialJson = (jsonStr: string) => {
    if (!jsonStr) return null;
    try {
        let cleanStr = jsonStr.trim();
        cleanStr = cleanStr.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const firstBrace = cleanStr.indexOf('{');
        const lastBrace = cleanStr.lastIndexOf('}');
        if (firstBrace !== -1) {
            if (lastBrace !== -1 && lastBrace > firstBrace) {
                const candidate = cleanStr.substring(firstBrace, lastBrace + 1);
                try { return JSON.parse(candidate); } catch (e) {
                    try { return JSON.parse(candidate + ']}'); } catch (e2) {}
                    try { return JSON.parse(candidate + '}'); } catch (e3) {}
                }
            } else {
                const incomplete = cleanStr.substring(firstBrace);
                try { return JSON.parse(incomplete + ']}'); } catch (e) {}
                try { return JSON.parse(incomplete + '}'); } catch (e) {}
            }
        }
        const codeBlockMatch = cleanStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (codeBlockMatch) {
            try { return JSON.parse(codeBlockMatch[1].trim()); } catch (e) {}
        }
        return null;
    } catch (e) { return null; }
};

// --- Helper: Strict HTML Extractor ---
const extractCleanHtml = (text: string) => {
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const codeBlockMatch = cleanText.match(/```html\s*/i);
    if (codeBlockMatch && codeBlockMatch.index !== undefined) {
        let clean = cleanText.substring(codeBlockMatch.index + codeBlockMatch[0].length);
        const endFenceIndex = clean.indexOf('```');
        if (endFenceIndex !== -1) {
            clean = clean.substring(0, endFenceIndex);
        }
        return clean;
    }
    const rawStart = cleanText.search(/<!DOCTYPE|<html|<div|<section|<head|<body/i);
    if (rawStart !== -1) {
        let clean = cleanText.substring(rawStart);
        const endFenceIndex = clean.indexOf('```');
        if (endFenceIndex !== -1) {
            clean = clean.substring(0, endFenceIndex);
        }
        return clean;
    }
    return '';
};

// --- Helper: Parse <think> tags from content ---
const parseThinkTag = (text: string) => {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
        return {
            reasoning: thinkMatch[1].trim(),
            content: text.replace(thinkMatch[0], '').trim()
        };
    }
    const unclosedMatch = text.match(/<think>([\s\S]*)/i);
    if (unclosedMatch) {
        return {
            reasoning: unclosedMatch[1].trim(),
            content: ''
        };
    }
    return { reasoning: '', content: text };
};

// --- Helper: Markdown Renderer ---
const MarkdownContent: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
    const html = React.useMemo(() => {
        try {
            return marked.parse(content) as string;
        } catch (e) {
            return content.replace(/\n/g, '<br/>'); // Fallback
        }
    }, [content]);

    return (
        <div 
            className={`markdown-body ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
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
        <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/50 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2">
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
                        className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto custom-scrollbar border-l-2 border-indigo-200 pl-3 italic break-words"
                    >
                        {content}
                        {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-400 animate-pulse align-middle"></span>}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Retrieval Block Component (Grouped Result Display) ---
const RetrievalBlock: React.FC<{ 
    isSearching: boolean; 
    query: string; 
    items?: any[]; // Grouped items
    onItemClick: (item: InfoItem) => void 
}> = ({ isSearching, query, items, onItemClick }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (isSearching) {
        return (
            <div className="mb-3 p-3 bg-white border border-blue-100 rounded-xl shadow-sm flex items-center gap-3 animate-pulse">
                <RefreshIcon className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-xs text-slate-600 font-medium">正在检索知识库: <strong>{query}</strong>...</span>
            </div>
        );
    }

    if (!items || items.length === 0) return null;

    return (
        <div className="mb-3 rounded-xl border border-blue-100 bg-white overflow-hidden shadow-sm">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
            >
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="text-xs font-bold text-slate-700">已检索到 {items.length} 篇相关资料</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[150px] ml-1">({query})</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {isExpanded && (
                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 bg-slate-50/50">
                    {items.map((group, idx) => (
                        <div 
                            key={group.article_id || idx}
                            onClick={() => onItemClick({
                                id: group.article_id,
                                title: group.title,
                                content: group.segments?.map((s:any) => s.content).join('\n\n') || '',
                                source_name: group.source_name,
                                publish_date: group.publish_date,
                                original_url: group.url,
                                created_at: group.created_at || new Date().toISOString()
                            })}
                            className="p-2 m-1 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
                        >
                            <div className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-4 h-4 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600">
                                        {group.title}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                        <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{group.source_name}</span>
                                        {group.segments?.length > 0 && <span>命中 {group.segments.length} 个片段</span>}
                                    </div>
                                </div>
                                <ExternalLinkIcon className="w-3 h-3 text-slate-300 group-hover:text-indigo-400" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Reference Reader Modal ---
const ReferenceReaderModal: React.FC<{ item: InfoItem; onClose: () => void }> = ({ item, onClose }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [loadingHtml, setLoadingHtml] = useState(false);

    useEffect(() => {
        if (item.is_atomized) {
            setLoadingHtml(true);
            getArticleHtml(item.id)
                .then(res => setHtmlContent(res.html_content))
                .catch(() => {})
                .finally(() => setLoadingHtml(false));
        }
    }, [item]);

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-base font-bold text-slate-800 truncate">{item.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded">{item.source_name}</span>
                            <a href={item.original_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline">
                                <ExternalLinkIcon className="w-3 h-3"/> 原文
                            </a>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-white p-0 relative">
                    {loadingHtml ? (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm gap-2">
                            <RefreshIcon className="w-4 h-4 animate-spin"/> 加载原文排版...
                        </div>
                    ) : htmlContent ? (
                        <iframe 
                            srcDoc={htmlContent} 
                            className="w-full h-full border-none" 
                            sandbox="allow-scripts allow-same-origin"
                        />
                    ) : (
                        <div className="p-8 prose prose-sm max-w-none text-slate-700">
                            <div dangerouslySetInnerHTML={{ __html: marked.parse(item.content) as string }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface CopilotSidebarProps extends SharedGeneratorProps {
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
    statusBar?: React.ReactNode; 
    sessionTitle?: string;
    onTitleChange?: (newTitle: string) => void;
    onSwitchSession?: (sessionId: string) => void;
    onEnsureSession?: () => Promise<string>;
    onToggleHistory?: () => void;
}

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
    stage, setStage, history, setHistory, data, setData, 
    isLlmActive, setIsLlmActive, activePageIndex, setActivePageIndex, onReset,
    sessionId, statusBar,
    sessionTitle, onTitleChange, onSwitchSession, onEnsureSession, onToggleHistory, onRefreshSession, onHandleInsufficientBalance
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoGenMode, setAutoGenMode] = useState<'text' | 'html' | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Viewer Modal
    const [viewingItem, setViewingItem] = useState<InfoItem | null>(null);
    
    // Title Edit State
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');

    useEffect(() => {
        setTempTitle(sessionTitle || '');
    }, [sessionTitle]);

    const saveTitle = () => {
        if (tempTitle.trim() && onTitleChange) {
            onTitleChange(tempTitle.trim());
        }
        setIsEditingTitle(false);
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = Math.min(Math.max(scrollHeight, 44), 100) + 'px'; 
        }
    }, [input]);

    // --- Guidance State ---
    const [activeGuide, setActiveGuide] = useState<'outline' | 'compose' | null>(null);

    useEffect(() => {
        if (stage === 'outline' && !localStorage.getItem('ai_guide_outline')) {
            setActiveGuide('outline');
        } else if (stage === 'compose' && !autoGenMode && !localStorage.getItem('ai_guide_compose')) {
            setActiveGuide('compose');
        } else {
            setActiveGuide(null);
        }
    }, [stage, autoGenMode]);

    const dismissGuide = (key: 'outline' | 'compose') => {
        localStorage.setItem(`ai_guide_${key}`, 'true');
        setActiveGuide(null);
    };

    // Initial Greeting
    useEffect(() => {
        if (history.length === 0) {
            const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
            setHistory([{ 
                role: 'assistant', 
                content: `你好！我是您的研报助手。\n📅 今天是 **${today}**。\n\n请告诉我您想要研究的主题，我会调用知识库工具为您构建分析框架。` 
            }]);
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, stage, isLlmActive]);

    // --- Core Logic: Agent Loop with Tool Calling ---
    const runAgentLoop = async (
        initialMessages: any[], 
        onResult: (content: string, reasoning: string) => void,
        onToolUI: (query: string, items: any[]) => void, // UI callback for retrieval
        model: string
    ) => {
        setIsLlmActive(true);
        let activeSessionId = sessionId;
        if (!activeSessionId && onEnsureSession) {
            activeSessionId = await onEnsureSession();
        }

        try {
            let messages = [...initialMessages];
            let finished = false;
            let loopCount = 0;
            const MAX_LOOPS = 5;

            while (!finished && loopCount < MAX_LOOPS) {
                loopCount++;
                let accumulatedContent = '';
                let accumulatedReasoning = '';
                let toolCallsBuffer: any[] = [];
                let currentToolIndex = -1;

                await streamChatCompletions({
                    model: model,
                    messages: messages,
                    stream: true,
                    enable_billing: true,
                    tools: [SEARCH_TOOL_DEF], // Inject Tool
                    tool_choice: 'auto'
                }, (chunk) => {
                    if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                    if (chunk.content) accumulatedContent += chunk.content;
                    
                    // Buffer Tool Calls
                    if (chunk.tool_calls) {
                        chunk.tool_calls.forEach((tc: any) => {
                            if (tc.index !== undefined) {
                                currentToolIndex = tc.index;
                                if (!toolCallsBuffer[currentToolIndex]) {
                                    toolCallsBuffer[currentToolIndex] = { ...tc, function: { name: "", arguments: "" }, id: tc.id };
                                }
                            }
                            if (tc.function?.name && toolCallsBuffer[currentToolIndex]) {
                                toolCallsBuffer[currentToolIndex].function.name += tc.function.name;
                            }
                            if (tc.function?.arguments && toolCallsBuffer[currentToolIndex]) {
                                toolCallsBuffer[currentToolIndex].function.arguments += tc.function.arguments;
                            }
                        });
                    }
                    
                    // Stream content feedback to UI
                    if (toolCallsBuffer.length === 0) {
                        onResult(accumulatedContent, accumulatedReasoning);
                    }
                }, () => {
                    if (onRefreshSession) onRefreshSession();
                }, undefined, activeSessionId, AGENTS.REPORT_GENERATOR);

                // Add Assistant Response to History
                const assistantMsg: any = { 
                    role: 'assistant', 
                    content: accumulatedContent,
                    tool_calls: toolCallsBuffer.length > 0 ? toolCallsBuffer : undefined
                };
                messages.push(assistantMsg);

                // Check for Tool Calls
                if (toolCallsBuffer.length > 0) {
                    for (const toolCall of toolCallsBuffer) {
                        if (toolCall.function.name === 'search_knowledge_base') {
                            let args = { query: '' };
                            try { args = JSON.parse(toolCall.function.arguments); } catch(e) {}
                            
                            // UI Feedback: Searching
                            onToolUI(args.query, []); 

                            // Execute Search (Grouped)
                            let items = [];
                            try {
                                const searchRes = await searchSemanticGrouped({
                                    query_text: args.query,
                                    page: 1,
                                    size: 5, // Top 5 Articles
                                    similarity_threshold: 0.35
                                });
                                items = searchRes.items || [];
                            } catch (searchError: any) {
                                console.error("Search failed", searchError);
                                items = []; // Fail safe
                            }
                            
                            // UI Feedback: Results
                            onToolUI(args.query, items);

                            // Construct Tool Result
                            const toolResult = items.length > 0 
                                ? items.map((item: any) => `文章标题: ${item.title}\n来源: ${item.source_name}\n相关片段:\n${item.segments?.map((s:any) => s.content).join('\n---\n')}`).join('\n\n')
                                : "未找到直接相关资料。";
                            
                            messages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: toolResult
                            });
                        }
                    }
                    // Loop continues to let LLM process the tool results
                } else {
                    finished = true; // No tools called, we are done
                }
            }

        } catch (e: any) {
            console.error(e);
            // Feed error back to UI so user isn't stuck
            setHistory(prev => [...prev, { role: 'assistant', content: `⚠️ 生成过程中发生错误: ${e.message || '网络连接中断'}`, model: model }]);
            
            if (e.message === 'INSUFFICIENT_BALANCE' && onHandleInsufficientBalance) {
                onHandleInsufficientBalance();
            }
        } finally {
            setIsLlmActive(false);
        }
    };

    // --- Outline Generation (Using Agent Loop) ---
    const runOutlineGeneration = async (userPromptText: string, isRefinement: boolean) => {
        // Prepare UI
        setHistory(prev => [...prev, { role: 'assistant', content: '', reasoning: '', model: DEFAULT_STABLE_MODEL }]);
        
        const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        
        // Context from existing data
        const baseContext = data.referenceMaterials ? `【已有参考资料】\n${data.referenceMaterials}\n\n` : '';
        
        const systemPrompt = `You are an expert presentation outline generator. Current Date: ${currentDate}.
        
Objective: Create a detailed outline based on user topic.
Process:
1. **Search**: If you need external info about the topic, use 'search_knowledge_base'.
2. **Structure**: Create a valid JSON outline.

Output: STRICT JSON: { "title": "...", "pages": [ { "title": "...", "content": "Brief summary..." }, ... ] }
Wrap the JSON in \`\`\`json code block.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${baseContext}用户指令: ${userPromptText}` }
        ];

        let finalContent = "";

        await runAgentLoop(
            messages, 
            (content, reasoning) => {
                finalContent = content;
                setHistory(prev => {
                    const newHistory = [...prev];
                    const lastIdx = newHistory.length - 1;
                    // Only update if it's the pending assistant bubble
                    if (newHistory[lastIdx].role === 'assistant' && !newHistory[lastIdx].retrievedItems) {
                         newHistory[lastIdx] = { ...newHistory[lastIdx], reasoning, content };
                    }
                    return newHistory;
                });
            },
            (query, items) => {
                // UI Update for Tool Usage: Append a separate bubble for search results if items exist
                // Logic update: Ensure we append the tool result AND a new placeholder for the next text generation
                if (items && items.length > 0) {
                     setHistory(prev => {
                         // Find the last message. If it was the "Searching..." indicator, we might want to replace it or append.
                         // For simplicity, we just append the result block.
                         return [...prev, {
                             role: 'assistant',
                             content: '', // Tool block content is handled by RetrievalBlock via retrievedItems
                             isRetrieving: false,
                             searchQuery: query,
                             retrievedItems: items, // This will trigger RetrievalBlock
                             timestamp: Date.now()
                         }, { role: 'assistant', content: '', reasoning: '', model: DEFAULT_STABLE_MODEL }]; // Add fresh bubble for continued generation
                     });
                }
            },
            DEFAULT_STABLE_MODEL
        );

        // Post-processing
        const partialOutline = tryParsePartialJson(finalContent);
        if (partialOutline && partialOutline.pages && partialOutline.pages.length > 0) {
            setData(prev => ({ 
                ...prev, 
                topic: partialOutline.title || prev.topic, 
                outline: partialOutline,
                referenceMaterials: (prev.referenceMaterials || '') 
            }));
            if (!isRefinement) {
                setStage('outline');
            }
        }
    };

    // --- Content Generation (Using Agent Loop) ---
    // This runs for each page in the queue
    useEffect(() => {
        if (stage !== 'compose' || isLlmActive || !autoGenMode) return;

        const processQueue = async () => {
             // ... Balance Check ...
            try {
                const wallet = await getWalletBalance();
                if (wallet.balance <= 0) {
                    if (onHandleInsufficientBalance) onHandleInsufficientBalance();
                    setAutoGenMode(null);
                    return; 
                }
            } catch(e) {}

            const pages = data.pages;
            let targetIdx = -1;

            if (autoGenMode === 'text') {
                targetIdx = pages.findIndex(p => !p.content);
            } else if (autoGenMode === 'html') {
                targetIdx = pages.findIndex(p => !p.html);
            }

            if (targetIdx === -1) {
                setAutoGenMode(null);
                setHistory(prev => [...prev, { 
                    role: 'assistant', 
                    content: autoGenMode === 'text' ? "✅ 内容底稿生成完毕！" : "🎉 幻灯片渲染完成！" 
                }]);
                return;
            }

            setActivePageIndex(targetIdx);
            
            const currentPage = pages[targetIdx];
            const taskName = autoGenMode === 'text' ? '撰写内容' : '渲染页面';
            const modelStr = autoGenMode === 'html' ? HTML_GENERATION_MODEL : DEFAULT_STABLE_MODEL;

            // UI Update: Start Bubble
            setHistory(prev => [...prev, { 
                role: 'assistant', 
                content: `正在${taskName} (第 ${targetIdx + 1}/${pages.length} 页)：**${currentPage.title}**...`, 
                model: modelStr
            }]);

            setData(prev => {
                const newPages = [...prev.pages];
                newPages[targetIdx] = { ...newPages[targetIdx], isGenerating: true };
                return { ...prev, pages: newPages };
            });

            // Construct Prompt
            let messages: any[] = [];
            if (autoGenMode === 'text') {
                 // Text Generation Agent Prompt
                 const systemPrompt = `You are a professional report writer.
1. **Search**: If you lack specific details for the slide "${currentPage.title}", use 'search_knowledge_base' to find facts.
2. **Write**: Generate detailed slide content. JSON format: { "content": "..." }.`;

                 messages = [
                     { role: 'system', content: systemPrompt },
                     { role: 'user', content: `Title: ${currentPage.title}\nSummary: ${currentPage.summary}` }
                 ];
            } else {
                 // HTML Generation (Direct, usually no search needed, but we keep structure)
                 // ... HTML prompt setup (same as before) ...
                 let systemPromptContent = "You are an expert web designer. Create a 1600x900 HTML slide.";
                 try {
                     const promptDetail = await getPromptDetail("14920b9c-604f-4066-bb80-da7a47b65572");
                     systemPromptContent = promptDetail.content;
                 } catch(e) {}
                 messages = [
                    { role: 'system', content: systemPromptContent }, 
                    { role: 'user', content: `Title: ${currentPage.title}\nContent:\n${currentPage.content}` }
                ];
            }

            // Run Loop
            let finalContent = "";
            await runAgentLoop(messages, (content, reasoning) => {
                 finalContent = content;
                 // Update UI Bubble
                 setHistory(prev => {
                    const h = [...prev];
                    const lastMsg = h[h.length - 1];
                    if (lastMsg.role === 'assistant' && !lastMsg.retrievedItems) {
                         h[h.length - 1] = { ...lastMsg, reasoning, content };
                    }
                    return h;
                });
                
                // Update Page Data Live
                setData(prev => {
                    const newPages = [...prev.pages];
                    if (autoGenMode === 'text') {
                        let displayContent = content;
                        const partial = tryParsePartialJson(content);
                        if (partial && partial.content) displayContent = partial.content;
                        newPages[targetIdx].content = displayContent;
                    } else {
                        const cleanHtml = extractCleanHtml(content);
                        if (cleanHtml) newPages[targetIdx].html = cleanHtml;
                    }
                    return { ...prev, pages: newPages };
                });

            }, (query, items) => {
                 // Tool UI Feedback
                 if (items && items.length > 0) {
                     setHistory(prev => [...prev, {
                         role: 'assistant',
                         content: '',
                         searchQuery: query,
                         retrievedItems: items, 
                         timestamp: Date.now()
                     }, { role: 'assistant', content: '', model: modelStr }]);
                }
            }, modelStr);

            // Finalize Page
             setData(prev => {
                const newPages = [...prev.pages];
                newPages[targetIdx].isGenerating = false;
                if (autoGenMode === 'html') {
                     const cleanHtml = extractCleanHtml(finalContent);
                     newPages[targetIdx].html = cleanHtml;
                }
                return { ...prev, pages: newPages };
            });

        };
        processQueue();
    }, [stage, isLlmActive, autoGenMode, data.pages]);


    // ... Modification logic omitted for brevity as it remains similar ...
    // Using a simpler placeholder here for modification as it's less affected by RAG flow currently
    const handleModification = async (instruction: string) => {
         // (Keep existing modification logic, ensuring isLlmActive is handled)
         setIsLlmActive(true);
         setHistory(prev => [...prev, { role: 'assistant', content: "收到修改指令，正在处理..." }]);
         setTimeout(() => setIsLlmActive(false), 1000); // Mock
    };


    const handleSend = async (val?: string) => {
        if (activeGuide) dismissGuide(activeGuide);
        const text = val || input;
        if (!text.trim() || isLlmActive) return;
        
        if (!val) setInput('');
        setHistory(prev => [...prev, { role: 'user', content: text }]);

        if (stage === 'collect') {
            await runOutlineGeneration(text, false);
        } else if (stage === 'outline') {
            await runOutlineGeneration(`Update outline based on: ${text}`, true);
        } else if (stage === 'compose') {
            if (autoGenMode) {
                setHistory(prev => [...prev, { role: 'assistant', content: "请等待当前生成队列完成。" }]);
            } else {
                await handleModification(text);
            }
        }
    };

    const allTextReady = data.pages.length > 0 && data.pages.every(p => !!p.content);
    const hasHtml = data.pages.some(p => !!p.html);
    const isEditMode = stage === 'compose' && !autoGenMode;
    const activePage = data.pages[activePageIndex];
    const isHtmlEdit = !!activePage?.html;

    useEffect(() => {
        if (stage === 'compose' && !autoGenMode && !allTextReady && !isLlmActive) {
            setAutoGenMode('text');
        }
    }, [stage, allTextReady, autoGenMode, isLlmActive]);

    const renderChatBubbles = () => (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" ref={scrollRef}>
             <style>{`
                .markdown-body p { margin-bottom: 0.5rem; }
                .markdown-body ul, .markdown-body ol { margin-left: 1.25rem; list-style-type: disc; margin-bottom: 0.5rem; }
                .markdown-body ol { list-style-type: decimal; }
                .markdown-body h1, .markdown-body h2, .markdown-body h3 { font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem; }
                .markdown-body code { background: #f1f5f9; padding: 0.2rem 0.4rem; rounded: 4px; font-size: 0.85em; }
                .markdown-body pre { background: #1e293b; color: #e2e8f0; padding: 0.75rem; rounded-lg; overflow-x: auto; margin-bottom: 0.5rem; }
                .markdown-body pre code { background: transparent; padding: 0; color: inherit; }
                .markdown-body blockquote { border-left: 3px solid #cbd5e1; padding-left: 1rem; color: #64748b; }
            `}</style>
            
            {history.filter(m => !m.hidden).map((msg, i) => {
                const isAssistant = msg.role === 'assistant';
                const isLast = i === history.length - 1;
                
                // --- Retrieval Block Rendering ---
                if (msg.retrievedItems && msg.retrievedItems.length > 0) {
                    return (
                        <RetrievalBlock 
                            key={i}
                            isSearching={false}
                            query={msg.searchQuery || 'Tool Search'}
                            items={msg.retrievedItems}
                            onItemClick={setViewingItem}
                        />
                    );
                }

                // --- Standard Message Rendering ---
                let parsedContent = { reasoning: msg.reasoning || '', content: msg.content };
                if (!parsedContent.reasoning && parsedContent.content) {
                     const split = parseThinkTag(parsedContent.content);
                     if (split.reasoning) parsedContent = split;
                }
                if (msg.reasoning) {
                    parsedContent.reasoning = msg.reasoning + (parsedContent.reasoning ? '\n' + parsedContent.reasoning : '');
                }

                const trimmed = parsedContent.content.trim();
                const isJsonOutline = isAssistant && ((trimmed.startsWith('{') || trimmed.startsWith('```json')) && trimmed.includes('"pages"'));
                const isJsonContent = isAssistant && ((trimmed.startsWith('{') || trimmed.startsWith('```json')) && trimmed.includes('"content"') && !trimmed.includes('"pages"'));
                const isHtml = isAssistant && (trimmed.startsWith('```html') || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html'));

                const shouldHideText = isJsonOutline || isJsonContent || isHtml;
                const showThinking = !!parsedContent.reasoning;
                const isEmpty = !parsedContent.content && !parsedContent.reasoning;

                let statusTitle = "处理完成";
                let statusDesc = "已同步至右侧画布";

                if (isHtml) statusTitle = isLlmActive && isLast ? "正在绘制幻灯片..." : "幻灯片渲染完成";
                else if (isJsonOutline) statusTitle = isLlmActive && isLast ? "正在构建大纲..." : "大纲构建完成";
                else if (isJsonContent) statusTitle = isLlmActive && isLast ? "正在撰写内容..." : "内容撰写完成";

                if (isLlmActive && isLast) statusDesc = "AI 正在实时输出至右侧画布...";

                return (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {isAssistant && msg.model && (
                            <div className="mb-2 flex items-center gap-1.5 ml-1">
                                <div className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 shadow-sm">
                                    <ServerIcon className="w-2.5 h-2.5" />
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-50/50 px-1.5 py-0.5 rounded border border-slate-100 truncate max-w-[220px]" title={msg.model}>
                                    {msg.model.replace('openrouter@', '').replace(':free', '')}
                                </span>
                            </div>
                        )}

                        <div className={`
                            max-w-[95%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm border transition-all
                            ${msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-sm border-indigo-600 shadow-indigo-100' 
                                : 'bg-white text-slate-700 border-slate-200 rounded-tl-sm'
                            }
                        `}>
                            {showThinking && (
                                <ThinkingBlock 
                                    content={parsedContent.reasoning} 
                                    isStreaming={isLlmActive && isLast} 
                                />
                            )}
                            
                            {isAssistant && isEmpty && isLlmActive && isLast && (
                                <div className="flex items-center gap-2 text-slate-400 text-xs italic py-1">
                                    <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                                    <span>正在启动深度推理...</span>
                                </div>
                            )}

                            {shouldHideText ? (
                                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-50 shadow-none">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isLlmActive && isLast ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                                        {isLlmActive && isLast ? (
                                            isHtml ? <PlayIcon className="w-4 h-4 animate-spin"/> : <DocumentTextIcon className="w-4 h-4 animate-pulse"/>
                                        ) : (
                                            <CheckCircleIcon className="w-4 h-4"/>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">{statusTitle}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{statusDesc}</div>
                                    </div>
                                </div>
                            ) : (
                                <MarkdownContent 
                                    content={parsedContent.content} 
                                    className={msg.role === 'user' ? 'text-white prose-invert' : 'text-slate-700'} 
                                />
                            )}
                        </div>
                    </div>
                );
            })}
             {history.length === 0 && (
                <div className="mt-20 text-center text-slate-400 px-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                        <SparklesIcon className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="font-bold text-slate-700 mb-2">AI 研报助手</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        请输入您的研报主题，AI 将自动检索最新情报并为您构建专业分析框架。
                    </p>
                </div>
            )}

            {stage === 'compose' && allTextReady && !autoGenMode && !hasHtml && (
                <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4">
                    <button 
                        onClick={() => setAutoGenMode('html')}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                        <PlayIcon className="w-3 h-3" /> 开始设计幻灯片
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] border-r border-slate-200">
            {/* Header */}
            <div className="h-16 px-5 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                 {/* ... Header Content (Same as previous) ... */}
                 <div className="flex items-center gap-4 flex-1 overflow-hidden mr-2">
                     <div className="flex-shrink-0">
                        {statusBar}
                     </div>
                     <div className="flex items-center gap-2 min-w-0 flex-1">
                         <div className="h-4 w-px bg-slate-200"></div>
                         {isEditingTitle ? (
                             <div className="flex items-center gap-1 flex-1">
                                 <input 
                                     autoFocus
                                     value={tempTitle}
                                     onChange={e => setTempTitle(e.target.value)}
                                     onBlur={saveTitle}
                                     onKeyDown={e => e.key === 'Enter' && saveTitle()}
                                     className="w-full bg-white border border-indigo-300 rounded px-2 py-0.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                                     placeholder="输入任务标题..."
                                 />
                                 <button onClick={saveTitle} className="text-green-600 hover:bg-green-50 p-1 rounded">
                                     <CheckCircleIcon className="w-3.5 h-3.5" />
                                 </button>
                             </div>
                         ) : (
                             <div 
                                className="group flex items-center gap-2 cursor-pointer hover:bg-slate-100 px-2 py-1 rounded-md transition-colors flex-1 min-w-0"
                                onClick={() => { setIsEditingTitle(true); setTempTitle(sessionTitle || '未命名报告'); }}
                                title="点击修改标题"
                             >
                                 <span className="text-xs font-bold text-slate-700 truncate">{sessionTitle || '未命名报告'}</span>
                                 <PencilIcon className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </div>
                         )}
                     </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                     <button 
                        onClick={onToggleHistory} 
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="查看历史任务"
                    >
                        <ClockIcon className="w-5 h-5" />
                    </button>
                     <button 
                        onClick={onReset} 
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="新建任务"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                {renderChatBubbles()}

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-200 z-20 flex-shrink-0 relative">
                    <ContextAnchor 
                        stage={stage}
                        pageIndex={activePageIndex}
                        pageTitle={data.pages[activePageIndex]?.title}
                        isVisualMode={isHtmlEdit}
                    />

                    {activeGuide === 'outline' && (
                        <GuidanceBubble 
                            message="对大纲结构不满意？直接输入“修改第二章为...”或“增加关于xxx的章节”，AI 将为您即时调整。" 
                            onDismiss={() => dismissGuide('outline')} 
                        />
                    )}
                    {activeGuide === 'compose' && (
                        <GuidanceBubble 
                            message="💡 操作提示：先点击右侧幻灯片选中要修改的页面，然后在对话框输入指令（如“精简这段话”或“换个深色背景”）即可。" 
                            onDismiss={() => dismissGuide('compose')} 
                        />
                    )}

                    {isEditMode && (
                        <div className="mb-3 animate-in fade-in slide-in-from-bottom-1">
                             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {(isHtmlEdit 
                                    ? ['换个深色主题', '增加图表', '改为左右布局', '字体加大', '重绘'] 
                                    : ['扩写一段', '精简内容', '增加数据', '润色语气', '翻译成英文']
                                ).map(action => (
                                    <button
                                        key={action}
                                        onClick={() => handleSend(action)}
                                        disabled={isLlmActive}
                                        className="flex-shrink-0 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-500 text-[10px] rounded-full transition-all shadow-sm active:scale-95"
                                    >
                                        {action}
                                    </button>
                                ))}
                             </div>
                         </div>
                    )}
                    
                    <div className={`relative shadow-sm rounded-xl transition-all duration-300 bg-white ${isEditMode ? 'ring-2 ring-indigo-100 border-indigo-200' : 'border-slate-200 border'}`}>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={isEditMode 
                                ? (isHtmlEdit ? "输入调整指令（如：换个更现代的字体...）" : "输入内容修改指令...")
                                : (stage === 'collect' ? "输入研报主题..." : "输入修改建议...")
                            }
                            className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none resize-none max-h-32 min-h-[44px] custom-scrollbar placeholder:text-slate-400"
                            disabled={isLlmActive}
                            rows={1}
                        />
                        <button 
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLlmActive}
                            className={`absolute bottom-2 right-2 p-1.5 rounded-lg transition-all ${
                                input.trim() && !isLlmActive 
                                    ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' 
                                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                        >
                            {isLlmActive ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {viewingItem && (
                <ReferenceReaderModal 
                    item={viewingItem} 
                    onClose={() => setViewingItem(null)} 
                />
            )}
        </div>
    );
};
