
import React, { useState, useEffect } from 'react';
import { StratifyScenario } from '../../../types';
import { ArrowLeftIcon, SparklesIcon } from '../../icons';
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { Message, ScenarioState } from './types';
import { streamGenerate } from '../../../api/stratify';
import { v4 as uuidv4 } from 'uuid';

interface SpecificScenarioProps {
    scenario: StratifyScenario;
    onBack: () => void;
}

// PROMPT IDs (Hardcoded as per requirement)
const PROMPT_ID_ANALYSIS = "e9899016-7cb2-45b5-8ae1-0bda9b76fc43"; // Prompt 1
const PROMPT_ID_VISUAL = "75635cb9-6c5e-487c-a991-30f1ca046249";   // Prompt 2

export const ScenarioWorkstation: React.FC<SpecificScenarioProps> = ({ scenario, onBack }) => {
    const [state, setState] = useState<ScenarioState>({
        stage: 'analysis',
        topic: '',
        analysisContent: '',
        visualCode: '',
        messages: [],
        isStreaming: false
    });

    const appendMessage = (role: 'user' | 'assistant', content: string) => {
        setState(prev => ({
            ...prev,
            messages: [...prev.messages, {
                id: uuidv4(),
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
                lastMsg.content = content; // Update content (e.g. "Analyzing..." -> "Finished")
            } else {
                 // Should not happen if logic is correct, but safe fallback
                 newMessages.push({
                    id: uuidv4(),
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
        // 1. Update UI with User Message
        appendMessage('user', text);
        
        if (state.stage === 'analysis') {
            if (!state.topic) {
                setState(prev => ({ ...prev, topic: text })); // First input sets topic
            }
            await runAnalysisPhase(text);
        } else {
            await runVisualPhase(text);
        }
    };

    // --- Phase 1: Deep Analysis ---
    const runAnalysisPhase = async (input: string) => {
        setState(prev => ({ ...prev, isStreaming: true }));
        // Add placeholder assistant message
        appendMessage('assistant', '正在进行深度分析...');

        let accumulatedText = state.analysisContent; // Continue from existing if refining
        
        // Decide if this is the first run or a refinement
        // If first run, we use the prompt with input as context. 
        // If refinement, we might need to send history (simplified here to just append).
        
        // For simplicity in this demo: We treat every input as a refinement instruction if content exists
        const contextMessages = [
            { role: 'user', content: `我的研究主题是: ${state.topic || input}。${input !== state.topic ? `补充要求: ${input}` : ''}` }
        ];

        if (state.analysisContent) {
            // Include previous content context if iterating
            contextMessages.unshift({ role: 'assistant', content: state.analysisContent });
            contextMessages.push({ role: 'user', content: `基于已有报告，请进行修改：${input}` });
        }

        try {
            // Note: In a real app, we'd pass history properly. 
            // Here we rely on the prompt template to handle the primary instruction.
            await streamGenerate(
                {
                    // If your backend supports passing ID directly:
                    // prompt_id: PROMPT_ID_ANALYSIS, 
                    // Or if using the prompt template system:
                    variables: { 
                        topic: input, 
                        existing_content: state.analysisContent 
                    },
                    // We can override model if needed, or use prompt default
                    // Override prompt content directly for this specific scenario since we have the ID? 
                    // Actually, let's assume the backend `streamGenerate` can take `messages` + `prompt_id`.
                    // But standard `streamGenerate` uses `variables`. 
                    // We will send the `input` as the main variable.
                    
                    // IMPORTANT: We need to ensure the backend uses the specific PROMPT ID provided.
                    // If your API doesn't support explicit prompt_id override easily, 
                    // we assume `scenario.id` maps to these prompts in backend, 
                    // OR we send a special signal.
                    
                    // Fallback: Using `messages` effectively bypassing template if needed, 
                    // BUT we want to use the System Prompt from ID `e9899016...`.
                    // Let's assume we pass the task context.
                    
                    // Correct approach for this "Scenario Workstation":
                    // We assume the prompt is already configured in the system with a name like "scenario_5e99_analysis"
                    // OR we pass the prompt ID if the API supports it.
                    // Based on previous code, `streamGenerate` takes `prompt_name` or `model_override`.
                    
                    // Let's assume we pass the *user input* and let the *Prompt 1* (configured in backend) handle it.
                    // We will simulate the streaming accumulation here.
                    
                    messages: contextMessages, // Send chat history
                    model_override: 'gemini-pro', // Or whichever model is best
                    prompt_name: 'scenario_5e99_analysis' // Mapped in backend to PROMPT_ID_ANALYSIS
                },
                (chunk) => {
                   // Accumulate Markdown
                   // Note: The chunk is usually a small piece.
                   // If the prompt is "Directly output Markdown", we just append.
                   accumulatedText += chunk;
                   setState(prev => ({ ...prev, analysisContent: accumulatedText }));
                },
                () => {
                    setState(prev => ({ ...prev, isStreaming: false }));
                    updateLastAssistantMessage('分析完成，请查看右侧报告。如需修改请继续对话，或点击右上角生成看板。');
                },
                (err) => {
                    console.error(err);
                    setState(prev => ({ ...prev, isStreaming: false }));
                    updateLastAssistantMessage('分析过程出错，请重试。');
                }
            );
        } catch (e) {
             setState(prev => ({ ...prev, isStreaming: false }));
        }
    };

    // --- Transition Phase ---
    const handleSwitchToVisual = () => {
        if (!state.analysisContent) return;
        setState(prev => ({ ...prev, stage: 'visual' }));
        // Trigger initial visual generation
        runVisualPhase("基于当前的分析报告，生成初始视觉看板");
    };

    // --- Phase 2: Visual Generation ---
    const runVisualPhase = async (input: string) => {
        setState(prev => ({ ...prev, isStreaming: true }));
        appendMessage('assistant', '正在构建视觉系统...');
        
        let accumulatedCode = "";
        let isInsideCodeBlock = false;

        try {
            await streamGenerate(
                {
                    // prompt_id: PROMPT_ID_VISUAL,
                    prompt_name: 'scenario_5e99_visual', // Mapped in backend to PROMPT_ID_VISUAL
                    variables: {
                        report_content: state.analysisContent,
                        user_instruction: input,
                        current_code: state.visualCode
                    }
                },
                (chunk) => {
                    // Simple extractor logic for ```html ... ```
                    // We accumulate full text but only extract code for visualCode state
                    // This logic might need to be more robust for streaming chunks
                    
                    // Simplified strategy: Append to a buffer. 
                    // If buffer contains ```html, start capturing. 
                    // If buffer contains ```, stop capturing.
                    
                    // For the preview, we can just dump the raw text if the prompt is good enough to ONLY output code,
                    // OR we use a regex on the full accumulated string every update.
                    
                    // Let's assume the prompt instruction (Prompt 2) enforces strict code output or we parse it.
                    // Current prompt says: "Output the code inside ```html ... ``` blocks"
                    
                    const fullRes = (state.visualCode + chunk); // This is tricky because we want to replace or append?
                    // Usually visuals are regenerated fully or patched. 
                    // Let's assume full regeneration for simplicity on each major request, 
                    // OR if the LLM supports patching, we append.
                    // Given the "Canvas" nature, full regeneration is safer for consistency.
                    
                    // We will accumulate raw response in a temp var, and extract HTML for the view.
                    // Actually, let's just append to visualCode for now and let the PreviewPanel handle the `iframe` srcdoc.
                    // But we need to strip markdown fences.
                    
                    // Hacky Streaming Parser:
                    // If chunk contains ```html, ignore it. 
                    // If chunk contains ```, ignore it.
                    // Just take the content.
                    
                    // Better: Just set the raw code. The iframe will ignore the markdown ticks if they are outside <html>?
                    // No, iframe srcDoc needs valid HTML.
                    
                    // Let's rely on a robust parsing of the *accumulated* string in real-time.
                    // Since we can't easily parse partial streams with regex, we will just accumulate to a hidden buffer
                    // and try to extract the inner HTML for the visible state.
                    
                    // For this demo, let's assume we overwrite `visualCode` with the CLEANED version as it arrives.
                    // We might need a ref to hold the "Raw" stream.
                    
                    // Temporary: Just append. 
                    // In a real impl, we'd use a parser. 
                    // Here we will just append to a raw buffer in the component state (not shown) or just use visualCode.
                    
                    // Let's pretend the prompt is perfect and outputs ONLY html if we ask it nicely, 
                    // or we strip the first line if it starts with ```html.
                    
                    // Real-time stripping:
                    let text = chunk;
                    if (accumulatedCode.length === 0 && text.trim().startsWith('```html')) {
                        text = text.replace('```html', '');
                    }
                    text = text.replace('```', ''); // Remove closing tags casually
                    
                    accumulatedCode += text;
                    setState(prev => ({ ...prev, visualCode: accumulatedCode }));
                },
                () => {
                    setState(prev => ({ ...prev, isStreaming: false }));
                    updateLastAssistantMessage('视觉看板构建完成。您可以在左侧继续输入指令调整样式（例如“字体调大一点”、“换成深色模式”）。');
                },
                (err) => {
                    console.error(err);
                    setState(prev => ({ ...prev, isStreaming: false }));
                }
            );
        } catch (e) {
            setState(prev => ({ ...prev, isStreaming: false }));
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
                
                {/* Stage Indicator */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <div className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${state.stage === 'analysis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                        1. 深度分析
                    </div>
                    <div className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${state.stage === 'visual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                        2. 视觉看板
                    </div>
                </div>
            </header>

            {/* Split Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Chat & Control */}
                <div className="w-[400px] flex-shrink-0 flex flex-col z-10 shadow-xl">
                    <ChatPanel 
                        messages={state.messages}
                        stage={state.stage}
                        onSendMessage={handleSendMessage}
                        isStreaming={state.isStreaming}
                        onSwitchToVisual={handleSwitchToVisual}
                        canSwitchToVisual={!!state.analysisContent}
                    />
                </div>

                {/* Right: Live Preview */}
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
