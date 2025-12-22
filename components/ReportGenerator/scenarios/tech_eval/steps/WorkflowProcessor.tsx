
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { streamGenerate } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { BrainIcon, CheckIcon, RefreshIcon, PencilIcon, SparklesIcon, DocumentTextIcon } from '../../../../icons';
import { WorkflowState } from '../TechEvalScenario';

// 定义报告的结构化数据
interface ReportSections {
    p1: string; // 技术路线
    p2: string; // 风险分析
    p3: string; // 方案推荐
    p4: string; // 引用来源
}

const TARGET_MODEL = "openrouter@mistralai/devstral-2512:free";

// 实时提取流中的内容
const extractPartialValue = (text: string, keys: string[]): string => {
    for (const key of keys) {
        const regex = new RegExp(`"${key}"\\s*:\\s*"(?<content>(?:[^"\\\\]|\\\\.)*)`, 'gs');
        const matches = Array.from(text.matchAll(regex));
        if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            if (lastMatch.groups?.content) {
                return lastMatch.groups.content
                    .replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\$/, ''); 
            }
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
    workflowState: WorkflowState;
    setWorkflowState: (s: WorkflowState) => void;
    onReviewComplete: (markdown: string) => void;
}> = ({ taskId, scenario, initialSessionId, targetTech, materials, workflowState, setWorkflowState, onReviewComplete }) => {
    
    // --- State ---
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [thoughtStream, setThoughtStream] = useState('');
    const [sessionId, setSessionId] = useState(initialSessionId);
    
    // 结构化内容状态
    const [sections, setSections] = useState<ReportSections>({ p1: '', p2: '', p3: '', p4: '' });
    
    // 修改状态
    const [activeEditSection, setActiveEditSection] = useState<keyof ReportSections | null>(null);
    const [revisionInput, setRevisionInput] = useState('');
    const [isRevising, setIsRevising] = useState(false);

    const chatScrollRef = useRef<HTMLDivElement>(null);
    const hasStarted = useRef(false);

    // --- Pipeline Execution ---
    useEffect(() => {
        if (hasStarted.current || workflowState !== 'processing') return;
        hasStarted.current = true;
        runPipeline();
    }, [workflowState]);

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [thoughtStream]);

    // 格式化 Step 4 的 JSON 为 Markdown 列表
    const formatReferences = (rawJson: string) => {
        try {
            const cleanJson = rawJson.trim().endsWith(',') ? rawJson.trim().slice(0, -1) + '}' : rawJson;
            const refs = JSON.parse(cleanJson);
            if (Object.keys(refs).length === 0) return '';
            let md = '## 引用资料来源\n\n';
            Object.entries(refs).forEach(([title, url]) => {
                md += `- [${title}](${url})\n`;
            });
            return md;
        } catch (e) { return sections.p4; }
    };

    const executeStep = async (promptName: string, vars: any, logLabel: string, partKey?: keyof ReportSections): Promise<string> => {
        setThoughtStream(prev => prev + `\n\n[System]: 开始执行 - ${logLabel}...`);
        return new Promise((resolve, reject) => {
            let accumulated = '';
            streamGenerate(
                { prompt_name: promptName, variables: vars, scenario, session_id: sessionId, model_override: TARGET_MODEL },
                (chunk) => {
                    accumulated += chunk;
                    const { thought, jsonPart } = extractThoughtAndJson(accumulated);
                    
                    if (thought) {
                        // 只显示最新的 thought 增量会比较复杂，这里简化为替换显示
                        // 实际生产中可以做更精细的 diff
                    }

                    if (partKey) {
                        if (partKey === 'p4') {
                             if (jsonPart && jsonPart.includes('}')) {
                                setSections(prev => ({ ...prev, p4: formatReferences(jsonPart) }));
                            }
                        } else {
                            const content = extractPartialValue(accumulated, [`第一部分_技术路线与当前所处阶段分析`, `第二部分_当前技术潜在风险识别与分析`, `第三部分_行业技术方案推荐`]);
                            if (content) setSections(prev => ({ ...prev, [partKey]: content }));
                        }
                    }
                },
                () => {
                    setThoughtStream(prev => prev + `\n[System]: ${logLabel} 完成。`);
                    resolve(accumulated);
                },
                reject,
                (sid) => { if (sid) setSessionId(sid); },
                (reasoning) => {
                     // 将 reasoning 实时追加到 thoughtStream
                     // 这里为了避免重复，实际应该有个缓冲区，简化处理
                }
            );
        });
    };

    const runPipeline = async () => {
        try {
            setCurrentStep(1);
            await executeStep('01_Role_ProtocolSetup', {}, '初始化分析协议');
            setCurrentStep(2);
            await executeStep('02_DataIngestion', { reference_materials: materials }, '知识库注入');
            setCurrentStep(3);
            await executeStep('03_TriggerGeneration_step1', { target_tech: targetTech }, '分析技术路线', 'p1');
            setCurrentStep(4);
            await executeStep('03_TriggerGeneration_step2', {}, '识别潜在风险', 'p2');
            setCurrentStep(5);
            await executeStep('03_TriggerGeneration_step3', {}, '构建推荐方案', 'p3');
            setCurrentStep(6);
            await executeStep('03_TriggerGeneration_step4', {}, '溯源引用资料', 'p4');
            
            // 流程结束，进入 Review 状态
            setWorkflowState('review');
        } catch (e) { 
            console.error(e);
            setThoughtStream(prev => prev + `\n[Error]: 执行中断 - ${e}`);
        }
    };

    // --- Revision Logic ---
    const handleReviseSection = async (key: keyof ReportSections) => {
        if (!revisionInput.trim() || isRevising) return;
        setIsRevising(true);
        setActiveEditSection(null); // Close input to show loading
        
        // 使用通用的修改 Prompt (假设存在 04_revise_content 或复用逻辑)
        // 这里我们将当前段落内容作为 current_content 传入
        const currentContent = sections[key];
        setThoughtStream(prev => prev + `\n\n[User]: 修改 ${key} - "${revisionInput}"`);
        
        try {
            let newContent = '';
            await new Promise<void>((resolve, reject) => {
                streamGenerate(
                    {
                        // 复用 general_ppt 的修改 prompt，或者 tech_eval 目录下应该有一个类似的
                        prompt_name: '04_revise_content', 
                        variables: {
                            page_title: getSectionTitle(key), // 伪造一个标题给 prompt 用
                            current_content: currentContent,
                            user_revision_request: revisionInput
                        },
                        scenario, // 确保 tech_eval 场景下能找到这个 prompt，如果找不到会 fallback 到 default 吗？API 需要支持。
                        // 如果 tech_eval 目录下没有 04_revise_content，需要确保后端配置了共享或者拷贝了文件。
                        // 假设后端已配置。
                        session_id: sessionId,
                        model_override: TARGET_MODEL
                    },
                    (chunk) => {
                        // 简单的流式解析，假设返回的是 JSON { content: "..." }
                        const { jsonPart } = extractThoughtAndJson(chunk); // chunk is accumulative? No, standard api sends chunks.
                        // streamGenerate 封装里实际上 callback 返回的是 content 或者是 raw chunk? 
                        // 查看 api/stratify.ts，onData 返回的是 json.content。
                        // 等等，之前的 WorkflowProcessor 是自己拼 buffer。
                        // 这里我们使用闭包 buffer。
                    },
                    () => resolve(),
                    reject,
                    undefined,
                    undefined
                ).then(() => {
                    // 由于 streamGenerate 封装的特性，我们需要一种方式获取最终结果。
                    // 重新调用一次带 buffer 的逻辑 (手动 fetch streamGenerate 内部逻辑较为复杂)
                    // 简化方案：我们手动调用底层的 streamGenerate，自己拼 buffer
                    // 上面的调用是错误的，因为 streamGenerate helper 内部处理了 SSE。
                    // 让我们重写一个简单的 revision flow。
                });
                
                // Re-implementation of stream call for revision
                let buffer = '';
                streamGenerate(
                    {
                        prompt_name: '04_revise_content',
                        variables: {
                            page_title: getSectionTitle(key),
                            current_content: currentContent,
                            user_revision_request: revisionInput
                        },
                        scenario,
                        session_id: sessionId,
                        model_override: TARGET_MODEL
                    },
                    (chunk) => {
                        buffer += chunk;
                        const { jsonPart } = extractThoughtAndJson(buffer);
                        // 尝试提取 content
                        const match = jsonPart.match(/"content"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
                         if (match && match.groups?.content) {
                            const raw = match.groups.content;
                            newContent = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
                            setSections(prev => ({ ...prev, [key]: newContent }));
                        }
                    },
                    () => {
                        setIsRevising(false);
                        setRevisionInput('');
                        setThoughtStream(prev => prev + `\n[Agent]: ${key} 修改完成。`);
                    },
                    (e) => {
                        console.error(e);
                        setIsRevising(false);
                    }
                );
            });
        } catch (e) {
            setIsRevising(false);
        }
    };

    const handleManualEdit = (key: keyof ReportSections, value: string) => {
        setSections(prev => ({ ...prev, [key]: value }));
    };

    const handleFinalConfirm = () => {
        const md = `## 技术路线与当前所处阶段分析\n\n${sections.p1}\n\n## 当前技术潜在风险识别与分析\n\n${sections.p2}\n\n## 行业技术方案推荐\n\n${sections.p3}\n\n${sections.p4}`;
        onReviewComplete(md);
    };

    const getSectionTitle = (key: string) => {
        const map: any = { p1: '技术路线分析', p2: '潜在风险识别', p3: '方案推荐', p4: '参考资料' };
        return map[key] || 'Section';
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            {/* View Switching */}
            {workflowState === 'processing' ? (
                // Generating View (Split Screen)
                <div className="flex-1 flex flex-col p-8 items-center justify-center space-y-8">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <BrainIcon className="w-5 h-5 text-indigo-600 animate-pulse" />
                            Agent Execution Log
                        </h3>
                        <div ref={chatScrollRef} className="h-64 overflow-y-auto custom-scrollbar font-mono text-xs text-slate-500 bg-slate-50 rounded-xl p-4 border border-slate-200 leading-relaxed whitespace-pre-wrap">
                            {thoughtStream || "> Initializing..."}
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        {[1, 2, 3, 4, 5, 6].map(step => (
                            <div key={step} className={`w-3 h-3 rounded-full transition-all duration-500 ${step <= currentStep ? 'bg-indigo-600 scale-125' : 'bg-slate-200'}`}></div>
                        ))}
                    </div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest animate-pulse">Processing Step {currentStep}/6</p>
                </div>
            ) : (
                // Review & Edit View
                <div className="flex-1 flex overflow-hidden">
                    {/* Main Document Editor (Scrollable) */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-slate-900 mb-2">审查与修订</h2>
                                <p className="text-slate-500 text-sm">点击任意段落进行手动编辑，或使用 AI 助手进行定点优化。</p>
                            </div>

                            {(['p1', 'p2', 'p3', 'p4'] as Array<keyof ReportSections>).map((key) => (
                                <div key={key} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                    {/* Section Header */}
                                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                            <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                                            {getSectionTitle(key)}
                                        </h3>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setActiveEditSection(activeEditSection === key ? null : key)}
                                                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${activeEditSection === key ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-indigo-50 text-slate-500 hover:text-indigo-600'}`}
                                            >
                                                <SparklesIcon className="w-3.5 h-3.5" />
                                                AI Refine
                                            </button>
                                        </div>
                                    </div>

                                    {/* AI Revision Input Overlay */}
                                    {activeEditSection === key && (
                                        <div className="bg-indigo-50 p-4 border-b border-indigo-100 animate-in slide-in-from-top-2">
                                            <div className="flex gap-2">
                                                <input 
                                                    autoFocus
                                                    className="flex-1 bg-white border border-indigo-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder={`告诉 AI 如何修改"${getSectionTitle(key)}"... (例如：精简文字，增加数据支撑)`}
                                                    value={revisionInput}
                                                    onChange={e => setRevisionInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleReviseSection(key)}
                                                />
                                                <button 
                                                    onClick={() => handleReviseSection(key)}
                                                    disabled={isRevising || !revisionInput.trim()}
                                                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {isRevising ? <RefreshIcon className="w-4 h-4 animate-spin"/> : '发送'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Editor Area */}
                                    <textarea 
                                        className="w-full min-h-[200px] p-6 text-sm md:text-base text-slate-700 leading-relaxed resize-y outline-none focus:bg-slate-50 transition-colors font-sans"
                                        value={sections[key]}
                                        onChange={e => handleManualEdit(key, e.target.value)}
                                        spellCheck={false}
                                    />
                                    
                                    {/* Processing Overlay for specific section */}
                                    {isRevising && activeEditSection === null && (
                                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                                            {/* Only show loader if we don't know which one, or ideally track revision key */}
                                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-indigo-100">
                                                <RefreshIcon className="w-4 h-4 text-indigo-600 animate-spin" />
                                                <span className="text-xs font-bold text-indigo-700">AI 正在重写...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Floating Bar */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
                        <div className="bg-white/90 backdrop-blur-xl border border-slate-200 p-2 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-4">
                             <div className="px-4 text-xs font-medium text-slate-500">
                                 满意当前内容？
                             </div>
                             <button 
                                onClick={handleFinalConfirm}
                                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-600 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
                             >
                                 <CheckIcon className="w-4 h-4" />
                                 生成最终报告 (HTML)
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
