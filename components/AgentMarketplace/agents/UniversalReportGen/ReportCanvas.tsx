
import React, { useRef, useEffect } from 'react';
import { 
    SparklesIcon, CheckCircleIcon, RefreshIcon,
    DatabaseIcon
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
    references: { title: string; url: string; source: string }[];
}

interface ReportCanvasProps {
    mainStatus: GenStatus;
    topic: string;
    outline: { title: string; instruction: string }[]; // Keep for compatibility if needed
    sections: ReportSection[];
    currentSectionIdx: number;
    onStart: () => void;
    onRetry: (idx: number) => void;
    seedReferences?: any[]; // Keep interface
    intentSummary?: string; // Keep interface
}

const ActiveSectionCard: React.FC<{ section: ReportSection }> = ({ section }) => {
    const logEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [section.logs]);

    return (
        <div className="my-8 bg-white rounded-2xl border border-indigo-100 shadow-xl overflow-hidden relative animate-in slide-in-from-bottom-8 duration-700 ring-4 ring-indigo-50/50">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
                <div className="h-full bg-indigo-500 animate-loading-bar origin-left"></div>
            </div>
            
            <div className="p-6 md:p-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm shadow-md animate-pulse">
                                <RefreshIcon className="w-4 h-4 animate-spin" />
                            </span>
                            {section.title}
                        </h2>
                        <div className="mt-2 flex items-center gap-3 ml-11">
                            <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                                section.status === 'planning' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                section.status === 'searching' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                'bg-indigo-50 text-indigo-600 border-indigo-200'
                            }`}>
                                {section.status === 'planning' && 'Thinking...'}
                                {section.status === 'searching' && 'Searching...'}
                                {section.status === 'writing' && 'Writing...'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Terminal Area */}
                    <div className="lg:col-span-2 bg-[#0f172a] rounded-xl p-4 font-mono text-[10px] h-48 overflow-y-auto custom-scrollbar-dark shadow-inner text-slate-300 border border-slate-700">
                        {section.logs.map((log, i) => (
                            <div key={i} className="mb-1.5 flex gap-2">
                                <span className="text-slate-500 font-bold">{'>'}</span>
                                <span className={i === section.logs.length - 1 ? 'text-cyan-400 font-bold' : 'opacity-80'}>{log}</span>
                            </div>
                        ))}
                        <div ref={logEndRef} />
                        <div className="w-1.5 h-3 bg-indigo-500 animate-pulse inline-block ml-1"></div>
                    </div>

                    {/* Preview Area */}
                    <div className="lg:col-span-3 flex flex-col gap-3">
                        {section.references.length > 0 && (
                            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <DatabaseIcon className="w-3.5 h-3.5" /> 实时引用来源
                                </h4>
                                <div className="space-y-1.5">
                                    {section.references.slice(0, 3).map((ref, i) => (
                                        <div key={i} className="bg-white px-2 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 border border-slate-200 truncate flex items-center gap-2 shadow-sm">
                                            <span className="w-3.5 h-3.5 bg-blue-100 text-blue-600 flex items-center justify-center rounded text-[8px]">{i+1}</span>
                                            {ref.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-center shadow-sm">
                            <p className="text-xs text-slate-500 leading-relaxed italic opacity-80">
                                {section.content ? section.content.slice(-150) + "..." : "AI 正在组织语言..."}
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
    mainStatus, topic, sections, currentSectionIdx
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    return (
        <div className="h-full overflow-y-auto bg-slate-50 custom-scrollbar scroll-smooth p-8">
            <div className="max-w-4xl mx-auto pb-32">
                <div className="text-center mb-16 pt-8">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">{topic || '等待研究开始...'}</h1>
                    <div className="flex justify-center gap-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        <span>Gemini Deep Research Flow</span>
                        <span>Multi-Step Execution</span>
                    </div>
                </div>

                {sections.map((section, idx) => {
                    if (section.status === 'completed') {
                        return (
                            <div key={section.id} className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                        <span className="text-slate-300 font-black text-3xl select-none opacity-30">0{idx+1}</span>
                                        {section.title}
                                    </h2>
                                    <CheckCircleIcon className="w-6 h-6 text-green-500 ml-auto" />
                                </div>
                                <article 
                                    className="prose prose-slate max-w-none prose-p:text-base prose-p:leading-relaxed prose-headings:font-bold prose-a:text-indigo-600 prose-img:rounded-2xl"
                                    dangerouslySetInnerHTML={{ __html: marked.parse(section.content) as string }}
                                />
                                {section.references.length > 0 && (
                                    <div className="mt-8 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {section.references.map((r, ri) => (
                                            <a key={ri} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 px-3 py-2 rounded-lg truncate">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0"></span>
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

                    // Future/Pending sections
                    return (
                        <div key={section.id} className="mb-6 p-6 border-2 border-dashed border-slate-200 rounded-3xl text-center opacity-40 grayscale select-none bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-400">{section.title}</h3>
                            <p className="text-xs text-slate-400 mt-2">待研究</p>
                        </div>
                    );
                })}

                {mainStatus === 'finished' && (
                    <div className="mt-20 p-12 bg-slate-900 rounded-[40px] text-center space-y-6 animate-in zoom-in duration-1000 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <SparklesIcon className="w-64 h-64 text-white" />
                        </div>
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/50">
                                <CheckCircleIcon className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-black text-white">深度研究报告交付完毕</h2>
                            <p className="text-slate-400 text-base max-w-lg mx-auto leading-relaxed">
                                已完成全流程自动化研究。您可以复制上方内容或使用截图保存。
                            </p>
                        </div>
                    </div>
                )}
                
                <div ref={bottomRef} className="h-20"></div>
            </div>
        </div>
    );
};
