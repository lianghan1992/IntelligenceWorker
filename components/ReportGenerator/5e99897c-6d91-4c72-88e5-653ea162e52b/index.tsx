
import React, { useState, useEffect } from 'react';
import { StratifyScenario } from '../../../types';
import { ArrowLeftIcon, SparklesIcon } from '../../icons';
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { Message, ScenarioState } from './types';
import { streamChatCompletions, getPromptDetail } from '../../../api/stratify';
import { v4 as uuidv4 } from 'uuid';

interface SpecificScenarioProps {
    scenario: StratifyScenario;
    onBack: () => void;
}

// PROMPT IDs provided by user
const PROMPT_ID_ANALYSIS = "e9899016-7cb2-45b5-8ae1-0bda9b76fc43"; 
const PROMPT_ID_VISUAL = "75635cb9-6c5e-487c-a991-30f1ca046249";   

// Native UUID generator
const generateId = () => crypto.randomUUID();

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

    // Initialize Model String from Scenario Config
    useEffect(() => {
        if (scenario.channel_code && scenario.model_id) {
            setModelString(`${scenario.channel_code}@${scenario.model_id}`);
        } else {
            // Fallback default if not configured
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

    const updateLastAssistantMessage = (content: string) => {
        setState(prev => {
            const newMessages = [...prev.messages];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content = content; 
            } else {
                 newMessages.push({
                    id: generateId(),
                    role: 'assistant',
                    content: content,
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
        
        try {
            // 1. Fetch System Prompt Content
            const prompt = await getPromptDetail(PROMPT_ID_ANALYSIS);
            const systemPrompt = prompt.content;

            // 2. Construct Messages
            const messages = [
                { role: 'system', content: systemPrompt },
                // Include chat context if this is a refinement (simplified: just current context + input)
                { role: 'user', content: `分析主题: ${state.topic || input}。${input !== state.topic ? `补充指令: ${input}` : ''}。${state.analysisContent ? `\n基于已有分析继续完善:\n${state.analysisContent}` : ''}` }
            ];

            // 3. Stream from OpenAI Compatible Gateway
            await streamChatCompletions(
                {
                    model: modelString,
                    messages: messages,
                    temperature: 0.7
                },
                (chunk) => {
                   accumulatedText += chunk;
                   setState(prev => ({ ...prev, analysisContent: accumulatedText }));
                   updateLastAssistantMessage("正在生成分析报告...\n\n" + accumulatedText.substring(0, 100) + "..."); // Optional: Show preview in chat bubbles too? Better keep chat clean.
                },
                () => {
                    setState(prev => ({ ...prev, isStreaming: false }));
                    updateLastAssistantMessage('分析完成。您可以继续对话修改，或点击上方“生成看板”。');
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

        try {
            // 1. Fetch Visual Prompt Content
            const prompt = await getPromptDetail(PROMPT_ID_VISUAL);
            const systemPrompt = prompt.content;

            // 2. Construct Messages
            // We pass the Analysis Content as context
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `【分析报告内容】\n${state.analysisContent}\n\n【用户指令】\n${input}` }
            ];

            // 3. Stream
            await streamChatCompletions(
                {
                    model: modelString,
                    messages: messages,
                    temperature: 0.2 // Lower temp for code
                },
                (chunk) => {
                    let text = chunk;
                    // Simple cleaning on the fly
                    if (accumulatedCode.length === 0 && text.trim().startsWith('```html')) {
                        text = text.replace('```html', '');
                    }
                    text = text.replace('```', ''); 
                    
                    accumulatedCode += text;
                    setState(prev => ({ ...prev, visualCode: accumulatedCode }));
                },
                () => {
                    setState(prev => ({ ...prev, isStreaming: false }));
                    updateLastAssistantMessage('视觉看板构建完成。您可以在左侧继续输入指令调整样式。');
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
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                            {scenario.title}
                        </h1>
                    </div>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <div className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${state.stage === 'analysis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                        1. 深度分析
                    </div>
                    <div className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${state.stage === 'visual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                        2. 视觉看板
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-[400px] flex-shrink-0 flex flex-col z-10 shadow-xl border-r border-slate-200">
                    <ChatPanel 
                        messages={state.messages}
                        stage={state.stage}
                        onSendMessage={handleSendMessage}
                        isStreaming={state.isStreaming}
                        onSwitchToVisual={handleSwitchToVisual}
                        canSwitchToVisual={!!state.analysisContent}
                    />
                </div>

                <div className="flex-1 min-w-0 bg-slate-50 relative">
                    <PreviewPanel 
                        stage={state.stage}
                        markdownContent={state.analysisContent}
                        htmlCode={state.visualCode}
                    />
                </div>
            </div>
        </div>
    );
};
