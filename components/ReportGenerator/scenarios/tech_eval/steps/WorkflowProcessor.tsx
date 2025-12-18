
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { CheckIcon, SparklesIcon, ArrowRightIcon, BrainIcon, CloseIcon, DocumentTextIcon, MessageIcon } from '../../../../icons';

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
    const [sessionId, setSessionId] = useState(initialSessionId);
    
    // 报告分段状态：严格仅存储 Step 1-4 的内容
    const [parts, setParts] = useState<{ p1: string; p2: string; p3: string; refs: string }>({
        p1: '', p2: '', p3: '', refs: ''
    });
    
    const [isConsoleOpen, setIsConsoleOpen] = useState(true); // 初始打开，展示 AI 的回复
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const hasStarted = useRef(false);
    const thoughtEndRef = useRef<HTMLDivElement>(null);

    // 组合最终 Markdown：严格合稿逻辑，不包含用户输入
    const combinedMarkdown = useMemo(() => {
        let md = '';
        if (parts.p1) md += `## 第一部分：技术路线与当前所处阶段分析\n\n${parts.p1}\n\n`;
        if (parts.p2) md += `## 第二部分：当前技术潜在风险识别与分析\n\n${parts.p2}\n\n`;
        if (parts.p3) md += `## 第三部分：行业技术方案推荐\n\n${parts.p3}\n\n`;
        if (parts.refs) md += `### 引用资料来源\n\n${parts.refs}`;
        return md.trim();
    }, [parts]);

    useEffect(() => {
        if (isConsoleOpen) {
            thoughtEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [thoughtStream, isConsoleOpen]);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        runPipeline();
    }, []);

    const executeStep = async (promptName: string, vars: any, logLabel: string, onPartUpdate?: (content: string) => void): Promise<string> => {
        setSubTaskLabel(logLabel);
        setThoughtStream(prev => prev + `\n\n[SYSTEM] >>> 执行阶段: ${logLabel}\n-----------------------------------\n`);
        
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
                (chunk) => { 
                    fullRes += chunk; 
                    // 实时解析 JSON 中的 content 部分以便预览
                    const { jsonPart } = extractThoughtAndJson(fullRes);
                    if (jsonPart && onPartUpdate) {
                        const parsed = parseLlmJson<any>(jsonPart);
                        const content = parsed ? (Object.values(parsed)[0] as string) : '';
                        if (content) onPartUpdate(content);
                    }
                }, 
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
            // 展示 AI 的协议回复
            const roleRes = await executeStep('01_Role_ProtocolSetup', {}, '专家协议初始化');
            setMessages(prev => [...prev, { role: 'assistant', content: roleRes.replace(/```json[\s\S]*?```/g, '').trim() || '专家协议已激活。' }]);

            setCurrentStep(2);
            // 展示资料注入确认
            const ingestRes = await executeStep('02_DataIngestion', { reference_materials: materials }, '行业情报注入');
            setMessages(prev => [...prev, { role: 'assistant', content: ingestRes.replace(/```json[\s\S]*?```/g, '').trim() || '资料库已就绪，正在准备分析。' }]);

            // 当开始 Step 1 时，保持控制台开启供用户查看，但主界面开始显示合稿
            setCurrentStep(3);
            
            // 步骤 1: 技术路线
            await executeStep('03_TriggerGeneration_step1', { target_tech: targetTech }, '核心分析: 技术路线', 
                (c) => setParts(prev => ({ ...prev, p1: c })));
            
            // 步骤 2: 潜在风险
            await executeStep('03_TriggerGeneration_step2', {}, '核心分析: 风险识别',
                (c) => setParts(prev => ({ ...prev, p2: c })));

            // 步骤 3: 方案推荐
            await executeStep('03_TriggerGeneration_step3', {}, '核心分析: 专家建议',
                (c) => setParts(prev => ({ ...prev, p3: c })));

            // 步骤 4: 参考文献
            const res4 = await executeStep('03_TriggerGeneration_step4', {}, '提取参考文献');
            const { jsonPart: refsJsonRaw } = extractThoughtAndJson(res4);
            const refsJson = parseLlmJson<any>(refsJsonRaw);
            if (refsJson && typeof refsJson === 'object') {
                const refsMd = Object.entries(refsJson).map(([title, url]) => `- [${title}](${url})`).join('\n');
                setParts(prev => ({ ...prev, refs: refsMd }));
            }

            setCurrentStep(4);
            setMessages(prev => [...prev, { role: 'assistant', content: '评估报告草案已合成。您可以在主界面预览，或在此发送修订指令。' }]);
            
            // 自动关闭控制台，让用户看报告
            setTimeout(() => setIsConsoleOpen(false), 2000);

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
                // 修订逻辑：假设返回的是全量更新
                if (fullRes.length > 50) {
                    setParts({ p1: fullRes, p2: '', p3: '', refs: '' });
                }
            },
            () => {
                setMessages(prev => [...prev, { role: 'assistant', content: '内容已根据修订要求更新。' }]);
                setIsProcessing(false);
            },
            () => setIsProcessing(false),
            undefined,
            (tChunk) => setThoughtStream(prev => prev + tChunk)
        );
    };

    const steps = [
        { id: 1, label: '角色协议' },
        { id: 2, label: '情报注入' },
        { id: 3, label: '多维合稿' },
        { id: 4, label: '审阅定稿' },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f1f5f9] font-sans">
            {/* 顶栏 */}
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <SparklesIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-900 leading-none">新技术深度评估</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Strategic Intelligence Agent</p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-6">
                        {steps.map(s => (
                            <div key={s.id} className={`flex items-center gap-2 transition-all ${currentStep >= s.id ? 'opacity-100' : 'opacity-30'}`}>
                                <div className={`w-2 h-2 rounded-full ${currentStep === s.id ? 'bg-indigo-600 animate-pulse' : (currentStep > s.id ? 'bg-indigo-600' : 'bg-slate-300')}`}></div>
                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {isProcessing && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full animate-in fade-in">
                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></div>
                            <span className="text-[10px] font-black text-indigo-600 uppercase">{subTaskLabel}</span>
                        </div>
                    )}
                    <button 
                        onClick={() => onFinish(combinedMarkdown)}
                        disabled={isProcessing || !parts.p1}
                        className="px-6 py-2.5 bg-slate-900 text-white font-black text-sm rounded-xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2"
                    >
                        <CheckIcon className="w-4 h-4" />
                        <span>确认并生成报告</span>
                    </button>
                </div>
            </div>

            {/* 文档预览区 */}
            <div className="flex-1 overflow-y-auto py-12 px-4 custom-scrollbar">
                <div className="max-w-4xl mx-auto bg-white rounded-sm shadow-[0_0_60px_rgba(0,0,0,0.06)] border border-slate-200 overflow-hidden flex flex-col min-h-[1100px] animate-in fade-in zoom-in duration-1000">
                    <div className="h-1.5 bg-indigo-600 w-full shadow-sm"></div>
                    <div className="flex-1 p-12 md:p-24 relative">
                        {/* 背景水印装饰 */}
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                            <BrainIcon className="w-96 h-96 text-slate-900" />
                        </div>

                        {!parts.p1 && !isProcessing ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
                                <DocumentTextIcon className="w-20 h-20 opacity-10" />
                                <p className="font-black uppercase tracking-[0.3em] text-xs">Waiting for Pipeline Ignition...</p>
                            </div>
                        ) : (
                            <div className="prose prose-slate max-w-none prose-headings:font-black prose-h2:text-2xl prose-h2:border-b prose-h2:pb-3 prose-h2:mt-16 prose-p:text-slate-600 prose-p:leading-loose selection:bg-indigo-100 relative z-10">
                                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-16 flex justify-between border-b border-slate-100 pb-3">
                                    <span>CONFIDENTIAL ASSESSMENT DOSSIER</span>
                                    <span>AUTOINSIGHT AGENT v3.2</span>
                                </div>
                                
                                <div className="whitespace-pre-wrap font-sans text-slate-800">
                                    {combinedMarkdown}
                                    {isProcessing && <span className="inline-block w-2 h-5 bg-indigo-600 ml-1 animate-pulse align-middle"></span>}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="h-12 bg-slate-50 border-t border-slate-100 flex items-center px-12 justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Internal Strategic Intelligence Unit</span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">REF_ID: {taskId.slice(0,16)}</span>
                    </div>
                </div>
            </div>

            {/* 悬浮控制台入口 */}
            <button 
                onClick={() => setIsConsoleOpen(true)}
                className={`fixed bottom-10 right-10 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-600 hover:scale-110 transition-all z-40 group ${isConsoleOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
            >
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white animate-pulse"></div>
                <BrainIcon className="w-7 h-7" />
                <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest shadow-xl">Diagnostic Console</span>
            </button>

            {/* 控制台全屏模态框 */}
            {isConsoleOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0f172a] w-full max-w-6xl h-full max-h-[850px] rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95">
                        {/* 模态框头部 */}
                        <div className="px-10 py-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/20">
                                    <BrainIcon className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-xl tracking-tight uppercase">Agent Intelligence Interface</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Real-time reasoning stream & cognitive interaction</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsConsoleOpen(false)} 
                                className="p-3 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90"
                            >
                                <CloseIcon className="w-7 h-7" />
                            </button>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* 左：思维链诊断 */}
                            <div className="flex-1 flex flex-col border-r border-white/5 bg-slate-900/30">
                                <div className="px-8 py-4 border-b border-white/5 flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reasoning Engine Stream</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-8 font-mono text-[11px] leading-relaxed text-slate-400 custom-scrollbar-dark selection:bg-indigo-500/30">
                                    <div className="whitespace-pre-wrap break-words opacity-80">
                                        {thoughtStream || ">> WAITING FOR COGNITIVE INPUT..."}
                                        {isProcessing && <span className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-1 animate-pulse"></span>}
                                    </div>
                                    <div ref={thoughtEndRef} />
                                </div>
                            </div>

                            {/* 右：会话修订区 */}
                            <div className="w-[420px] flex flex-col bg-black/40">
                                <div className="px-8 py-4 border-b border-white/5 flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interaction Buffer</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar-dark">
                                    {messages.map((m, i) => (
                                        <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                                            <div className={`max-w-[95%] px-5 py-3.5 rounded-2xl text-xs leading-loose ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-900/20' : 'bg-slate-800/80 text-slate-300 border border-white/5'}`}>
                                                {m.content}
                                            </div>
                                        </div>
                                    ))}
                                    {messages.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                                            <MessageIcon className="w-16 h-16 text-slate-400 mb-4" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Active Transmission</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-8 border-t border-white/5 bg-[#0f172a]">
                                    <div className="relative">
                                        <textarea 
                                            value={userInput}
                                            onChange={e => setUserInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                            placeholder="SEND REVISION COMMAND..."
                                            className="w-full h-32 bg-black/50 border border-white/10 rounded-2xl p-5 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all resize-none placeholder:text-slate-800 font-mono"
                                            disabled={isProcessing || currentStep < 4}
                                        />
                                        <button 
                                            onClick={handleSendMessage}
                                            disabled={isProcessing || !userInput.trim() || currentStep < 4}
                                            className="absolute bottom-4 right-4 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-30 transition-all shadow-xl active:scale-95 flex items-center justify-center"
                                        >
                                            <ArrowRightIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-slate-600 mt-4 text-center font-bold tracking-widest uppercase">Press ENTER to commit command</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
