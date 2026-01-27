
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, BrainIcon, ChevronDownIcon, 
    CheckCircleIcon, PlayIcon, DocumentTextIcon, ServerIcon, PencilIcon, ClockIcon, PlusIcon,
    DatabaseIcon, CloseIcon, ExternalLinkIcon, EyeIcon
} from '../icons';
import { getPromptDetail, streamChatCompletions, getPrompts, getScenarioPrompts } from '../../api/stratify';
import { searchSemanticBatchGrouped, getArticleHtml } from '../../api/intelligence';
import { getWalletBalance } from '../../api/user'; 
import { PPTStage, ChatMessage, PPTData, SharedGeneratorProps } from './types';
import { ContextAnchor, GuidanceBubble } from './Guidance';
import { InfoItem } from '../../types';
import { marked } from 'marked';
import { AGENTS } from '../../agentConfig';

// --- 提示词名称配置 (与后端保持一致) ---
const PROMPT_NAME_COLLECT = "01.大纲撰写"; 
const PROMPT_NAME_CONTENT = "02.详细内容生成";

// --- Agent 常量 ---
const MAX_SEARCH_ROUNDS = 3; // 最大自主检索轮次

// --- Helper: Robust Partial JSON Parser ---
export const tryParsePartialJson = (jsonStr: string) => {
    if (!jsonStr) return null;
    let cleanStr = jsonStr.trim();
    // 移除 markdown 标记
    cleanStr = cleanStr.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    // 移除 thinking 标签
    cleanStr = cleanStr.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    try {
        return JSON.parse(cleanStr);
    } catch (e) {
        try {
            // 简单修复尝试
            if (cleanStr.startsWith('{') && !cleanStr.endsWith('}')) {
                return JSON.parse(cleanStr + '}');
            }
        } catch (e2) {}
    }
    return null;
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
    display = display.replace(/```json\s*\{[\s\S]*?"call":\s*"search"[\s\S]*?\}[\s\S]*?```/gi, '\n(⚡️ 正在调用全网检索工具...)\n');
    display = display.replace(/\{[\s\S]*?"call":\s*"search"[\s\S]*?\}/gi, '\n(⚡️ 正在调用全网检索工具...)\n');
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
        <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/50 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 transition-all duration-500">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100/50 transition-colors"
            >
                <BrainIcon className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse' : ''}`} />
                <span>深度思考过程 {isStreaming ? '...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div 
                className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="px-3 pb-3">
                    <div 
                        ref={scrollRef}
                        className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto custom-scrollbar border-l-2 border-indigo-200 pl-3 italic break-words scroll-smooth"
                    >
                        {content}
                        {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-400 animate-pulse align-middle"></span>}
                    </div>
                </div>
            </div>
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
    const getModelConfig = async (promptName: string) => {
        try {
            const scenarioPrompts = await getScenarioPrompts(AGENTS.REPORT_GENERATOR);
            const prompt = scenarioPrompts.find(p => p.name === promptName);
            
            if (prompt) {
                let fullModel = 'openrouter@xiaomi/mimo-v2-flash:free'; 
                
                if (prompt.channel_code && prompt.model_id) {
                    fullModel = `${prompt.channel_code}@${prompt.model_id}`;
                }
                
                setActiveModelName(fullModel);
                return { 
                    model: fullModel,
                    template: prompt.content
                };
            }
        } catch (e) {
            console.warn("Failed to fetch specific prompt config, using fallback.", e);
        }
        const fallback = 'openrouter@xiaomi/mimo-v2-flash:free';
        setActiveModelName(fallback);
        return { 
            model: fallback,
            template: null
        };
    };

    // Init Model Name Display (Default to collect prompt)
    useEffect(() => {
        getModelConfig(PROMPT_NAME_COLLECT);
    }, []);

    // --- Agent Loop for Outline Generation (ReAct) ---
    const runAgentLoop = async (userPromptText: string, isRefinement: boolean) => {
        setIsLlmActive(true);
        
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

        let activeSessionId = sessionId;
        if (!activeSessionId && onEnsureSession) {
            activeSessionId = await onEnsureSession();
        }

        const { model: activeModel, template } = await getModelConfig(PROMPT_NAME_COLLECT);
        const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
        
        const systemPromptContent = template 
            ? template.replace('{{current_date}}', currentDate)
            : `你是一个专业的行业研究员。请为用户生成研报大纲。`;

        let apiHistory = history.filter(m => m.role !== 'system' && !m.isRetrieving).map(m => ({
            role: m.role, 
            content: m.content || ''
        }));

        apiHistory.push({ role: 'user', content: userPromptText });

        if (apiHistory.length === 0 || apiHistory[0].role !== 'system') {
            apiHistory.unshift({ role: 'system', content: systemPromptContent });
        }

        let loopCount = 0;
        let keepRunning = true;
        let hasOutline = false; 

        try {
            while (keepRunning && loopCount < MAX_SEARCH_ROUNDS) {
                loopCount++;
                
                const assistantMsgId = crypto.randomUUID();
                setHistory(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', reasoning: '', model: activeModel }]);
                
                let accumulatedContent = '';
                let accumulatedReasoning = '';

                await streamChatCompletions({
                    model: activeModel, 
                    messages: apiHistory,
                    stream: true,
                    temperature: 0.2,
                    enable_billing: true
                }, (chunk) => {
                    if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                    if (chunk.content) accumulatedContent += chunk.content;

                    const partialOutline = tryParsePartialJson(accumulatedContent);
                    if (partialOutline && partialOutline.pages && Array.isArray(partialOutline.pages)) {
                        setData(prev => ({
                            ...prev,
                            topic: partialOutline.title || prev.topic,
                            outline: partialOutline
                        }));
                    }

                    setHistory(prev => {
                        const newHistory = [...prev];
                        const idx = newHistory.findIndex(m => m.id === assistantMsgId);
                        if (idx !== -1) {
                            const isJsonLike = accumulatedContent.trim().startsWith('```json') || accumulatedContent.trim().startsWith('{');
                            let displayContent = isJsonLike ? "🔄 正在构建大纲结构..." : maskToolContent(accumulatedContent);
                            
                            if (partialOutline && partialOutline.pages && partialOutline.pages.length > 0) {
                                displayContent = `🔄 正在构建大纲... (已生成 ${partialOutline.pages.length} 页)`;
                            }

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

                apiHistory.push({
                    role: 'assistant',
                    content: accumulatedContent
                });

                const partialOutline = tryParsePartialJson(accumulatedContent);
                if (partialOutline && partialOutline.pages && partialOutline.pages.length > 0) {
                    setHistory(prev => prev.map(m => m.id === assistantMsgId ? {
                        ...m,
                        content: `✅ **大纲构建完成**\n\n已为您生成包含 ${partialOutline.pages.length} 个章节的研报大纲，请在右侧预览确认。`,
                        reasoning: accumulatedReasoning
                    } : m));
                    
                    setData(prev => ({ 
                        ...prev, 
                        topic: partialOutline.title || prev.topic, 
                        outline: partialOutline 
                    }));
                    
                    if (!isRefinement) setStage('outline');
                    keepRunning = false;
                    hasOutline = true; 
                    break;
                }

                let queries: string[] = [];
                let toolCallFound = false;
                let standardMatch = accumulatedContent.match(/call:search\s*(\[.*?\])/i);
                if (standardMatch) {
                    try { queries = JSON.parse(standardMatch[1]); toolCallFound = true; } catch (e) {
                        const rawParams = standardMatch[1].replace(/[\[\]"]/g, '').split(',');
                        queries = rawParams.map(q => q.trim()).filter(Boolean);
                        toolCallFound = true;
                    }
                }
                if (!toolCallFound) {
                    const jsonBlockMatch = accumulatedContent.match(/(\{[\s\S]*?"call":\s*"search"[\s\S]*?\})/i);
                    if (jsonBlockMatch) {
                        try {
                            const parsed = JSON.parse(jsonBlockMatch[1]);
                            if (parsed.keywords && Array.isArray(parsed.keywords)) { queries = parsed.keywords; toolCallFound = true; }
                        } catch(e) {}
                    }
                }

                if (toolCallFound && queries.length > 0) {
                    const toolMsgId = crypto.randomUUID();
                    setHistory(prev => [...prev, {
                        role: 'tool', 
                        content: '', 
                        isRetrieving: true,
                        searchQuery: queries.join(', '),
                        id: toolMsgId
                    }]);

                    let searchResultString = "No results found.";
                    let foundItems: InfoItem[] = [];
                    
                    try {
                        const res = await searchSemanticBatchGrouped({ 
                            query_texts: queries, 
                            max_segments_per_query: 4, 
                            similarity_threshold: 0.35 
                        });
                        
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
                        
                        const uniqueMap = new Map();
                        foundItems.forEach(item => { if(!uniqueMap.has(item.id)) uniqueMap.set(item.id, item); });
                        foundItems = Array.from(uniqueMap.values());

                        if (foundItems.length > 0) {
                            searchResultString = foundItems.map((item, idx) => 
                                `[资料${idx+1}] 标题:${item.title} 来源:${item.source_name}\n内容摘要:${item.content.slice(0, 500)}`
                            ).join('\n\n');
                            
                            const newRefText = foundItems.map(i => `[${i.title}]: ${i.content}`).join('\n\n');
                            setData(prev => ({
                                ...prev,
                                referenceMaterials: (prev.referenceMaterials || '') + "\n" + newRefText
                            }));
                        }
                    } catch (err: any) {
                        searchResultString = `Search Error: ${err.message}`;
                    }

                    setHistory(prev => prev.map(m => m.id === toolMsgId ? {
                        ...m,
                        isRetrieving: false,
                        retrievedItems: foundItems
                    } : m));

                    apiHistory.push({
                        role: 'user',
                        content: `【工具返回结果】\n${searchResultString}\n\n系统提示：资料已更新。如果信息足够，请**立即停止搜索**并开始撰写 JSON 大纲。`
                    });
                } else {
                    keepRunning = false;
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

    // --- Phase 2: Content Generation (Streaming & Detailed) ---
    const runContentGeneration = async (instructions?: string) => {
        setIsLlmActive(true);
        
        try {
            const wallet = await getWalletBalance();
            if (wallet.balance <= 0) {
                if (onHandleInsufficientBalance) onHandleInsufficientBalance();
                setIsLlmActive(false);
                return;
            }

            let activeSessionId = sessionId;
            if (!activeSessionId && onEnsureSession) {
                activeSessionId = await onEnsureSession();
            }

            const { model: activeModel, template } = await getModelConfig(PROMPT_NAME_CONTENT);
            
            const currentPage = data.pages[activePageIndex];
            if (!currentPage) return;

            setData(prev => {
                const newPages = [...prev.pages];
                newPages[activePageIndex] = { ...newPages[activePageIndex], isGenerating: true };
                return { ...prev, pages: newPages };
            });

            let promptContent = template || "";
            if (!promptContent) {
                promptContent = `请为第 ${activePageIndex+1} 页生成详细内容。\n页标题：${currentPage.title}\n页摘要：${currentPage.summary}`;
            } else {
                promptContent = promptContent
                    .replace('{{ page_index }}', String(activePageIndex + 1))
                    .replace('{{ page_title }}', currentPage.title)
                    .replace('{{ page_summary }}', currentPage.summary);
            }
            
            if (instructions) {
                promptContent += `\n\n用户额外指令：${instructions}`;
            }

            let accumulatedContent = '';
            let accumulatedReasoning = '';
            
            const assistantMsgId = crypto.randomUUID();
            setHistory(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: `正在为 **${currentPage.title}** 撰写内容...`, model: activeModel }]);

            await streamChatCompletions({
                model: activeModel,
                messages: [{ role: 'user', content: promptContent }],
                stream: true,
                temperature: 0.7,
                enable_billing: true
            }, (chunk) => {
                if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                
                if (chunk.content) {
                    accumulatedContent += chunk.content;
                    
                    // --- 增强版流式内容提取 ---
                    let contentToDisplay = "";
                    const match = accumulatedContent.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)/s);
                    if (match) {
                        let raw = match[1];
                        try {
                            raw = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                        } catch(e) {}
                        contentToDisplay = raw;
                    } else {
                         const parsed = tryParsePartialJson(accumulatedContent);
                         if (parsed && parsed.content) {
                             contentToDisplay = parsed.content;
                         } else if (!accumulatedContent.trim().startsWith('{')) {
                             // Fallback: raw markdown if model ignores JSON instruction
                             contentToDisplay = accumulatedContent;
                         }
                    }

                    if (contentToDisplay) {
                        setData(prev => {
                            const newPages = [...prev.pages];
                            newPages[activePageIndex] = { ...newPages[activePageIndex], content: contentToDisplay };
                            return { ...prev, pages: newPages };
                        });
                    }
                }
                
                setHistory(prev => prev.map(m => m.id === assistantMsgId ? { ...m, reasoning: accumulatedReasoning } : m));
            }, () => {
                if (onRefreshSession) onRefreshSession();
                const finalParsed = tryParsePartialJson(accumulatedContent);
                let finalContent = "";
                
                if (finalParsed && finalParsed.content) {
                    finalContent = finalParsed.content;
                } else {
                    const match = accumulatedContent.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
                    if (match) {
                         try {
                            finalContent = JSON.parse(`"${match[1]}"`); 
                         } catch(e) {
                             finalContent = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                         }
                    } else if (!accumulatedContent.trim().startsWith('{')) {
                        finalContent = accumulatedContent;
                    }
                }

                if (finalContent) {
                     setData(prev => {
                        const newPages = [...prev.pages];
                        newPages[activePageIndex] = { 
                            ...newPages[activePageIndex], 
                            content: finalContent, 
                            isGenerating: false 
                        };
                        return { ...prev, pages: newPages };
                    });
                } else {
                     setData(prev => {
                        const newPages = [...prev.pages];
                        newPages[activePageIndex] = { 
                            ...newPages[activePageIndex], 
                            isGenerating: false 
                        };
                        return { ...prev, pages: newPages };
                    });
                }
                
                setHistory(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: `✅ **${currentPage.title}** 内容撰写完成。`, reasoning: accumulatedReasoning } : m));

            }, undefined, activeSessionId, AGENTS.REPORT_GENERATOR);

        } catch (e: any) {
            console.error(e);
             if (e.message === 'INSUFFICIENT_BALANCE') {
                if (onHandleInsufficientBalance) onHandleInsufficientBalance();
             }
             setData(prev => {
                const newPages = [...prev.pages];
                if (newPages[activePageIndex]) newPages[activePageIndex].isGenerating = false;
                return { ...prev, pages: newPages };
            });
        } finally {
            setIsLlmActive(false);
        }
    };

    // --- Outline Modification Logic ---
    const runOutlineModification = async (instruction: string) => {
        setIsLlmActive(true);
        await runAgentLoop(`基于当前大纲，进行修改：${instruction}`, true);
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
             await runOutlineModification(text);
        } else if (stage === 'compose') {
             await runContentGeneration(text);
        }
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
                        isVisualMode={false} 
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
                            placeholder={
                                stage === 'collect' ? "输入研报主题，开始 AI 规划..." :
                                stage === 'outline' ? "输入修改意见，AI 将调整大纲..." :
                                "输入指令修改当前页内容，或点击生成..."
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
