
import React, { useState, useEffect } from 'react';
import { StratifyScenario } from '../../../types';
import { ArrowLeftIcon, SparklesIcon, DocumentTextIcon, ViewGridIcon, CloseIcon, ShieldExclamationIcon } from '../../icons';
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { Message, ScenarioState } from './types';
import { streamGeminiCookieChat, checkGeminiCookieStatus, getPromptDetail } from '../../../api/stratify';

interface SpecificScenarioProps {
    scenario: StratifyScenario;
    onBack: () => void;
}

// PROMPT IDs (Same as the original scenario as per instructions)
const PROMPT_ID_ANALYSIS = "e9899016-7cb2-45b5-8ae1-0bda9b76fc43"; 
const PROMPT_ID_VISUAL = "75635cb9-6c5e-487c-a991-30f1ca046249";   

// Native UUID generator
const generateId = () => crypto.randomUUID();

// Helper to strip markdown code fences
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

    const [geminiHealth, setGeminiHealth] = useState<{ valid: boolean; message: string } | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Check health on mount
    useEffect(() => {
        checkGeminiCookieStatus()
            .then(setGeminiHealth)
            .catch(() => setGeminiHealth({ valid: false, message: '无法连接到 Gemini 服务' }));
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
                if (reasoning) {
                    lastMsg.reasoning = reasoning;
                }
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

    // --- Core Logic: Handle User Input ---
    const handleSendMessage = async (text: string) => {
        if (geminiHealth && !geminiHealth.valid) {
            appendMessage('assistant', `⚠️ 系统检测到 Gemini 服务异常 (${geminiHealth.message})，无法处理请求。请联系管理员更新 Cookie。`);
            return;
        }

        appendMessage('user', text);
        
        if (state.stage === 'analysis') {
            if (!state.topic) {
                setState(prev => ({ ...prev, topic: text })); 
            }
            await runAnalysisPhase(text);
        } else {
            await runVisualPhase(text);
        }
    };

    // --- Phase 1: Deep Analysis ---
    const runAnalysisPhase = async (input: string) => {
        setState(prev => ({ ...prev, isStreaming: true }));
        appendMessage('assistant', '正在进行深度分析 (Gemini)...');

        let accumulatedText = "";
        let accumulatedReasoning = "";
        
        try {
            const prompt = await getPromptDetail(PROMPT_ID_ANALYSIS);
            const systemPrompt = prompt.content;

            let userPromptContent = "";
            if (!state.analysisContent) {
                userPromptContent = `分析主题: ${state.topic || input}。${input !== state.topic ? `补充指令: ${input}` : ''}`;
            } else {
                userPromptContent = `
【当前完整报告内容 (Markdown)】:
${state.analysisContent}

【用户修改/补充指令】:
${input}

【重要系统指令】:
请根据用户的指令修改上述报告。
务必输出修改后的**完整** Markdown 内容，严禁只输出修改片段或使用省略号。
请保持报告的完整结构。
`;
            }

            const messages = [
                { role: 'user', content: systemPrompt + "\n\n" + userPromptContent } // Gemini cookie interface might expect user role primarily
            ];

            await streamGeminiCookieChat(
                {
                    messages: messages,
                    model: 'gemini-3-flash', // Default model for cookie interface
                },
                (data) => {
                   if (data.content) {
                       accumulatedText += data.content;
                       const cleanText = stripMarkdownFences(accumulatedText);
                       setState(prev => ({ ...prev, analysisContent: cleanText }));
                   }
                   if (data.reasoning) {
                       accumulatedReasoning += data.reasoning;
                   }
                   updateLastAssistantMessage(accumulatedText || "正在生成分析报告...", accumulatedReasoning);
                },
                () => {
                    const cleanText = stripMarkdownFences(accumulatedText);
                    setState(prev => ({ ...prev, analysisContent: cleanText, isStreaming: false }));
                    updateLastAssistantMessage(accumulatedText, accumulatedReasoning);
                },
                (err) => {
                    console.error(err);
                    setState(prev => ({ ...prev, isStreaming: false }));
                    updateLastAssistantMessage(`分析过程出错: ${err.message || '未知错误'}`);
                }
            );
        } catch (e: any) {
             setState(prev => ({ ...prev, isStreaming: false }));
             updateLastAssistantMessage(`启动失败: ${e.message}`);
        }
    };

    // --- Transition Phase ---
    const handleSwitchToVisual = () => {
        if (!state.analysisContent) return;
        setState(prev => ({ ...prev, stage: 'visual' }));
        runVisualPhase("基于当前的分析报告，生成初始视觉看板");
    };

    // --- Phase 2: Visual Generation ---
    const runVisualPhase = async (input: string) => {
        setState(prev => ({ ...prev, isStreaming: true }));
        appendMessage('assistant', '正在构建视觉系统 (Gemini)...');
        
        let accumulatedCode = "";
        let accumulatedReasoning = "";

        try {
            const prompt = await getPromptDetail(PROMPT_ID_VISUAL);
            const systemPrompt = prompt.content;

            let userPromptContent = "";
            if (!state.visualCode) {
                 userPromptContent = `【分析报告内容】\n${state.analysisContent}\n\n【用户指令】\n${input}`;
            } else {
                 userPromptContent = `
【当前完整 HTML 代码】:
${state.visualCode}

【用户修改指令】:
${input}

【重要系统指令】:
请根据指令修改代码。
务必输出修改后的**完整** HTML 代码，严禁只输出修改片段或使用省略号。
确保包含完整的 <html>, <head>, <body> 结构。
`;
            }

            const messages = [
                { role: 'user', content: systemPrompt + "\n\n" + userPromptContent }
            ];

            await streamGeminiCookieChat(
                {
                    messages: messages,
                    model: 'gemini-3-flash',
                },
                (data) => {
                    if (data.content) {
                        accumulatedCode += data.content;
                        const cleanCode = stripMarkdownFences(accumulatedCode);
                        setState(prev => ({ ...prev, visualCode: cleanCode }));
                    }
                    if (data.reasoning) {
                        accumulatedReasoning += data.reasoning;
                    }
                    updateLastAssistantMessage(
                        accumulatedCode ? accumulatedCode : "正在设计视觉结构...", 
                        accumulatedReasoning
                    );
                },
                () => {
                    const finalCleanCode = stripMarkdownFences(accumulatedCode);
                    setState(prev => ({ ...prev, visualCode: finalCleanCode, isStreaming: false }));
                    updateLastAssistantMessage(accumulatedCode, accumulatedReasoning);
                },
                (err) => {
                    console.error(err);
                    setState(prev => ({ ...prev, isStreaming: false }));
                    updateLastAssistantMessage('生成出错，请重试。');
                }
            );
        } catch (e: any) {
            setState(prev => ({ ...prev, isStreaming: false }));
            updateLastAssistantMessage(`启动失败: ${e.message}`);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-hidden font-sans">
            {/* Health Alert */}
            {geminiHealth && !geminiHealth.valid && (
                <div className="absolute top-0 left-0 right-0 z-50 bg-red-50 text-red-700 px-4 py-2 text-xs font-bold flex items-center justify-center border-b border-red-100 shadow-sm animate-in slide-in-from-top-2">
                    <ShieldExclamationIcon className="w-4 h-4 mr-2" />
                    {geminiHealth.message} (服务不可用)
                </div>
            )}

            {/* --- Background Decorations (Blobs) --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                <div className="absolute top-[-10%] left-[-10%] w-[45rem] h-[45rem] bg-indigo-200/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob"></div>
                <div className="absolute top-[10%] right-[-10%] w-[40rem] h-[40rem] bg-purple-200/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[50rem] h-[50rem] bg-blue-100/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
            </div>

            {/* Header */}
            <header className="flex-shrink-0 px-6 py-3 border-b border-white/40 bg-white/70 backdrop-blur-md flex items-center justify-between z-20 shadow-sm sticky top-0 mt-8"> {/* Added mt-8 to account for potential health banner if desired, or remove if overlay */}
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-white/50 rounded-full transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                            {scenario.title} (Gemini Engine)
                        </h1>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex bg-slate-100/50 p-1 rounded-lg border border-slate-200/50">
                        <div className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${state.stage === 'analysis' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-400'}`}>
                            1. 深度分析
                        </div>
                        <div className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${state.stage === 'visual' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-400'}`}>
                            2. 视觉看板
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setIsPreviewOpen(true)}
                        disabled={!state.analysisContent}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {state.stage === 'analysis' ? <DocumentTextIcon className="w-4 h-4"/> : <ViewGridIcon className="w-4 h-4"/>}
                        <span className="hidden sm:inline">打开预览</span>
                    </button>
                </div>
            </header>

            {/* Main Content - Centered Single Column */}
            <div className="flex-1 overflow-hidden w-full relative z-10">
                <div className="h-full max-w-5xl mx-auto bg-white/95 backdrop-blur-sm shadow-2xl shadow-indigo-100/50 border-x border-white/50 flex flex-col relative ring-1 ring-slate-900/5">
                    <ChatPanel 
                        messages={state.messages}
                        stage={state.stage}
                        onSendMessage={handleSendMessage}
                        isStreaming={state.isStreaming}
                        onSwitchToVisual={handleSwitchToVisual}
                        canSwitchToVisual={!!state.analysisContent}
                        onPreview={() => setIsPreviewOpen(true)}
                    />
                </div>
            </div>

            {/* Preview Modal (Full Screen) */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#2a2a2a] w-[95vw] h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 border border-white/10 ring-1 ring-black/50">
                        <button 
                            onClick={() => setIsPreviewOpen(false)}
                            className="absolute top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur rounded-full text-white hover:bg-white/20 shadow-sm border border-white/10 transition-all hover:scale-110"
                        >
                            <CloseIcon className="w-6 h-6" />
                        </button>
                        
                        <PreviewPanel 
                            stage={state.stage}
                            markdownContent={state.analysisContent}
                            htmlCode={state.visualCode}
                        />
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 15s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
};
