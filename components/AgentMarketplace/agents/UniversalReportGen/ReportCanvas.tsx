
import React, { useRef, useEffect } from 'react';
import { 
    SparklesIcon, CheckCircleIcon, RefreshIcon,
    DatabaseIcon, GlobeIcon, DocumentTextIcon,
    ArrowRightIcon, CheckIcon, ExternalLinkIcon,
    BrainIcon, SearchIcon, PencilIcon
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
        </div>
    </div>
);

// --- Component: Active Processing Card (Redesigned) ---
const ActiveSectionCard: React.FC<{ section: ReportSection }> = ({ section }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    
    // Auto-scroll as content generates
    useEffect(() => {
        if (contentRef.current && section.status === 'writing') {
             contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [section.content, section.status]);

    const getStepStatus = (stepName: string) => {
        const order = ['planning', 'searching', 'writing', 'completed'];
        const currentIndex = order.indexOf(section.status);
        const stepIndex = order.indexOf(stepName);
        
        if (currentIndex > stepIndex) return 'completed';
        if (currentIndex === stepIndex) return 'active';
        return 'pending';
    };

    const steps = [
        { id: 'planning', label: '规划路径', icon: BrainIcon },
        { id: 'searching', label: '全网检索', icon: SearchIcon },
        { id: 'writing', label: '深度撰写', icon: PencilIcon },
    ];

    return (
        <div className="my-10 bg-white rounded-2xl border border-indigo-100 shadow-2xl shadow-indigo-200/20 overflow-hidden relative animate-in slide-in-from-bottom-8 duration-700 ring-1 ring-indigo-50/50">
            {/* 1. Header: Steps & Title */}
            <div className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                        </span>
                        {section.title}
                    </h2>
                    {/* Step Indicators */}
                    <div className="flex items-center gap-2">
                        {steps.map((step, i) => {
                            const st = getStepStatus(step.id);
                            return (
                                <div key={step.id} className="flex items-center">
                                    <div className={`
                                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-500
                                        ${st === 'active' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' : 
                                          st === 'completed' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-100 text-slate-400 border-slate-200'}
                                    `}>
                                        {st === 'active' && <RefreshIcon className="w-3 h-3 animate-spin" />}
                                        {st === 'completed' && <CheckIcon className="w-3 h-3" />}
                                        <step.icon className={`w-3 h-3 ${st === 'pending' ? 'opacity-50' : ''}`} />
                                        <span>{step.label}</span>
                                    </div>
                                    {i < steps.length - 1 && <div className="w-4 h-0.5 bg-slate-200 mx-1"></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Current Log Display */}
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm w-fit">
                    <span className="text-indigo-500 font-bold">{'>'}</span>
                    <span className="animate-pulse">{section.logs[section.logs.length - 1] || 'Initializing...'}</span>
                </div>
            </div>

            {/* 2. Reference Deck (Horizontal Scroll) */}
            <div className="border-b border-slate-100 bg-slate-50/30 p-4">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                    <DatabaseIcon className="w-3.5 h-3.5" />
                    引用来源 ({section.references.length})
                </div>
                
                {section.references.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                        {section.references.map((ref, i) => (
                            <a 
                                key={i} 
                                href={ref.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex-shrink-0 w-64 bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group snap-start cursor-pointer block text-left"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold border border-blue-100">
                                            {i + 1}
                                        </div>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                                            {ref.source}
                                        </span>
                                    </div>
                                    <ExternalLinkIcon className="w-3 h-3 text-slate-300 group-hover:text-indigo-500" />
                                </div>
                                <h4 className="text-xs font-bold text-slate-700 line-clamp-2 leading-snug group-hover:text-indigo-700 transition-colors mb-1">
                                    {ref.title}
                                </h4>
                                {ref.snippet && (
                                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed opacity-80">
                                        {ref.snippet}
                                    </p>
                                )}
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-slate-400 italic px-2 py-4 border-2 border-dashed border-slate-200 rounded-xl text-center">
                        {section.status === 'planning' ? '等待检索任务启动...' : '正在全网搜寻相关资料...'}
                    </div>
                )}
            </div>

            {/* 3. Live Writing Area */}
            <div className="p-8 bg-white min-h-[300px] relative">
                <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest pointer-events-none select-none">
                    Live Draft Preview
                </div>
                
                {section.content ? (
                    <article 
                        className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-slate-800"
                        dangerouslySetInnerHTML={{ __html: marked.parse(section.content) as string }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-300 gap-3">
                         <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center animate-pulse">
                             <PencilIcon className="w-5 h-5 text-slate-300" />
                         </div>
                         <p className="text-sm font-medium">AI 正在组织语言...</p>
                    </div>
                )}
                
                {/* Blinking Cursor Indicator if writing */}
                {section.status === 'writing' && (
                    <div className="mt-2 w-2 h-4 bg-indigo-500 animate-pulse inline-block"></div>
                )}
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
