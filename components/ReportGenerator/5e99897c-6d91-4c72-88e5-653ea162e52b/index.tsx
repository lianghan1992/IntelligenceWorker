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

// Prompt IDs for this scenario
const PROMPT_ID_ANALYSIS = "e9899016-7cb2-45b5-8ae1-0bda9b76fc43"; 
const PROMPT_ID_VISUAL = "75635cb9-6c5e-487c-a991-30f1ca046249";   

const generateId = () => crypto.randomUUID();

const stripMarkdownFences = (content: string) => {
    if (!content) return "";
    let clean = content.trim();
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

    const [engine, setEngine] = useState<'standard' | 'gemini'>('standard');
    const [geminiHealth, setGeminiHealth] = useState<{ valid: boolean; message: string } | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Initial and periodic health check
    useEffect(() => {
        const check = () => checkGeminiCookieStatus().then(setGeminiHealth).catch(() => setGeminiHealth({ valid: false, message: '无法连接' }));
        check();
        const timer = setInterval(check, 30000);
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
            if (!state.topic) setState(prev => ({ ...prev, topic: text.split('\n')[0].substring(0, 50) }));
            await runAnalysisPhase(text);
        } else {
            await runVisualPhase(text);
        }
    };

    const runAnalysisPhase = async (input: string) => {
        setState(prev => ({ ...prev, isStreaming: true }));
        appendMessage('assistant', `正在使用 ${engine === 'gemini' ? 'Gemini' : '标准'} 引擎进行分析...`);

        let accumulatedText = "";
        let accumulatedReasoning = "";
        
        try {
            const prompt = await getPromptDetail(PROMPT_ID_ANALYSIS);
            const systemPrompt = prompt.content;
            const userPromptContent = !state.analysisContent 
                ? `分析指令/主题: ${input}` 
                : `【当前完整报告内容】:\n${state.analysisContent}\n\n【用户修改指令】:\n${input}\n\n请输出修改后的完整 Markdown 内容。`;

            const messages = [{ role: 'user', content: systemPrompt + "\n\n" + userPromptContent }];

            if (engine === 'gemini') {
                await streamGeminiCookieChat({ messages, model: 'gemini-2.5-flash' }, 
                    (data) => {
                        if (data.content) accumulatedText += data.content;
                        if (data.reasoning) accumulatedReasoning += data.reasoning;
                        updateLastAssistantMessage(accumulatedText || "正在生成...", accumulatedReasoning);
                    },
                    () => {
                        setState(prev => ({ ...prev, analysisContent: stripMarkdownFences(accumulatedText), isStreaming: false }));
                        updateLastAssistantMessage(accumulatedText, accumulatedReasoning);
                    },
                    (err) => updateLastAssistantMessage(`出错: ${err.message}`)
                );
            } else {
                await streamChatCompletions({ 
                    model: prompt.channel_code ? `${prompt.channel_code}@${prompt.model_id}` : "siliconflow@deepseek-ai/DeepSeek-V3", 
                    messages 
                }, 
                    (data) => {
                        if (data.content) accumulatedText += data.content;
                        if (data.reasoning) accumulatedReasoning += data.reasoning;
                        updateLastAssistantMessage(accumulatedText || "正在生成...", accumulatedReasoning);
                    },
                    () => {
                        setState(prev => ({ ...prev, analysisContent: stripMarkdownFences(accumulatedText), isStreaming: false }));
                        updateLastAssistantMessage(accumulatedText, accumulatedReasoning);
                    },
                    (err) => updateLastAssistantMessage(`出错: ${err.message}`)
                );
            }
        } catch (e: any) {
             setState(prev => ({ ...prev, isStreaming: false }));
             updateLastAssistantMessage(`失败: ${e.message}`);
        }
    };

    const runVisualPhase = async (input: string) => {
        setState(prev => ({ ...prev, isStreaming: true }));
        appendMessage('assistant', `正在构建视觉系统 (${engine})...`);
        let accumulatedCode = "";
        let accumulatedReasoning = "";

        try {
            const prompt = await getPromptDetail(PROMPT_ID_VISUAL);
            const userPromptContent = !state.visualCode 
                ? `【分析报告】\n${state.analysisContent}\n\n【用户指令】\n${input}`
                : `【当前代码】:\n${state.visualCode}\n\n【用户修改指令】:\n${input}\n\n输出修改后的完整 HTML。`;

            const messages = [{ role: 'user', content: prompt.content + "\n\n" + userPromptContent }];

            const onData = (data: any) => {
                if (data.content) accumulatedCode += data.content;
                if (data.reasoning) accumulatedReasoning += data.reasoning;
                updateLastAssistantMessage(accumulatedCode || "设计中...", accumulatedReasoning);
            };

            const onDone = () => {
                setState(prev => ({ ...prev, visualCode: stripMarkdownFences(accumulatedCode), isStreaming: false }));
                updateLastAssistantMessage(accumulatedCode, accumulatedReasoning);
            };

            if (engine === 'gemini') {
                await streamGeminiCookieChat({ messages, model: 'gemini-2.5-flash' }, onData, onDone, (err) => updateLastAssistantMessage(`出错: ${err.message}`));
            } else {
                await streamChatCompletions({ 
                    model: prompt.channel_code ? `${prompt.channel_code}@${prompt.model_id}` : "siliconflow@deepseek-ai/DeepSeek-V3", 
                    messages 
                }, onData, onDone, (err) => updateLastAssistantMessage(`出错: ${err.message}`));
            }
        } catch (e: any) {
            setState(prev => ({ ...prev, isStreaming: false }));
            updateLastAssistantMessage(`失败: ${e.message}`);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-hidden font-sans">
            <header className="flex-shrink-0 px-6 py-3 border-b border-white/40 bg-white/70 backdrop-blur-md flex items-center justify-between z-20 shadow-sm sticky top-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-white/50 rounded-full transition-colors"><ArrowLeftIcon className="w-5 h-5" /></button>
                    <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-indigo-600" />{scenario.title}</h1>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                        <button onClick={() => setEngine('standard')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${engine === 'standard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                            <ServerIcon className="w-3.5 h-3.5" /> 标准
                        </button>
                        <button onClick={() => setEngine('gemini')} className={`group relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${engine === 'gemini' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                            <SparklesIcon className="w-3.5 h-3.5" /> Gemini
                            {engine === 'gemini' && (
                                <div className={`ml-1 w-1.5 h-1.5 rounded-full ${geminiHealth?.valid ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                            )}
                            {/* Gemini Status Tooltip */}
                            {engine === 'gemini' && !geminiHealth?.valid && (
                                <div className="absolute top-full mt-2 right-0 bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded border border-red-100 whitespace-nowrap shadow-lg">
                                    Cookie 可能已失效
                                </div>
                            )}
                        </button>
                    </div>
                    <button onClick={() => setIsPreviewOpen(true)} disabled={!state.analysisContent} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-slate-800 disabled:opacity-50">
                        {state.stage === 'analysis' ? <DocumentTextIcon className="w-4 h-4"/> : <ViewGridIcon className="w-4 h-4"/>}
                        <span className="hidden sm:inline">预览报告</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden w-full relative z-10">
                <div className="h-full max-w-5xl mx-auto bg-white/95 backdrop-blur-sm shadow-2xl border-x border-white/50 flex flex-col relative">
                    <ChatPanel messages={state.messages} stage={state.stage} onSendMessage={handleSendMessage} isStreaming={state.isStreaming} onSwitchToVisual={() => { setState(prev => ({ ...prev, stage: 'visual' })); runVisualPhase("生成初始视觉看板"); }} canSwitchToVisual={!!state.analysisContent} onPreview={() => setIsPreviewOpen(true)} />
                </div>
            </div>

            {isPreviewOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-[#2a2a2a] w-[95vw] h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95">
                        <button onClick={() => setIsPreviewOpen(false)} className="absolute top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur rounded-full text-white hover:bg-white/20 border border-white/10 transition-all hover:scale-110"><CloseIcon className="w-6 h-6" /></button>
                        <PreviewPanel stage={state.stage} markdownContent={state.analysisContent} htmlCode={state.visualCode} />
                    </div>
                </div>
            )}
        </div>
    );
};