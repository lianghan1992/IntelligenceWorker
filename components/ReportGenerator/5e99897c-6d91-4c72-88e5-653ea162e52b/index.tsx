
import React, { useState, useEffect } from 'react';
import { StratifyScenario } from '../../../types';
import { ArrowLeftIcon, SparklesIcon, DocumentTextIcon, ViewGridIcon, CloseIcon } from '../../icons';
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { Message, ScenarioState } from './types';
import { streamChatCompletions, getPromptDetail } from '../../../api/stratify';

interface SpecificScenarioProps {
    scenario: StratifyScenario;
    onBack: () => void;
}

// PROMPT IDs provided by user
const PROMPT_ID_ANALYSIS = "e9899016-7cb2-45b5-8ae1-0bda9b76fc43"; 
const PROMPT_ID_VISUAL = "75635cb9-6c5e-487c-a991-30f1ca046249";   

// Native UUID generator
const generateId = () => crypto.randomUUID();

// Helper to strip markdown code fences if the model wraps the whole response
const stripMarkdownFences = (content: string) => {
    let clean = content.trim();
    if (/^```markdown/i.test(clean)) {
        clean = clean.replace(/^```markdown/i, '').trim();
    } else if (clean.startsWith('```')) {
         clean = clean.replace(/^```/, '').trim();
    }
    if (clean.endsWith('```')) {
        clean = clean.slice(0, -3).trim();
    }
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

    const [modelString, setModelString] = useState<string>('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => {
        if (scenario.channel_code && scenario.model_id) {
            const prefix = `${scenario.channel_code}@`;
            const cleanModelId = scenario.model_id.startsWith(prefix) 
                ? scenario.model_id.substring(prefix.length) 
                : scenario.model_id;
            
            setModelString(`${scenario.channel_code}@${cleanModelId}`);
        } else {
            setModelString('openrouter@gpt-4o'); 
        }
    }, [scenario]);

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
        appendMessage('assistant', '正在进行深度分析...');

        let accumulatedText = "";
        let accumulatedReasoning = "";
        
        try {
            const prompt = await getPromptDetail(PROMPT_ID_ANALYSIS);
            const systemPrompt = prompt.content;

            // Strategy: Inject Current State
            // 如果已经有 analysisContent，说明是修改/追问。必须把当前完整内容带上，并要求输出完整内容。
            let userPromptContent = "";
            if (!state.analysisContent) {
                // 第一次生成
                userPromptContent = `分析主题: ${state.topic || input}。${input !== state.topic ? `补充指令: ${input}` : ''}`;
            } else {
                // 修改/迭代
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
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPromptContent }
            ];

            await streamChatCompletions(
                {
                    model: modelString,
                    messages: messages,
                    temperature: 0.7
                },
                (data) => {
                   if (data.content) {
                       accumulatedText += data.content;
                       // Real-time update state for preview (optional, can be heavy)
                       // Better to update state only at end or throttled, but for now we update per chunk for responsiveness
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
        appendMessage('assistant', '正在构建视觉系统...');
        
        let accumulatedCode = "";
        let accumulatedReasoning = "";

        try {
            const prompt = await getPromptDetail(PROMPT_ID_VISUAL);
            const systemPrompt = prompt.content;

            // Strategy: Inject Current Code State if exists
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
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPromptContent }
            ];

            await streamChatCompletions(
                {
                    model: modelString,
                    messages: messages,
                    temperature: 0.2 
                },
                (data) => {
                    if (data.content) {
                        accumulatedCode += data.content;
                        // Strip fences logic
                        let cleanCode = accumulatedCode;
                        if (cleanCode.includes('```html')) {
                             cleanCode = cleanCode.replace(/```html/g, '').replace(/```/g, '');
                        } else if (cleanCode.includes('```')) {
                             cleanCode = cleanCode.replace(/```/g, '');
                        }
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
                    let finalCleanCode = accumulatedCode;
                    if (finalCleanCode.includes('```html')) {
                         finalCleanCode = finalCleanCode.replace(/```html/g, '').replace(/```/g, '');
                    } else if (finalCleanCode.includes('```')) {
                         finalCleanCode = finalCleanCode.replace(/```/g, '');
                    }
                    setState(prev => ({ ...prev, visualCode: finalCleanCode, isStreaming: false }));
                    updateLastAssistantMessage(accumulatedCode, accumulatedReasoning); // Show full code in chat (ChatPanel handles collapsing)
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
            {/* --- Background Decorations (Blobs) --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                <div className="absolute top-[-10%] left-[-10%] w-[45rem] h-[45rem] bg-indigo-200/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob"></div>
                <div className="absolute top-[10%] right-[-10%] w-[40rem] h-[40rem] bg-purple-200/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[50rem] h-[50rem] bg-blue-100/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
            </div>

            {/* Header */}
            <header className="flex-shrink-0 px-6 py-3 border-b border-white/40 bg-white/70 backdrop-blur-md flex items-center justify-between z-20 shadow-sm sticky top-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-white/50 rounded-full transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                            {scenario.title}
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
