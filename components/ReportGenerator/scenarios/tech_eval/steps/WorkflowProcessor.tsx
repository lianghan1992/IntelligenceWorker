
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { CheckIcon, SparklesIcon, ArrowRightIcon, CodeIcon, ChevronRightIcon, BrainIcon, CloseIcon, ClockIcon } from '../../../../icons';

// 场景指定使用的模型引擎
const TARGET_MODEL = "openrouter@tngtech/deepseek-r1t2-chimera:free";

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
    const [thoughtStream, setThoughtStream] = useState('');
    const [draftMarkdown, setDraftMarkdown] = useState('');
    const [sessionId, setSessionId] = useState(initialSessionId);
    
    // 修订对话状态
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const hasStarted = useRef(false);
    const thoughtEndRef = useRef<HTMLDivElement>(null);

    // 自动滚动思考终端
    useEffect(() => {
        thoughtEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thoughtStream]);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        runPipeline();
    }, []);

    // 辅助函数：执行单个步骤
    const executeStep = async (promptName: string, vars: any, logLabel: string): Promise<string> => {
        setSubTaskLabel(logLabel);
        setThoughtStream(prev => prev + `\n\n> [SYSTEM]: 开始执行 - ${logLabel}...\n`);
        
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
                () => resolve(fullRes),
                reject,
                (sid) => { if (sid) { setSessionId(sid); onUpdateSession(sid); } },
                (tChunk) => setThoughtStream(prev => prev + tChunk)
            );
        });
    };

    const runPipeline = async () => {
        setIsProcessing(true);
        try {
            // Step 1: 协议初始化
            setCurrentStep(1);
            await executeStep('01_Role_ProtocolSetup', {}, '初始化行业专家 Agent 协议');

            // Step 2: 注入资料库 (关键：注入 data 变量)
            setCurrentStep(2);
            await executeStep('02_DataIngestion', { data: materials }, '解析参考资料库与事实依据');

            // Step 3: 多阶段撰写报告
            setCurrentStep(3);
            
            // Sub-Step 3.1: 技术分析 (关键：注入 tec 变量)
            const res1 = await executeStep('03_TriggerGeneration_step1', { tec: targetTech }, '分析技术路线与成熟度');
            const part1 = parseLlmJson<any>(extractThoughtAndJson(res1).jsonPart)?.第一部分_技术路线与当前所处阶段分析 || '';

            // Sub-Step 3.2: 风险识别
            const res2 = await executeStep('03_TriggerGeneration_step2', {}, '识别工程实现风险与物理隐患');
            const part2 = parseLlmJson<any>(extractThoughtAndJson(res2).jsonPart)?.第二部分_当前技术潜在风险识别与分析 || '';

            // Sub-Step 3.3: 方案推荐
            const res3 = await executeStep('03_TriggerGeneration_step3', {}, '生成 Plan A/B/C 决策建议');
            const part3 = parseLlmJson<any>(extractThoughtAndJson(res3).jsonPart)?.第三部分_行业技术方案推荐 || '';

            // Sub-Step 3.4: 引用提取
            const res4 = await executeStep('03_TriggerGeneration_step4', {}, '提取参考文献与链接');
            const refsJson = parseLlmJson<any>(extractThoughtAndJson(res4).jsonPart);
            let refsMd = '';
            if (refsJson && typeof refsJson === 'object' && Object.keys(refsJson).length > 0) {
                refsMd = "\n\n### 引用资料来源\n\n" + Object.entries(refsJson).map(([title, url]) => `- [${title}](${url})`).join('\n');
            }

            // 自动化缝合 Markdown
            const finalDraft = `# 技术评估报告: ${targetTech}\n\n## 第一部分：技术路线与当前所处阶段分析\n\n${part1}\n\n## 第二部分：当前技术潜在风险识别与分析\n\n${part2}\n\n## 第三部分：行业技术方案推荐\n\n${part3}${refsMd}`;
            
            setDraftMarkdown(finalDraft);
            setCurrentStep(4);
            setMessages([{ role: 'assistant', content: '评估报告初稿已完成。请检查右侧内容，如有需要请直接告知我如何修改。' }]);
        } catch (e) {
            setThoughtStream(prev => prev + `\n\n[ERROR]: ${String(e)}\n`);
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
        setThoughtStream(prev => prev + `\n\n> [USER REQUEST]: ${userMsg}\n`);

        let fullRes = '';
        await streamGenerate(
            { 
                prompt_name: '02_revise_outline', 
                variables: { user_revision_request: userMsg }, 
                scenario, 
                session_id: sessionId,
                model_override: TARGET_MODEL 
            },
            (chunk) => {
                fullRes += chunk;
                // 实时预览修改效果
                if (fullRes.length > 30) setDraftMarkdown(fullRes); 
            },
            () => {
                setMessages(prev => [...prev, { role: 'assistant', content: '已按照您的要求完成内容改写。' }]);
                setIsProcessing(false);
            },
            () => setIsProcessing(false),
            undefined,
            (tChunk) => setThoughtStream(prev => prev + tChunk)
        );
    };

    const steps = [
        { id: 1, label: '初始化', status: currentStep >= 1 ? 'done' : 'wait' },
        { id: 2, label: '资料注入', status: currentStep >= 2 ? 'done' : 'wait' },
        { id: 3, label: '深度撰写', status: currentStep >= 3 ? 'done' : 'wait' },
        { id: 4, label: '交互修订', status: currentStep >= 4 ? 'done' : 'wait' },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
            {/* 顶栏：进度指示 */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-black/20">
                <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Agent Pipeline</span>
                    <div className="flex items-center gap-4">
                        {steps.map(s => (
                            <div key={s.id} className={`flex items-center gap-2 transition-opacity ${currentStep === s.id ? 'opacity-100' : 'opacity-40'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${currentStep >= s.id ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-slate-700'}`}></div>
                                <span className="text-[10px] font-bold text-slate-300">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                        <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{isProcessing ? 'Agent Active' : 'Agent Ready'}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* 左：指令与思考终端 */}
                <div className="w-[450px] flex flex-col border-r border-white/5 bg-[#0f172a] shadow-2xl z-10">
                    {/* 思考终端 */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BrainIcon className="w-4 h-4 text-indigo-400" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Thought Stream Console</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed text-slate-400 custom-scrollbar-dark selection:bg-indigo-500/30">
                            <div className="whitespace-pre-wrap break-words">
                                {thoughtStream || "Initializing Agent sandbox..."}
                                {isProcessing && <span className="inline-block w-1.5 h-3 bg-indigo-500 ml-1 animate-pulse"></span>}
                            </div>
                            <div ref={thoughtEndRef} />
                        </div>
                    </div>

                    {/* 修订对话区 */}
                    <div className="h-[300px] border-t border-white/5 flex flex-col bg-black/20">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar-dark">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-white/5 bg-slate-900">
                            <div className="relative">
                                <textarea 
                                    value={userInput}
                                    onChange={e => setUserInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="输入修订指令..."
                                    className="w-full h-20 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all resize-none"
                                    disabled={isProcessing || currentStep < 4}
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={isProcessing || !userInput.trim() || currentStep < 4}
                                    className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 transition-all"
                                >
                                    <ArrowRightIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 右：白皮书草稿预览 (A4 风格) */}
                <div className="flex-1 flex flex-col bg-[#1e293b] p-8 overflow-hidden relative">
                    {/* 顶部操作 */}
                    <div className="absolute top-8 right-12 z-20">
                        <button 
                            onClick={() => onFinish(draftMarkdown)}
                            disabled={isProcessing || !draftMarkdown || currentStep < 4}
                            className="px-8 py-3 bg-white text-slate-900 font-black text-sm rounded-xl shadow-2xl hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2"
                        >
                            <CheckIcon className="w-5 h-5" />
                            确认终稿
                        </button>
                    </div>

                    {/* 纸张容器 */}
                    <div className="flex-1 w-full max-w-4xl mx-auto bg-white rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-1000">
                        <div className="h-1 bg-indigo-600 w-full"></div>
                        <div className="flex-1 overflow-y-auto p-12 md:p-20 custom-scrollbar">
                            {draftMarkdown ? (
                                <div className="prose prose-slate max-w-none prose-headings:font-black prose-h1:text-4xl prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h2:mt-12 prose-p:text-slate-600 prose-p:leading-relaxed">
                                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-8 flex justify-between">
                                        <span>Confidential Assessment</span>
                                        <span>AutoInsight Agent v3.1</span>
                                    </div>
                                    <div className="whitespace-pre-wrap">
                                        {draftMarkdown}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
                                    <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-400 text-lg uppercase tracking-widest">Agent Drafting...</p>
                                        <p className="text-xs text-slate-300 mt-2 font-mono">{subTaskLabel}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="h-12 bg-slate-50 border-t border-slate-100 flex items-center px-12 justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Draft Preview Only</span>
                            <span className="text-[10px] font-mono text-slate-400">Page 01 / 01</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </div>
    );
};
