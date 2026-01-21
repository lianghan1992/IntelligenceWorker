
import React from 'react';
import { 
    SparklesIcon, RefreshIcon, CheckCircleIcon, 
    DocumentTextIcon, GlobeIcon, BrainIcon, SearchIcon, PencilIcon
} from '../../../icons';
import { marked } from 'marked';

// --- Types ---
export interface ResearchLog {
    id: string;
    message: string;
    type: 'search' | 'read' | 'plan';
    status: 'loading' | 'done';
}

export interface ReportSection {
    title: string;
    content: string;
}

interface ReportCanvasProps {
    status: 'idle' | 'researching' | 'planning' | 'generating' | 'done';
    logs: ResearchLog[];
    outline: { title: string; instruction: string }[];
    sections: ReportSection[];
    topic: string;
    processingIndex?: number;
    processingPhase?: 'analyzing' | 'searching' | 'writing';
}

// --- Sub-components ---

const IdleState = () => (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200">
            <SparklesIcon className="w-12 h-12 text-indigo-300"/>
        </div>
        <h3 className="text-xl font-bold text-slate-700">万能研报助手</h3>
        <p className="text-sm mt-2 max-w-xs text-center leading-relaxed">
            请在右侧输入研究主题，AI 将自动进行全网检索、构建研究思路并撰写报告。
        </p>
    </div>
);

const ResearchVisualizer: React.FC<{ logs: ResearchLog[] }> = ({ logs }) => (
    <div className="w-full max-w-2xl mx-auto py-10 space-y-6">
        <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 animate-pulse">
                <GlobeIcon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">正在进行深度背景调查...</h2>
            <p className="text-slate-500 text-sm mt-2">AI Agent 正在分析全网资料以构建最佳研究视角</p>
        </div>

        <div className="space-y-3">
            {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex-shrink-0">
                        {log.status === 'loading' ? (
                            <RefreshIcon className="w-5 h-5 text-indigo-500 animate-spin" />
                        ) : (
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700">{log.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wider">{log.type}</p>
                    </div>
                    {log.status === 'loading' && (
                        <div className="text-xs font-mono text-indigo-400">Processing...</div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

const OutlineVisualizer: React.FC<{ outline: { title: string; instruction: string }[] }> = ({ outline }) => (
    <div className="w-full max-w-3xl mx-auto py-10">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-indigo-600"/> 研究思路规划
        </h2>
        <div className="space-y-4">
            {outline.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-start animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-sm">
                        {idx + 1}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-lg">{item.title}</h4>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.instruction}</p>
                    </div>
                </div>
            ))}
             <div className="flex items-center justify-center py-8">
                 <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold animate-pulse">
                     <RefreshIcon className="w-4 h-4 animate-spin"/> 正在规划大纲...
                 </div>
             </div>
        </div>
    </div>
);

const ProcessingStatusBadge: React.FC<{ phase: string }> = ({ phase }) => {
    let icon, text, color;
    switch(phase) {
        case 'analyzing':
            icon = <BrainIcon className="w-4 h-4 animate-pulse" />;
            text = "规划检索词...";
            color = "bg-purple-100 text-purple-700";
            break;
        case 'searching':
            icon = <SearchIcon className="w-4 h-4 animate-bounce" />;
            text = "正在全网检索...";
            color = "bg-blue-100 text-blue-700";
            break;
        case 'writing':
            icon = <PencilIcon className="w-4 h-4 animate-pulse" />;
            text = "AI 正在持续撰写...";
            color = "bg-green-100 text-green-700";
            break;
        default:
            return null;
    }
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${color} shadow-sm border border-white/50 mb-4 animate-in fade-in`}>
            {icon}
            <span>{text}</span>
        </div>
    );
}

const ReportViewer: React.FC<{ 
    sections: ReportSection[]; 
    topic: string; 
    processingIndex?: number;
    processingPhase?: 'analyzing' | 'searching' | 'writing';
}> = ({ sections, topic, processingIndex, processingPhase }) => {
    
    // Auto scroll to active section
    const activeRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (processingIndex !== undefined && processingIndex >= 0 && activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [processingIndex]);

    return (
        <div className="w-full max-w-4xl mx-auto bg-white min-h-[90vh] shadow-lg my-8 p-10 md:p-16 rounded-sm">
            <div className="border-b border-slate-200 pb-8 mb-10 text-center">
                <h1 className="text-4xl font-black text-slate-900 mb-4">{topic}</h1>
                <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">Auto Insight AI Research Report</p>
            </div>
            
            <div className="space-y-12">
                {sections.map((section, idx) => {
                    const isActive = idx === processingIndex;
                    return (
                        <section 
                            key={idx} 
                            ref={isActive ? activeRef : null}
                            className={`animate-in fade-in duration-700 ${isActive ? 'ring-2 ring-indigo-500/10 rounded-xl p-4 -m-4 bg-slate-50/50 transition-all' : ''}`}
                        >
                            <h2 className="text-2xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                                <span className="text-indigo-200 font-black text-3xl opacity-50 select-none">0{idx + 1}</span>
                                {section.title}
                            </h2>

                            {isActive && processingPhase && (
                                <ProcessingStatusBadge phase={processingPhase} />
                            )}
                            
                            <article 
                                className="prose prose-slate max-w-none prose-headings:font-bold prose-p:text-justify prose-p:leading-relaxed prose-li:marker:text-indigo-400"
                                dangerouslySetInnerHTML={{ __html: marked.parse(section.content || '') as string }}
                            />
                            
                            {!section.content && !isActive && (
                                <div className="h-20 flex items-center justify-center bg-slate-50 rounded border border-dashed border-slate-200 text-slate-400 text-xs">
                                    等待生成...
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
            
            <div className="mt-20 pt-10 border-t border-slate-100 text-center text-slate-300 text-xs">
                Generated by StratifyAI Engine
            </div>
        </div>
    );
};

export const ReportCanvas: React.FC<ReportCanvasProps> = ({ 
    status, logs, outline, sections, topic, processingIndex, processingPhase 
}) => {
    return (
        <div className="flex-1 h-full overflow-y-auto bg-slate-50 custom-scrollbar relative scroll-smooth">
            <div className="min-h-full p-6">
                {status === 'idle' && <IdleState />}
                
                {status === 'researching' && <ResearchVisualizer logs={logs} />}
                
                {status === 'planning' && <OutlineVisualizer outline={outline} />}
                
                {(status === 'generating' || status === 'done') && (
                    <ReportViewer 
                        sections={sections} 
                        topic={topic} 
                        processingIndex={processingIndex}
                        processingPhase={processingPhase}
                    />
                )}
            </div>
        </div>
    );
};
