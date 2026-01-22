
import React, { useRef, useEffect } from 'react';
import { 
    SparklesIcon, BrainIcon, SearchIcon, PencilIcon, 
    CheckCircleIcon, ShieldExclamationIcon, RefreshIcon,
    DocumentTextIcon, DatabaseIcon, ArrowRightIcon, GlobeIcon,
    ClockIcon
} from '../../../icons';
import { marked } from 'marked';
import { GenStatus } from './index';

export type SectionStatus = 'pending' | 'planning' | 'searching' | 'writing' | 'completed' | 'error';

export interface ReportSection {
    id: string;
    title: string;
    instruction: string;
    status: SectionStatus;
    content: string;
    logs: string[];
    references: { title: string; url: string; source: string }[];
}

interface ReportCanvasProps {
    mainStatus: GenStatus;
    topic: string;
    intentSummary?: string;
    seedReferences?: any[];
    outline: { title: string; instruction: string }[];
    sections: ReportSection[];
    currentSectionIdx: number;
    onStart: () => void;
    onRetry: (idx: number) => void;
}

// --- Scene: 初始侦测 (Phase 1 & 2) ---
const DiscoveryView: React.FC<{ topic: string; intent?: string; refs?: any[]; status: GenStatus }> = ({ topic, intent, refs, status }) => (
    <div className="h-full flex flex-col p-12 overflow-y-auto custom-scrollbar bg-slate-50">
        <div className="max-w-4xl mx-auto w-full space-y-10">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold animate-pulse">
                    <GlobeIcon className="w-4 h-4"/> 正在启动全球研报雷达
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">{topic}</h1>
            </div>

            {/* 意图识别结果 */}
            {intent && (
                <div className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-500/5 animate-in slide-in-from-bottom-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BrainIcon className="w-5 h-5 text-indigo-500" /> 研究意图扫描 (Intelligence Intent)
                    </h3>
                    <p className="text-lg text-slate-700 leading-relaxed font-medium">{intent}</p>
                </div>
            )}

            {/* 种子检索结果 */}
            {refs && refs.length > 0 && (
                <div className="animate-in fade-in duration-1000 delay-300">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <DatabaseIcon className="w-5 h-5 text-blue-500" /> 已捕获的关键线索 (Key Findings)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {refs.map((ref, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0 font-bold">
                                    {i + 1}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-slate-800 text-sm truncate">{ref.title}</h4>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">SOURCE: {ref.source_name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {status === 'analyzing_intent' || status === 'initial_retrieval' ? (
                <div className="flex flex-col items-center py-20 gap-4 text-slate-400">
                    <RefreshIcon className="w-10 h-10 animate-spin text-indigo-500" />
                    <span className="text-sm font-bold animate-pulse">正在穿透海量知识库...</span>
                </div>
            ) : null}
        </div>
    </div>
);

// --- Scene: 任务流水线 (Phase 4) ---
const ActiveSectionCard: React.FC<{ section: ReportSection }> = ({ section }) => {
    const logEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [section.logs]);

    return (
        <div className="my-12 bg-white rounded-[40px] border border-indigo-100 shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom-8 duration-700">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
                <div className="h-full bg-indigo-500 animate-loading-bar origin-left"></div>
            </div>
            
            <div className="p-8 md:p-12">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{section.title}</h2>
                        <div className="mt-2 flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${
                                section.status === 'planning' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                section.status === 'searching' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                'bg-indigo-50 text-indigo-600 border-indigo-200'
                            }`}>
                                {section.status === 'planning' && 'Thinking'}
                                {section.status === 'searching' && 'Retrieving'}
                                {section.status === 'writing' && 'Synthesizing'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Terminal Area */}
                    <div className="lg:col-span-2 bg-[#0f172a] rounded-3xl p-6 font-mono text-[11px] h-64 overflow-y-auto custom-scrollbar-dark shadow-inner text-slate-300">
                        {section.logs.map((log, i) => (
                            <div key={i} className="mb-2 flex gap-3">
                                <span className="text-slate-600 font-bold">{'>'}</span>
                                <span className={i === section.logs.length - 1 ? 'text-cyan-400 font-bold' : ''}>{log}</span>
                            </div>
                        ))}
                        <div ref={logEndRef} />
                        <div className="w-1.5 h-3 bg-indigo-500 animate-pulse inline-block ml-1"></div>
                    </div>

                    {/* Preview Area */}
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        {section.references.length > 0 && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <DatabaseIcon className="w-4 h-4" /> 引用情报脉络
                                </h4>
                                <div className="space-y-2">
                                    {section.references.slice(0, 3).map((ref, i) => (
                                        <div key={i} className="bg-white p-2.5 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-200 truncate flex items-center gap-2 shadow-sm">
                                            <span className="w-4 h-4 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded text-[9px]">{i+1}</span>
                                            {ref.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex-1 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 p-6 flex flex-col justify-center">
                            <p className="text-sm text-indigo-900 leading-relaxed italic opacity-80">
                                {section.content ? section.content.slice(-200) + "..." : "正在提炼研究精华..."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes loading-bar {
                    0% { transform: scaleX(0); }
                    50% { transform: scaleX(0.7); }
                    100% { transform: scaleX(1); }
                }
                .animate-loading-bar { animation: loading-bar 2s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export const ReportCanvas: React.FC<ReportCanvasProps> = ({ 
    mainStatus, topic, intentSummary, seedReferences, outline, sections, currentSectionIdx, onStart, onRetry 
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    if (mainStatus === 'idle') {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white">
                <div className="w-32 h-32 bg-indigo-600 rounded-[40px] flex items-center justify-center shadow-2xl shadow-indigo-200 mb-10 transform -rotate-12 hover:rotate-0 transition-transform duration-700">
                    <SparklesIcon className="w-16 h-16 text-white" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">万能深度研报助手</h2>
                <p className="text-slate-400 text-lg max-w-lg leading-relaxed">
                    基于高维向量库的全网情报专家。请输入您的研究课题，我会自动为您深度检索、多维分析并交付万字长文报告。
                </p>
            </div>
        );
    }

    if (mainStatus === 'analyzing_intent' || mainStatus === 'initial_retrieval') {
        return <DiscoveryView topic={topic} intent={intentSummary} refs={seedReferences} status={mainStatus} />;
    }

    if (mainStatus === 'planning' || mainStatus === 'review_plan') {
        return (
            <div className="h-full bg-slate-50 p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-10 pb-32">
                    <div className="text-center">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">{topic}</h2>
                        <p className="text-slate-500 font-medium">研究思路规划已完成，共计 {outline.length} 个核心章节。</p>
                    </div>
                    <div className="space-y-4">
                        {outline.map((o, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex gap-6 hover:border-indigo-400 hover:shadow-xl transition-all duration-300">
                                <div className="text-4xl font-black text-slate-100 select-none">{i+1}</div>
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800">{o.title}</h4>
                                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">{o.instruction}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="fixed bottom-12 left-0 right-[360px] flex justify-center pointer-events-none">
                    <button 
                        onClick={onStart}
                        className="pointer-events-auto px-10 py-4 bg-indigo-600 text-white font-black rounded-full shadow-2xl shadow-indigo-300 hover:bg-indigo-700 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3"
                    >
                        确认思路并开始自动撰写 <ArrowRightIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar scroll-smooth">
            <div className="max-w-4xl mx-auto px-10 py-20">
                <div className="text-center mb-24 border-b-4 border-slate-900 pb-12">
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">{topic}</h1>
                    <div className="flex justify-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        <span>Autonomous Report v2.1</span>
                        <span>Multi-Agent Research Pipeline</span>
                    </div>
                </div>

                {sections.map((section, idx) => {
                    if (section.status === 'completed') {
                        return (
                            <div key={section.id} className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                <div className="flex items-center gap-4 mb-8 border-l-4 border-indigo-600 pl-6">
                                    <h2 className="text-3xl font-black text-slate-900">{section.title}</h2>
                                    <CheckCircleIcon className="w-6 h-6 text-green-500" />
                                </div>
                                <article 
                                    className="prose prose-slate max-w-none prose-p:text-lg prose-p:leading-loose prose-headings:font-black prose-a:text-indigo-600 prose-img:rounded-3xl prose-strong:text-indigo-900"
                                    dangerouslySetInnerHTML={{ __html: marked.parse(section.content) as string }}
                                />
                                {section.references.length > 0 && (
                                    <div className="mt-10 p-6 bg-slate-50 rounded-3xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {section.references.map((r, ri) => (
                                            <a key={ri} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                <span className="truncate">{r.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    
                    if (idx === currentSectionIdx) {
                        return <ActiveSectionCard key={section.id} section={section} />;
                    }

                    return (
                        <div key={section.id} className="mb-8 opacity-20 filter grayscale p-10 border-2 border-dashed border-slate-200 rounded-[40px] text-center">
                            <h3 className="text-2xl font-black text-slate-400">{section.title}</h3>
                            <div className="mt-4 flex justify-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                            </div>
                        </div>
                    );
                })}

                {mainStatus === 'finished' && (
                    <div className="mt-32 p-16 bg-slate-900 rounded-[60px] text-center space-y-8 animate-in zoom-in duration-1000 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <SparklesIcon className="w-64 h-64 text-white" />
                        </div>
                        <div className="relative z-10">
                            <CheckCircleIcon className="w-20 h-20 text-green-400 mx-auto mb-6" />
                            <h2 className="text-4xl font-black text-white">深度研究报告交付完毕</h2>
                            <p className="text-slate-400 text-lg mt-4 max-w-xl mx-auto leading-relaxed">
                                已基于全网知识库完成深度对标分析。您可以直接复制报告内容到本地文档。
                            </p>
                        </div>
                    </div>
                )}
                
                <div ref={bottomRef} className="h-40"></div>
            </div>
        </div>
    );
};
