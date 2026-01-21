
import React from 'react';
import { 
    SparklesIcon, RefreshIcon, CheckCircleIcon, 
    DocumentTextIcon, GlobeIcon, BrainIcon, SearchIcon, PencilIcon,
    ArrowRightIcon, DatabaseIcon, CheckIcon
} from '../../../icons';
import { marked } from 'marked';

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
    status: 'idle' | 'researching' | 'planning' | 'waiting_confirmation' | 'generating' | 'done';
    logs: ResearchLog[];
    outline: { title: string; instruction: string }[];
    sections: ReportSection[];
    topic: string;
    processingIndex?: number;
    processingPhase?: 'analyzing' | 'searching' | 'writing';
    onConfirmOutline?: () => void;
}

const IdleState = () => (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200">
            <SparklesIcon className="w-12 h-12 text-indigo-300"/>
        </div>
        <h3 className="text-xl font-bold text-slate-700">万能研报生成器</h3>
        <p className="text-sm mt-2 max-w-xs text-center">输入主题，AI 将自动规划思路并分章节检索撰写长文。</p>
    </div>
);

// 研究思路规划视图
const ReasoningVisualizer: React.FC<{ 
    outline: { title: string; instruction: string }[]; 
    status: string;
    onConfirm?: () => void;
}> = ({ outline, status, onConfirm }) => (
    <div className="w-full max-w-3xl mx-auto py-12">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <BrainIcon className="w-7 h-7 text-indigo-600"/> 研究思路规划
            </h2>
            {status === 'planning' && <RefreshIcon className="w-5 h-5 text-indigo-500 animate-spin" />}
        </div>
        
        <div className="space-y-4 mb-12">
            {outline.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex gap-4 items-start animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-sm border border-indigo-100">
                        {idx + 1}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 text-lg">{item.title}</h4>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.instruction}</p>
                    </div>
                </div>
            ))}
            {status === 'planning' && (
                <div className="h-20 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-indigo-400 text-xs font-bold animate-pulse">
                    AI 正在构建后续章节思路...
                </div>
            )}
        </div>

        {status === 'waiting_confirmation' && (
            <div className="sticky bottom-8 flex justify-center animate-in slide-in-from-bottom-4">
                <button 
                    onClick={onConfirm}
                    className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-indigo-200 transition-all transform active:scale-95 flex items-center gap-3"
                >
                    <CheckIcon className="w-6 h-6" />
                    <span>确认思路，开始分章节撰写</span>
                </button>
            </div>
        )}
    </div>
);

// 章节执行状态小部件
const SectionStepIndicator: React.FC<{ queries: string[]; count: number; phase: string }> = ({ queries, count, phase }) => (
    <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${phase === 'writing' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {phase === 'analyzing' && <BrainIcon className="w-4 h-4 animate-pulse" />}
                    {phase === 'searching' && <SearchIcon className="w-4 h-4 animate-bounce" />}
                    {phase === 'writing' && <PencilIcon className="w-4 h-4 animate-pulse" />}
                </div>
                <span className="text-xs font-black text-slate-700 uppercase">
                    {phase === 'analyzing' ? '正在规划本章检索词' : 
                     phase === 'searching' ? '正在执行深度情报检索' : '正在根据情报流式撰写'}
                </span>
            </div>
            {count > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black shadow-lg">
                    <DatabaseIcon className="w-3 h-3" />
                    命中 {count} 条参考资料
                </div>
            )}
        </div>
        <div className="flex flex-wrap gap-2">
            {queries.length > 0 ? queries.map((q, i) => (
                <div key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 shadow-sm animate-in zoom-in">
                    # {q}
                </div>
            )) : <div className="text-[10px] text-slate-400 italic">正在思考检索策略...</div>}
        </div>
    </div>
);

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
        <div className="w-full max-w-4xl mx-auto bg-white min-h-full shadow-2xl my-12 p-12 md:p-20 rounded-lg relative">
            <div className="border-b-4 border-slate-900 pb-8 mb-16 text-center">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 uppercase tracking-tighter">{topic}</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Seres AI Autonomous Research Report</p>
            </div>
            
            <div className="space-y-24">
                {sections.map((section, idx) => {
                    const isActive = idx === processingIndex;
                    return (
                        <section key={idx} ref={isActive ? activeRef : null} className={`transition-all duration-700 ${isActive ? 'scale-[1.01]' : ''}`}>
                            <div className="flex items-baseline gap-4 mb-8">
                                <span className="text-6xl font-black text-slate-100 select-none">0{idx + 1}</span>
                                <h2 className="text-3xl font-black text-slate-800 border-b-2 border-slate-100 pb-2 flex-1">{section.title}</h2>
                            </div>

                            {isActive && processingPhase && (
                                <SectionStepIndicator 
                                    queries={section.queries || []} 
                                    count={section.retrievedCount || 0}
                                    phase={processingPhase}
                                />
                            )}
                            
                            <article 
                                className="prose prose-slate max-w-none prose-p:text-justify prose-p:leading-relaxed prose-strong:text-slate-900 prose-headings:font-black"
                                dangerouslySetInnerHTML={{ __html: marked.parse(section.content || '') as string }}
                            />

                            {isActive && !section.content && (
                                <div className="h-32 flex flex-col items-center justify-center text-indigo-400 gap-3">
                                    <RefreshIcon className="w-6 h-6 animate-spin"/>
                                    <span className="text-xs font-bold uppercase tracking-widest animate-pulse">正在同步情报资料并生成正文...</span>
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

export const ReportCanvas: React.FC<ReportCanvasProps> = ({ 
    status, outline, sections, topic, processingIndex, processingPhase, onConfirmOutline 
}) => {
    return (
        <div className="flex-1 h-full overflow-y-auto bg-slate-50 custom-scrollbar relative scroll-smooth">
            <div className="min-h-full p-6">
                {status === 'idle' && <IdleState />}
                
                {(status === 'researching' || status === 'planning' || status === 'waiting_confirmation') && (
                    <ReasoningVisualizer outline={outline} status={status} onConfirm={onConfirmOutline} />
                )}
                
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
