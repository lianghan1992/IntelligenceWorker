
import React from 'react';
import { 
    SparklesIcon, RefreshIcon, CheckCircleIcon, 
    DocumentTextIcon, GlobeIcon, BrainIcon, SearchIcon, PencilIcon,
    ArrowRightIcon, DatabaseIcon
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
    queries?: string[];
    retrievedCount?: number;
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
            <h2 className="text-2xl font-bold text-slate-800">正在执行全网深度扫描...</h2>
            <p className="text-slate-500 text-sm mt-2">Agent 正在分析各方情报以定位核心业务逻辑</p>
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
                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">{log.type}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const OutlineVisualizer: React.FC<{ outline: { title: string; instruction: string }[] }> = ({ outline }) => (
    <div className="w-full max-w-3xl mx-auto py-10">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-indigo-600"/> 研报大纲规划
        </h2>
        <div className="space-y-4">
            {outline.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-start animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-sm">
                        {idx + 1}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 text-lg">{item.title}</h4>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.instruction}</p>
                    </div>
                </div>
            ))}
             <div className="flex items-center justify-center py-10">
                 <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold animate-pulse">
                     <RefreshIcon className="w-4 h-4 animate-spin"/> 正在细化分析粒度...
                 </div>
             </div>
        </div>
    </div>
);

// --- 章节检索状态面板 ---
const SectionInsightPanel: React.FC<{ queries: string[]; count: number; phase: string }> = ({ queries, count, phase }) => {
    return (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${phase === 'writing' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        {phase === 'analyzing' && <BrainIcon className="w-4 h-4 animate-pulse" />}
                        {phase === 'searching' && <SearchIcon className="w-4 h-4 animate-bounce" />}
                        {phase === 'writing' && <PencilIcon className="w-4 h-4 animate-pulse" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {phase === 'analyzing' ? '正在规划本章检索词' : 
                         phase === 'searching' ? '正在执行语义搜索' : '正在根据情报撰写'}
                    </span>
                </div>
                {count > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black shadow-lg shadow-blue-500/20">
                        <DatabaseIcon className="w-3 h-3" />
                        命中 {count} 条情报
                    </div>
                )}
            </div>
            
            <div className="flex flex-wrap gap-2">
                {queries.length > 0 ? (
                    queries.map((q, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 shadow-sm animate-in zoom-in">
                            <span className="text-indigo-400">#</span> {q}
                        </div>
                    ))
                ) : (
                    <div className="text-[11px] text-slate-400 italic">正在思考检索策略...</div>
                )}
            </div>
        </div>
    );
};

const ReportViewer: React.FC<{ 
    sections: ReportSection[]; 
    topic: string; 
    processingIndex?: number;
    processingPhase?: 'analyzing' | 'searching' | 'writing';
}> = ({ sections, topic, processingIndex, processingPhase }) => {
    
    const activeRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (processingIndex !== undefined && processingIndex >= 0 && activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [processingIndex]);

    return (
        <div className="w-full max-w-4xl mx-auto bg-white min-h-full shadow-2xl my-8 md:my-16 p-8 md:p-20 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="border-b-4 border-slate-900 pb-8 mb-16 text-center">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tighter leading-tight uppercase">{topic}</h1>
                <div className="flex items-center justify-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    <span>Automated Deep Research</span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                    <span>{new Date().toLocaleDateString()}</span>
                </div>
            </div>
            
            <div className="space-y-20">
                {sections.map((section, idx) => {
                    const isActive = idx === processingIndex;
                    return (
                        <section 
                            key={idx} 
                            ref={isActive ? activeRef : null}
                            className={`relative transition-all duration-700 ${isActive ? 'scale-[1.02]' : ''}`}
                        >
                            <div className="flex items-baseline gap-4 mb-8">
                                <span className="text-6xl font-black text-slate-100 select-none leading-none">0{idx + 1}</span>
                                <h2 className="text-3xl font-black text-slate-800 border-b-2 border-slate-100 pb-2 flex-1">{section.title}</h2>
                            </div>

                            {isActive && processingPhase && (
                                <SectionInsightPanel 
                                    queries={section.queries || []} 
                                    count={section.retrievedCount || 0}
                                    phase={processingPhase}
                                />
                            )}
                            
                            <div className="relative">
                                <article 
                                    className="prose prose-slate max-w-none prose-p:text-justify prose-p:leading-loose prose-strong:text-slate-900 prose-headings:font-black"
                                    dangerouslySetInnerHTML={{ __html: marked.parse(section.content || '') as string }}
                                />
                                {isActive && !section.content && processingPhase !== 'analyzing' && (
                                    <div className="flex flex-col items-center justify-center py-10 text-indigo-400 gap-3">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-widest">AI 正在根据获取的情报进行逻辑合成...</span>
                                    </div>
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>
            
            <div className="mt-32 pt-10 border-t border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    Generated by StratifyAI • Autonomous Intelligence Engine v4.0
                </p>
            </div>
        </div>
    );
};

export const ReportCanvas: React.FC<ReportCanvasProps> = ({ 
    status, logs, outline, sections, topic, processingIndex, processingPhase 
}) => {
    return (
        <div className="flex-1 h-full overflow-y-auto bg-slate-50 custom-scrollbar relative scroll-smooth">
            <div className="min-h-full">
                {status === 'idle' && <IdleState />}
                
                {status === 'researching' && (
                    <div className="px-6"><ResearchVisualizer logs={logs} /></div>
                )}
                
                {status === 'planning' && (
                    <div className="px-6"><OutlineVisualizer outline={outline} /></div>
                )}
                
                {(status === 'generating' || status === 'done') && (
                    <div className="px-4 md:px-10">
                        <ReportViewer 
                            sections={sections} 
                            topic={topic} 
                            processingIndex={processingIndex}
                            processingPhase={processingPhase}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
