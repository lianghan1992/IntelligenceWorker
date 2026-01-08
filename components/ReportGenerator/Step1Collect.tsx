import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, BrainIcon, ChevronDownIcon, 
    CheckCircleIcon, PlayIcon, DocumentTextIcon, ServerIcon, PencilIcon
} from '../icons';
import { getPromptDetail, streamChatCompletions } from '../../api/stratify';
import { PPTStage, ChatMessage, PPTData, PPTPageData } from './types';
import { ContextAnchor, GuidanceBubble } from './Guidance';

// --- 统一模型配置 ---
const DEFAULT_STABLE_MODEL = "xiaomi/mimo-v2-flash:free";
const HTML_GENERATION_MODEL = "google/gemini-3-flash-preview";

// --- Helper: Robust Partial JSON Parser ---
/**
 * 增强版解析器：
 * 针对开启搜索功能后，模型可能在 JSON 块之后输出 [1], [2] 等引用的情况。
 * 通过精准提取第一个 { 和最后一个 } 之间的内容来确保解析成功。
 */
export const tryParsePartialJson = (jsonStr: string) => {
    if (!jsonStr) return null;
    try {
        let cleanStr = jsonStr.trim();
        // 1. 移除可能存在的思考链
        cleanStr = cleanStr.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        
        // 2. 查找 JSON 边界
        const firstBrace = cleanStr.indexOf('{');
        const lastBrace = cleanStr.lastIndexOf('}');
        
        if (firstBrace !== -1) {
            // 如果找到了闭合括号，尝试提取中间内容
            if (lastBrace !== -1 && lastBrace > firstBrace) {
                const candidate = cleanStr.substring(firstBrace, lastBrace + 1);
                try {
                    return JSON.parse(candidate);
                } catch (e) {
                    // 如果标准解析失败，可能是流还没完全闭合，尝试补全
                    try { return JSON.parse(candidate + ']}'); } catch (e2) {}
                    try { return JSON.parse(candidate + '}'); } catch (e3) {}
                }
            } else {
                // 如果只有开括号，说明还在流式输出中
                const incomplete = cleanStr.substring(firstBrace);
                try { return JSON.parse(incomplete + ']}'); } catch (e) {}
                try { return JSON.parse(incomplete + '}'); } catch (e) {}
            }
        }
        
        // 3. 回退方案：尝试从 Markdown 代码块提取
        const codeBlockMatch = cleanStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (codeBlockMatch) {
            try { return JSON.parse(codeBlockMatch[1].trim()); } catch (e) {}
        }

        return null;
    } catch (e) {
        return null;
    }
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

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
    stage, setStage, history, setHistory, data, setData, 
    isLlmActive, setIsLlmActive, activePageIndex, setActivePageIndex, onReset
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoGenMode, setAutoGenMode] = useState<'text' | 'html' | null>(null);

    // --- Guidance State ---
    const [activeGuide, setActiveGuide] = useState<'outline' | 'compose' | null>(null);

    // Determine if guidance is needed based on stage and localStorage
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

    // Initial Greeting with Date
    useEffect(() => {
        if (history.length === 0) {
            const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
            setHistory([{ 
                role: 'assistant', 
                content: `你好！我是您的研报助手。\n📅 今天是 **${today}**。\n\n请告诉我您想要研究的主题，我将为您构建分析框架。` 
            }]);
        }
    }, []);

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, stage, isLlmActive]);

    // --- Core Logic: Generate Outline ---
    const runOutlineGeneration = async (userPromptText: string, isRefinement: boolean) => {
        setIsLlmActive(true);
        const contextMessages = isRefinement ? history.map(m => ({ role: m.role, content: m.content })) : []; 
        
        const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

        let finalPrompt = userPromptText;
        if (data.referenceMaterials && data.referenceMaterials.length > 0) {
            finalPrompt = `【参考背景资料】\n${data.referenceMaterials}\n\n【用户指令】\n${userPromptText}`;
        }
        
        const apiMessages = [
            { role: 'system', content: `You are an expert presentation outline generator. Current Date: ${currentDate}. Output STRICT JSON: { "title": "...", "pages": [ { "title": "...", "content": "Brief summary..." }, ... ] }` },
            ...contextMessages,
            { role: 'user', content: finalPrompt }
        ];

        // 大纲生成使用稳定模型
        const modelToUse = DEFAULT_STABLE_MODEL;

        setHistory(prev => [...prev, { role: 'assistant', content: '', reasoning: '', model: modelToUse }]);
        let accumulatedContent = '';
        let accumulatedReasoning = '';

        try {
            await streamChatCompletions({
                model: modelToUse, 
                messages: apiMessages,
                stream: true
            }, (chunk) => {
                if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                if (chunk.content) accumulatedContent += chunk.content;
                
                setHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { 
                        ...newHistory[newHistory.length - 1], 
                        reasoning: accumulatedReasoning, 
                        content: accumulatedContent 
                    };
                    return newHistory;
                });
                
                const partialOutline = tryParsePartialJson(accumulatedContent);
                // 只要检测到包含 pages 的结构，就开始同步数据并准备切换状态
                if (partialOutline && partialOutline.pages && partialOutline.pages.length > 0) {
                    setData(prev => ({ 
                        ...prev, 
                        topic: partialOutline.title || prev.topic, 
                        outline: partialOutline 
                    }));
                    // 如果当前是收集阶段，检测到大纲后立即进入大纲预览阶段
                    if (!isRefinement) {
                        setStage('outline');
                    }
                }
            });
            
            // 最终确认一次解析，即便存在尾部引文也要能正确提取 JSON
            const finalOutline = tryParsePartialJson(accumulatedContent);
            if (finalOutline && finalOutline.pages) {
                setData(prev => ({ ...prev, topic: finalOutline.title || prev.topic, outline: finalOutline }));
                if (!isRefinement) setStage('outline');
            }
        } catch (e) {
            console.error(e);
            setHistory(prev => [...prev, { role: 'assistant', content: "生成出错，请重试。" }]);
        } finally {
            setIsLlmActive(false);
        }
    };

    // --- Core Logic: Serial Generation (Text or HTML) ---
    useEffect(() => {
        if (stage !== 'compose' || isLlmActive || !autoGenMode) return;

        const processQueue = async () => {
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
                    content: autoGenMode === 'text' 
                        ? "✅ 内容底稿生成完毕！\n请点击页面卡片进行预览或修改，确认无误后点击“生成幻灯片”。" 
                        : "🎉 幻灯片渲染完成！" 
                }]);
                return;
            }

            setActivePageIndex(targetIdx);
            setIsLlmActive(true);
            
            const currentPage = pages[targetIdx];
            const taskName = autoGenMode === 'text' ? '撰写内容' : '渲染页面';
            
            // 核心修改：根据生成类型切换模型
            const modelStr = autoGenMode === 'html' ? HTML_GENERATION_MODEL : DEFAULT_STABLE_MODEL;

            setHistory(prev => [...prev, { 
                role: 'assistant', 
                content: `正在${taskName} (第 ${targetIdx + 1}/${pages.length} 页)：**${currentPage.title}**...`, 
                reasoning: '',
                model: modelStr
            }]);

            setData(prev => {
                const newPages = [...prev.pages];
                newPages[targetIdx] = { ...newPages[targetIdx], isGenerating: true };
                return { ...prev, pages: newPages };
            });

            try {
                let messages: any[] = [];
                let systemPromptContent = '';

                if (autoGenMode === 'text') {
                    const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
                    
                    try {
                        const promptDetail = await getPromptDetail("c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2");
                        const content = promptDetail.content
                            .replace('{{ page_index }}', String(targetIdx + 1))
                            .replace('{{ page_title }}', currentPage.title)
                            .replace('{{ page_summary }}', currentPage.summary);
                        
                        let finalContent = `Current Date: ${currentDate}\n\n${content}`;
                        if (data.referenceMaterials) {
                            finalContent = `Current Date: ${currentDate}\nReference Materials:\n${data.referenceMaterials}\n\n${content}`;
                        }
                        
                        messages = [{ role: 'user', content: finalContent }];
                    } catch(e) {
                         messages = [{ role: 'user', content: `Current Date: ${currentDate}. Write detailed slide content for slide ${targetIdx+1}: "${currentPage.title}". Summary: ${currentPage.summary}. Output Markdown.` }];
                    }
                } else {
                    try {
                        const promptDetail = await getPromptDetail("14920b9c-604f-4066-bb80-da7a47b65572");
                        systemPromptContent = promptDetail.content;
                    } catch(e) {
                         systemPromptContent = "You are an expert web designer. Create a single 1600x900 HTML slide using TailwindCSS.";
                    }
                    messages = [
                        { role: 'system', content: systemPromptContent }, 
                        { role: 'user', content: `Title: ${currentPage.title}\nContent:\n${currentPage.content}` }
                    ];

                    setData(prev => {
                        const newPages = [...prev.pages];
                        newPages[targetIdx].chatHistory = messages as ChatMessage[];
                        return { ...prev, pages: newPages };
                    });
                }

                let accContent = '';
                let accReasoning = '';

                await streamChatCompletions({
                    model: modelStr,
                    messages: messages,
                    stream: true
                }, (chunk) => {
                    if (chunk.reasoning) accReasoning += chunk.reasoning;
                    if (chunk.content) accContent += chunk.content;

                    setHistory(prev => {
                        const h = [...prev];
                        h[h.length - 1] = { ...h[h.length - 1], reasoning: accReasoning, content: accContent };
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
                });

                setData(prev => {
                    const newPages = [...prev.pages];
                    newPages[targetIdx].isGenerating = false;
                    
                    if (autoGenMode === 'html') {
                         const cleanHtml = extractCleanHtml(accContent);
                         const currentHistory = newPages[targetIdx].chatHistory || [];
                         newPages[targetIdx].chatHistory = [...currentHistory, { role: 'assistant', content: cleanHtml }];
                         newPages[targetIdx].html = cleanHtml;
                    }
                    
                    return { ...prev, pages: newPages };
                });

                setHistory(prev => {
                   const h = [...prev];
                   h[h.length - 1].content = `✅ 第 ${targetIdx + 1} 页生成完成。`;
                   return h;
                });

            } catch (e) {
                console.error(e);
                setHistory(prev => [...prev, { role: 'assistant', content: `❌ 第 ${targetIdx + 1} 页生成失败，跳过。` }]);
                 setData(prev => {
                    const newPages = [...prev.pages];
                    newPages[targetIdx].isGenerating = false;
                    if (autoGenMode === 'text') newPages[targetIdx].content = '生成失败';
                    else newPages[targetIdx].html = '<div>生成失败</div>';
                    return { ...prev, pages: newPages };
                });
            } finally {
                setIsLlmActive(false); 
            }
        };

        processQueue();
    }, [stage, isLlmActive, autoGenMode, data.pages]);

    // --- Logic: Modification (Context-Aware) ---
    const handleModification = async (instruction: string) => {
        setIsLlmActive(true);
        const targetIdx = activePageIndex;
        const page = data.pages[targetIdx];
        const isHtmlMode = !!page.html;
        
        // 核心修改：根据修改内容类型切换模型
        const modelStr = isHtmlMode ? HTML_GENERATION_MODEL : DEFAULT_STABLE_MODEL;

        setHistory(prev => [...prev, { role: 'assistant', content: `收到。正在调整第 ${targetIdx + 1} 页...`, reasoning: '', model: modelStr }]);
        
        let messages: ChatMessage[] = [];

        try {
             if (isHtmlMode) {
                 let contextHistory = page.chatHistory || [];
                 if (contextHistory.length === 0) {
                     contextHistory = [
                         { role: 'system', content: "You are an expert web designer. User will ask to modify the slide." },
                         { role: 'assistant', content: page.html || '' }
                     ];
                 }
                 const newMsg: ChatMessage = { role: 'user', content: instruction };
                 messages = [...contextHistory, newMsg];
                 
                 setData(prev => {
                    const newPages = [...prev.pages];
                    newPages[targetIdx] = { 
                        ...newPages[targetIdx], 
                        isGenerating: true,
                        chatHistory: messages 
                    };
                    return { ...prev, pages: newPages };
                });

             } else {
                 const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
                 const userMsg = `Previous Content: ${page.content}\nUser Feedback: ${instruction}\n\nPlease rewrite the slide content for "${page.title}" incorporating the feedback. Output straight Markdown content.`;
                 
                 messages = [
                     { role: 'system', content: `You are an expert editor. Current Date: ${currentDate}.` },
                     { role: 'user', content: userMsg }
                 ];
                 
                 setData(prev => {
                    const newPages = [...prev.pages];
                    newPages[targetIdx] = { ...newPages[targetIdx], isGenerating: true, content: '' };
                    return { ...prev, pages: newPages };
                 });
             }

             let accContent = '';
             let accReasoning = '';

             await streamChatCompletions({
                model: modelStr,
                messages: messages as any[],
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
                    if (isHtmlMode) {
                        const cleanHtml = extractCleanHtml(accContent);
                        if (cleanHtml) {
                             newPages[targetIdx].html = cleanHtml;
                        }
                    } else {
                        let displayContent = accContent;
                        const partial = tryParsePartialJson(accContent);
                        if (partial && partial.content) {
                            displayContent = partial.content;
                        }
                        newPages[targetIdx].content = displayContent;
                    }
                    return { ...prev, pages: newPages };
                });
            });

            setData(prev => {
                const newPages = [...prev.pages];
                newPages[targetIdx].isGenerating = false;
                
                if (isHtmlMode) {
                     const cleanHtml = extractCleanHtml(accContent);
                     const updatedHistory = [...messages, { role: 'assistant', content: cleanHtml } as ChatMessage];
                     newPages[targetIdx].chatHistory = updatedHistory;
                     newPages[targetIdx].html = cleanHtml;
                }
                
                return { ...prev, pages: newPages };
            });
            
            setHistory(prev => {
                const h = [...prev];
                h[h.length - 1].content = `✅ 第 ${targetIdx + 1} 页已${isHtmlMode ? '重绘' : '更新'}。`;
                return h;
            });

        } catch (e) {
            setHistory(prev => [...prev, { role: 'assistant', content: "修改失败，请重试。" }]);
             setData(prev => {
                const newPages = [...prev.pages];
                newPages[targetIdx].isGenerating = false;
                return { ...prev, pages: newPages };
            });
        } finally {
            setIsLlmActive(false);
        }
    };

    // --- Handlers ---
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
            {history.filter(m => !m.hidden).map((msg, i) => {
                const isAssistant = msg.role === 'assistant';
                const isLast = i === history.length - 1;
                
                let parsedContent = { reasoning: msg.reasoning || '', content: msg.content };
                
                if (!parsedContent.reasoning && parsedContent.content) {
                     const split = parseThinkTag(parsedContent.content);
                     if (split.reasoning) {
                         parsedContent = split;
                     }
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

                if (isHtml) {
                    statusTitle = isLlmActive && isLast ? "正在绘制幻灯片..." : "幻灯片渲染完成";
                } else if (isJsonOutline) {
                    statusTitle = isLlmActive && isLast ? "正在构建大纲..." : "大纲构建完成";
                } else if (isJsonContent) {
                    statusTitle = isLlmActive && isLast ? "正在撰写内容..." : "内容撰写完成";
                }

                if (isLlmActive && isLast) {
                    statusDesc = "AI 正在实时输出至右侧画布...";
                }

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
                                        <div className="text-xs font-bold text-slate-800">
                                            {statusTitle}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                             {statusDesc}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap">{parsedContent.content}</div>
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
                        请输入您的研报主题，我将为您进行深度思考，并构建专业的分析框架。
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
                <div className="p-4 bg-white border-t border-slate-200 z-20 flex-shrink-0 relative">
                    
                    {/* --- 上下文锚点 --- */}
                    <ContextAnchor 
                        stage={stage}
                        pageIndex={activePageIndex}
                        pageTitle={data.pages[activePageIndex]?.title}
                        isVisualMode={isHtmlEdit}
                    />

                    {/* --- 引导气泡逻辑 --- */}
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
                    
                    <div className={`relative shadow-sm rounded-xl transition-all duration-300 ${isEditMode ? 'ring-2 ring-indigo-100 border-indigo-200' : 'border-slate-200'}`}>
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder={
                                stage === 'collect' ? "输入研报主题..." : 
                                (autoGenMode ? "正在生成中..." : 
                                (isEditMode ? "输入修改指令..." : "输入内容..."))
                            }
                            className="w-full bg-slate-50 text-slate-800 placeholder:text-slate-400 border border-transparent rounded-xl pl-4 pr-12 py-3.5 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                            disabled={isLlmActive}
                        />
                        <button 
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLlmActive}
                            className={`absolute right-2 top-2 p-1.5 text-white rounded-lg transition-all shadow-sm ${
                                isEditMode && input.trim() ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300'
                            }`}
                        >
                            {isLlmActive ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                        </button>
                    </div>
                    
                    {stage === 'compose' && !autoGenMode && (
                        <p className="text-[10px] text-center text-slate-400 mt-2 flex items-center justify-center gap-1">
                           <span className={`w-1.5 h-1.5 rounded-full ${isEditMode ? 'bg-green-400' : 'bg-slate-300'}`}></span>
                           {isEditMode ? '输入指令即可实时更新当前幻灯片' : '点击 "开始设计幻灯片" 启动渲染'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};