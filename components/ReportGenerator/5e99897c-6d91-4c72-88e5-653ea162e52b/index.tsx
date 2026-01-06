
import React, { useState, useEffect } from 'react';
import { StratifyScenario } from '../../../types';
import { ArrowLeftIcon, SparklesIcon, DocumentTextIcon, ViewGridIcon, CloseIcon, ShieldExclamationIcon, CheckCircleIcon, RefreshIcon, ServerIcon } from '../../icons';
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { Message, ScenarioState } from './types';
import { streamGeminiCookieChat, streamChatCompletions, checkGeminiCookieStatus, getPromptDetail } from '../../../api/stratify';

interface SpecificScenarioProps {
    scenario: StratifyScenario;
    onBack: () => void;
}

// 场景特定的 Prompt IDs
const PROMPT_ID_ANALYSIS = "e9899016-7cb2-45b5-8ae1-0bda9b76fc43"; 
const PROMPT_ID_VISUAL = "75635cb9-6c5e-487c-a991-30f1ca046249";   

const generateId = () => crypto.randomUUID();

const stripMarkdownFences = (content: string) => {
    if (!content) return "";
    let clean = content.trim();
    // 移除开头和结尾的 markdown 代码块包裹
    clean = clean.replace(/^```(?:markdown|md|html)?\s*\n?/i, "");
    clean = clean.replace(/\n?\s*```$/, "");
    return clean;
};

