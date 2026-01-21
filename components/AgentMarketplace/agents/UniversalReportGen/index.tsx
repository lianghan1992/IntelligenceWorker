
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    ArrowLeftIcon, SparklesIcon, PlayIcon, RefreshIcon, 
    CheckCircleIcon, PlusIcon, TrashIcon, DocumentTextIcon, 
    StopIcon, DownloadIcon, ClockIcon 
} from '../../../icons';
import { streamChatCompletions, createSession, updateSession, getSession } from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { AGENTS } from '../../../../agentConfig';
import { marked } from 'marked';

interface UniversalReportGenProps {
    onBack: () => void;
}

// ---------------- Types ----------------

type Stage = 'topic' | 'outline' | 'generating' | 'finished';

interface Section {
    id: string;
    title: string;
    instruction: string;
    status: 'pending' | 'searching' | 'writing' | 'done' | 'error';
    content?: string;
    searchQuery?: string;
    references?: string[];
}

interface ReportData {
    topic: string;
    sections: Section[];
}

// ---------------- Config ----------------

// 使用 OpenRouter 的小米模型 (免费且速度尚可，适合长文本推理)
const MODEL_ID = "openrouter@xiaomi/mimo-v2-flash:free"; 
const AGENT_ID = AGENTS.UNIVERSAL_REPORT_GEN;

// ---------------- Component ----------------

