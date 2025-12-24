
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { 
    BrainIcon, ChartIcon, CheckIcon, 
    ShieldExclamationIcon, LightBulbIcon, DocumentTextIcon,
    RefreshIcon, ArrowRightIcon, LightningBoltIcon
} from '../../../../icons';

// 步骤定义 (Visual Only)
const STEPS = [
    { label: '领先性分析', icon: ChartIcon },
    { label: '可行性论证', icon: ShieldExclamationIcon },
    { label: '技术壁垒构建', icon: DocumentTextIcon },
    { label: '营销卖点提炼', icon: LightBulbIcon },
];

export const ContentGenStep: React.FC<{
    taskId: string;
    topic: string;
    materials: string;
    scenario: string;
    model?: string;
    onComplete: (markdown: string, sessionId: string) => void;
}> = ({ taskId, topic, materials, scenario, model, onComplete }) => {
    const [streamContent, setStreamContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(true);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [revisionInput, setRevisionInput] = useState('');
    const [isRevising, setIsRevising] = useState(false);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasStarted = useRef(false);

    // 自动滚动
    useEffect(() => {
        if (scrollRef.current && (isGenerating || isRevising)) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [streamContent, isGenerating, isRevising]);

    // 启动初始生成
    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;

        let fullBuffer = '';
        streamGenerate(
            {
                prompt_name: '新技术四象限编写', 
                variables: { 
                    new_tech: topic,
                    // 关键修复：根据指令将补充材料映射为 markdown_content 变量
                    markdown_content: materials || "无补充材料"
                },
                scenario,
                task_id: taskId,
                phase_name: '新技术四象限编写',
                model_override: model
            },
            (chunk) => {
                fullBuffer += chunk;
                
                const { jsonPart } = extractThoughtAndJson(fullBuffer);
                
                if (jsonPart) {
                    // 1. 尝试完整解析 JSON
                    const parsed = parseLlmJson<{ content: string }>(jsonPart);
                    if (parsed && parsed.content) {
                        setStreamContent(parsed.content);
                    } else {
                        // 2. 流式正则提取 content 字段
                        // 匹配 "content": "..." 结构，处理转义字符
                        const match = jsonPart.match(/"content"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
                        if (match && match.groups?.content) {
                            const rawContent = match.groups.content;
                            const cleanContent = rawContent
                                .replace(/\\n/g, '\n')
                                .replace(/\\"/g, '"')
                                .replace(/\\t/g, '\t')
                                .replace(/\\\\/g, '\\');
                            setStreamContent(cleanContent);
                        }
                    }
                }
            },
            () => {
                setIsGenerating(false);
            },
            (err) => {
                console.error(err);
                setIsGenerating(false);
            },
            (sid) => {
                if (sid && !sessionId) setSessionId(sid);
            }
        );
    }, [topic, materials, scenario, taskId, sessionId, model]);

    // 处理修改请求
    const handleRevise = () => {
        if (!revisionInput.trim() || !sessionId) return;
        
        setIsRevising(true);
        
        let newContentBuffer = '';

        streamGenerate(
            {
                // 使用通用的修订提示词
                prompt_name: '04_revise_content',
                variables: { 
                    user_revision_request: revisionInput,
                    current_content: streamContent
                },
                scenario,
                session_id: sessionId, // Important: Maintain session
                task_id: taskId,
                phase_name: '新技术四象限编写_revision',
                model_override: model
            },
            (chunk) => {
                newContentBuffer += chunk;
                const { jsonPart } = extractThoughtAndJson(newContentBuffer);
                
                if (jsonPart) {
                    const parsed = parseLlmJson<{ content: string }>(jsonPart);
                    if (parsed && parsed.content) {
                        setStreamContent(parsed.content);
                    } else {
                        const match = jsonPart.match(/"content"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
                        if (match && match.groups?.content) {
                             const cleanContent = match.groups.content
                                .replace(/\\n/g, '\n')
                                .replace(/\\"/g, '"')
                                .replace(/\\t/g, '\t')
                                .replace(/\\\\/g, '\\');
                             setStreamContent(cleanContent);
                        }
                    }
                }
            },
            () => {
                setIsRevising(false);
                setRevisionInput('');
            },
            (err) => {
                console.error(err);
                setIsRevising(false);
            }
        );
    };

    const handleConfirm = () => {
        if (sessionId) {
            onComplete(streamContent, sessionId);
        }
    };

    return (
        <div className="flex h-full bg-slate-900 text-slate-200 font-mono overflow-hidden">
            {/* 左侧：可视化进度 */}
            <div className="w-64 border-r border-slate-800 p-8 flex flex-col justify-center gap-8 bg-slate-950 flex-shrink-0">
                {STEPS.map((step, i) => (
                    <div key={i} className={`flex items-center gap-4 transition-all duration-500 ${isGenerating ? 'opacity-100' : 'opacity-50'}`}>
                        <div className={`p-3 rounded-xl ${isGenerating ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                            <step.icon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Phase 0{i+1}</span>
                            <span className="font-bold text-sm text-slate-300">{step.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 右侧：终端视图与操作区 */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0f172a]">
                <div className="h-14 border-b border-slate-800 flex items-center px-6 gap-4 bg-slate-900/50 backdrop-blur z-10 justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                        </div>
                        <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
                            <BrainIcon className="w-3.5 h-3.5" />
                            AI_ANALYST_TERMINAL
                        </div>
                        {model && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700 ml-2">
                                <LightningBoltIcon className="w-3 h-3 text-indigo-400" />
                                <span className="text-[10px] font-mono text-slate-400">{model.split('@').pop()?.replace(':free', '')}</span>
                            </div>
                        )}
                    </div>
                    {isGenerating || isRevising ? (
                        <span className="text-[10px] text-orange-500 animate-pulse font-bold tracking-wider">● PROCESSING STREAM</span>
                    ) : (
                        <span className="text-[10px] text-green-500 font-bold tracking-wider">● READY FOR REVIEW</span>
                    )}
                </div>

                {/* Markdown Viewer */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-8 custom-scrollbar-dark"
                >
                    <div className="prose prose-invert prose-sm max-w-4xl mx-auto pb-20">
                        {/* Simple rendering for now to keep stream speed high */}
                         <div className="whitespace-pre-wrap break-words leading-relaxed text-sm text-emerald-400/90 font-mono">
                            {streamContent || <span className="text-slate-600 animate-pulse">Initializing neural link...</span>}
                            {(isGenerating || isRevising) && <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 align-middle animate-pulse"></span>}
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur">
                    <div className="max-w-4xl mx-auto flex gap-4">
                        <input 
                            value={revisionInput}
                            onChange={(e) => setRevisionInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isGenerating && !isRevising && handleRevise()}
                            placeholder="输入修改意见，例如：'补充一下与特斯拉FSD的对比分析'..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500 outline-none placeholder:text-slate-500"
                            disabled={isGenerating || isRevising}
                        />
                        <button 
                            onClick={handleRevise}
                            disabled={isGenerating || isRevising || !revisionInput.trim()}
                            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <RefreshIcon className={`w-4 h-4 ${isRevising ? 'animate-spin' : ''}`} />
                            修改
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={isGenerating || isRevising || !streamContent.trim()}
                            className="px-8 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-green-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <CheckIcon className="w-4 h-4" />
                            确认生成可视化
                        </button>
                    </div>
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: #0f172a; }
            `}</style>
        </div>
    );
};