export const ScenarioWorkstation: React.FC<SpecificScenarioProps> = ({ scenario, onBack }) => {
    const [state, setState] = useState<ScenarioState>({
        stage: 'analysis',
        topic: '',
        analysisContent: '',
        visualCode: '',
        messages: [],
        isStreaming: false
    });

    // 引擎状态：标准 API vs Gemini Cookie
    const [engine, setEngine] = useState<'standard' | 'gemini'>('standard');
    const [geminiHealth, setGeminiHealth] = useState<{ valid: boolean; message: string } | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // 初始和定期检查 Gemini 状态
    useEffect(() => {
        const check = async () => {
            try {
                const res = await checkGeminiCookieStatus();
                setGeminiHealth(res);
            } catch (e) {
                setGeminiHealth({ valid: false, message: '网络连接异常' });
            }
        };
        check();
        const timer = setInterval(check, 45000); // 45秒检查一次
        return () => clearInterval(timer);
    }, []);

    const appendMessage = (role: 'user' | 'assistant', content: string) => {
        setState(prev => ({
            ...prev,
            messages: [...prev.messages, {
                id: generateId(),
                role,
                content,
                stage: prev.stage,
                timestamp: Date.now()
            }]
        }));
    };

    const updateLastAssistantMessage = (content: string, reasoning?: string) => {
        setState(prev => {
            const newMessages = [...prev.messages];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content = content; 
                if (reasoning) lastMsg.reasoning = reasoning;
            } else {
                 newMessages.push({
                    id: generateId(),
                    role: 'assistant',
                    content: content,
                    reasoning: reasoning || '',
                    stage: prev.stage,
                    timestamp: Date.now()
                });
            }
            return { ...prev, messages: newMessages };
        });
    };

    const handleSendMessage = async (text: string) => {
        appendMessage('user', text);
        if (state.stage === 'analysis') {
            if (!state.topic) {
                setState(prev => ({ ...prev, topic: text.split('\n')[0].substring(0, 50) }));
            }
            await runAnalysisPhase(text);
        } else {
            await runVisualPhase(text);
        }
    };

    const runAnalysisPhase = async (input: string) => {
        setState(prev => ({ ...prev, isStreaming: true }));
        
        const engineLabel = engine === 'gemini' ? 'Gemini 2.5' : '标准高性能';
        appendMessage('assistant', `正在调用 ${engineLabel} 引擎分析 "${input.substring(0, 20)}${input.length > 20 ? '...' : ''}"...`);

        let accumulatedText = "";
        let accumulatedReasoning = "";
        
        try {
            const prompt = await getPromptDetail(PROMPT_ID_ANALYSIS);
            const systemPrompt = prompt.content;
            
            // 构造上下文：如果有之前的报告内容，则视为修改请求
            const userPromptContent = !state.analysisContent 
                ? `分析对象: ${input}` 
                : `【当前分析结果】:\n${state.analysisContent}\n\n【用户修改建议】:\n${input}\n\n请输出优化后的完整 Markdown 内容。`;

            const messages = [{ role: 'user' as const, content: systemPrompt + "\n\n" + userPromptContent }];

            if (engine === 'gemini') {
                await streamGeminiCookieChat({ 
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    model: 'gemini-2.5-flash' 
                }, 
                    (data) => {
                        if (data.content) accumulatedText += data.content;
                        if (data.reasoning) accumulatedReasoning += data.reasoning;
                        updateLastAssistantMessage(accumulatedText || "正在生成深度研报...", accumulatedReasoning);
                    },
                    () => {
                        setState(prev => ({ ...prev, analysisContent: stripMarkdownFences(accumulatedText), isStreaming: false }));
                        updateLastAssistantMessage(accumulatedText, accumulatedReasoning);
                    },
                    (err) => {
                        setState(prev => ({ ...prev, isStreaming: false }));
                        updateLastAssistantMessage(`分析过程遇到异常: ${err.message}`);
                    }
                );
            } else {
                await streamChatCompletions({ 
                    model: prompt.channel_code ? `${prompt.channel_code}@${prompt.model_id}` : "siliconflow@deepseek-ai/DeepSeek-V3", 
                    messages,
                    stream: true
                }, 
                    (data) => {
                        if (data.content) accumulatedText += data.content;
                        if (data.reasoning) accumulatedReasoning += data.reasoning;
                        updateLastAssistantMessage(accumulatedText || "正在提取关键洞察...", accumulatedReasoning);
                    },
                    () => {
                        setState(prev => ({ ...prev, analysisContent: stripMarkdownFences(accumulatedText), isStreaming: false }));
                        updateLastAssistantMessage(accumulatedText, accumulatedReasoning);
                    },
                    (err) => {
                        setState(prev => ({ ...prev, isStreaming: false }));
                        updateLastAssistantMessage(`API 调用失败: ${err.message}`);
                    }
                );
            }
        } catch (e: any) {
             setState(prev => ({ ...prev, isStreaming: false }));
             updateLastAssistantMessage(`系统错误: ${e.message}`);
        }
    };

    const runVisualPhase = async (input: string) => {
        setState(prev => ({ ...prev, isStreaming: true }));
        appendMessage('assistant', `正在转换分析数据为视觉看板 (${engine})...`);
        
        let accumulatedCode = "";
        let accumulatedReasoning = "";

        try {
            const prompt = await getPromptDetail(PROMPT_ID_VISUAL);
            const userPromptContent = !state.visualCode 
                ? `【分析报告数据】\n${state.analysisContent}\n\n【用户视觉偏好】\n${input}`
                : `【当前视觉代码】:\n${state.visualCode}\n\n【用户修改建议】:\n${input}\n\n请输出重构后的完整 HTML 代码。`;

            const messages = [{ role: 'user' as const, content: prompt.content + "\n\n" + userPromptContent }];

            const onData = (data: any) => {
                if (data.content) accumulatedCode += data.content;
                if (data.reasoning) accumulatedReasoning += data.reasoning;
                updateLastAssistantMessage(accumulatedCode || "正在渲染高保真布局...", accumulatedReasoning);
            };

            const onDone = () => {
                setState(prev => ({ ...prev, visualCode: stripMarkdownFences(accumulatedCode), isStreaming: false }));
                updateLastAssistantMessage(accumulatedCode, accumulatedReasoning);
            };

            if (engine === 'gemini') {
                await streamGeminiCookieChat({ 
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    model: 'gemini-2.5-flash' 
                }, onData, onDone, (err) => updateLastAssistantMessage(`视觉转换失败: ${err.message}`));
            } else {
                await streamChatCompletions({ 
                    model: prompt.channel_code ? `${prompt.channel_code}@${prompt.model_id}` : "siliconflow@deepseek-ai/DeepSeek-V3", 
                    messages,
                    stream: true
                }, onData, onDone, (err) => updateLastAssistantMessage(`API 渲染失败: ${err.message}`));
            }
        } catch (e: any) {
            setState(prev => ({ ...prev, isStreaming: false }));
            updateLastAssistantMessage(`渲染链路错误: ${e.message}`);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-hidden font-sans">
            {/* Header with Engine Toggle */}
            <header className="flex-shrink-0 px-6 py-3 border-b border-white/40 bg-white/70 backdrop-blur-md flex items-center justify-between z-20 shadow-sm sticky top-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 hover:bg-white/50 rounded-full transition-colors"><ArrowLeftIcon className="w-5 h-5" /></button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-indigo-600" />
                            {scenario.title}
                        </h1>
                        <p className="text-[10px] text-slate-400 font-medium">Auto Insight Agent v3.1</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Engine Selector */}
                    <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200 shadow-inner">
                        <button 
                            onClick={() => setEngine('standard')} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${engine === 'standard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ServerIcon className="w-3.5 h-3.5" /> 标准
                        </button>
                        <button 
                            onClick={() => setEngine('gemini')} 
                            className={`group relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${engine === 'gemini' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <SparklesIcon className="w-3.5 h-3.5" /> Gemini
                            {engine === 'gemini' && (
                                <div className={`ml-1 w-1.5 h-1.5 rounded-full ${geminiHealth?.valid ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`} />
                            )}
                            {/* Gemini Status Tooltip */}
                            {engine === 'gemini' && !geminiHealth?.valid && (
                                <div className="absolute top-full mt-2 right-0 bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded border border-red-100 whitespace-nowrap shadow-lg z-50 animate-in fade-in slide-in-from-top-1">
                                    {geminiHealth?.message || 'Cookie 已失效'}
                                </div>
                            )}
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    <button 
                        onClick={() => setIsPreviewOpen(true)} 
                        disabled={!state.analysisContent} 
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {state.stage === 'analysis' ? <DocumentTextIcon className="w-4 h-4"/> : <ViewGridIcon className="w-4 h-4"/>}
                        <span>预览结果</span>
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden w-full relative z-10">
                <div className="h-full max-w-5xl mx-auto bg-white shadow-2xl border-x border-slate-100 flex flex-col relative">
                    <ChatPanel 
                        messages={state.messages} 
                        stage={state.stage} 
                        onSendMessage={handleSendMessage} 
                        isStreaming={state.isStreaming} 
                        onSwitchToVisual={() => { 
                            setState(prev => ({ ...prev, stage: 'visual' })); 
                            runVisualPhase("基于当前分析报告生成交互式视觉看板"); 
                        }} 
                        canSwitchToVisual={!!state.analysisContent} 
                        onPreview={() => setIsPreviewOpen(true)} 
                    />
                </div>
            </div>

            {/* Fullscreen Preview Modal */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-[#1a1a1a] w-[95vw] h-[90vh] rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300 border border-white/10">
                        <div className="absolute top-4 left-4 z-50 flex gap-2">
                            <button 
                                onClick={() => setIsPreviewOpen(false)} 
                                className="p-2.5 bg-white/10 backdrop-blur rounded-full text-white hover:bg-white/20 border border-white/10 transition-all hover:scale-110 shadow-lg"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <PreviewPanel 
                            stage={state.stage} 
                            markdownContent={state.analysisContent} 
                            htmlCode={state.visualCode} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