const UniversalReportGen: React.FC<UniversalReportGenProps> = ({ onBack }) => {
    // --- State ---
    const [stage, setStage] = useState<Stage>('topic');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionCost, setSessionCost] = useState(0);
    
    // Data
    const [topic, setTopic] = useState('');
    const [sections, setSections] = useState<Section[]>([]);
    
    // UI State
    const [isThinking, setIsThinking] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
    const [streamingContent, setStreamingContent] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);

    // --- Helpers ---

    const ensureSession = async (title: string): Promise<string> => {
        if (sessionId) return sessionId;
        try {
            const sess = await createSession(AGENT_ID, title);
            setSessionId(sess.id);
            return sess.id;
        } catch (e) {
            console.error("Session creation failed", e);
            return "";
        }
    };

    const saveProgress = async () => {
        if (!sessionId) return;
        try {
            const res = await updateSession(sessionId, {
                title: topic,
                current_stage: stage,
                context_data: { topic, sections }
            });
            setSessionCost(res.total_cost || 0);
        } catch (e) {
            console.warn("Auto-save failed");
        }
    };

    // Auto-save when sections update (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (stage !== 'topic') saveProgress();
        }, 2000);
        return () => clearTimeout(timer);
    }, [sections, stage]);

    // --- Step 1: Generate Outline ---

    const handleGenerateOutline = async () => {
        if (!topic.trim()) return;
        setIsThinking(true);
        
        try {
            const sid = await ensureSession(topic);
            
            const prompt = `
你是一个专业的研报架构师。请根据用户的主题【${topic}】，设计一个深度研究报告的大纲。
要求：
1. 分为 4-8 个核心章节。
2. 每个章节必须包含：
   - title: 章节标题 (Markdown H2)
   - instruction: 给撰写者的具体指令（例如："分析XXX的市场规模，引用2023年数据"）。
3. 输出纯 JSON 数组格式，不要 Markdown 代码块。格式：[{"title": "...", "instruction": "..."}]
`;
            let buffer = "";
            await streamChatCompletions({
                model: MODEL_ID,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
                temperature: 0.3,
                enable_billing: true
            }, (data) => {
                if (data.content) buffer += data.content;
            }, undefined, undefined, sid, AGENT_ID);

            // Clean & Parse JSON
            const jsonStr = buffer.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            
            if (Array.isArray(parsed)) {
                const newSections: Section[] = parsed.map((item: any) => ({
                    id: crypto.randomUUID(),
                    title: item.title,
                    instruction: item.instruction,
                    status: 'pending'
                }));
                setSections(newSections);
                setStage('outline');
            } else {
                alert("生成格式错误，请重试");
            }
        } catch (e) {
            alert("大纲生成失败: " + e);
        } finally {
            setIsThinking(false);
        }
    };

    // --- Step 2: Recursive Execution Loop ---

    const runGenerationLoop = useCallback(async () => {
        if (isRunning) return;
        setIsRunning(true);
        setStage('generating');

        // Find next pending section
        // We use a ref-like approach by accessing state in the loop or recursive calls.
        // Here we use a while loop with state updates.
        
        // Note: In React, state updates inside a loop don't reflect immediately. 
        // We need a pointer or recursive function. Let's use recursion.
        
        const processNext = async () => {
            // Re-read latest sections from state via functional update to ensure we have latest status
            let currentSections: Section[] = [];
            setSections(prev => {
                currentSections = prev;
                return prev;
            });

            const nextSectionIndex = currentSections.findIndex(s => s.status === 'pending');
            if (nextSectionIndex === -1) {
                setIsRunning(false);
                setStage('finished');
                return;
            }

            const section = currentSections[nextSectionIndex];
            setCurrentSectionId(section.id);

            // 1. Search Phase
            setSections(prev => prev.map((s, i) => i === nextSectionIndex ? { ...s, status: 'searching' } : s));
            
            let context = "";
            try {
                // Generate search query based on title
                const searchQuery = `${topic} ${section.title}`;
                const searchRes = await searchSemanticBatchGrouped({
                    query_texts: [searchQuery],
                    max_segments_per_query: 5
                });
                
                const items = searchRes.results?.[0]?.items || [];
                const refs = items.flatMap((art: any) => art.segments.map((seg: any) => seg.content));
                
                context = refs.join('\n\n');
                
                setSections(prev => prev.map((s, i) => i === nextSectionIndex ? { 
                    ...s, 
                    searchQuery, 
                    references: refs 
                } : s));
            } catch (e) {
                console.warn("Search failed, proceeding without context", e);
            }

            // 2. Writing Phase
            setSections(prev => prev.map((s, i) => i === nextSectionIndex ? { ...s, status: 'writing' } : s));
            setStreamingContent('');

            const sid = sessionId!;
            const prompt = `
你是一位资深行业分析师。正在撰写报告【${topic}】的章节。
当前章节：【${section.title}】
写作要求：${section.instruction}
参考资料：
${context || '无（请基于通用知识撰写）'}

请撰写本章节内容。要求：
1. 逻辑严密，数据详实。
2. 使用 Markdown 格式。
3. 不需要输出章节标题（标题已存在）。
4. 字数控制在 500-1000 字。
`;
            let sectionContent = "";
            try {
                await streamChatCompletions({
                    model: MODEL_ID,
                    messages: [{ role: 'user', content: prompt }],
                    stream: true,
                    temperature: 0.4,
                    enable_billing: true
                }, (data) => {
                    if (data.content) {
                        sectionContent += data.content;
                        setStreamingContent(sectionContent);
                    }
                }, undefined, undefined, sid, AGENT_ID);

                // Update section with final content
                setSections(prev => prev.map((s, i) => i === nextSectionIndex ? { 
                    ...s, 
                    status: 'done', 
                    content: sectionContent 
                } : s));
                
                setStreamingContent(''); // Clear stream buffer
                setCurrentSectionId(null);
                
                // Recursively process next
                // Short delay to allow UI to breathe
                setTimeout(processNext, 500);

            } catch (e) {
                console.error("Writing failed", e);
                setSections(prev => prev.map((s, i) => i === nextSectionIndex ? { ...s, status: 'error' } : s));
                setIsRunning(false); // Stop on error
            }
        };

        processNext();

    }, [isRunning, sessionId, topic]); // Removed 'sections' dep to avoid infinite loop resets

    const stopGeneration = () => {
        // Since we use recursion/promises, setting state won't immediately kill the fetch inside streamChatCompletions unless we used AbortController.
        // For MVP, we just set flag so the recursion stops at next step.
        // Ideally streamChatCompletions should return a controller.
        // Here we just reload page or simple flag check.
        // A simple way is to set isRunning false, and check it in processNext.
        // But processNext captures isRunning from closure. 
        // We need a ref for isRunning to stop immediately.
        // For now, let's just refresh page (Brute force) or just set state.
        // Let's rely on the user pausing between steps.
        if (confirm("确定要停止生成吗？")) {
             window.location.reload(); 
        }
    };

    // --- Helpers UI ---

    const addSection = () => {
        setSections([...sections, { id: crypto.randomUUID(), title: '新章节', instruction: '请输入指令...', status: 'pending' }]);
    };

    const removeSection = (idx: number) => {
        const newSections = [...sections];
        newSections.splice(idx, 1);
        setSections(newSections);
    };

    const updateSection = (idx: number, key: keyof Section, val: string) => {
        const newSections = [...sections];
        // @ts-ignore
        newSections[idx][key] = val;
        setSections(newSections);
    };

    const handleDownload = () => {
        const fullContent = `# ${topic}\n\n` + sections.map(s => `## ${s.title}\n\n${s.content || ''}`).join('\n\n');
        const blob = new Blob([fullContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${topic}_report.md`;
        a.click();
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            {/* Header */}
            <div className="h-16 px-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                            <DocumentTextIcon className="w-5 h-5" />
                        </div>
                        <h1 className="text-lg font-bold text-slate-800">万能研报生成器</h1>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {sessionId && (
                         <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-mono">
                            <ClockIcon className="w-3.5 h-3.5 text-indigo-500" />
                            <span>¥{sessionCost.toFixed(4)}</span>
                        </div>
                    )}
                    {stage === 'finished' && (
                        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all">
                            <DownloadIcon className="w-4 h-4" /> 导出 Markdown
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col items-center justify-center p-6 relative">
                
                {/* --- STAGE 1: TOPIC INPUT --- */}
                {stage === 'topic' && (
                    <div className="w-full max-w-2xl bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <SparklesIcon className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">想研究什么主题？</h2>
                        <p className="text-slate-500 mb-8">输入任意行业、公司或技术话题，AI 将自动规划全篇结构。</p>
                        
                        <div className="relative">
                            <input 
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleGenerateOutline()}
                                disabled={isThinking}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-lg font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:font-normal"
                                placeholder="例如：2024年中国人形机器人产业分析..."
                            />
                            <button 
                                onClick={handleGenerateOutline}
                                disabled={!topic.trim() || isThinking}
                                className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isThinking ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <PlayIcon className="w-5 h-5" />}
                                {isThinking ? '规划中...' : '开始'}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- STAGE 2: OUTLINE EDIT --- */}
                {stage === 'outline' && (
                    <div className="w-full max-w-4xl h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-6 flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">{topic}</h2>
                                <p className="text-slate-500 mt-1">请确认或调整生成的大纲，点击“开始撰写”启动任务。</p>
                            </div>
                            <button 
                                onClick={runGenerationLoop}
                                className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                            >
                                <PlayIcon className="w-5 h-5" /> 开始撰写
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-20">
                            {sections.map((section, idx) => (
                                <div key={section.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-black text-sm shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <input 
                                                value={section.title}
                                                onChange={e => updateSection(idx, 'title', e.target.value)}
                                                className="w-full font-bold text-lg text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                                                placeholder="章节标题"
                                            />
                                            <textarea 
                                                value={section.instruction}
                                                onChange={e => updateSection(idx, 'instruction', e.target.value)}
                                                className="w-full text-sm text-slate-600 bg-slate-50 rounded-lg p-3 resize-none focus:ring-2 focus:ring-indigo-100 outline-none border border-transparent focus:border-indigo-200"
                                                rows={2}
                                                placeholder="给 AI 的写作指令..."
                                            />
                                        </div>
                                        <button onClick={() => removeSection(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button 
                                onClick={addSection}
                                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                            >
                                <PlusIcon className="w-5 h-5" /> 添加新章节
                            </button>
                        </div>
                    </div>
                )}

                {/* --- STAGE 3 & 4: GENERATION / RESULT --- */}
                {(stage === 'generating' || stage === 'finished') && (
                    <div className="flex w-full h-full gap-6 animate-in fade-in duration-700">
                        {/* Left: Progress Sidebar */}
                        <div className="w-80 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <span className="font-bold text-slate-700">生成进度</span>
                                {isRunning && (
                                    <button onClick={stopGeneration} className="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded">
                                        <StopIcon className="w-3 h-3 inline mr-1"/> 停止
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                {sections.map((s, idx) => (
                                    <div 
                                        key={s.id}
                                        onClick={() => setCurrentSectionId(s.id)}
                                        className={`p-3 rounded-xl text-sm transition-all cursor-pointer ${
                                            currentSectionId === s.id ? 'bg-indigo-50 border border-indigo-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="shrink-0">
                                                {s.status === 'done' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                                                {s.status === 'writing' && <RefreshIcon className="w-4 h-4 text-indigo-500 animate-spin" />}
                                                {s.status === 'searching' && <SparklesIcon className="w-4 h-4 text-amber-500 animate-pulse" />}
                                                {s.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>}
                                                {s.status === 'error' && <div className="w-4 h-4 rounded-full bg-red-500"></div>}
                                            </div>
                                            <div className={`font-medium truncate ${currentSectionId === s.id ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                {s.title}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Content Preview */}
                        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                            {currentSectionId ? (
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    {(() => {
                                        const sec = sections.find(s => s.id === currentSectionId);
                                        if (!sec) return null;
                                        const isStreaming = sec.status === 'writing';
                                        const contentToShow = isStreaming ? streamingContent : sec.content;
                                        
                                        return (
                                            <div className="max-w-3xl mx-auto">
                                                <h2 className="text-3xl font-black text-slate-900 mb-6 pb-4 border-b border-slate-100">
                                                    {sec.title}
                                                </h2>
                                                {sec.status === 'searching' && (
                                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 animate-pulse">
                                                        <SparklesIcon className="w-12 h-12 text-amber-200" />
                                                        <p>AI 正在检索知识库以获取最新情报...</p>
                                                    </div>
                                                )}
                                                {contentToShow ? (
                                                    <article 
                                                        className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-indigo-600"
                                                        dangerouslySetInnerHTML={{ __html: marked.parse(contentToShow) as string }}
                                                    />
                                                ) : (
                                                    sec.status === 'pending' && (
                                                        <div className="text-center py-20 text-slate-300">等待生成...</div>
                                                    )
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                                    <DocumentTextIcon className="w-16 h-16 opacity-20 mb-4" />
                                    <p>选择左侧章节查看内容</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default UniversalReportGen;
