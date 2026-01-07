
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, BrainIcon, ChevronDownIcon, 
    CheckCircleIcon, PlayIcon, DocumentTextIcon, ServerIcon, PencilIcon
} from '../icons';
import { getPromptDetail, streamChatCompletions } from '../../api/stratify';
import { PPTStage, ChatMessage, PPTData, PPTPageData } from './types';

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

// --- Helper: Robust Partial JSON Parser ---
export const tryParsePartialJson = (jsonStr: string) => {
    try {
        let cleanStr = jsonStr.replace(/```json|```/g, '').trim();
        if (cleanStr.startsWith('```')) cleanStr = cleanStr.substring(3).trim();
        
        const stack = [];
        let inString = false;
        let escaped = false;
        
        for (let i = 0; i < cleanStr.length; i++) {
            const char = cleanStr[i];
            if (escaped) { escaped = false; continue; }
            if (char === '\\') { escaped = true; continue; }
            if (char === '"') { inString = !inString; continue; }
            if (!inString) {
                if (char === '{' || char === '[') stack.push(char);
                else if (char === '}') { if (stack[stack.length-1] === '{') stack.pop(); }
                else if (char === ']') { if (stack[stack.length-1] === '[') stack.pop(); }
            }
        }
        
        if (inString) cleanStr += '"';

        let closer = '';
        while (stack.length > 0) {
            const char = stack.pop();
            closer += (char === '{' ? '}' : ']');
        }
        
        return JSON.parse(cleanStr + closer);
    } catch (e) {
        return null;
    }
};

