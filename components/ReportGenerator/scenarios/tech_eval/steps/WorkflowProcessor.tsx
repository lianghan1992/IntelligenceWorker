
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { CheckIcon, BrainIcon, RefreshIcon, ChevronRightIcon, ArrowRightIcon, DocumentTextIcon, PencilIcon } from '../../../../icons';

declare global {
  interface Window {
    marked?: { parse(md: string): string; };
  }
}

const TARGET_MODEL = "openrouter@mistralai/devstral-2512:free";

const extractPartialValue = (text: string): string => {
    const matches = Array.from(text.matchAll(/"(?:第一部分_技术路线与当前所处阶段分析|第二部分_当前技术潜在风险识别与分析|第三部分_行业技术方案推荐|第四部分_引用资料来源)"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/gs));
    if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        if (lastMatch.groups?.content) {
            return lastMatch.groups.content
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\t/g, '\t')
                .replace(/\\$/, ''); 
        }
    }
    return '';
};

export const WorkflowProcessor: React.FC<{
    taskId: string;
    scenario: string;
    initialSessionId: string;
    targetTech: string;
    materials: string;
    workflowState: string;
    setWorkflowState: (s: any) => void;
    markdownContent: string;
    setMarkdownContent: (md: string) => void;
    onConfirm: () => void;
}> = ({ taskId, scenario, initialSessionId, targetTech, materials, workflowState, setWorkflowState, markdownContent, setMarkdownContent, onConfirm }) => {
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [thoughtStream, setThoughtStream] = useState('');
    const [sessionId, setSessionId] = useState(initialSessionId);
    const [parts, setParts] = useState({ p1: '', p2: '', p3: '', p4: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [editBuffer, setEditBuffer] = useState('');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const docEndRef = useRef<HTMLDivElement>(null);
    const hasStarted = useRef(false);

    const combinedMarkdown = useMemo(() => {
        let md = '';
        if (parts.p1) md += `## 第一部分：技术路线分析\n\n${parts.p1}\n\n`;
        if (parts.p2) md += `## 第二部分：潜在风险识别\n\n${parts.p2}\n\n`;
        if (parts.p3) md += `## 第三部分：方案推荐建议\n\n${parts.p3}\n\n`;
        if (parts.p4) md += `## 引用资料来源\n\n${parts.p4}`;
        return md.trim();
    }, [parts]);

    useEffect(() => {
        if (workflowState !== 'review') setMarkdownContent(combinedMarkdown);
    }, [combinedMarkdown, workflowState, setMarkdownContent]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thoughtStream]);

    useEffect(() => {
        if (workflowState === 'composing') docEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [markdownContent, workflowState]);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        runPipeline();
    }, []);

    const executeStep = async (promptName: string, vars: any, logLabel: string, partKey?: keyof typeof parts): Promise<string> => {
        setThoughtStream(prev => prev + `\n\n[System] 执行步骤: ${logLabel}\n----------------------------\n`);
        return new Promise((resolve, reject) => {
            let accumulated = '';
            streamGenerate(
                { prompt_name: promptName, variables: vars, scenario, session_id: sessionId, model_override: TARGET_MODEL },
                (chunk) => {
                    accumulated += chunk;
                    if (partKey) {
                        const content = extractPartialValue(accumulated);
                        if (content) setParts(prev => ({ ...prev, [partKey]: content }));
                    } else {
                        setThoughtStream(prev => prev + chunk);
                    }
                },
                () => resolve(accumulated),
                reject,
                (sid) => { if (sid) setSessionId(sid); },
                (tChunk) => setThoughtStream(prev => prev + tChunk)
            );
        });
    };

    const runPipeline = async () => {
        try {
            setCurrentStep(1);
            await executeStep('01_Role_ProtocolSetup', {}, '初始化角色协议');
            setCurrentStep(2);
            await executeStep('02_DataIngestion', { reference_materials: materials }, '知识对齐中');
            
            // 切换到写作模式：中间栏高度分配
            setWorkflowState('composing');
            
            setCurrentStep(3);
            await executeStep('03_TriggerGeneration_step1', { target_tech: targetTech }, '正在产出第一章节', 'p1');
            await executeStep('03_TriggerGeneration_step2', {}, '正在产出第二章节', 'p2');
            await executeStep('03_TriggerGeneration_step3', {}, '正在产出第三章节', 'p3');
            
            const res4 = await executeStep('03_TriggerGeneration_step4', {}, '溯源资料整理');
            const parsedRefs = parseLlmJson<any>(res4);
            if (parsedRefs) {
                const refsMd = Object.entries(parsedRefs).map(([t, u]) => `- [${t}](${u})`).join('\n');
                setParts(prev => ({ ...prev, p4: refsMd }));
            }
            setCurrentStep(4);
            setWorkflowState('review');
        } catch (e) { console.error(e); }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative">
            {/* 紧凑步骤指示 */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur z-20">
                <div className="flex items-center gap-5">
                    {[
                        { id: 1, label: '协议' },
                        { id: 2, label: '对齐' },
                        { id: 3, label: '生成' },
                        { id: 4, label: '复核' }
                    ].map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${currentStep === s.id ? 'bg-indigo-600 ring-4 ring-indigo-50' : (currentStep > s.id ? 'bg-emerald-500' : 'bg-slate-200')}`}></div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep === s.id ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                            {i < 3 && <ChevronRightIcon className="w-3 h-3 text-slate-100" />}
                        </div>
                    ))}
                </div>
                {workflowState === 'review' && (
                    <button 
                        onClick={onConfirm}
                        className="px-6 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-full hover:bg-indigo-600 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                    >
                        <CheckIcon className="w-3 h-3" /> 确认排版
                    </button>
                )}
            </div>

            {/* 动态工作区 */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* 顶部：文稿画布 (高雅亮白) */}
                <div className={`transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] bg-[#fafafa] overflow-hidden flex flex-col ${workflowState === 'analyzing' ? 'h-0' : 'flex-1'}`}>
                    <div className="flex-1 overflow-y-auto p-12 md:p-20 custom-scrollbar relative">
                        <div className="max-w-3xl mx-auto bg-white p-12 md:p-16 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] border border-slate-100 rounded-sm min-h-full">
                            <div className="flex justify-between items-center mb-16 border-b border-slate-100 pb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <DocumentTextIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Technical Intelligence Dossier</span>
                                </div>
                                {workflowState === 'review' && !isEditing && (
                                    <button onClick={() => { setEditBuffer(markdownContent); setIsEditing(true); }} className="text-[10px] font-black text-indigo-600 border border-indigo-100 px-3 py-1 rounded-full hover:bg-indigo-50 transition-all flex items-center gap-1.5">
                                        <PencilIcon className="w-3 h-3" /> 点击编辑
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <textarea 
                                    value={editBuffer}
                                    onChange={e => setEditBuffer(e.target.value)}
                                    onBlur={() => { setMarkdownContent(editBuffer); setIsEditing(false); }}
                                    autoFocus
                                    className="w-full h-[600px] p-0 text-slate-800 font-sans leading-relaxed focus:ring-0 outline-none resize-none border-none text-lg"
                                />
                            ) : (
                                <article 
                                    className="prose prose-slate max-w-none 
                                    prose-headings:text-slate-900 prose-headings:font-black
                                    prose-h2:text-2xl prose-h2:border-b-2 prose-h2:border-slate-900 prose-h2:pb-4 prose-h2:mb-8 prose-h2:mt-12
                                    prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-lg prose-p:mb-6
                                    prose-strong:text-indigo-600 prose-strong:font-black
                                    animate-in fade-in duration-1000"
                                    dangerouslySetInnerHTML={{ __html: window.marked?.parse(markdownContent) || '' }}
                                />
                            )}
                            <div ref={docEndRef} className="h-32" />
                        </div>
                    </div>
                </div>

                {/* 底部：Agent 思维流 (浅灰终端感) */}
                <div className={`transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] border-t border-slate-100 flex flex-col bg-slate-50 ${workflowState === 'analyzing' ? 'h-full' : 'h-[280px]'}`}>
                    <div className="bg-slate-100/50 px-8 py-3 border-b border-slate-200/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                             <BrainIcon className="w-4 h-4 text-indigo-500" />
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Agent Logic Terminal</span>
                        </div>
                        <div className="flex gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 font-mono text-[12px] text-slate-500 leading-relaxed custom-scrollbar selection:bg-indigo-100">
                        <div className="whitespace-pre-wrap break-all">
                            {thoughtStream || '>> System: Establishing neural connection...'}
                            <span className="inline-block w-1.5 h-3 bg-indigo-500 animate-pulse ml-1 align-middle"></span>
                        </div>
                        <div ref={chatEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};
