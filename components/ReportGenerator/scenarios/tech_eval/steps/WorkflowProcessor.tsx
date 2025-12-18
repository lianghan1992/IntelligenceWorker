
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';
// Fix: Removed non-existent MessageIcon and unused BrainIcon
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
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1); // 1:Role, 2:Analyze, 3:Draft, 4:Revision
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    const [thoughtStream, setThoughtStream] = useState('');
    const [draftMarkdown, setDraftMarkdown] = useState('');
    const [sessionId, setSessionId] = useState(initialSessionId);
    
    // 修订对话
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
            // Step 1: AI角色定义 (01_Role_ProtocolSetup)
            setCurrentStep(1);
            setIsThinkingOpen(true);
            await new Promise<void>((resolve, reject) => {
                streamGenerate(
                    { prompt_name: '01_Role_ProtocolSetup', variables: {}, scenario, session_id: sessionId },
                    () => {}, 
                    resolve,
                    reject,
                    (sid) => { setSessionId(sid); onUpdateSession(sid); },
                    setThoughtStream
                );
            });

            // Step 2: AI正在分析资料 (02_DataIngestion)
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

            // Step 3: AI撰写报告 (03_TriggerGeneration)
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
                            // 尝试格式化显示 draft
                            const parsed = parseLlmJson<any>(jsonPart);
                            if (parsed && parsed.报告) {
                                let md = '';
                                Object.entries(parsed.报告).forEach(([k, v]: [string, any]) => {
                                    md += `## ${k}\n\n**核心观点**: ${v.核心观点}\n\n**详细论据**: ${v.详细论据}\n\n**可视化建议**: ${v.可视化建议}\n\n`;
                                });
                                setDraftMarkdown(md);
                            } else {
                                setDraftMarkdown(jsonPart);
                            }
                        }
                    },
                    resolve,
                    reject,
                    undefined,
                    setThoughtStream
                );
            });

            setCurrentStep(4);
            setIsThinkingOpen(false);
            setMessages([{ role: 'assistant', content: '技术评估报告初稿已完成。您可以查看右侧预览内容，并在此处提出修改意见。' }]);
        } catch (e) {
            console.error("Pipeline error", e);
            alert("执行过程中出现异常，请重试");
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
            { 
                prompt_name: '02_revise_outline', // 复用修订指令
                variables: { user_revision_request: userMsg }, 
                scenario, 
                session_id: sessionId 
            },
            (chunk) => {
                fullRes += chunk;
                // 实时更新右侧预览（简单处理，对话期间 AI 通常直接返回 Markdown 内容）
                if (fullRes.length > 20) setDraftMarkdown(fullRes); 
            },
            () => {
                setMessages(prev => [...prev, { role: 'assistant', content: '内容已按您的要求更新。' }]);
                setIsProcessing(false);
                setIsThinkingOpen(false);
            },
            () => { setIsProcessing(false); setIsThinkingOpen(false); },
            undefined,
            setThoughtStream
        );
    };

    const steps = [
        { id: 1, label: '角色定义', active: currentStep === 1, done: currentStep > 1 },
        { id: 2, label: '分析资料', active: currentStep === 2, done: currentStep > 2 },
        { id: 3, label: '撰写初稿', active: currentStep === 3, done: currentStep > 3 },
        { id: 4, label: '修订调优', active: currentStep === 4, done: false },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
            <ReasoningModal 
                isOpen={isThinkingOpen} 
                onClose={() => setIsThinkingOpen(false)} 
                content={thoughtStream}
                status={`AI 正在执行: ${steps.find(s => s.active)?.label || '任务处理'}`}
            />

            {/* 顶部进度条 */}
            <div className="bg-white border-b border-slate-200 px-10 py-4 flex justify-center gap-12">
                {steps.map(s => (
                    <div key={s.id} className={`flex items-center gap-3 transition-all ${s.active ? 'scale-105' : 'opacity-50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 ${s.done ? 'bg-green-50 border-green-100 text-white' : s.active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-400'}`}>
                            {s.done ? <CheckIcon className="w-5 h-5" /> : s.id}
                        </div>
                        <span className={`text-sm font-bold ${s.active ? 'text-indigo-900' : 'text-slate-500'}`}>{s.label}</span>
                    </div>
                ))}
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* 左：修订对话栏 */}
                <div className="w-96 border-r border-slate-200 bg-white flex flex-col shadow-inner">
                    <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-indigo-600" />
                        <span className="font-bold text-slate-800 text-sm">修订实验室</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700'}`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {isProcessing && currentStep === 4 && (
                            <div className="flex items-center gap-2 text-slate-400 italic text-xs px-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-indigo-500 border-t-transparent"></div>
                                AI 正在改写报告...
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-slate-50">
                        <div className="relative">
                            <textarea 
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                placeholder="输入修改建议..."
                                className="w-full h-24 p-4 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm"
                                disabled={isProcessing || currentStep < 4}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={isProcessing || !userInput.trim() || currentStep < 4}
                                className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-lg"
                            >
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 右：内容预览区 */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                    <div className="absolute top-6 right-8 z-10">
                        <button 
                            onClick={() => onFinish(draftMarkdown)}
                            disabled={isProcessing || !draftMarkdown || currentStep < 4}
                            className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                        >
                            <CheckIcon className="w-6 h-6" />
                            确认终稿并渲染报告
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-16 pt-24">
                        {draftMarkdown ? (
                            <div className="max-w-3xl mx-auto prose prose-indigo max-w-none">
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-10 pb-2 border-b border-slate-100 flex justify-between">
                                    <span>Live Assessment Draft</span>
                                    <span>{draftMarkdown.length} chars</span>
                                </div>
                                <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed text-lg">
                                    {draftMarkdown}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
                                <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin"></div>
                                <div className="text-center space-y-2">
                                    <p className="font-black text-slate-400 text-xl tracking-tight">Agent 正在深度解析资料</p>
                                    <p className="text-sm font-medium text-slate-300">构建技术逻辑链，识别潜在工程风险...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
