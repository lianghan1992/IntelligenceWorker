
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';
// Removed MessageIcon, BrainIcon, and RefreshIcon as they were unused or did not exist in icons.tsx.
import { CheckIcon, SparklesIcon, ArrowRightIcon } from '../../../../icons';

interface WorkflowProcessorProps {
    taskId: string;
    scenario: string;
    initialSessionId: string;
    targetTech: string;
    materials: string;
    onFinish: (markdown: string) => void;
    onUpdateSession: (sid: string) => void;
}

export const WorkflowProcessor: React.FC<WorkflowProcessorProps> = ({ 
    taskId, scenario, initialSessionId, targetTech, materials, onFinish, onUpdateSession 
}) => {
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1); // 1: Role, 2: Ingest, 3: Generate, 4: Revision
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    const [thoughtStream, setThoughtStream] = useState('');
    const [draftMarkdown, setDraftMarkdown] = useState('');
    const [sessionId, setSessionId] = useState(initialSessionId);
    
    // 修订对话状态
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const hasStarted = useRef(false);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        runPipeline();
    }, []);

    const runPipeline = async () => {
        setIsProcessing(true);
        
        try {
            // Step 1: 01_Role_ProtocolSetup
            setCurrentStep(1);
            setIsThinkingOpen(true);
            await new Promise<void>((resolve, reject) => {
                streamGenerate(
                    { prompt_name: '01_Role_ProtocolSetup', variables: {}, scenario, session_id: sessionId },
                    () => {}, // 不解析返回，直接推进
                    resolve,
                    reject,
                    (sid) => { setSessionId(sid); onUpdateSession(sid); },
                    setThoughtStream
                );
            });

            // Step 2: 02_DataIngestion
            setCurrentStep(2);
            setThoughtStream('');
            await new Promise<void>((resolve, reject) => {
                streamGenerate(
                    { prompt_name: '02_DataIngestion', variables: { data: materials }, scenario, session_id: sessionId },
                    () => {},
                    resolve,
                    reject,
                    undefined,
                    setThoughtStream
                );
            });

            // Step 3: 03_TriggerGeneration
            setCurrentStep(3);
            setThoughtStream('');
            let fullDraft = '';
            await new Promise<void>((resolve, reject) => {
                streamGenerate(
                    { prompt_name: '03_TriggerGeneration', variables: { target_technology: targetTech }, scenario, session_id: sessionId },
                    (chunk) => {
                        fullDraft += chunk;
                        const { jsonPart } = extractThoughtAndJson(fullDraft);
                        if (jsonPart) {
                            // 尝试解析 JSON 中的“报告”部分，如果是流式 JSON 可能解析失败，我们只在 DONE 时取最终的
                            setDraftMarkdown(jsonPart); 
                        }
                    },
                    () => {
                        const { jsonPart } = extractThoughtAndJson(fullDraft);
                        // 如果有结构化 JSON，提取出 Markdown 内容。如果没有则保留原样。
                        const parsed = parseLlmJson<any>(jsonPart);
                        if (parsed && parsed.报告) {
                            // 将复杂的 JSON 报告对象转回 Markdown 供用户修订
                            const md = Object.entries(parsed.报告).map(([k, v]: [string, any]) => {
                                return `## ${k}\n\n**核心观点**: ${v.核心观点}\n\n**详细论据**: ${typeof v.详细论据 === 'string' ? v.详细论据 : JSON.stringify(v.详细论据, null, 2)}\n\n**可视化建议**: ${v.可视化建议}`;
                            }).join('\n\n');
                            setDraftMarkdown(md);
                            setMessages([{ role: 'assistant', content: '我已经基于资料为您生成了初步的评估报告。您可以查看右侧内容，并在此处提出修改意见。' }]);
                        } else {
                            setDraftMarkdown(jsonPart || fullDraft);
                        }
                        resolve();
                    },
                    reject,
                    undefined,
                    setThoughtStream
                );
            });

            setCurrentStep(4);
            setIsThinkingOpen(false);
        } catch (e) {
            console.error("Pipeline failed", e);
            alert("流程执行异常，请重试");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendMessage = async () => {
        if (!userInput.trim() || isProcessing) return;
        
        const userMsg = userInput.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setUserInput('');
        setIsProcessing(true);
        setIsThinkingOpen(true);
        setThoughtStream('');

        let fullRes = '';
        await streamGenerate(
            { prompt_name: '02_revise_outline', variables: { user_revision_request: userMsg }, scenario, session_id: sessionId },
            (chunk) => {
                fullRes += chunk;
                // 对话模式下，通常 AI 会返回新的 Markdown 内容
                setDraftMarkdown(prev => fullRes.length > 20 ? fullRes : prev); 
            },
            () => {
                setMessages(prev => [...prev, { role: 'assistant', content: '报告内容已根据您的建议进行更新。' }]);
                setIsProcessing(false);
                setIsThinkingOpen(false);
            },
            () => { setIsProcessing(false); setIsThinkingOpen(false); },
            undefined,
            setThoughtStream
        );
    };

    const steps = [
        { id: 1, label: '设定专家角色', active: currentStep === 1, done: currentStep > 1 },
        { id: 2, label: '资料深度分析', active: currentStep === 2, done: currentStep > 2 },
        { id: 3, label: '撰写评估报告', active: currentStep === 3, done: currentStep > 3 },
        { id: 4, label: '修订与确认', active: currentStep === 4, done: false },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
            <ReasoningModal 
                isOpen={isThinkingOpen} 
                onClose={() => setIsThinkingOpen(false)} 
                content={thoughtStream}
                status={`AI 正在处理: ${steps.find(s => s.active)?.label || '思考中'}`}
            />

            {/* Top Minimal Stepper */}
            <div className="bg-white border-b border-slate-200 px-8 py-3 flex justify-center gap-10">
                {steps.map(s => (
                    <div key={s.id} className={`flex items-center gap-2 transition-all ${s.active ? 'scale-105' : 'opacity-50'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${s.done ? 'bg-green-50 border-green-50 text-white' : s.active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-400'}`}>
                            {s.done ? <CheckIcon className="w-4 h-4" /> : s.id}
                        </div>
                        <span className={`text-xs font-bold ${s.active ? 'text-indigo-900' : 'text-slate-500'}`}>{s.label}</span>
                    </div>
                ))}
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Chat Revision */}
                <div className="w-96 border-r border-slate-200 bg-white flex flex-col shadow-inner">
                    <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-indigo-600" />
                        <span className="font-bold text-slate-800 text-sm">评估修订对话</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] px-4 py-2 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {isProcessing && currentStep === 4 && (
                            <div className="flex items-center gap-2 text-slate-400 italic text-xs px-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-indigo-500 border-t-transparent"></div>
                                AI 正在调整内容...
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-slate-50">
                        <div className="relative">
                            <textarea 
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                placeholder="输入修订意见..."
                                className="w-full h-24 p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm"
                                disabled={isProcessing || currentStep < 4}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={isProcessing || !userInput.trim() || currentStep < 4}
                                className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 transition-all"
                            >
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Markdown Preview */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                    <div className="absolute top-4 right-4 z-10">
                        <button 
                            onClick={() => onFinish(draftMarkdown)}
                            disabled={isProcessing || !draftMarkdown || currentStep < 4}
                            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-xl hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            <CheckIcon className="w-5 h-5" />
                            确认并交付排版
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-12 pt-20">
                        {draftMarkdown ? (
                            <div className="max-w-3xl mx-auto prose prose-slate max-w-none">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 pb-2 border-b border-slate-100 flex justify-between">
                                    <span>Live Draft Console</span>
                                    <span>Character Count: {draftMarkdown.length}</span>
                                </div>
                                <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed text-lg">
                                    {draftMarkdown}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin"></div>
                                <p className="font-bold animate-pulse">正在从原始资料库精炼情报...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
