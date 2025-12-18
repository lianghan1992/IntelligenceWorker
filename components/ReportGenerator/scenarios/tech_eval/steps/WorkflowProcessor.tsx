
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { CheckIcon, SparklesIcon, ArrowRightIcon, BrainIcon, CloseIcon, DocumentTextIcon, MessageIcon } from '../../../../icons';

// 为从CDN加载的 `marked` 库提供类型声明
declare global {
  interface Window {
    marked?: {
      parse(markdownString: string): string;
    };
  }
}

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
    
    // 报告分段状态：严格仅存储 Step 1-4 的 JSON 产出
    const [parts, setParts] = useState<{ p1: string; p2: string; p3: string; refs: string }>({
        p1: '', p2: '', p3: '', refs: ''
    });
    
    const [isConsoleOpen, setIsConsoleOpen] = useState(true); 
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const hasStarted = useRef(false);
    const thoughtEndRef = useRef<HTMLDivElement>(null);
    const docEndRef = useRef<HTMLDivElement>(null);

    // 组合最终 Markdown：严格合稿逻辑
    const combinedMarkdown = useMemo(() => {
        let md = '';
        if (parts.p1) md += `## 第一部分：技术路线与当前所处阶段分析\n\n${parts.p1}\n\n`;
        if (parts.p2) md += `## 第二部分：当前技术潜在风险识别与分析\n\n${parts.p2}\n\n`;
        if (parts.p3) md += `## 第三部分：行业技术方案推荐\n\n${parts.p3}\n\n`;
        if (parts.refs) md += `### 引用资料来源\n\n${parts.refs}`;
        return md.trim();
    }, [parts]);

    // 实时渲染 Markdown
    const renderedHtml = useMemo(() => {
        if (!combinedMarkdown) return '';
        if (window.marked && typeof window.marked.parse === 'function') {
            return window.marked.parse(combinedMarkdown);
        }
        return combinedMarkdown;
    }, [combinedMarkdown]);

    useEffect(() => {
        if (isConsoleOpen) thoughtEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thoughtStream, isConsoleOpen, messages]);

    useEffect(() => {
        docEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [combinedMarkdown]);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        runPipeline();
    }, []);

    const executeStep = async (promptName: string, vars: any, logLabel: string, onPartUpdate?: (content: string) => void): Promise<string> => {
        setSubTaskLabel(logLabel);
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
            const roleRes = await executeStep('01_Role_ProtocolSetup', {}, '初始化专家协议');
            setMessages(prev => [...prev, { role: 'assistant', content: roleRes.replace(/```json[\s\S]*?```/g, '').trim() || '技术专家角色已激活。' }]);

            setCurrentStep(2);
            const ingestRes = await executeStep('02_DataIngestion', { reference_materials: materials }, '情报注入分析');
            setMessages(prev => [...prev, { role: 'assistant', content: ingestRes.replace(/```json[\s\S]*?```/g, '').trim() || '资料库已就绪，开始深度评估。' }]);

            // 开始核心输出阶段，关闭对话框
            setCurrentStep(3);
            setIsConsoleOpen(false); 
            
            await executeStep('03_TriggerGeneration_step1', { target_tech: targetTech }, '分析技术路线', 
                (c) => setParts(prev => ({ ...prev, p1: c })));
            
            await executeStep('03_TriggerGeneration_step2', {}, '识别潜在风险',
                (c) => setParts(prev => ({ ...prev, p2: c })));

            await executeStep('03_TriggerGeneration_step3', {}, '生成专家建议',
                (c) => setParts(prev => ({ ...prev, p3: c })));

            const res4 = await executeStep('03_TriggerGeneration_step4', {}, '整合文献来源');
            const { jsonPart: refsJsonRaw } = extractThoughtAndJson(res4);
            const refsJson = parseLlmJson<any>(refsJsonRaw);
            if (refsJson && typeof refsJson === 'object') {
                const refsMd = Object.entries(refsJson).map(([title, url]) => `- [${title}](${url})`).join('\n');
                setParts(prev => ({ ...prev, refs: refsMd }));
            }

            setCurrentStep(4);
            setMessages(prev => [...prev, { role: 'assistant', content: '评估报告已合成，请审阅。如有修订需求可在此反馈。' }]);
        } catch (e) {
            console.error(e);
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
                if (fullRes.length > 50) setParts({ p1: fullRes, p2: '', p3: '', refs: '' });
            },
            () => {
                setMessages(prev => [...prev, { role: 'assistant', content: '修订完成。' }]);
                setIsProcessing(false);
            },
            () => setIsProcessing(false),
            undefined,
            (tChunk) => setThoughtStream(prev => prev + tChunk)
        );
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100 font-sans relative">
            {/* 顶部极简状态栏 */}
            <div className="h-14 border-b border-slate-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-30">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2.5">
                        <SparklesIcon className="w-5 h-5 text-indigo-600" />
                        <span className="font-black text-slate-800 text-sm tracking-tight">TECH_EVAL_AGENT v3.2</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-4">
                        {['协议', '注入', '生成', '定稿'].map((l, i) => (
                            <div key={l} className={`flex items-center gap-2 ${currentStep > i + 1 ? 'text-green-600' : (currentStep === i + 1 ? 'text-indigo-600' : 'text-slate-300')}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${currentStep === i + 1 ? 'bg-indigo-600 animate-pulse' : (currentStep > i + 1 ? 'bg-green-600' : 'bg-slate-300')}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{l}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {isProcessing && (
                        <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter animate-pulse">
                            Agent: {subTaskLabel}
                        </div>
                    )}
                    <button 
                        onClick={() => onFinish(combinedMarkdown)}
                        disabled={isProcessing || !parts.p1}
                        className="px-6 py-2 bg-slate-900 text-white font-black text-xs rounded-xl shadow-lg hover:bg-indigo-600 transition-all disabled:opacity-30 flex items-center gap-2"
                    >
                        <CheckIcon className="w-4 h-4" />
                        确认定稿
                    </button>
                </div>
            </div>

            {/* 文档区 */}
            <div className="flex-1 overflow-y-auto py-12 px-4 custom-scrollbar bg-slate-200/50">
                <div className="max-w-4xl mx-auto bg-white min-h-[1200px] shadow-2xl border border-slate-300 relative animate-in fade-in zoom-in duration-1000">
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none rotate-12">
                        <h2 className="text-[120px] font-black text-slate-900 whitespace-nowrap uppercase">AutoInsight Confidential</h2>
                    </div>

                    <div className="p-12 md:p-24 relative z-10">
                        {!parts.p1 && !isProcessing ? (
                            <div className="h-96 flex flex-col items-center justify-center text-slate-300">
                                <DocumentTextIcon className="w-20 h-20 opacity-10 mb-4" />
                                <p className="font-black text-xs uppercase tracking-[0.4em]">Standby for ignition...</p>
                            </div>
                        ) : (
                            <article 
                                className="prose prose-slate max-w-none prose-headings:font-black prose-h2:text-3xl prose-h2:border-b prose-h2:pb-4 prose-h2:mt-16 prose-p:text-slate-700 prose-p:leading-loose prose-p:text-lg selection:bg-indigo-100"
                                dangerouslySetInnerHTML={{ __html: renderedHtml }}
                            />
                        )}
                        {isProcessing && currentStep === 3 && (
                            <div className="mt-8 flex items-center gap-3 text-indigo-600 animate-pulse">
                                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                <span className="text-sm font-bold uppercase tracking-widest">AI 正在追加情报内容...</span>
                            </div>
                        )}
                        <div ref={docEndRef} className="h-20" />
                    </div>
                </div>
            </div>

            {/* 悬浮控制台入口 */}
            <button 
                onClick={() => setIsConsoleOpen(true)}
                className={`fixed bottom-8 right-8 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-600 transition-all z-40 ${isConsoleOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
            >
                <BrainIcon className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white animate-pulse"></div>
            </button>

            {/* 沉浸式对话模态框 */}
            {isConsoleOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-950 w-full max-w-4xl h-[70vh] rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-4">
                                <BrainIcon className="w-6 h-6 text-indigo-400" />
                                <h3 className="font-black text-white text-lg tracking-widest uppercase">Intelligence Interface</h3>
                            </div>
                            <button onClick={() => setIsConsoleOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar-dark space-y-8">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] text-2xl md:text-3xl font-medium leading-relaxed ${m.role === 'user' ? 'text-indigo-400 text-right' : 'text-white'}`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {isProcessing && thoughtStream && (
                                <div className="text-slate-500 font-mono text-sm leading-relaxed border-t border-white/5 pt-6 opacity-60">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
                                        <span className="uppercase tracking-[0.2em] font-black text-[10px]">Processing Thoughts</span>
                                    </div>
                                    <div className="whitespace-pre-wrap">{thoughtStream}</div>
                                </div>
                            )}
                            <div ref={thoughtEndRef} />
                        </div>

                        <div className="p-8 bg-white/5 border-t border-white/10">
                            <div className="relative">
                                <textarea 
                                    value={userInput}
                                    onChange={e => setUserInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="输入您的指令或见解..."
                                    className="w-full h-24 bg-transparent text-white text-2xl font-bold outline-none resize-none placeholder:text-slate-800"
                                    disabled={isProcessing}
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={isProcessing || !userInput.trim()}
                                    className="absolute bottom-0 right-0 p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 shadow-xl transition-all active:scale-95 disabled:opacity-20"
                                >
                                    <ArrowRightIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
