
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';
import { CheckIcon, SparklesIcon, ArrowRightIcon, CodeIcon, ChevronRightIcon, BrainIcon, CloseIcon } from '../../../../icons';

// 场景指定使用的模型引擎
const TARGET_MODEL = "openrouter@tngtech/deepseek-r1t2-chimera:free";

interface InteractionLog {
    role: 'user' | 'assistant' | 'system';
    name: string;
    content: string;
    timestamp: number;
}

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
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
    const [subTaskLabel, setSubTaskLabel] = useState('');
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    const [thoughtStream, setThoughtStream] = useState('');
    const [draftMarkdown, setDraftMarkdown] = useState('');
    const [sessionId, setSessionId] = useState(initialSessionId);
    
    // 调试记录状态
    const [interactionLogs, setInteractionLogs] = useState<InteractionLog[]>([]);
    const [isDebugOpen, setIsDebugOpen] = useState(false);

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

    const addLog = (log: InteractionLog) => {
        setInteractionLogs(prev => [...prev, log]);
    };

    // 辅助函数：执行单个流式步骤并返回完整响应
    const executeStep = async (promptName: string, vars: any, logLabel: string): Promise<string> => {
        setSubTaskLabel(logLabel);
        setThoughtStream('');
        addLog({ role: 'system', name: promptName, content: `执行步骤: ${logLabel}...`, timestamp: Date.now() });
        
        return new Promise<string>((resolve, reject) => {
            let fullRes = '';
            streamGenerate(
                { 
                    prompt_name: promptName, 
                    variables: vars, 
                    scenario, 
                    session_id: sessionId,
                    model_override: TARGET_MODEL 
                },
                (chunk) => { fullRes += chunk; }, 
                () => {
                    addLog({ role: 'assistant', name: promptName, content: fullRes, timestamp: Date.now() });
                    resolve(fullRes);
                },
                reject,
                (sid) => { if (sid) { setSessionId(sid); onUpdateSession(sid); } },
                (tChunk) => setThoughtStream(prev => prev + tChunk)
            );
        });
    };

    const runPipeline = async () => {
        setIsProcessing(true);
        try {
            // Step 1: 初始化专家协议
            setCurrentStep(1);
            setIsThinkingOpen(true);
            await executeStep('01_Role_ProtocolSetup', {}, '初始化行业专家协议');

            // Step 2: 注入资料库 (使用 data 变量，请确保 Prompt 文末有 {data} 占位符)
            setCurrentStep(2);
            await executeStep('02_DataIngestion', { data: materials }, '注入参考资料与行业背景');

            // Step 3: 多阶段报告撰写
            setCurrentStep(3);
            
            // Sub-Step 3.1: 技术路线分析 (核心注入 tec 变量)
            const res1 = await executeStep('03_TriggerGeneration_step1', { tec: targetTech }, '分析技术路线与代际定位');
            const part1 = parseLlmJson<any>(extractThoughtAndJson(res1).jsonPart)?.第一部分_技术路线与当前所处阶段分析 || '';

            // Sub-Step 3.2: 潜在风险识别
            const res2 = await executeStep('03_TriggerGeneration_step2', {}, '识别工程实现与环境风险');
            const part2 = parseLlmJson<any>(extractThoughtAndJson(res2).jsonPart)?.第二部分_当前技术潜在风险识别与分析 || '';

            // Sub-Step 3.3: 行业方案推荐
            const res3 = await executeStep('03_TriggerGeneration_step3', {}, '生成行业方案决策建议');
            const part3 = parseLlmJson<any>(extractThoughtAndJson(res3).jsonPart)?.第三部分_行业技术方案推荐 || '';

            // Sub-Step 3.4: 引用资料提取
            const res4 = await executeStep('03_TriggerGeneration_step4', {}, '提取并构建引用资料清单');
            const refsJson = parseLlmJson<any>(extractThoughtAndJson(res4).jsonPart);
            let refsMd = '';
            if (refsJson && typeof refsJson === 'object' && Object.keys(refsJson).length > 0) {
                refsMd = "### 引用资料来源\n\n" + Object.entries(refsJson).map(([title, url]) => `- [${title}](${url})`).join('\n');
            }

            // 自动化 Markdown 缝合
            const finalDraft = `# 技术评估报告: ${targetTech}\n\n## 第一部分：技术路线与当前所处阶段分析\n\n${part1}\n\n## 第二部分：当前技术潜在风险识别与分析\n\n${part2}\n\n## 第三部分：行业技术方案推荐\n\n${part3}\n\n${refsMd}`;
            
            setDraftMarkdown(finalDraft);
            setCurrentStep(4);
            setIsThinkingOpen(false);
            setMessages([{ role: 'assistant', content: '技术评估报告初稿已完成。您可以查看右侧预览内容，并在此处提出修改意见。' }]);
        } catch (e) {
            console.error("Pipeline error", e);
            addLog({ role: 'system', name: 'Error', content: `执行异常: ${String(e)}`, timestamp: Date.now() });
            alert("执行过程中出现异常，请重试");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendMessage = async () => {
        if (!userInput.trim() || isProcessing) return;
        
        const userMsg = userInput.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        addLog({ role: 'user', name: 'ManualRevision', content: userMsg, timestamp: Date.now() });
        setUserInput('');
        setIsProcessing(true);
        setIsThinkingOpen(true);
        setThoughtStream('');
        setSubTaskLabel('正在按要求修订报告');

        let fullRes = '';
        await streamGenerate(
            { 
                prompt_name: '02_revise_outline', // 通用修订逻辑
                variables: { user_revision_request: userMsg }, 
                scenario, 
                session_id: sessionId,
                model_override: TARGET_MODEL 
            },
            (chunk) => {
                fullRes += chunk;
                if (fullRes.length > 20) setDraftMarkdown(fullRes); 
            },
            () => {
                addLog({ role: 'assistant', name: 'ManualRevision', content: fullRes, timestamp: Date.now() });
                setMessages(prev => [...prev, { role: 'assistant', content: '内容已按您的要求更新。' }]);
                setIsProcessing(false);
                setIsThinkingOpen(false);
            },
            () => { setIsProcessing(false); setIsThinkingOpen(false); },
            undefined,
            (tChunk) => setThoughtStream(prev => prev + tChunk)
        );
    };

    const steps = [
        { id: 1, label: '专家协议', active: currentStep === 1, done: currentStep > 1 },
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
                status={`Agent 正在执行: ${subTaskLabel || '深度解析中'}`}
            />

            {/* 顶部进度条 */}
            <div className="bg-white border-b border-slate-200 px-10 py-4 flex items-center justify-between shadow-sm relative z-10">
                <div className="flex-1"></div>
                <div className="flex items-center gap-12">
                    {steps.map(s => (
                        <div key={s.id} className={`flex items-center gap-3 transition-all ${s.active ? 'scale-105' : 'opacity-50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 ${s.done ? 'bg-green-50 border-green-100 text-white' : s.active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-400'}`}>
                                {s.done ? <CheckIcon className="w-5 h-5" /> : s.id}
                            </div>
                            <span className={`text-sm font-bold ${s.active ? 'text-indigo-900' : 'text-slate-500'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>
                <div className="flex-1 flex justify-end">
                    <button 
                        onClick={() => setIsDebugOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all border border-slate-200"
                        title="查看原始交互记录"
                    >
                        <CodeIcon className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Debug Console</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* 左：修订对话栏 */}
                <div className="w-96 border-r border-slate-200 bg-white flex flex-col shadow-inner">
                    <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-indigo-600" />
                        <span className="font-bold text-slate-800 text-sm">报告修订台</span>
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
                                AI 正在重构报告内容...
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-slate-50">
                        <div className="relative">
                            <textarea 
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                placeholder="输入具体修改指令..."
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
                            确认终稿并启动高保真渲染
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
                                    <p className="text-sm font-medium text-slate-300">{subTaskLabel || '构建技术逻辑链，提取高价值洞察...'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 对话交互记录模态框 */}
            {isDebugOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in">
                    <div className="bg-[#0f172a] w-full max-w-5xl h-[85vh] rounded-[32px] shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                                    <CodeIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-lg">Agent Interaction Console</h3>
                                    <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">Tracing Session: {sessionId || 'No Session'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDebugOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-all">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar-dark bg-[#0f172a]">
                            {interactionLogs.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-600 font-mono italic">
                                    Waiting for first interaction packet...
                                </div>
                            ) : (
                                interactionLogs.map((log, i) => (
                                    <div key={i} className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${
                                                log.role === 'assistant' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 
                                                log.role === 'system' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 
                                                'border-indigo-500/30 text-indigo-400 bg-indigo-500/10'
                                            }`}>
                                                {log.role}
                                            </span>
                                            <span className="text-slate-500 font-mono text-[10px]">{log.name}</span>
                                            <div className="h-px bg-white/5 flex-1"></div>
                                            <span className="text-slate-600 font-mono text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className={`p-5 rounded-2xl border font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap ${
                                            log.role === 'assistant' ? 'bg-slate-800/40 border-slate-700/50 text-slate-300 shadow-inner' : 'bg-transparent border-white/5 text-slate-400'
                                        }`}>
                                            {log.content}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 bg-slate-950/80 border-t border-white/5 flex justify-between items-center px-8">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Pipeline: Tech_Eval_v3</span>
                                </div>
                                <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Captured Logs: {interactionLogs.length}</span>
                            </div>
                            <span className="text-indigo-400/30 font-black italic text-[10px] tracking-widest uppercase">AutoInsight Internal Engine</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
