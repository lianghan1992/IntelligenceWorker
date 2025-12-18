import React, { useState, useEffect, useRef, useMemo } from 'react';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { CheckIcon, SparklesIcon, ArrowRightIcon, BrainIcon, CloseIcon, DocumentTextIcon, RefreshIcon, ChevronRightIcon } from '../../../../icons';

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
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [subTaskLabel, setSubTaskLabel] = useState('');
    const [thoughtStream, setThoughtStream] = useState('');
    const [sessionId, setSessionId] = useState(initialSessionId);
    
    // 报告内容分段存储
    const [parts, setParts] = useState<{ p1: string; p2: string; p3: string; refs: string }>({
        p1: '', p2: '', p3: '', refs: ''
    });
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [userInput, setUserInput] = useState('');

    const hasStarted = useRef(false);
    const thoughtEndRef = useRef<HTMLDivElement>(null);
    const docEndRef = useRef<HTMLDivElement>(null);

    // 组合最终 Markdown
    const combinedMarkdown = useMemo(() => {
        let md = '';
        if (parts.p1) md += `## 第一部分：技术路线与当前所处阶段分析\n\n${parts.p1}\n\n`;
        if (parts.p2) md += `## 第二部分：当前技术潜在风险识别与分析\n\n${parts.p2}\n\n`;
        if (parts.p3) md += `## 第三部分：行业技术方案推荐\n\n${parts.p3}\n\n`;
        if (parts.refs) md += `### 引用资料来源\n\n${parts.refs}`;
        return md.trim();
    }, [parts]);

    // 实时渲染 Markdown 预览
    const renderedHtml = useMemo(() => {
        if (!combinedMarkdown) return '';
        if (window.marked && typeof window.marked.parse === 'function') {
            return window.marked.parse(combinedMarkdown);
        }
        return combinedMarkdown;
    }, [combinedMarkdown]);

    useEffect(() => {
        thoughtEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thoughtStream]);

    useEffect(() => {
        docEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [combinedMarkdown]);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        runPipeline();
    }, []);

    // 修复：添加处理用户消息的 handleSendMessage 函数，用于处理修订指令
    const handleSendMessage = async () => {
        if (!userInput.trim() || isProcessing) return;
        
        const message = userInput.trim();
        setUserInput('');
        setIsProcessing(true);
        setSubTaskLabel('正在处理修订指令...');
        setThoughtStream('');

        try {
            let fullRes = '';
            await streamGenerate(
                { 
                    prompt_name: '04_Revise_Combined_Content', 
                    variables: { 
                        revision_request: message,
                        current_content: combinedMarkdown 
                    }, 
                    scenario, 
                    session_id: sessionId,
                    model_override: TARGET_MODEL 
                },
                (chunk) => { 
                    fullRes += chunk; 
                    const { jsonPart } = extractThoughtAndJson(fullRes);
                    if (jsonPart) {
                        const parsed = parseLlmJson<any>(jsonPart);
                        if (parsed) {
                            if (parsed.p1) setParts(prev => ({ ...prev, p1: parsed.p1 }));
                            if (parsed.p2) setParts(prev => ({ ...prev, p2: parsed.p2 }));
                            if (parsed.p3) setParts(prev => ({ ...prev, p3: parsed.p3 }));
                            if (parsed.refs) setParts(prev => ({ ...prev, refs: parsed.refs }));
                        }
                    }
                }, 
                () => setIsProcessing(false),
                (err) => {
                    console.error(err);
                    setIsProcessing(false);
                },
                (sid) => { if (sid) { setSessionId(sid); onUpdateSession(sid); } },
                (tChunk) => setThoughtStream(prev => prev + tChunk)
            );
        } catch (e) {
            console.error(e);
            setIsProcessing(false);
        }
    };

    const executeStep = async (promptName: string, vars: any, logLabel: string, onPartUpdate?: (content: string) => void): Promise<string> => {
        setSubTaskLabel(logLabel);
        setThoughtStream(''); // 每个大步骤清空一次思考流，或追加
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
            await executeStep('01_Role_ProtocolSetup', {}, '专家协议初始化');
            
            setCurrentStep(2);
            await executeStep('02_DataIngestion', { reference_materials: materials }, '情报知识库对齐');

            setCurrentStep(3);
            await executeStep('03_TriggerGeneration_step1', { target_tech: targetTech }, '分析代际演进', 
                (c) => setParts(prev => ({ ...prev, p1: c })));
            
            await executeStep('03_TriggerGeneration_step2', {}, '失效模式识别',
                (c) => setParts(prev => ({ ...prev, p2: c })));

            await executeStep('03_TriggerGeneration_step3', {}, '制定推荐方案',
                (c) => setParts(prev => ({ ...prev, p3: c })));

            const res4 = await executeStep('03_TriggerGeneration_step4', {}, '溯源文献整理');
            const { jsonPart: refsJsonRaw } = extractThoughtAndJson(res4);
            const refsJson = parseLlmJson<any>(refsJsonRaw);
            if (refsJson && typeof refsJson === 'object') {
                const refsMd = Object.entries(refsJson).map(([title, url]) => `- [${title}](${url})`).join('\n');
                setParts(prev => ({ ...prev, refs: refsMd }));
            }

            setCurrentStep(4);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f1f3f6]">
            {/* 顶栏：极简状态 */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-30 shadow-sm">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <BrainIcon className="w-5 h-5" />
                        </div>
                        <span className="font-black text-slate-900 tracking-tight">AI ANALYZER ENGINE</span>
                    </div>
                    
                    {/* 进度步进器 */}
                    <div className="hidden md:flex items-center gap-6">
                        {[
                            { id: 1, label: '角色协议' },
                            { id: 2, label: '知识对齐' },
                            { id: 3, label: '核心评估' },
                            { id: 4, label: '审核校对' }
                        ].map((s, i) => (
                            <div key={s.id} className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${currentStep === s.id ? 'bg-indigo-600 animate-pulse ring-4 ring-indigo-100' : (currentStep > s.id ? 'bg-green-50' : 'bg-slate-300')}`}></div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep === s.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {s.label}
                                </span>
                                {i < 3 && <ChevronRightIcon className="w-3 h-3 text-slate-200" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isProcessing && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-tighter animate-pulse border border-indigo-100">
                            <RefreshIcon className="w-3 h-3 animate-spin" />
                            Status: {subTaskLabel}
                        </div>
                    )}
                    <button 
                        onClick={() => onFinish(combinedMarkdown)}
                        disabled={isProcessing || !parts.p1}
                        className="px-8 py-2.5 bg-slate-900 text-white font-black text-xs rounded-xl shadow-xl hover:bg-indigo-600 transition-all disabled:opacity-20 active:scale-95 flex items-center gap-2"
                    >
                        <CheckIcon className="w-4 h-4" /> 完成并导出
                    </button>
                </div>
            </div>

            {/* 主体工作台：分屏布局 */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* 左侧：Agent 思维控制台 (Dark) */}
                <div className="w-full md:w-[400px] lg:w-[450px] bg-[#0f172a] border-r border-slate-800 flex flex-col shadow-2xl relative z-10">
                    <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Agent Thought Stream</span>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
                            <div className="w-2 h-2 rounded-full bg-amber-500/20"></div>
                            <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 font-mono text-[13px] leading-relaxed text-slate-300 custom-scrollbar-dark">
                        <div className="space-y-6">
                            {/* 此处可以渲染之前的 Message 历史，这里简化为展示当前 Thought */}
                            <div className="opacity-40 italic text-slate-500 mb-8 border-b border-slate-800 pb-4">
                                >> System: Neural network initialized.<br/>
                                >> Protocol: Engineering Intelligence v3.2<br/>
                                >> Source: Intelligence Database (RAG Mode)
                            </div>
                            
                            {thoughtStream ? (
                                <div className="animate-in fade-in duration-300">
                                    <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
                                        <SparklesIcon className="w-4 h-4" /> 正在分析...
                                    </div>
                                    <div className="whitespace-pre-wrap text-slate-400">{thoughtStream}</div>
                                    <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1 align-middle"></span>
                                </div>
                            ) : (
                                <div className="py-20 text-center text-slate-600">
                                    <div className="w-12 h-12 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-[10px] uppercase tracking-widest font-black">Executing Pipeline...</p>
                                </div>
                            )}
                            <div ref={thoughtEndRef} />
                        </div>
                    </div>

                    {/* 修订指令框 */}
                    <div className="p-5 bg-slate-900/50 border-t border-slate-800">
                        <div className="relative group">
                            <textarea 
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !isProcessing && handleSendMessage()}
                                placeholder="输入修订指令 (例如: '加强对比部分的数据密度')"
                                className="w-full h-24 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-slate-600 group-hover:border-slate-600"
                                disabled={isProcessing}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={isProcessing || !userInput.trim()}
                                className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-lg active:scale-95 disabled:opacity-20"
                            >
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 右侧：文档预览 (Light/Paper) */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-12 lg:p-20 custom-scrollbar relative">
                    {/* 纸张质感容器 */}
                    <div className="max-w-4xl mx-auto bg-white min-h-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200 rounded-[2px] relative overflow-hidden transition-all duration-700">
                        
                        {/* 文档装饰：页眉 */}
                        <div className="absolute top-0 left-0 right-0 h-16 border-b border-slate-50 flex items-center justify-between px-12 opacity-30 select-none">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em]">CONFIDENTIAL TECH REPORT</span>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em]">{new Date().toISOString().split('T')[0]}</span>
                        </div>

                        <div className="p-16 md:p-24 pt-28">
                            {!combinedMarkdown ? (
                                <div className="flex flex-col items-center justify-center py-40 text-slate-200">
                                    <DocumentTextIcon className="w-24 h-24 opacity-10 mb-6" />
                                    <div className="space-y-2 text-center">
                                        <div className="h-4 w-64 bg-slate-100 rounded-full animate-pulse"></div>
                                        <div className="h-4 w-48 bg-slate-100 rounded-full animate-pulse mx-auto"></div>
                                        <div className="h-4 w-56 bg-slate-100 rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                            ) : (
                                <article 
                                    className="prose prose-slate max-w-none 
                                    prose-headings:text-slate-900 prose-headings:font-black
                                    prose-h2:text-3xl prose-h2:mb-8 prose-h2:mt-16 prose-h2:border-b-2 prose-h2:border-slate-900 prose-h2:pb-4
                                    prose-p:text-slate-600 prose-p:leading-loose prose-p:text-lg prose-p:text-justify
                                    prose-strong:text-indigo-600 prose-strong:font-black
                                    prose-ul:my-8 prose-li:my-2
                                    animate-in fade-in duration-1000"
                                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                                />
                            )}
                            <div ref={docEndRef} className="h-32" />
                        </div>
                        
                        {/* 页脚装饰 */}
                        <div className="h-16 border-t border-slate-50 flex items-center justify-center opacity-20 select-none">
                            <div className="flex items-center gap-2">
                                <SparklesIcon className="w-3 h-3" />
                                <span className="text-[8px] font-black tracking-widest uppercase">AutoInsight Intelligence Core v3.2</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                
                @keyframes scan {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(100%); }
                }
                .scanline {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.05), transparent);
                    animation: scan 3s linear infinite;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
};