// --- Helper: Strict HTML Extractor ---
// Ensures ONLY HTML is returned, stripping any conversational preamble.
const extractCleanHtml = (text: string) => {
    // 1. Look for standard markdown code block
    const codeBlockMatch = text.match(/```html\s*/i);
    if (codeBlockMatch && codeBlockMatch.index !== undefined) {
        // Start exactly after ```html
        let clean = text.substring(codeBlockMatch.index + codeBlockMatch[0].length);
        
        // If there is a closing fence, cut off everything after it
        const endFenceIndex = clean.indexOf('```');
        if (endFenceIndex !== -1) {
            clean = clean.substring(0, endFenceIndex);
        }
        return clean;
    }

    // 2. Fallback: Look for raw HTML tags if LLM forgot code block
    // We scan for common start tags.
    const rawStart = text.search(/<!DOCTYPE|<html|<div|<section|<head|<body/i);
    if (rawStart !== -1) {
        let clean = text.substring(rawStart);
        // Check if there is a closing fence that might have been used without an opening one (rare but possible in streams)
        const endFenceIndex = clean.indexOf('```');
        if (endFenceIndex !== -1) {
            clean = clean.substring(0, endFenceIndex);
        }
        return clean;
    }

    // 3. If no code detected yet, return empty string.
    // This prevents showing "Sure, here is the code..." in the black terminal.
    return '';
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

        let modelToUse = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free"; 
        try {
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600"); 
            if (prompt.channel_code && prompt.model_id) {
                modelToUse = `${prompt.channel_code}@${prompt.model_id}`;
            }
        } catch (e) { console.warn("Using default model for outline"); }

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
                
                if (accumulatedContent.trim().startsWith('{')) {
                    const partialOutline = tryParsePartialJson(accumulatedContent);
                    if (partialOutline && (partialOutline.title || (partialOutline.pages && partialOutline.pages.length > 0))) {
                        setData(prev => ({ 
                            ...prev, 
                            topic: partialOutline.title || prev.topic, 
                            outline: partialOutline 
                        }));
                        if (stage === 'collect') setStage('outline');
                    }
                }
            });
            
            const jsonStr = accumulatedContent.replace(/```json|```/g, '').trim();
            const parsedOutline = JSON.parse(jsonStr);
            if (parsedOutline.pages) {
                setData(prev => ({ ...prev, topic: parsedOutline.title, outline: parsedOutline }));
                if (stage === 'collect') setStage('outline');
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
            
            // Determine Model first to show in history
            let modelStr = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free";
            if (autoGenMode === 'text') {
                 try {
                    const promptDetail = await getPromptDetail("c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2");
                    if (promptDetail.channel_code) modelStr = `${promptDetail.channel_code}@${promptDetail.model_id}`;
                } catch(e) {}
            } else {
                 try {
                    const promptDetail = await getPromptDetail("14920b9c-604f-4066-bb80-da7a47b65572");
                    if (promptDetail.channel_code) modelStr = `${promptDetail.channel_code}@${promptDetail.model_id}`;
                } catch(e) {}
            }

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
                    try {
                        const promptDetail = await getPromptDetail("c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2");
                        const content = promptDetail.content
                            .replace('{{ page_index }}', String(targetIdx + 1))
                            .replace('{{ page_title }}', currentPage.title)
                            .replace('{{ page_summary }}', currentPage.summary);
                        messages = [{ role: 'user', content }];
                    } catch(e) {
                         messages = [{ role: 'user', content: `Write detailed slide content for slide ${targetIdx+1}: "${currentPage.title}". Summary: ${currentPage.summary}. Output Markdown.` }];
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
                            if (accContent.trim().startsWith('{') || accContent.includes('"content":')) {
                                const partial = tryParsePartialJson(accContent);
                                if (partial && partial.content) displayContent = partial.content;
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
        
        let modelStr = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free";
        try {
           const promptDetail = await getPromptDetail("c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2");
           if (promptDetail.channel_code) modelStr = `${promptDetail.channel_code}@${promptDetail.model_id}`;
        } catch(e) {}

        setHistory(prev => [...prev, { role: 'assistant', content: `收到。正在调整第 ${targetIdx + 1} 页...`, reasoning: '', model: modelStr }]);
        
        let messages: ChatMessage[] = [];
        const isHtmlMode = !!page.html;

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
                 const userMsg = `Previous Content: ${page.content}\nUser Feedback: ${instruction}\n\nPlease rewrite the slide content for "${page.title}" incorporating the feedback. Output straight Markdown content.`;
                 messages = [{ role: 'user', content: userMsg }];
                 
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
                        if (accContent.trim().startsWith('{')) {
                            const partial = tryParsePartialJson(accContent);
                            if (partial && partial.content) displayContent = partial.content;
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
    
    // Determine if we are in "Edit Context" mode (meaning we are composing/editing, but not auto-generating)
    const isEditMode = stage === 'compose' && !autoGenMode;
    const activePage = data.pages[activePageIndex];
    const isHtmlEdit = !!activePage?.html;

    // Watch for stage change to trigger initial text generation
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
                
                const trimmed = msg.content.trim();
                const isJsonOutline = isAssistant && ((trimmed.startsWith('{') || trimmed.startsWith('```json')) && trimmed.includes('"pages"'));
                const isJsonContent = isAssistant && ((trimmed.startsWith('{') || trimmed.startsWith('```json')) && trimmed.includes('"content"') && !trimmed.includes('"pages"'));
                const isHtml = isAssistant && (trimmed.startsWith('```html') || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html'));

                const shouldHideText = isJsonOutline || isJsonContent || isHtml;

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
                        {/* Model Badge */}
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
                            {msg.reasoning && (
                                <ThinkingBlock 
                                    content={msg.reasoning} 
                                    isStreaming={isLlmActive && isLast} 
                                />
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
                                <div className="whitespace-pre-wrap">{msg.content}</div>
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

            {/* Action Buttons inside Chat */}
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
                <div className="p-4 bg-white border-t border-slate-200 z-20 flex-shrink-0">
                    {/* Explicit Modification Indicator & Chips */}
                    {isEditMode && (
                        <div className="space-y-3 mb-3 animate-in fade-in slide-in-from-bottom-1">
                             <div className={`px-3 py-2 border rounded-lg flex items-center justify-between ${isHtmlEdit ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                                 <div className="flex items-center gap-2">
                                     {isHtmlEdit ? (
                                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                            <SparklesIcon className="w-3 h-3 text-green-600" />
                                        </div>
                                     ) : (
                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                                            <PencilIcon className="w-3 h-3 text-blue-600" />
                                        </div>
                                     )}
                                     <span className="text-xs font-bold text-indigo-700">
                                        {isHtmlEdit ? '🎨 正在调整设计' : '📝 正在撰写内容'}：第 {activePageIndex + 1} 页
                                     </span>
                                 </div>
                                 <span className="text-[9px] text-indigo-400 font-mono font-bold tracking-wider opacity-60">
                                     {isHtmlEdit ? 'VISUAL EDITOR' : 'TEXT EDITOR'}
                                 </span>
                             </div>
                             
                             {/* Quick Action Chips based on Context */}
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
                    
                    {/* Context Hint */}
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
