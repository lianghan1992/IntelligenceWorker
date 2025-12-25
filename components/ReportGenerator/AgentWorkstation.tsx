
import React, { useState, useRef, useEffect } from 'react';
import { StratifyScenario, StratifyTask } from '../../types';
import { createStratifyTask, streamGenerate, parseLlmJson, generatePdf } from '../../api/stratify';
import { extractThoughtAndJson } from './utils';
import { ContextCollector } from './shared/ContextCollector';
import { ReasoningModal } from './shared/ReasoningModal';
import { 
    BrainIcon, SparklesIcon, CheckCircleIcon, RefreshIcon, 
    DocumentTextIcon, ArrowRightIcon, DownloadIcon, ChevronLeftIcon,
    StopIcon
} from '../icons';

interface AgentWorkstationProps {
    scenario: StratifyScenario;
    initialTask?: StratifyTask;
    onBack: () => void;
}

export const AgentWorkstation: React.FC<AgentWorkstationProps> = ({ scenario, initialTask, onBack }) => {
    // State
    const [view, setView] = useState<'input' | 'executing' | 'result'>('input');
    const [task, setTask] = useState<StratifyTask | null>(initialTask || null);
    
    // Execution State
    const [streamBuffer, setStreamBuffer] = useState('');
    const [thoughtBuffer, setThoughtBuffer] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    
    // Result State
    const [finalHtml, setFinalHtml] = useState<string>('');
    const [isDownloading, setIsDownloading] = useState(false);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasStartedRef = useRef(false);

    // Restore state if loading from history
    useEffect(() => {
        if (initialTask) {
            setTask(initialTask);
            // 这里可以添加更复杂的恢复逻辑，比如解析 result 字段
            // 目前简单恢复到结果页（假设历史任务都是完成的）
            if (initialTask.status === 'completed') {
                setView('result');
                // 尝试从最后阶段恢复 HTML，如果没有则显示 Markdown
                // 此处简化处理
            }
        }
    }, [initialTask]);

    // Auto-scroll console
    useEffect(() => {
        if (view === 'executing' && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [streamBuffer, thoughtBuffer]);

    const handleStart = async (userInput: string, context: any) => {
        setView('executing');
        setIsGenerating(true);
        setStreamBuffer('');
        setThoughtBuffer('');
        setIsThinkingOpen(true); // Start with thinking modal open

        try {
            // 1. Create Task (Persistence)
            const newTask = await createStratifyTask(userInput, scenario.id);
            setTask({ ...newTask, context });

            // 2. Stream Generation
            // 假设我们现在是一个单体流式生成，或者后端编排好的流
            // Prompt Name 可以约定为 scenario.name 或者固定入口 'default_entry'
            const promptName = scenario.name || 'default';
            
            await streamGenerate(
                {
                    prompt_name: promptName, // 后端根据场景名路由到对应提示词
                    variables: { 
                        user_input: userInput,
                        context_str: JSON.stringify(context) 
                    },
                    scenario: scenario.id,
                    task_id: newTask.id,
                    session_id: undefined // New session
                },
                (chunk) => {
                    // Update Content
                    setStreamBuffer(prev => {
                        const next = prev + chunk;
                        const { thought, jsonPart } = extractThoughtAndJson(next);
                        
                        // Update thought separately if needed, or just use raw stream
                        if (thought && thought.length > thoughtBuffer.length) {
                            setThoughtBuffer(thought);
                        }
                        
                        // Auto-close thinking modal when real content appears
                        if (jsonPart && jsonPart.length > 50 && isThinkingOpen) {
                            setIsThinkingOpen(false);
                        }
                        
                        return next;
                    });
                },
                () => {
                    setIsGenerating(false);
                    setIsThinkingOpen(false);
                    finalizeResult();
                },
                (err) => {
                    console.error(err);
                    setIsGenerating(false);
                    setStreamBuffer(prev => prev + `\n\n[System Error]: ${err.message || 'Connection lost.'}`);
                },
                undefined, // onSessionId
                (reasoningChunk) => {
                    // DeepSeek style reasoning channel
                    setThoughtBuffer(prev => prev + reasoningChunk);
                }
            );

        } catch (e) {
            alert('任务启动失败');
            setView('input');
        }
    };

    const finalizeResult = () => {
        // Parse the final buffer to see if it contains HTML or JSON
        const { jsonPart } = extractThoughtAndJson(streamBuffer);
        let content = streamBuffer;

        // Try to find HTML structure
        if (jsonPart) {
            try {
                const parsed = JSON.parse(jsonPart);
                if (parsed.html) content = parsed.html;
                else if (parsed.content) content = parsed.content;
            } catch (e) {}
        } else {
             // Fallback regex for HTML
             const htmlMatch = streamBuffer.match(/<(!DOCTYPE\s+)?html[\s\S]*<\/html>/i);
             if (htmlMatch) content = htmlMatch[0];
        }

        setFinalHtml(content);
        setView('result');
    };

    const handleDownload = async () => {
        if (!finalHtml) return;
        setIsDownloading(true);
        try {
            const blob = await generatePdf(finalHtml, `Report_${task?.id.slice(0,6)}.pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${scenario.title}_Report.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert('导出失败');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Thinking Modal (Overlay) */}
            <ReasoningModal 
                isOpen={isThinkingOpen} 
                onClose={() => setIsThinkingOpen(false)} 
                content={thoughtBuffer || "正在初始化 Agent 环境..."}
                status="AI Agent 正在深度思考..."
            />

            {/* Header */}
            <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                            {scenario.title || scenario.name}
                        </h2>
                        {task && <span className="text-xs text-slate-400 font-mono">Task ID: {task.id.slice(0,8)}</span>}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {view === 'executing' && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold animate-pulse">
                            <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                            Generating...
                        </div>
                    )}
                    {view !== 'input' && (
                        <button 
                            onClick={() => setIsThinkingOpen(true)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="查看思考过程"
                        >
                            <BrainIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
                
                {/* 1. Input View */}
                {view === 'input' && (
                    <ContextCollector 
                        onStart={handleStart} 
                        isProcessing={false} 
                    />
                )}

                {/* 2. Executing Console View */}
                {view === 'executing' && (
                    <div className="h-full bg-[#1e1e1e] p-6 overflow-auto custom-scrollbar-dark font-mono text-sm leading-relaxed" ref={scrollRef}>
                        <div className="max-w-4xl mx-auto">
                            {/* Thought Block (If visible inline) */}
                            {thoughtBuffer && !isThinkingOpen && (
                                <div className="mb-6 border-l-2 border-indigo-500 pl-4 py-2 text-indigo-300/70 text-xs">
                                    <div className="font-bold mb-1 uppercase tracking-wider flex items-center gap-2">
                                        <BrainIcon className="w-3 h-3"/> Thought Process
                                    </div>
                                    <div className="whitespace-pre-wrap break-all line-clamp-6 hover:line-clamp-none transition-all cursor-pointer">
                                        {thoughtBuffer}
                                    </div>
                                </div>
                            )}

                            {/* Output Stream */}
                            <div className="text-emerald-400/90 whitespace-pre-wrap break-words">
                                {extractThoughtAndJson(streamBuffer).jsonPart || streamBuffer}
                                <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 align-middle animate-pulse"></span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Result View */}
                {view === 'result' && (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 bg-slate-200 p-4 md:p-8 overflow-auto flex justify-center custom-scrollbar">
                            {finalHtml.includes('<html') || finalHtml.includes('<!DOCTYPE') ? (
                                <div className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-2xl">
                                    <iframe 
                                        srcDoc={finalHtml} 
                                        className="w-full h-full min-h-[1200px] border-none"
                                        title="Result"
                                        sandbox="allow-scripts"
                                    />
                                </div>
                            ) : (
                                <div className="w-full max-w-4xl bg-white p-8 shadow-xl rounded-xl prose prose-slate max-w-none">
                                    <div className="whitespace-pre-wrap font-sans text-slate-700">
                                        {finalHtml}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Bottom Actions */}
                        <div className="p-4 bg-white border-t border-slate-200 flex justify-center gap-4 shadow-lg z-10">
                            <button 
                                onClick={() => setView('input')}
                                className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                            >
                                重开任务
                            </button>
                            <button 
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDownloading ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <DownloadIcon className="w-4 h-4"/>}
                                导出报告
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
