
import React, { useRef, useEffect } from 'react';
import { 
    SparklesIcon, CheckCircleIcon, RefreshIcon,
    DatabaseIcon, GlobeIcon, DocumentTextIcon,
    ArrowRightIcon, CheckIcon
} from '../../../../components/icons';
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
    references: { title: string; url: string; source: string; snippet?: string }[];
}

interface ReportCanvasProps {
    mainStatus: GenStatus;
    topic: string;
    outline: { title: string; instruction: string }[];
    sections: ReportSection[];
    currentSectionIdx: number;
    onStart: () => void;
    onRetry: (idx: number) => void;
}

// --- Component: Hero / Empty State ---
const ResearchHero: React.FC<{ topic: string }> = ({ topic }) => (
    <div className="h-full flex flex-col items-center justify-center p-12 bg-white relative overflow-hidden">
        {/* Background Grid & Decor */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 text-center max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-8 animate-in fade-in zoom-in duration-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">Deep Research Engine Ready</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 drop-shadow-sm">
                深度研究
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">.AI</span>
            </h1>
            
            <p className="text-lg text-slate-500 leading-relaxed font-medium">
                {topic ? `正在为您规划关于 “${topic}” 的研究路径...` : "全网实时数据检索 · 深度逻辑推理 · 专家级长文报告"}
            </p>
            
            {!topic && (
                <div className="mt-12 flex gap-4 justify-center text-slate-400 text-sm">
                    <div className="flex items-center gap-2">
                        <GlobeIcon className="w-4 h-4" /> 全球数据源
                    </div>
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4" /> 深度思维链
                    </div>
                    <div className="flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4" /> 万字研报
                    </div>
                </div>
            )}
        </div>
    </div>
);

// --- Component: Processing Card ---
const ActiveSectionCard: React.FC<{ section: ReportSection }> = ({ section }) => {
    const logEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [section.logs]);

    const getPhaseStep = () => {
        switch(section.status) {
            case 'planning': return 1;
            case 'searching': return 2;
            case 'writing': return 3;
            default: return 0;
        }
    };
    const currentStep = getPhaseStep();

    return (
        <div className="my-10 bg-white rounded-3xl border border-indigo-100 shadow-2xl shadow-indigo-200/40 overflow-hidden relative animate-in slide-in-from-bottom-8 duration-700 ring-1 ring-indigo-50">
            {/* Status Header */}
            <div className="h-1.5 w-full bg-slate-100 flex">
                <div className={`h-full bg-indigo-500 transition-all duration-500 ease-out`} style={{ width: `${(currentStep/3)*100}%` }}></div>
            </div>
            
            <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <div className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                                 <RefreshIcon className="w-3 h-3 animate-spin"/>
                                 Processing
                             </div>
                             <span className="text-slate-400 text-xs font-mono uppercase tracking-widest">SECTION ANALYSIS</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{section.title}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left: Terminal Logs */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div className="bg-[#0f172a] rounded-2xl p-5 font-mono text-[11px] h-64 overflow-y-auto custom-scrollbar-dark shadow-inner text-slate-300 border border-slate-800 relative group">
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div>
                                </div>
                            </div>
                            {section.logs.map((log, i) => (
                                <div key={i} className="mb-2 flex gap-2 animate-in fade-in slide-in-from-left-2">
                                    <span className="text-indigo-500 font-bold">{'>'}</span>
                                    <span className={i === section.logs.length - 1 ? 'text-white font-bold' : 'opacity-70'}>{log}</span>
                                </div>
                            ))}
                            <div ref={logEndRef} />
                            <div className="w-2 h-4 bg-indigo-500 animate-pulse inline-block ml-2 align-middle"></div>
                        </div>
                    </div>

                    {/* Right: Knowledge Graph / Citations */}
                    <div className="lg:col-span-3 flex flex-col h-64">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <DatabaseIcon className="w-3.5 h-3.5" /> 
                            实时情报捕获 ({section.references.length})
                         </h4>
                         
                         <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                            {section.references.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                    <GlobeIcon className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-xs font-medium">等待检索数据注入...</span>
                                </div>
                            ) : (
                                section.references.map((ref, i) => (
                                    <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex gap-3 hover:border-indigo-200 transition-colors group animate-in slide-in-from-bottom-2 fade-in">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h5 className="text-xs font-bold text-slate-700 truncate pr-2 group-hover:text-indigo-700">{ref.title}</h5>
                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">{ref.source}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{ref.url}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ReportCanvas: React.FC<ReportCanvasProps> = ({ 
    mainStatus, topic, sections, currentSectionIdx
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Initial View
    if (mainStatus === 'planning' || !topic) {
        return <ResearchHero topic={topic} />;
    }

    return (
        <div className="h-full overflow-y-auto bg-[#f8fafc] custom-scrollbar scroll-smooth p-6 md:p-12 relative">
            <div className="max-w-4xl mx-auto pb-40">
                {/* Document Header */}
                <div className="text-center mb-20 pt-10 border-b border-slate-200 pb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                        <SparklesIcon className="w-3 h-3" /> Deep Research Report
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                        {topic}
                    </h1>
                    <div className="flex justify-center gap-8 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <CheckIcon className="w-3.5 h-3.5 text-green-500" /> Auto-Generated
                        </span>
                        <span>•</span>
                        <span>{new Date().toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Multi-Agent System</span>
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-12">
                    {sections.map((section, idx) => {
                        // Completed Section
                        if (section.status === 'completed') {
                            return (
                                <section key={section.id} className="animate-in fade-in slide-in-from-bottom-8 duration-700 relative group">
                                    {/* Sidebar Index */}
                                    <div className="hidden lg:block absolute -left-16 top-2 text-right w-10">
                                        <span className="text-2xl font-black text-slate-200 group-hover:text-indigo-200 transition-colors">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                    </div>

                                    <div className="mb-6 flex items-baseline gap-4">
                                        <h2 className="text-2xl font-bold text-slate-800">{section.title}</h2>
                                    </div>
                                    
                                    <article 
                                        className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-slate-800 prose-strong:text-slate-900 prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg"
                                        dangerouslySetInnerHTML={{ __html: marked.parse(section.content) as string }}
                                    />
                                    
                                    {/* References Footnote */}
                                    {section.references.length > 0 && (
                                        <div className="mt-8 pt-6 border-t border-slate-100">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Sources & Citations</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {section.references.map((r, ri) => (
                                                    <a 
                                                        key={ri} 
                                                        href={r.url} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all"
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                        <span className="max-w-[150px] truncate">{r.title}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            );
                        }
                        
                        // Active Section
                        if (idx === currentSectionIdx) {
                            return <ActiveSectionCard key={section.id} section={section} />;
                        }

                        // Pending Section (Visual Placeholder)
                        return (
                            <div key={section.id} className="p-8 border-2 border-dashed border-slate-100 rounded-3xl opacity-60">
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl font-black text-slate-100">{String(idx + 1).padStart(2, '0')}</span>
                                    <h3 className="text-xl font-bold text-slate-300">{section.title}</h3>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Completion Banner */}
                {mainStatus === 'finished' && (
                    <div className="mt-24 p-12 bg-gradient-to-br from-slate-900 to-indigo-900 rounded-[40px] text-center space-y-6 animate-in zoom-in duration-1000 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <SparklesIcon className="w-64 h-64 text-white" />
                        </div>
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-900/50 animate-bounce">
                                <CheckCircleIcon className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tight">研究报告已交付</h2>
                            <p className="text-indigo-200 text-lg max-w-xl mx-auto leading-relaxed font-medium">
                                全流程深度研究已完成。您现在可以复制上方内容，或导出为 Markdown/PDF 格式。
                            </p>
                        </div>
                    </div>
                )}
                
                <div ref={bottomRef} className="h-20"></div>
            </div>
        </div>
    );
};
