
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { CheckIcon, SparklesIcon, ArrowRightIcon, CodeIcon, ChevronRightIcon, BrainIcon, CloseIcon, ClockIcon } from '../../../../icons';

// 场景指定使用的模型引擎
const TARGET_MODEL = "openrouter@tngtech/deepseek-r1t2-chimera:free";

export const WorkflowProcessor: React.FC<{
    taskId: string;
    scenario: string;
    initialSessionId: string;
    targetTech: string;
    materials: string;
    onFinish: (markdown: string) => void;
    onUpdateSession: (sid: string) => void;
}> = ({ taskId, scenario, initialSessionId, targetTech, materials, onFinish, onUpdateSession }) => {
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
    const [subTaskLabel, setSubTaskLabel] = useState('');
    const [thoughtStream, setThoughtStream] = useState('');
    const [draftMarkdown, setDraftMarkdown] = useState('');
    const [sessionId, setSessionId] = useState(initialSessionId);
    
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const hasStarted = useRef(false);
    const thoughtEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        thoughtEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thoughtStream]);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        runPipeline();
    }, []);

    // 辅助函数：执行单个步骤并打印诊断信息
    const executeStep = async (promptName: string, vars: any, logLabel: string): Promise<string> => {
        setSubTaskLabel(logLabel);
        
        // 关键诊断：在思维链控制台打印变量注入情况
        const varDiagnostic = Object.entries(vars)
            .map(([k, v]) => `[CONTEXT INJECT] ${k} (Len: ${String(v).length})`)
            .join('\n');
            
        setThoughtStream(prev => prev + `\n\n>>> 正在调用: ${promptName}\n${varDiagnostic}\n-----------------------------------\n`);
        
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
            setCurrentStep(1);
            await executeStep('01_Role_ProtocolSetup', {}, '初始化专家协议');

            setCurrentStep(2);
            // 对齐后端变量名: reference_materials
            await executeStep('02_DataIngestion', { reference_materials: materials }, '注入行业资料库');

            setCurrentStep(3);
            // 对齐后端变量名: target_tech
            const res1 = await executeStep('03_TriggerGeneration_step1', { target_tech: targetTech }, '分析技术路线');
            const part1 = parseLlmJson<any>(extractThoughtAndJson(res1).jsonPart)?.第一部分_技术路线与当前所处阶段分析 || '';

            const res2 = await executeStep('03_TriggerGeneration_step2', {}, '评估潜在风险');
            const part2 = parseLlmJson<any>(extractThoughtAndJson(res2).jsonPart)?.第二部分_当前技术潜在风险识别与分析 || '';

            const res3 = await executeStep('03_TriggerGeneration_step3', {}, '生成推荐方案');
            const part3 = parseLlmJson<any>(extractThoughtAndJson(res3).jsonPart)?.第三部分_行业技术方案推荐 || '';

            const res4 = await executeStep('03_TriggerGeneration_step4', {}, '提取参考文献');
            const refsJson = parseLlmJson<any>(extractThoughtAndJson(res4).jsonPart);
            let refsMd = '';
            if (refsJson && typeof refsJson === 'object' && Object.keys(refsJson).length > 0) {
                refsMd = "\n\n### 引用资料来源\n\n" + Object.entries(refsJson).map(([title, url]) => `- [${title}](${url})`).join('\n');
            }

            const finalDraft = `# 技术评估报告: ${targetTech}\n\n## 第一部分：技术路线与当前所处阶段分析\n\n${part1}\n\n## 第二部分：当前技术潜在风险识别与分析\n\n${part2}\n\n## 第三部分：行业技术方案推荐\n\n${part3}${refsMd}`;
            
            setDraftMarkdown(finalDraft);
            setCurrentStep(4);
            setMessages([{ role: 'assistant', content: '技术评估初稿已生成。您可以查看右侧预览，或在此提出修改建议。' }]);
        } catch (e) {
            setThoughtStream(prev => prev + `\n\n[SYSTEM ERROR]: ${String(e)}\n`);
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
        setThoughtStream(prev => prev + `\n\n>>> 用户指令修订中...\n[INPUT]: ${userMsg}\n-----------------------------------\n`);

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
                if (fullRes.length > 20) setDraftMarkdown(fullRes); 
            },
            () => {
                setMessages(prev => [...prev, { role: 'assistant', content: '报告已按要求更新。' }]);
                setIsProcessing(false);
            },
            () => setIsProcessing(false),
            undefined,
            (tChunk) => setThoughtStream(prev => prev + tChunk)
        );
    };

    const steps = [
        { id: 1, label: '专家协议' },
        { id: 2, label: '资料注入' },
        { id: 3, label: '多维评估' },
        { id: 4, label: '交互修订' },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 font-sans">
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-black/20">
                <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Tech Eval Pipeline</span>
                    <div className="flex items-center gap-4">
                        {steps.map(s => (
                            <div key={s.id} className={`flex items-center gap-2 ${currentStep === s.id ? 'opacity-100' : 'opacity-40'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${currentStep >= s.id ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-slate-700'}`}></div>
                                <span className="text-[10px] font-bold text-slate-300 uppercase">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">{isProcessing ? 'Agent Working' : 'System Idle'}</span>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-[480px] flex flex-col border-r border-white/5 bg-[#0f172a] shadow-2xl z-10">
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-white/5 flex items-center gap-2">
                            <BrainIcon className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Diagnostic Thought Console</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed text-slate-400 custom-scrollbar-dark selection:bg-indigo-500/30">
                            <div className="whitespace-pre-wrap break-words">
                                {thoughtStream || "Waking up AutoInsight Engineering Agent..."}
                                {isProcessing && <span className="inline-block w-1.5 h-3 bg-indigo-500 ml-1 animate-pulse"></span>}
                            </div>
                            <div ref={thoughtEndRef} />
                        </div>
                    </div>

                    <div className="h-[280px] border-t border-white/5 flex flex-col bg-black/20">
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
                                    placeholder="输入修订指令或专家见解..."
                                    className="w-full h-20 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all resize-none placeholder:text-slate-600"
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

                <div className="flex-1 flex flex-col bg-[#1e293b] p-8 overflow-hidden relative">
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

                    <div className="flex-1 w-full max-w-4xl mx-auto bg-white rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-700">
                        <div className="h-1.5 bg-indigo-600 w-full"></div>
                        <div className="flex-1 overflow-y-auto p-12 md:p-20 custom-scrollbar">
                            {draftMarkdown ? (
                                <div className="prose prose-slate max-w-none prose-headings:font-black prose-h1:text-4xl prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h2:mt-12 prose-p:text-slate-600 prose-p:leading-relaxed">
                                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-12 flex justify-between border-b border-slate-100 pb-2">
                                        <span>Confidential Assessment Dossier</span>
                                        <span>Agent AutoInsight v3.1</span>
                                    </div>
                                    <div className="whitespace-pre-wrap font-sans text-slate-700">
                                        {draftMarkdown}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
                                    <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <div className="text-center">
                                        <p className="font-black text-slate-400 text-lg uppercase tracking-widest">Agent Drafting Dossier...</p>
                                        <p className="text-[10px] text-slate-300 mt-2 font-mono uppercase tracking-tighter">{subTaskLabel}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="h-10 bg-slate-50 border-t border-slate-100 flex items-center px-12 justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Use Only</span>
                            <span className="text-[10px] font-mono text-slate-400">REPORT_ID: {taskId.slice(0,8)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
