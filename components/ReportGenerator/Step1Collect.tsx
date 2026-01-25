
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

// --- Agent Tools Definition ---
const SEARCH_TOOL_DEF = {
    type: "function",
    function: {
        name: "search_knowledge_base",
        description: "搜索内部汽车行业情报数据库。当用户输入新的研究主题、需要事实数据支持、或现有信息不足以构建完整大纲时，必须使用此工具。",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "搜索关键词。应提炼用户意图的核心实体和属性，例如 '小米SU7 销量' 或 '固态电池 技术路线'。"
                }
            },
            required: ["query"]
        }
    }
};

const SYSTEM_PROMPT_TEMPLATE = `你是一个专业的行业研究员和报告策划专家。
当前日期: {{current_date}}。

**你的目标**：
基于用户输入的主题，构建一份结构严谨、逻辑清晰的 PPT 研报大纲。

**核心指令**：
1. **优先响应用户**：必须基于用户的具体输入（如“小米汽车26年战略”）进行规划，严禁忽略用户输入而自行假设主题。
2. **适度检索**：
   - 只有在确实缺乏核心事实时才调用 \`search_knowledge_base\`。
   - **最多允许 2 轮检索**。如果检索结果已部分覆盖或检索 2 次后仍不完美，请立即基于现有信息和你的通用知识生成大纲。
   - **禁止死循环**：不要为了追求“完美”而反复检索类似内容。
3. **输出大纲**：当信息足够或达到检索限制时，**必须**输出最终的 JSON 格式大纲，不要再说废话。

**最终输出格式 (必须是纯 JSON)**：
\`\`\`json
{
  "title": "报告主标题",
  "pages": [
    { "title": "第一页标题", "content": "本页核心观点和数据详述..." },
    { "title": "第二页标题", "content": "..." }
  ]
}
\`\`\`
注意：pages 数组建议包含 5-8 页。内容 (content) 需详实。`;

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

