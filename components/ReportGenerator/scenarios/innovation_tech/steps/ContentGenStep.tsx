
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { 
    BrainIcon, ChartIcon, CheckIcon, 
    ShieldExclamationIcon, LightBulbIcon, DocumentTextIcon,
    RefreshIcon
} from '../../../../icons';

// 步骤定义 (Visual Only)
const PHASE_STEPS = [
    { label: '领先性分析', icon: ChartIcon, keywords: ['领先', '优势', 'leading'] },
    { label: '可行性论证', icon: ShieldExclamationIcon, keywords: ['可行', '实现', 'feasibility'] },
    { label: '技术壁垒构建', icon: DocumentTextIcon, keywords: ['壁垒', '护城河', 'barrier', 'moat'] },
    { label: '营销卖点提炼', icon: LightBulbIcon, keywords: ['营销', '卖点', 'marketing', 'value'] },
];

export const ContentGenStep: React.FC<{
    taskId: string;
    topic: string;
    materials: string;
    scenario: string;
    model?: string;
    isReadOnly?: boolean;
    onComplete: (markdown: string, sessionId: string) => void;
}> = ({ taskId, topic, materials, scenario, model, isReadOnly = false, onComplete }) => {
    const [streamContent, setStreamContent] = useState('');
    const [thinking, setThinking] = useState('');
    const [isGenerating, setIsGenerating] = useState(true);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [revisionInput, setRevisionInput] = useState('');
    const [isRevising, setIsRevising] = useState(false);
    
    // 进度追踪状态
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);

    const scrollRef = useRef<HTMLDivElement>(null);
    const hasStarted = useRef(false);

    // 实时监测内容关键词以更新进度
    useEffect(() => {
        if (!streamContent) return;
        
        let detectedPhase = -1;
        // 倒序检查，找到内容中出现的最后一个阶段关键词
        for (let i = PHASE_STEPS.length - 1; i >= 0; i--) {
            const keywords = PHASE_STEPS[i].keywords;
            if (keywords.some(kw => streamContent.includes(kw))) {
                detectedPhase = i;
                break;
            }
        }

        // 仅当检测到的阶段比当前阶段靠后时才更新（单向推进）
        if (detectedPhase > currentPhaseIndex) {
            setCurrentPhaseIndex(detectedPhase);
        }
    }, [streamContent, currentPhaseIndex]);

    // Auto-scroll logic
    useEffect(() => {
        if (!isReadOnly && scrollRef.current && (isGenerating || isRevising)) {
             // Only auto-scroll if near bottom to allow user reading
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            if (scrollHeight - scrollTop - clientHeight < 200) {
                 scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
    }, [streamContent, thinking, isGenerating, isRevising, isReadOnly]);

    useEffect(() => {
        if (hasStarted.current || isReadOnly) return;
        hasStarted.current = true;

        let fullBuffer = '';
        streamGenerate(
            {
                prompt_name: '新技术四象限编写', 
                variables: { 
                    new_tech: topic,
                    markdown_content: materials || "无补充材料"
                },
                scenario,
                task_id: taskId,
                phase_name: '新技术四象限编写',
                model_override: model
            },
            (chunk) => {
                fullBuffer += chunk;
                const { thought, jsonPart } = extractThoughtAndJson(fullBuffer);
                if (thought) setThinking(thought);
                
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
            () => setIsGenerating(false),
            (err) => { console.error(err); setIsGenerating(false); },
            (sid) => { if (sid && !sessionId) setSessionId(sid); }
        );
    }, [topic, materials, scenario, taskId, sessionId, model, isReadOnly]);

    const handleRevise = () => {
        if (!revisionInput.trim() || !sessionId) return;
        setIsRevising(true);
        setThinking('');
        let newContentBuffer = '';

        streamGenerate(
            {
                prompt_name: '04_revise_content',
                variables: { 
                    user_revision_request: revisionInput,
                    current_content: streamContent
                },
                scenario,
                session_id: sessionId,
                task_id: taskId,
                phase_name: '新技术四象限编写_revision',
                model_override: model
            },
            (chunk) => {
                newContentBuffer += chunk;
                const { thought, jsonPart } = extractThoughtAndJson(newContentBuffer);
                if (thought) setThinking(thought);
                if (jsonPart) {
                    const parsed = parseLlmJson<{ content: string }>(jsonPart);
                    if (parsed && parsed.content) {
                        setStreamContent(parsed.content);
                    } else {
                        const match = jsonPart.match(/"content"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
                        if (match && match.groups?.content) {
                             const cleanContent = match.groups.content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
                             setStreamContent(cleanContent);
                        }
                    }
                }
            },
            () => { setIsRevising(false); setRevisionInput(''); },
            (err) => { console.error(err); setIsRevising(false); }
        );
    };

    const handleConfirm = () => {
        if (sessionId) onComplete(streamContent, sessionId);
    };

    return (
        <div className="flex flex-col h-[600px] md:h-[650px]">
            {/* Visual Progress Header */}
            {!isReadOnly && (
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
                    <div className="flex gap-4">
                        {PHASE_STEPS.map((step, i) => {
                            // 当正在生成时，当前检测到的阶段为 Active
                            // 当生成结束 (!isGenerating)，或者当前步骤索引小于最新检测到的步骤时，视为 Done
                            const isActive = isGenerating && i === currentPhaseIndex;
                            const isDone = !isGenerating || i < currentPhaseIndex;
                            
                            return (
                                <div key={i} className={`flex items-center gap-2 ${isActive ? 'text-orange-600' : isDone ? 'text-green-600' : 'text-slate-300'}`}>
                                    <step.icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                                    <span className={`text-xs font-bold hidden sm:inline ${isDone ? 'font-medium' : ''}`}>{step.label}</span>
                                    {isDone && !isActive && <CheckIcon className="w-3 h-3" />}
                                </div>
                            );
                        })}
                    </div>
                    {isGenerating && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold animate-pulse">GENERATING</span>}
                </div>
            )}

            {/* Main Content Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-[#0f172a] custom-scrollbar-dark relative">
                
                {/* Thinking Block */}
                {thinking && !isReadOnly && (
                    <div className="mb-6 bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 font-mono text-xs text-indigo-200/80">
                        <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold uppercase tracking-wider text-[10px]">
                            <BrainIcon className="w-3 h-3 animate-pulse" />
                            Reasoning Stream
                        </div>
                        <div className="whitespace-pre-wrap break-all opacity-80 pl-2 border-l-2 border-indigo-500/30">
                            {thinking}
                        </div>
                    </div>
                )}

                {/* Markdown Content */}
                <div className="prose prose-invert prose-sm max-w-none">
                     <div className="whitespace-pre-wrap break-words leading-relaxed text-sm text-emerald-400/90 font-mono">
                        {streamContent || <span className="text-slate-600 animate-pulse">Initializing neural link...</span>}
                        {(isGenerating || isRevising) && <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 align-middle animate-pulse"></span>}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            {!isReadOnly && (
                <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                    <input 
                        value={revisionInput}
                        onChange={(e) => setRevisionInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isGenerating && !isRevising && handleRevise()}
                        placeholder="输入修改意见 (e.g. '补充更多竞品对比数据')..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        disabled={isGenerating || isRevising}
                    />
                    <button 
                        onClick={handleRevise}
                        disabled={isGenerating || isRevising || !revisionInput.trim()}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:text-orange-600 hover:border-orange-200 disabled:opacity-50"
                    >
                        <RefreshIcon className={`w-4 h-4 ${isRevising ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={isGenerating || isRevising || !streamContent.trim()}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        <CheckIcon className="w-4 h-4" />
                        生成可视化
                    </button>
                </div>
            )}
        </div>
    );
};
