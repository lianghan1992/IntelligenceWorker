
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

/**
 * 局部 JSON 值提取，专为流式场景优化
 */
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

    // 组装最终 Markdown
    const combinedMarkdown = useMemo(() => {
        let md = '';
        if (parts.p1) md += `## 第一部分：技术路线分析\n\n${parts.p1}\n\n`;
        if (parts.p2) md += `## 第二部分：潜在风险识别\n\n${parts.p2}\n\n`;
        if (parts.p3) md += `## 第三部分：方案推荐建议\n\n${parts.p3}\n\n`;
        if (parts.p4) md += `## 引用资料来源\n\n${parts.p4}`;
        return md.trim();
    }, [parts]);

    // 同步给父组件
    useEffect(() => {
        if (workflowState !== 'review') {
            setMarkdownContent(combinedMarkdown);
        }
    }, [combinedMarkdown, workflowState, setMarkdownContent]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thoughtStream]);

    useEffect(() => {
        if (workflowState === 'composing') {
            docEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [markdownContent, workflowState]);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        runPipeline();
    }, []);

    const executeStep = async (promptName: string, vars: any, logLabel: string, partKey?: keyof typeof parts): Promise<string> => {
        setThoughtStream(prev => prev + `\n\n>> [Pipeline] 执行: ${logLabel}\n----------------------------\n`);
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
            setCurrentStep(1); // 01_Role
            await executeStep('01_Role_ProtocolSetup', {}, '初始化专家协议');
            
            setCurrentStep(2); // 02_Data
            await executeStep('02_DataIngestion', { reference_materials: materials }, '情报知识库对齐');

            // 转向内容生成模式
            setWorkflowState('composing');
            
            setCurrentStep(3); // 03_Step1
            await executeStep('03_TriggerGeneration_step1', { target_tech: targetTech }, '分析代际演进', 'p1');
            
            await executeStep('03_TriggerGeneration_step2', {}, '识别失效模式', 'p2');
            
            await executeStep('03_TriggerGeneration_step3', {}, '制定推荐方案', 'p3');
            
            const res4 = await executeStep('03_TriggerGeneration_step4', {}, '文献溯源整理');
            const parsedRefs = parseLlmJson<any>(res4);
            if (parsedRefs) {
                const refsMd = Object.entries(parsedRefs).map(([t, u]) => `- [${t}](${u})`).join('\n');
                setParts(prev => ({ ...prev, p4: refsMd }));
            }

            setCurrentStep(4);
            setWorkflowState('review');
        } catch (e) {
            console.error(e);
        }
    };

    const handleStartEdit = () => {
        setEditBuffer(markdownContent);
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        setMarkdownContent(editBuffer);
        setIsEditing(false);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0f172a] relative overflow-hidden">
            {/* 步骤条 */}
            <div className="px-6 py-3 bg-slate-900/80 border-b border-white/5 flex items-center justify-between z-30">
                <div className="flex items-center gap-6">
                    {[
                        { id: 1, label: '专家协议' },
                        { id: 2, label: '对齐' },
                        { id: 3, label: '深度评估' },
                        { id: 4, label: '复核' }
                    ].map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${currentStep === s.id ? 'bg-indigo-400 ring-4 ring-indigo-400/20' : (currentStep > s.id ? 'bg-emerald-500' : 'bg-slate-700')}`}></div>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${currentStep === s.id ? 'text-indigo-300' : 'text-slate-500'}`}>{s.label}</span>
                            {i < 3 && <ChevronRightIcon className="w-3 h-3 text-slate-800" />}
                        </div>
                    ))}
                </div>
                {workflowState === 'review' && (
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg"
                    >
                        <CheckIcon className="w-3 h-3" /> 确认进入排版
                    </button>
                )}
            </div>

            {/* 主内容区 */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* 顶部文档区 (Composing/Review 模式显示) */}
                <div className={`transition-all duration-700 ease-in-out bg-white overflow-hidden flex flex-col ${workflowState === 'analyzing' ? 'h-0' : 'flex-1'}`}>
                    <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-1 relative group">
                        <div className="max-w-3xl mx-auto">
                            <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Generated Intelligence Dossier</span>
                                </div>
                                {workflowState === 'review' && !isEditing && (
                                    <button onClick={handleStartEdit} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1 transition-colors">
                                        <PencilIcon className="w-3 h-3" /> 编辑文稿
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <textarea 
                                    value={editBuffer}
                                    onChange={e => setEditBuffer(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    autoFocus
                                    className="w-full h-[500px] p-6 bg-slate-50 border-2 border-indigo-100 rounded-2xl text-slate-700 font-sans leading-relaxed focus:ring-0 outline-none resize-none"
                                />
                            ) : (
                                <article 
                                    className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-h2:text-2xl prose-h2:border-b-2 prose-h2:pb-2 prose-p:text-slate-600 prose-p:leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: window.marked?.parse(markdownContent) || '' }}
                                />
                            )}
                            <div ref={docEndRef} className="h-20" />
                        </div>
                    </div>
                </div>

                {/* 底部 Chat/思维流区 */}
                <div className={`transition-all duration-700 ease-in-out border-t border-white/5 flex flex-col ${workflowState === 'analyzing' ? 'h-full' : 'h-[25%] min-h-[150px]'}`}>
                    <div className="bg-slate-900/80 px-6 py-2 border-b border-white/5 flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <BrainIcon className="w-3 h-3 text-indigo-500" /> Agent Thought Stream
                        </span>
                        {workflowState !== 'analyzing' && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 font-mono text-[12px] text-slate-400 custom-scrollbar-dark leading-relaxed">
                        <div className="whitespace-pre-wrap">
                            {thoughtStream || '>> Neural network connecting...'}
                            <span className="inline-block w-1.5 h-3 bg-indigo-500 animate-pulse ml-1 align-middle"></span>
                        </div>
                        <div ref={chatEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};
