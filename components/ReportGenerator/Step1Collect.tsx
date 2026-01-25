
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, BrainIcon, ChevronDownIcon, 
    CheckCircleIcon, PlayIcon, DocumentTextIcon, ServerIcon, PencilIcon, ClockIcon, PlusIcon,
    DatabaseIcon, CloseIcon, ExternalLinkIcon, EyeIcon
} from '../icons';
import { getPromptDetail, streamChatCompletions, getPrompts } from '../../api/stratify';
import { searchSemanticBatchGrouped, getArticleHtml } from '../../api/intelligence';
import { getWalletBalance } from '../../api/user'; 
import { PPTStage, ChatMessage, PPTData, SharedGeneratorProps } from './types';
import { ContextAnchor, GuidanceBubble } from './Guidance';
import { InfoItem } from '../../types';
import { marked } from 'marked';
import { AGENTS } from '../../agentConfig';

// --- 提示词 ID 配置 (从后端获取模型) ---
// 对应后端 "Report Generator - Collect Phase" 提示词
const PROMPT_ID_COLLECT = "report_generator_collect"; 

// --- Agent 常量 ---
const MAX_SEARCH_ROUNDS = 3; // 最大自主检索轮次

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

// --- Helper: Mask Tool Commands in UI ---
const maskToolContent = (text: string) => {
    let display = text;
    // Hide JSON tool calls
    display = display.replace(/```json\s*\{[\s\S]*?"call":\s*"search"[\s\S]*?\}[\s\S]*?```/gi, '\n(⚡️ 正在调用全网检索工具...)\n');
    display = display.replace(/\{[\s\S]*?"call":\s*"search"[\s\S]*?\}/gi, '\n(⚡️ 正在调用全网检索工具...)\n');
    // Hide call:search syntax
    display = display.replace(/call:search\s*(\[.*?\])?/gi, '\n(⚡️ 正在调用全网检索工具...)\n');
    return display;
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

// --- Retrieval Block Component ---
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [activeModelName, setActiveModelName] = useState<string>('');
    
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

    // --- Dynamic Model Config Fetcher ---
    const getModelConfig = async () => {
        try {
            // Attempt to fetch prompt config from backend to get the model
            // Priority 1: Try fetching by Name (More robust than ID)
            const allPrompts = await getPrompts();
            const prompt = allPrompts.find(p => p.name === PROMPT_ID_COLLECT);
            
            if (prompt && prompt.channel_code && prompt.model_id) {
                const fullModel = `${prompt.channel_code}@${prompt.model_id}`;
                setActiveModelName(fullModel);
                return { 
                    model: fullModel,
                    template: prompt.content
                };
            }
        } catch (e) {
            console.warn("Failed to fetch specific prompt config, using fallback.", e);
        }
        // Fallback
        const fallback = 'openrouter@xiaomi/mimo-v2-flash:free';
        setActiveModelName(fallback);
        return { 
            model: fallback,
            template: null
        };
    };

    // Init Model Name Display
    useEffect(() => {
        getModelConfig();
    }, []);

    // --- Agent Loop for Outline Generation (ReAct) ---
    const runAgentLoop = async (userPromptText: string, isRefinement: boolean) => {
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

        // 3. Get Model & System Prompt
        const { model: activeModel, template } = await getModelConfig();
        const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // Use backend template if available, otherwise construct one
        const systemPromptContent = template 
            ? template.replace('{{current_date}}', currentDate)
            : `你是一个专业的行业研究员和报告策划专家。当前日期: ${currentDate}。

**你的目标**：
基于用户输入的主题，构建一份结构严谨、逻辑清晰的 PPT 研报大纲。

**工作流程 (ReAct 模式)**：
1. **分析需求**：在 <think> 标签中思考用户主题需要哪些核心信息。
2. **获取事实**：如果你缺乏具体数据，**必须**输出工具调用指令 \`call:search["关键词1", "关键词2"]\` 进行检索。不要编造数据。
   - 你可以进行多轮检索，直到收集到足够的信息。
3. **生成大纲**：当信息充足时，输出最终的 JSON 格式大纲。

**工具指令格式**：
- \`call:search["关键词"]\`
- 或 JSON 格式: \`\`\`json { "call": "search", "keywords": ["关键词"] } \`\`\`

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
注意：pages 数组建议包含 5-8 页。内容 (content) 需详实，充分利用检索到的情报。`;

        // 4. Build History for API
        // FIX: The `history` state here is STALE (does not contain the user message added in handleSend).
        // We must manually construct the API history to include the latest user prompt.
        let apiHistory = history.filter(m => m.role !== 'system' && !m.isRetrieving).map(m => ({
            role: m.role, 
            content: m.content || ''
        }));

        // Explicitly add the new user prompt to the API payload
        apiHistory.push({ role: 'user', content: userPromptText });

        if (apiHistory.length === 0 || apiHistory[0].role !== 'system') {
            apiHistory.unshift({ role: 'system', content: systemPromptContent });
        }

        // --- Execution Loop ---
        let loopCount = 0;
        let keepRunning = true;
        let hasOutline = false; // Flag to track if successful outline generation occurred

        try {
            while (keepRunning && loopCount < MAX_SEARCH_ROUNDS) {
                loopCount++;
                
                // Prepare Assistant Message Placeholder
                const assistantMsgId = crypto.randomUUID();
                setHistory(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', reasoning: '', model: activeModel }]);
                
                let accumulatedContent = '';
                let accumulatedReasoning = '';

                // Stream Request
                await streamChatCompletions({
                    model: activeModel, // Use the dynamic model
                    messages: apiHistory,
                    stream: true,
                    temperature: 0.2,
                    enable_billing: true
                }, (chunk) => {
                    if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                    if (chunk.content) accumulatedContent += chunk.content;

                    // Live UI Update
                    setHistory(prev => {
                        const newHistory = [...prev];
                        const idx = newHistory.findIndex(m => m.id === assistantMsgId);
                        if (idx !== -1) {
                            // Mask JSON while streaming to prevent flickering and ugly raw data
                            const isJsonLike = accumulatedContent.trim().startsWith('```json') || accumulatedContent.trim().startsWith('{');
                            const displayContent = isJsonLike ? "🔄 正在构建大纲数据结构..." : maskToolContent(accumulatedContent);

                            newHistory[idx] = { 
                                ...newHistory[idx], 
                                reasoning: accumulatedReasoning, 
                                content: displayContent
                            };
                        }
                        return newHistory;
                    });
                }, () => {
                    if (onRefreshSession) onRefreshSession();
                }, undefined, activeSessionId, AGENTS.REPORT_GENERATOR);

                // --- Turn Finished, Process Result ---
                
                // Add full unmasked content to API history
                apiHistory.push({
                    role: 'assistant',
                    content: accumulatedContent
                });

                // 1. Check for JSON Outline
                const partialOutline = tryParsePartialJson(accumulatedContent);
                if (partialOutline && partialOutline.pages && partialOutline.pages.length > 0) {
                    
                    // Replace the raw JSON message with a user-friendly success message
                    setHistory(prev => prev.map(m => m.id === assistantMsgId ? {
                        ...m,
                        content: `✅ **大纲构建完成**\n\n已为您生成包含 ${partialOutline.pages.length} 个章节的研报大纲，正在跳转预览...`,
                        reasoning: accumulatedReasoning
                    } : m));
                    
                    // Wait a bit to show the message before transition
                    await new Promise(resolve => setTimeout(resolve, 800));

                    setData(prev => ({ 
                        ...prev, 
                        topic: partialOutline.title || prev.topic, 
                        outline: partialOutline 
                    }));
                    if (!isRefinement) setStage('outline');
                    keepRunning = false;
                    hasOutline = true; // Mark as success
                    break;
                }

                // 2. Check for Tool Calls (Text Protocol)
                let queries: string[] = [];
                let toolCallFound = false;

                // Format A: call:search[...]
                let standardMatch = accumulatedContent.match(/call:search\s*(\[.*?\])/i);
                if (standardMatch) {
                    try {
                        queries = JSON.parse(standardMatch[1]);
                        toolCallFound = true;
                    } catch (e) {
                        const rawParams = standardMatch[1].replace(/[\[\]"]/g, '').split(',');
                        queries = rawParams.map(q => q.trim()).filter(Boolean);
                        toolCallFound = true;
                    }
                }

                // Format B: JSON block { "call": "search" ... }
                if (!toolCallFound) {
                    const jsonBlockMatch = accumulatedContent.match(/```json\s*(\{[\s\S]*?"call":\s*"search"[\s\S]*?\})\s*```/i);
                    if (jsonBlockMatch) {
                        try {
                            const parsed = JSON.parse(jsonBlockMatch[1]);
                            if (parsed.keywords && Array.isArray(parsed.keywords)) {
                                queries = parsed.keywords;
                                toolCallFound = true;
                            }
                        } catch(e) {}
                    }
                }
                
                // Format C: Raw JSON
                if (!toolCallFound) {
                    const rawJsonMatch = accumulatedContent.match(/(\{[\s\S]*?"call":\s*"search"[\s\S]*?\})/i);
                    if (rawJsonMatch) {
                        try {
                            const parsed = JSON.parse(rawJsonMatch[1]);
                            if (parsed.keywords && Array.isArray(parsed.keywords)) {
                                queries = parsed.keywords;
                                toolCallFound = true;
                            }
                        } catch(e) {}
                    }
                }

                if (toolCallFound && queries.length > 0) {
                    // UI: Show Searching Block
                    const toolMsgId = crypto.randomUUID();
                    setHistory(prev => [...prev, {
                        role: 'tool', // Reuse existing type logic
                        content: '', 
                        isRetrieving: true,
                        searchQuery: queries.join(', '),
                        id: toolMsgId
                    }]);

                    // Execute Search
                    let searchResultString = "No results found.";
                    let foundItems: InfoItem[] = [];
                    
                    try {
                        // Use Batch Search for efficiency
                        const res = await searchSemanticBatchGrouped({ 
                            query_texts: queries, 
                            max_segments_per_query: 4, 
                            similarity_threshold: 0.35 
                        });
                        
                        // Flatten results
                        foundItems = (res.results || []).flatMap((r: any) => r.items || []).map((item: any) => ({
                            id: item.article_id || crypto.randomUUID(),
                            title: item.title,
                            content: item.segments ? item.segments.map((s: any) => s.content).join('\n') : item.content,
                            source_name: item.source_name,
                            publish_date: item.publish_date,
                            original_url: item.url,
                            created_at: item.created_at,
                            similarity: item.segments?.[0]?.similarity
                        }));
                        
                        // Deduplicate items
                        const uniqueMap = new Map();
                        foundItems.forEach(item => { if(!uniqueMap.has(item.id)) uniqueMap.set(item.id, item); });
                        foundItems = Array.from(uniqueMap.values());

                        if (foundItems.length > 0) {
                            // Construct observation string for LLM
                            searchResultString = foundItems.map((item, idx) => 
                                `[资料${idx+1}] 标题:${item.title} 来源:${item.source_name}\n内容摘要:${item.content.slice(0, 500)}`
                            ).join('\n\n');
                            
                            // Update global reference materials
                            const newRefText = foundItems.map(i => `[${i.title}]: ${i.content}`).join('\n\n');
                            setData(prev => ({
                                ...prev,
                                referenceMaterials: (prev.referenceMaterials || '') + "\n" + newRefText
                            }));
                        }
                    } catch (err: any) {
                        searchResultString = `Search Error: ${err.message}`;
                    }

                    // UI: Update Block
                    setHistory(prev => prev.map(m => m.id === toolMsgId ? {
                        ...m,
                        isRetrieving: false,
                        retrievedItems: foundItems
                    } : m));

                    // API History: Add Observation
                    apiHistory.push({
                        role: 'user',
                        content: `【工具返回结果】\n${searchResultString}\n\n系统提示：资料已更新。如果信息足够，请**立即停止搜索**并开始撰写 JSON 大纲。`
                    });
                } else {
                    // No tool calls, no JSON -> Stop loop (likely asking user clarification)
                    keepRunning = false;
                }
            }

            // --- Force Final Generation Fallback ---
            // If the loop finished because we hit MAX_SEARCH_ROUNDS and we still don't have an outline, force one last generation.
            if (!hasOutline && loopCount >= MAX_SEARCH_ROUNDS) {
                const finalPrompt = "System Notification: Maximum search steps reached. Please generate the JSON outline immediately based on the information gathered so far. Do not search again.";
                apiHistory.push({ role: 'system', content: finalPrompt });

                const finalMsgId = crypto.randomUUID();
                setHistory(prev => [...prev, { id: finalMsgId, role: 'assistant', content: '', reasoning: '', model: activeModel }]);
                
                let finalContent = '';
                let finalReasoning = '';

                await streamChatCompletions({
                    model: activeModel,
                    messages: apiHistory,
                    stream: true,
                    temperature: 0.2, // Low temp for robust JSON
                    enable_billing: true
                }, (chunk) => {
                     if (chunk.reasoning) finalReasoning += chunk.reasoning;
                     if (chunk.content) finalContent += chunk.content;
                     
                     // Mask partial JSON in UI
                     const isJsonLike = finalContent.trim().startsWith('```json') || finalContent.trim().startsWith('{');
                     const displayContent = isJsonLike ? "🔄 正在构建最终大纲..." : maskToolContent(finalContent);

                     setHistory(prev => {
                        const newHistory = [...prev];
                        const idx = newHistory.findIndex(m => m.id === finalMsgId);
                        if (idx !== -1) {
                            newHistory[idx] = { ...newHistory[idx], reasoning: finalReasoning, content: displayContent };
                        }
                        return newHistory;
                    });
                }, () => {
                     if (onRefreshSession) onRefreshSession();
                }, undefined, activeSessionId, AGENTS.REPORT_GENERATOR);

                // Attempt to parse final result
                const finalOutline = tryParsePartialJson(finalContent);
                if (finalOutline && finalOutline.pages && finalOutline.pages.length > 0) {
                     setHistory(prev => prev.map(m => m.id === finalMsgId ? {
                        ...m,
                        content: `✅ **大纲构建完成 (强制结束)**\n\n已为您生成包含 ${finalOutline.pages.length} 个章节的研报大纲，正在跳转预览...`,
                        reasoning: finalReasoning
                    } : m));
                    
                    await new Promise(resolve => setTimeout(resolve, 800));

                    setData(prev => ({ 
                        ...prev, 
                        topic: finalOutline.title || prev.topic, 
                        outline: finalOutline 
                    }));
                    if (!isRefinement) setStage('outline');
                } else {
                    // Fallback to text message if still no JSON
                     setHistory(prev => prev.map(m => m.id === finalMsgId ? {
                        ...m,
                        content: finalContent || "抱歉，无法生成结构化大纲，请尝试重新提问。",
                        reasoning: finalReasoning
                    } : m));
                }
            }

        } catch (e: any) {
             console.error(e);
             if (e.message === 'INSUFFICIENT_BALANCE') {
                if (onHandleInsufficientBalance) onHandleInsufficientBalance();
             } else {
                setHistory(prev => [...prev, { role: 'assistant', content: "生成出错，请重试。" }]);
             }
        } finally {
            setIsLlmActive(false);
        }
    };

    // --- Handle Input ---
    const handleSend = async (val?: string) => {
        const text = val || input;
        if (!text.trim() || isLlmActive) return;
        
        if (!val) setInput('');
        setHistory(prev => [...prev, { role: 'user', content: text }]);

        if (stage === 'collect') {
            await runAgentLoop(text, false);
        } else if (stage === 'outline') {
            // Outline refinement logic (optional: reuse agent loop with context)
            // For now, simpler handling or restart loop
        }
        // Compose logic is in parent
    };

    const renderChatBubbles = () => (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" ref={scrollRef}>
             <style>{`
                .markdown-body { color: inherit; }
                .markdown-body p { margin-bottom: 0.5rem; }
                .markdown-body ul, .markdown-body ol { margin-left: 1.25rem; list-style-type: disc; margin-bottom: 0.5rem; }
                .markdown-body h1, .markdown-body h2, .markdown-body h3 { font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem; }
                .markdown-body code { background: #f1f5f9; padding: 0.2rem 0.4rem; rounded: 4px; font-size: 0.85em; }
                .markdown-body pre { background: #0f172a !important; color: #f1f5f9 !important; padding: 0.75rem; rounded-lg; overflow-x: auto; margin-bottom: 0.5rem; }
            `}</style>
            
            {history.filter(m => !m.hidden).map((msg, i) => {
                const isAssistant = msg.role === 'assistant';
                const isLast = i === history.length - 1;
                
                // --- Retrieval Block Rendering ---
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
                
                const showThinking = !!parsedContent.reasoning;
                const isEmpty = !parsedContent.content && !parsedContent.reasoning;

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
                                : 'bg-white text-slate-900 border-slate-200 rounded-tl-sm'
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

                            <MarkdownContent 
                                content={parsedContent.content} 
                                className={msg.role === 'user' ? 'text-white prose-invert' : 'text-slate-900'} 
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // ... (Remainder of render logic: Input Area, Header, Modals) ...
    // Using existing layout code for CopilotSidebar
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
                        isVisualMode={false} // Simplify for collect stage
                    />

                    {/* Model Indicator Badge - NEW */}
                    {activeModelName && (
                        <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg w-fit transition-all duration-300 animate-in fade-in slide-in-from-bottom-1">
                            <ServerIcon className="w-3 h-3 text-indigo-600" />
                            <span className="text-[10px] font-bold text-indigo-700 font-mono tracking-wide">
                                Model: {activeModelName.replace('openrouter@', '').replace(':free', '')}
                            </span>
                        </div>
                    )}

                    <div className={`relative shadow-sm rounded-xl transition-all duration-300 bg-white border-slate-200 border`}>
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
                            placeholder="输入研报主题，开始 AI 规划..."
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
