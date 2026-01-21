
import React from 'react';
import { 
    SparklesIcon, RefreshIcon, CheckCircleIcon, 
    DocumentTextIcon, GlobeIcon, BrainIcon, SearchIcon, PencilIcon,
    ArrowRightIcon, DatabaseIcon, CheckIcon
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
    status: 'idle' | 'researching' | 'planning' | 'waiting_confirmation' | 'generating' | 'done';
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
        <p className="text-sm mt-2 max-w-xs text-center leading-relaxed">
            输入主题后，AI 将按顺序为您规划思路、深度检索并逐字撰写各章节内容。
        </p>
    </div>
);

// 研究思路规划展示 (流式)
const ReasoningVisualizer: React.FC<{ 
    outline: { title: string; instruction: string }[]; 
    status: string;
    onConfirm?: () => void;
}> = ({ outline, status, onConfirm }) => (
    <div className="w-full max-w-3xl mx-auto py-12 px-6">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <BrainIcon className="w-7 h-7 text-indigo-600"/> 研究思路规划
            </h2>
            {status === 'planning' && (
                <div className="flex items-center gap-2 text-indigo-500 text-xs font-bold animate-pulse">
                    <RefreshIcon className="w-4 h-4 animate-spin" />
                    逐字解析中...
                </div>
            )}
        </div>
        
        <div className="space-y-4 mb-16">
            {outline.map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex gap-5 items-start animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-sm border border-indigo-100">
                        {idx + 1}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 text-lg">{item.title}</h4>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.instruction}</p>
                    </div>
                </div>
            ))}
        </div>

        {status === 'waiting_confirmation' && (
            <div className="sticky bottom-10 flex justify-center animate-in slide-in-from-bottom-4">
                <button 
                    onClick={onConfirm}
                    className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-2xl shadow-indigo-200 transition-all transform active:scale-95 flex items-center gap-3"
                >
                    <CheckIcon className="w-6 h-6" />
                    <span>确认思路，按顺序开始撰写</span>
                </button>
            </div>
        )}
    </div>
);

// 章节执行状态指示器
const SectionStepIndicator: React.FC<{ queries: string[]; count: number; phase: string }> = ({ queries, count, phase }) => (
    <div className="mb-8 p-5 bg-slate-50 border border-indigo-100 rounded-2xl animate-in fade-in ring-1 ring-indigo-500/5">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${phase === 'writing' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {phase === 'analyzing' && <BrainIcon className="w-4 h-4 animate-pulse" />}
                    {phase === 'searching' && <SearchIcon className="w-4 h-4 animate-bounce" />}
                    {phase === 'writing' && <PencilIcon className="w-4 h-4 animate-pulse" />}
                </div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                    {phase === 'analyzing' ? '正在流式规划本章检索词' : 
                     phase === 'searching' ? '正在执行深度情报检索' : '正在根据情报流式撰写正文'}
                </span>
            </div>
            {count > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black shadow-lg">
                    <DatabaseIcon className="w-3 h-3" />
                    命中 {count} 条相关情报
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
        <div className="w-full max-w-4xl mx-auto bg-white min-h-full shadow-2xl my-12 p-8 md:p-24 rounded-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="border-b-4 border-slate-900 pb-10 mb-20 text-center">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tighter leading-tight uppercase">{topic}</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Autonomous AI Research Intelligence Platform</p>
            </div>
            
            <div className="space-y-32">
                {sections.map((section, idx) => {
                    const isActive = idx === processingIndex;
                    const hasContent = !!section.content;

                    return (
                        <section 
                            key={idx} 
                            ref={isActive ? activeRef : null}
                            className={`relative transition-all duration-700 ${isActive ? 'scale-[1.01]' : ''} ${!isActive && !hasContent ? 'opacity-20' : 'opacity-100'}`}
                        >
                            <div className="flex items-baseline gap-4 mb-10">
                                <span className={`text-7xl font-black select-none leading-none ${isActive ? 'text-indigo-600' : 'text-slate-100'}`}>0{idx + 1}</span>
                                <h2 className={`text-3xl font-black border-b-2 pb-2 flex-1 transition-colors ${isActive ? 'text-slate-900 border-indigo-500' : 'text-slate-800 border-slate-100'}`}>
                                    {section.title}
                                </h2>
                            </div>

                            {isActive && processingPhase && (
                                <SectionStepIndicator 
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
                                {isActive && !section.content && processingPhase === 'writing' && (
                                    <div className="flex flex-col items-center justify-center py-20 text-indigo-400 gap-4">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
                                            <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                            <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">正在逻辑合成深度正文...</span>
                                    </div>
                                )}
                            </div>
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
            <div className="min-h-full">
                {status === 'idle' && <IdleState />}
                
                {(status === 'researching' || status === 'planning' || status === 'waiting_confirmation') && (
                    <ReasoningVisualizer outline={outline} status={status} onConfirm={onConfirmOutline} />
                )}
                
                {(status === 'generating' || status === 'done') && (
                    <div className="px-4 md:px-12 py-10">
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