// --- Retrieval Block Component (Result Display) ---
const RetrievalBlock: React.FC<{ 
    isSearching: boolean; 
    query: string; 
    items?: InfoItem[]; 
    onItemClick: (item: InfoItem) => void 
}> = ({ isSearching, query, items, onItemClick }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (isSearching) {
        return (
            <div className="mb-3 p-3 bg-white border border-blue-100 rounded-xl shadow-sm flex items-center gap-3 animate-pulse">
                <RefreshIcon className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-xs text-slate-600 font-medium">正在调用知识库检索: <strong>{query}</strong>...</span>
            </div>
        );
    }

    if (!items || items.length === 0) return null;

    return (
        <div className="mb-3 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
            >
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="text-xs font-bold text-slate-700">已检索到 {items.length} 篇相关情报</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[150px] ml-1">({query})</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {isExpanded && (
                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 bg-slate-50/50">
                    {items.map((item, idx) => (
                        <div 
                            key={idx}
                            onClick={() => onItemClick(item)}
                            className="p-2 m-1 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
                        >
                            <div className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-4 h-4 bg-slate-100 text-slate-500 rounded text-[9px] font-bold flex items-center justify-center mt-0.5">
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600">
                                        {item.title}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                        <span className="bg-slate-50 px-1 rounded">{item.source_name}</span>
                                        <span>{(item.similarity ? item.similarity * 100 : 0).toFixed(0)}% 相似度</span>
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
                content: `你好！我是您的研报助手。\n📅 今天是 **${today}**。\n\n请告诉我您想要研究的主题，我会自动检索知识库并为您构建分析框架。` 
            }]);
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, stage, isLlmActive]);

    // --- Agent Loop for Outline Generation (ReAct) ---
    // ⚡️ Fix: Added 'tempUserMessage' parameter to accept the latest user input that might not be in state yet.
    const runAgentLoop = async (userPromptText: string, isRefinement: boolean, tempUserMessage?: ChatMessage) => {
        setIsLlmActive(true);
        
        // 1. Balance Check
        try {
            const wallet = await getWalletBalance();
            if (wallet.balance <= 0) {
                if (onHandleInsufficientBalance) onHandleInsufficientBalance();
                setIsLlmActive(false);
                return;
            }
        } catch(e) {
            console.warn("Failed check balance", e);
        }

        // 2. Session
        let activeSessionId = sessionId;
        if (!activeSessionId && onEnsureSession) {
            activeSessionId = await onEnsureSession();
        }

        const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // --- 3. Build History for API ---
        // ⚡️ CRITICAL FIX: Ensure `content` is null when `tool_calls` is present for OpenAI compatibility
        // ⚡️ CRITICAL FIX: Explicitly append the new user message if provided, because React state might lag
        let currentHistory = [...history];
        if (tempUserMessage) {
            currentHistory.push(tempUserMessage);
        }

        let apiHistory = currentHistory.filter(m => m.role !== 'system' && !m.isRetrieving).map(m => {
            const msg: any = { role: m.role };
            
            if (m.tool_calls && m.tool_calls.length > 0) {
                msg.content = null; // FORCE content to null if tool_calls exist
                msg.tool_calls = m.tool_calls;
            } else {
                msg.content = m.content || "";
            }
            
            if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
            return msg;
        });

        // Ensure System Prompt
        const systemPromptContent = SYSTEM_PROMPT_TEMPLATE.replace('{{current_date}}', currentDate);
        if (apiHistory.length === 0 || apiHistory[0].role !== 'system') {
            apiHistory.unshift({ role: 'system', content: systemPromptContent });
        }

        const MAX_TURNS = 5;
        let turnCount = 0;
        let keepRunning = true;
        let finalOutlineFound = false;

        try {
            while (keepRunning && turnCount < MAX_TURNS) {
                turnCount++;
                
                // ⚡️ OPTIMIZATION: System Intervention to prevent infinite loops
                if (turnCount > 3) {
                    apiHistory.push({
                        role: 'system',
                        content: "(系统提示：你已经进行了多次搜索。信息已足够，请立即停止搜索，基于现有信息生成 JSON 大纲。)"
                    });
                }

                // Prepare Assistant Message Placeholder
                const assistantMsgId = crypto.randomUUID();
                setHistory(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', reasoning: '' }]);
                
                let accumulatedContent = '';
                let accumulatedReasoning = '';
                let toolCallsBuffer: any[] = [];
                let currentToolIndex = -1;
                let streamError: Error | null = null; // Capture stream error

                await streamChatCompletions({
                    model: DEFAULT_STABLE_MODEL,
                    messages: apiHistory,
                    stream: true,
                    temperature: 0.2, // Lower temp for agent logic
                    tools: [SEARCH_TOOL_DEF],
                    tool_choice: "auto",
                    enable_billing: true
                }, (chunk) => {
                    if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                    if (chunk.content) accumulatedContent += chunk.content;
                    
                    if (chunk.tool_calls) {
                         chunk.tool_calls.forEach((tc: any) => {
                            if (tc.index !== undefined) {
                                currentToolIndex = tc.index;
                                if (!toolCallsBuffer[currentToolIndex]) {
                                    // ⚡️ CRITICAL FIX: Explicitly add type: 'function' to ensure API compatibility
                                    toolCallsBuffer[currentToolIndex] = { 
                                        ...tc, 
                                        type: 'function',
                                        function: { name: "", arguments: "" }, 
                                        id: tc.id 
                                    };
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

                    // Live UI Update
                    setHistory(prev => {
                        const newHistory = [...prev];
                        const idx = newHistory.findIndex(m => m.id === assistantMsgId);
                        if (idx !== -1) {
                            newHistory[idx] = { 
                                ...newHistory[idx], 
                                reasoning: accumulatedReasoning, 
                                content: accumulatedContent 
                            };
                        }
                        return newHistory;
                    });
                }, () => {
                    if (onRefreshSession) onRefreshSession();
                }, (err) => {
                    streamError = err; // Capture error
                }, activeSessionId, AGENTS.REPORT_GENERATOR);

                // Check if stream encountered error
                if (streamError) {
                    throw streamError;
                }

                // --- Turn Finished, Process Result ---
                // ⚡️ CRITICAL FIX: Sanitize toolCallsBuffer to ensure proper structure before adding to history
                const sanitizedToolCalls = toolCallsBuffer.length > 0 ? toolCallsBuffer.map(tc => ({
                    id: tc.id,
                    type: 'function',
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments
                    }
                })) : undefined;

                const finalMsg = {
                    role: 'assistant',
                    content: accumulatedContent || null, // Ensure strict null if empty for API history
                    tool_calls: sanitizedToolCalls
                };
                
                apiHistory.push(finalMsg as any);

                // 1. Check for JSON Outline First (in case model outputs it directly)
                const partialOutline = tryParsePartialJson(accumulatedContent);
                if (partialOutline && partialOutline.pages && partialOutline.pages.length > 0) {
                    setData(prev => ({ 
                        ...prev, 
                        topic: partialOutline.title || prev.topic, 
                        outline: partialOutline 
                    }));
                    if (!isRefinement) setStage('outline');
                    keepRunning = false;
                    finalOutlineFound = true;
                    break;
                }

                // 2. Handle Tools
                if (finalMsg.tool_calls && finalMsg.tool_calls.length > 0) {
                    for (const toolCall of finalMsg.tool_calls) {
                        if (toolCall.function.name === 'search_knowledge_base') {
                            let args = { query: '' };
                            try { args = JSON.parse(toolCall.function.arguments); } catch (e) { args.query = "error"; }

                            // A. UI: Show Searching Block
                            const toolMsgId = crypto.randomUUID();
                            setHistory(prev => [...prev, {
                                role: 'tool',
                                content: '', // Hidden in UI mainly
                                isRetrieving: true,
                                searchQuery: args.query,
                                id: toolMsgId
                            }]);

                            // B. API: Execute Search
                            let searchResultString = "No results found.";
                            let foundItems: InfoItem[] = [];
                            
                            try {
                                const res = await searchSemanticGrouped({ 
                                    query_text: args.query, 
                                    page: 1, 
                                    size: 5, 
                                    similarity_threshold: 0.35 
                                });
                                
                                // Map items preserving segments structure for better LLM context usage
                                foundItems = (res.items || []).map((item: any) => ({
                                    id: item.article_id,
                                    title: item.title,
                                    // Use 'segments' directly if available, otherwise use joined content
                                    // We will store segments in a special prop for formatting below
                                    segments: item.segments || [],
                                    content: item.segments ? item.segments.map((s: any) => s.content).join('\n') : '',
                                    source_name: item.source_name,
                                    publish_date: item.publish_date,
                                    original_url: item.url,
                                    created_at: item.created_at
                                }));
                                
                                if (foundItems.length > 0) {
                                    // ⚡️ OPTIMIZATION: Instead of violently truncating to 800 chars,
                                    // we provide the top N segments. This preserves context integrity while saving tokens.
                                    searchResultString = JSON.stringify(foundItems.map((i: any) => ({
                                        title: i.title,
                                        source: i.source_name,
                                        date: i.publish_date,
                                        // Provide top 3 segments (highly relevant chunks) to save token
                                        segments: (i.segments || []).slice(0, 3).map((s: any) => s.content) 
                                    })));
                                    
                                    // Update global reference materials for Context
                                    // Also using segments here for better granularity
                                    const newRefText = foundItems.map((i: any) => 
                                        `[${i.title}]: ${(i.segments || []).slice(0, 3).map((s: any) => s.content).join('... ')}`
                                    ).join('\n\n');
                                    
                                    setData(prev => ({
                                        ...prev,
                                        referenceMaterials: (prev.referenceMaterials || '') + "\n" + newRefText
                                    }));
                                }
                            } catch (err: any) {
                                searchResultString = `Search Error: ${err.message}`;
                            }

                            // C. UI: Update Block with Results
                            setHistory(prev => prev.map(m => m.id === toolMsgId ? {
                                ...m,
                                isRetrieving: false,
                                retrievedItems: foundItems
                            } : m));

                            // D. API History: Add Tool Result
                            apiHistory.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: searchResultString
                            });
                        }
                    }
                    // Loop continues for next turn (Model processes results)
                } else {
                    // No tool calls, and no JSON outline -> Likely conversational response or question
                    
                    // ⚡️ CRITICAL FIX: Check if response is empty (Silent failure case)
                    // If model returned nothing and no tool calls, it might have failed or refused.
                    if (!accumulatedContent && !accumulatedReasoning) {
                        setHistory(prev => [...prev, { role: 'assistant', content: "（思考结束，但未生成回复。请尝试更具体的指令。）" }]);
                    }
                    
                    keepRunning = false;
                }
            }

        } catch (e: any) {
             console.error(e);
             if (e.message === 'INSUFFICIENT_BALANCE') {
                if (onHandleInsufficientBalance) onHandleInsufficientBalance();
             } else {
                setHistory(prev => [...prev, { role: 'assistant', content: `生成出错：${e.message || '请重试'}` }]);
             }
        } finally {
            setIsLlmActive(false);
        }
    };

    // --- Core Logic: Serial Generation (Text or HTML) ---
    // (This part remains mostly unchanged from the original procedural logic as Agent loop is mainly for planning)
    // But we include the RAG search logic using tool style if needed.
    // For specific page generation, we use a simpler tool-less prompt usually, or we can enable tools there too.
    // For now, let's keep the existing logic for page generation but ensure it respects the reactive principle if we want consistent behavior.
    // However, user requested "Agent Reactive" for retrieval.
    
    // Helper to perform simple search for page generation (non-agentic for speed/simplicity in batch, or agentic?)
    // To be consistent with "Reactive", we should ideally use the same agent loop.
    // But generating 10 pages with full agent loop each is very slow and expensive.
    // Compromise: Use a simple RAG look-up (procedural) for page generation, 
    // OR allow the writer to call tools. 
    // The previous implementation had `performResearch` inside `useEffect` loop. We can keep that but use the new `searchSemanticGrouped` API.
    
    const performPageResearch = async (query: string): Promise<string> => {
        try {
            const res = await searchSemanticGrouped({
                query_text: query,
                page: 1,
                size: 3,
                similarity_threshold: 0.4
            });
            const items = res.items || [];
            if (items.length > 0) {
                 return items.map((item: any) => `[参考:${item.title}] ${item.segments?.[0]?.content || ''}`).join('\n');
            }
            return "";
        } catch (e) { return ""; }
    };

    useEffect(() => {
        if (stage !== 'compose' || isLlmActive || !autoGenMode) return;

        const processQueue = async () => {
            // ... Balance check ...
            try {
                const wallet = await getWalletBalance();
                if (wallet.balance <= 0) {
                    if (onHandleInsufficientBalance) onHandleInsufficientBalance();
                    setAutoGenMode(null);
                    return; 
                }
            } catch(e) {}

            let activeSessionId = sessionId;
            if (!activeSessionId && onEnsureSession) {
                activeSessionId = await onEnsureSession();
            }

            const pages = data.pages;
            let targetIdx = -1;

            if (autoGenMode === 'text') {
                targetIdx = pages.findIndex(p => !p.content);
            } else if (autoGenMode === 'html') {
                targetIdx = pages.findIndex(p => !p.html);
            }

            if (targetIdx === -1) {
                setAutoGenMode(null);
                return;
            }

            setActivePageIndex(targetIdx);
            setIsLlmActive(true);
            
            const currentPage = pages[targetIdx];
            const taskName = autoGenMode === 'text' ? '撰写内容' : '渲染页面';
            
            // ⚡️ MODEL DYNAMIC SWITCHING
            // Default models, will be overwritten if prompt config is fetched
            let modelStr = autoGenMode === 'html' ? HTML_GENERATION_MODEL : DEFAULT_STABLE_MODEL;

            let pageSpecificContext = "";
            if (autoGenMode === 'text') {
                const query = `${currentPage.title} ${currentPage.summary.slice(0, 30)}`;
                // Use simplified RAG for page generation speed
                pageSpecificContext = await performPageResearch(query);
            }

            setHistory(prev => {
                return [...prev, { 
                    role: 'assistant', 
                    content: `正在${taskName} (第 ${targetIdx + 1}/${pages.length} 页)：**${currentPage.title}**...`, 
                    reasoning: '',
                    model: 'Loading Config...' // Temp placeholder
                }];
            });

            setData(prev => {
                const newPages = [...prev.pages];
                newPages[targetIdx] = { ...newPages[targetIdx], isGenerating: true };
                return { ...prev, pages: newPages };
            });

            try {
                let messages: any[] = [];
                
                if (autoGenMode === 'text') {
                    const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
                    
                    let contentTemplate = "";
                    try {
                        const promptDetail = await getPromptDetail("c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2");
                        contentTemplate = promptDetail.content;
                        // ⚡️ DYNAMIC: Use model from prompt config if available
                        if (promptDetail.channel_code && promptDetail.model_id) {
                            modelStr = `${promptDetail.channel_code}@${promptDetail.model_id}`;
                        }
                    } catch(e) {
                         contentTemplate = `Write detailed slide content. Title: {{ page_title }}. Summary: {{ page_summary }}.`;
                    }
                    
                    const content = contentTemplate
                        .replace('{{ page_index }}', String(targetIdx + 1))
                        .replace('{{ page_title }}', currentPage.title)
                        .replace('{{ page_summary }}', currentPage.summary);
                    
                    const combinedRefs = (data.referenceMaterials || '') + (pageSpecificContext ? `\n\n[本页专属参考资料]\n${pageSpecificContext}` : '');
                    
                    let finalContent = `Current Date: ${currentDate}\n\n${content}`;
                    if (combinedRefs) {
                        finalContent = `Current Date: ${currentDate}\n【参考资料库】\n${combinedRefs}\n\n${content}`;
                    }
                    
                    messages = [{ role: 'user', content: finalContent }];
                } else {
                     // HTML Generation
                    let systemPromptContent = '';
                    try {
                        const promptDetail = await getPromptDetail("14920b9c-604f-4066-bb80-da7a47b65572");
                        systemPromptContent = promptDetail.content;
                        // ⚡️ DYNAMIC: Use model from prompt config if available
                        if (promptDetail.channel_code && promptDetail.model_id) {
                            modelStr = `${promptDetail.channel_code}@${promptDetail.model_id}`;
                        }
                    } catch(e) {
                         systemPromptContent = "You are an expert web designer. Create a single 1600x900 HTML slide using TailwindCSS.";
                    }
                    messages = [
                        { role: 'system', content: systemPromptContent }, 
                        { role: 'user', content: `Title: ${currentPage.title}\nContent:\n${currentPage.content}` }
                    ];
                }

                // Update UI with the actual model being used
                setHistory(prev => {
                    const h = [...prev];
                    const lastMsg = h[h.length - 1];
                    if (lastMsg.role === 'assistant') {
                         h[h.length - 1] = { ...lastMsg, model: modelStr };
                    }
                    return h;
                });

                let accContent = '';
                let accReasoning = '';

                await streamChatCompletions({
                    model: modelStr,
                    messages: messages,
                    stream: true,
                    enable_billing: true
                }, (chunk) => {
                    if (chunk.reasoning) accReasoning += chunk.reasoning;
                    if (chunk.content) accContent += chunk.content;

                    setHistory(prev => {
                        const h = [...prev];
                        const lastMsg = h[h.length - 1];
                        if (lastMsg.role === 'assistant' && !lastMsg.retrievedItems) {
                             h[h.length - 1] = { ...lastMsg, reasoning: accReasoning, content: accContent };
                        }
                        return h;
                    });

                    setData(prev => {
                        const newPages = [...prev.pages];
                        if (autoGenMode === 'text') {
                            let displayContent = accContent;
                            const partial = tryParsePartialJson(accContent);
                            if (partial && partial.content) {
                                displayContent = partial.content;
                            } else if (accContent.includes('"content":')) {
                                const match = accContent.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)/s);
                                if (match) displayContent = match[1];
                            }
                            newPages[targetIdx].content = displayContent;
                        } else {
                            const cleanHtml = extractCleanHtml(accContent);
                            if (cleanHtml) {
                                newPages[targetIdx].html = cleanHtml;
                            }
                        }
                        return { ...prev, pages: newPages };
                    });
                }, () => {
                    if (onRefreshSession) onRefreshSession();
                }, undefined, activeSessionId, AGENTS.REPORT_GENERATOR);

                setData(prev => {
                    const newPages = [...prev.pages];
                    newPages[targetIdx].isGenerating = false;
                    if (autoGenMode === 'html') {
                         const cleanHtml = extractCleanHtml(accContent);
                         newPages[targetIdx].html = cleanHtml;
                    }
                    return { ...prev, pages: newPages };
                });

                setHistory(prev => {
                   const h = [...prev];
                   const lastMsg = h[h.length - 1];
                    if (lastMsg.role === 'assistant' && !lastMsg.retrievedItems) {
                        h[h.length - 1].content = `✅ 第 ${targetIdx + 1} 页生成完成。`;
                    }
                   return h;
                });

            } catch (e: any) {
                if (e.message === 'INSUFFICIENT_BALANCE') {
                    if (onHandleInsufficientBalance) onHandleInsufficientBalance();
                    setAutoGenMode(null);
                }
                
                setData(prev => {
                    const newPages = [...prev.pages];
                    newPages[targetIdx].isGenerating = false;
                    return { ...prev, pages: newPages };
                });
            } finally {
                setIsLlmActive(false); 
            }
        };

        processQueue();
    }, [stage, isLlmActive, autoGenMode, data.pages]);

    // ... Handle Modification (User chat during generation) ...
    const handleSend = async (val?: string) => {
        if (activeGuide) dismissGuide(activeGuide);
        const text = val || input;
        if (!text.trim() || isLlmActive) return;
        
        if (!val) setInput('');
        
        // ⚡️ Fix: Add user message to state immediately for UI feedback
        const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: text };
        setHistory(prev => [...prev, userMsg]);

        if (stage === 'collect') {
            // ⚡️ Fix: Pass the user message object to ensure it's included in the loop context
            await runAgentLoop(text, false, userMsg);
        } else if (stage === 'outline') {
            const updateMsg = { id: crypto.randomUUID(), role: 'user' as const, content: `Update outline based on: ${text}` };
            await runAgentLoop(`Update outline based on: ${text}`, true, updateMsg);
        } else if (stage === 'compose') {
            if (autoGenMode) {
                setHistory(prev => [...prev, { role: 'assistant', content: "请等待当前生成队列完成。" }]);
            } else {
                // Modification logic (simplified for now, can be agentic too if needed)
                setIsLlmActive(true);
                setHistory(prev => [...prev, { role: 'assistant', content: "收到修改指令，正在处理..." }]);
                setTimeout(() => setIsLlmActive(false), 1000); 
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
            `}</style>
            
            {history.filter(m => !m.hidden).map((msg, i) => {
                const isAssistant = msg.role === 'assistant';
                const isLast = i === history.length - 1;
                
                // --- Retrieval Block Rendering (Mapped from Agent Tool Call) ---
                if (msg.role === 'tool' || msg.isRetrieving || (msg.retrievedItems && msg.retrievedItems.length > 0)) {
                    return (
                        <RetrievalBlock 
                            key={i}
                            isSearching={!!msg.isRetrieving}
                            query={msg.searchQuery || '检索中...'}
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
                
                const trimmed = (parsedContent.content || '').trim();
                const isJsonOutline = isAssistant && ((trimmed.startsWith('{') || trimmed.startsWith('```json')) && trimmed.includes('"pages"'));
                const isHtml = isAssistant && (trimmed.startsWith('```html') || trimmed.startsWith('<!DOCTYPE'));

                const shouldHideText = isJsonOutline || isHtml;
                const showThinking = !!parsedContent.reasoning;
                // Fix: Check if truly empty (no content, no reasoning, no tool calls)
                const isEmpty = !parsedContent.content && !parsedContent.reasoning && !msg.tool_calls;

                let statusTitle = "处理完成";
                let statusDesc = "已同步至画布";
                if (isHtml) statusTitle = "幻灯片渲染完成";
                else if (isJsonOutline) statusTitle = "大纲构建完成";

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
                                    <span>Agent 正在规划行动...</span>
                                </div>
                            )}

                            {shouldHideText ? (
                                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-50 shadow-none">
                                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                        <CheckCircleIcon className="w-4 h-4"/>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">{statusTitle}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{statusDesc}</div>
                                    </div>
                                </div>
                            ) : (
                                <MarkdownContent 
                                    content={parsedContent.content || ''} 
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
                    <h3 className="font-bold text-slate-700 mb-2">AI 研报助手 (ReAct Agent)</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        具备自主检索能力的智能体。<br/>
                        输入研究主题，AI 将自主调用搜索工具验证信息并构建报告。
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] border-r border-slate-200">
            {/* Header */}
            <div className="h-16 px-5 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between shadow-sm z-10 flex-shrink-0">
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
                                ? (isHtmlEdit ? "输入调整指令..." : "输入内容修改指令...")
                                : (stage === 'collect' ? "输入研报主题，开始 AI 规划..." : "输入指令...")
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
