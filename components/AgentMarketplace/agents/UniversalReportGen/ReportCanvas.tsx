
import React from 'react';
import { 
    SparklesIcon, RefreshIcon, CheckCircleIcon, 
    BrainIcon, SearchIcon, PencilIcon,
    DatabaseIcon, CheckIcon, ShieldExclamationIcon, ClockIcon
} from '../../../icons';
import { marked } from 'marked';

// --- Types ---
export interface ReportSection {
    title: string;
    content: string;
    queries?: string[];
    retrievedCount?: number;
    // 新增状态字段，精准控制UI
    status: 'pending' | 'analyzing' | 'searching' | 'writing' | 'completed' | 'error';
}

interface ReportCanvasProps {
    status: 'idle' | 'researching' | 'planning' | 'waiting_confirmation' | 'generating' | 'done';
    outline: { title: string; instruction: string }[];
    sections: ReportSection[];
    topic: string;
    processingIndex?: number;
    onConfirmOutline?: () => void;
}

const IdleState = () => (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200">
            <SparklesIcon className="w-12 h-12 text-indigo-300"/>
        </div>
        <h3 className="text-xl font-bold text-slate-700">万能研报生成器</h3>
        <p className="text-sm mt-2 max-w-xs text-center leading-relaxed">
            输入主题，AI 将按顺序为您规划思路、深度检索并逐字撰写万字长文。
        </p>
    </div>
);

// 阶段指示器 (仅在进行中或完成时显示)
const SectionStatusBadge: React.FC<{ status: string; count?: number }> = ({ status, count }) => {
    switch (status) {
        case 'pending':
            return <div className="text-xs text-slate-300 font-bold flex items-center gap-1"><ClockIcon className="w-3 h-3"/> 等待生成</div>;
        case 'analyzing':
            return <div className="text-xs text-indigo-500 font-bold flex items-center gap-1 animate-pulse"><BrainIcon className="w-3 h-3"/> 规划检索词...</div>;
        case 'searching':
            return <div className="text-xs text-blue-500 font-bold flex items-center gap-1 animate-bounce"><SearchIcon className="w-3 h-3"/> 检索全网情报...</div>;
        case 'writing':
            return <div className="text-xs text-purple-500 font-bold flex items-center gap-1 animate-pulse"><PencilIcon className="w-3 h-3"/> AI 撰写中...</div>;
        case 'completed':
            return (
                <div className="flex items-center gap-3">
                     <div className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircleIcon className="w-3.5 h-3.5"/> 已完成</div>
                     {count && count > 0 ? (
                        <div className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                            <DatabaseIcon className="w-3 h-3"/> 引用 {count} 篇
                        </div>
                     ) : null}
                </div>
            );
        case 'error':
            return <div className="text-xs text-red-500 font-bold flex items-center gap-1"><ShieldExclamationIcon className="w-3.5 h-3.5"/> 生成中断</div>;
        default:
            return null;
    }
};

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
                    AI 正在思考大纲...
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
            {status === 'planning' && (
                <div className="h-20 flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-indigo-400 text-xs font-bold animate-pulse">
                    ... 正在规划下一章节 ...
                </div>
            )}
        </div>

        {status === 'waiting_confirmation' && outline.length > 0 && (
            <div className="sticky bottom-10 flex justify-center animate-in slide-in-from-bottom-4 z-20">
                <button 
                    onClick={onConfirm}
                    className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-2xl shadow-indigo-200 transition-all transform active:scale-95 flex items-center gap-3"
                >
                    <CheckIcon className="w-6 h-6" />
                    <span>确认大纲，开始按序撰写</span>
                </button>
            </div>
        )}
    </div>
);

const ReportViewer: React.FC<{ 
    sections: ReportSection[]; 
    topic: string; 
    processingIndex?: number;
}> = ({ sections, topic, processingIndex }) => {
    
    const activeRef = React.useRef<HTMLDivElement>(null);
    
    // 自动滚动到当前正在生成的章节
    React.useEffect(() => {
        if (processingIndex !== undefined && processingIndex >= 0 && activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [processingIndex]);

    return (
        <div className="w-full max-w-4xl mx-auto bg-white min-h-full shadow-2xl my-12 p-8 md:p-24 rounded-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="border-b-4 border-slate-900 pb-10 mb-20 text-center">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tighter leading-tight uppercase">{topic || '未命名报告'}</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Autonomous AI Research Intelligence Platform</p>
            </div>
            
            <div className="space-y-24">
                {sections.map((section, idx) => {
                    const isActive = idx === processingIndex;
                    const isPending = section.status === 'pending';
                    const hasContent = !!section.content;

                    return (
                        <section 
                            key={idx} 
                            ref={isActive ? activeRef : null}
                            className={`relative transition-all duration-500 ${isPending ? 'opacity-40 grayscale' : 'opacity-100'}`}
                        >
                            <div className="flex items-center gap-6 mb-8 pb-4 border-b border-slate-100">
                                <span className={`text-6xl font-black select-none leading-none ${isActive || hasContent ? 'text-indigo-600' : 'text-slate-200'}`}>
                                    0{idx + 1}
                                </span>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-black text-slate-900 mb-1">{section.title}</h2>
                                    <SectionStatusBadge status={section.status} count={section.retrievedCount} />
                                </div>
                            </div>
                            
                            {/* 检索词展示区 */}
                            {section.queries && section.queries.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6 opacity-70">
                                    {section.queries.map((q, i) => (
                                        <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200"># {q}</span>
                                    ))}
                                </div>
                            )}

                            <div className="relative min-h-[100px]">
                                {hasContent ? (
                                    <article 
                                        className="prose prose-slate max-w-none prose-p:text-justify prose-p:leading-loose prose-strong:text-slate-900 prose-headings:font-black"
                                        dangerouslySetInnerHTML={{ __html: marked.parse(section.content) as string }}
                                    />
                                ) : (
                                    isActive && section.status === 'writing' && (
                                        <div className="space-y-3 animate-pulse">
                                            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                            <div className="h-4 bg-slate-100 rounded w-full"></div>
                                            <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                                            <div className="h-4 bg-slate-100 rounded w-4/5"></div>
                                        </div>
                                    )
                                )}
                                
                                {section.status === 'error' && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                                        该章节生成遭遇错误。内容可能不完整。
                                    </div>
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>
            
            <div className="mt-40 pt-10 border-t border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    Generated by StratifyAI • Autonomous Intelligence Engine v5.0
                </p>
            </div>
        </div>
    );
};

export const ReportCanvas: React.FC<ReportCanvasProps> = ({ 
    status, outline, sections, topic, processingIndex, onConfirmOutline 
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
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
