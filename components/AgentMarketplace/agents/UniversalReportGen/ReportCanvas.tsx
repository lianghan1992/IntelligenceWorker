
import React, { useRef, useEffect } from 'react';
import { 
    SparklesIcon, BrainIcon, SearchIcon, PencilIcon, 
    CheckCircleIcon, ShieldExclamationIcon, RefreshIcon,
    DocumentTextIcon, DatabaseIcon, ArrowRightIcon
} from '../../../icons';
import { marked } from 'marked';

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
    mainStatus: 'idle' | 'planning' | 'review' | 'generating' | 'finished';
    topic: string;
    outline: { title: string; instruction: string }[];
    sections: ReportSection[];
    currentSectionIdx: number;
    onStart: () => void;
    onRetry: (idx: number) => void;
}

// --- 组件：空状态/欢迎页 ---
const WelcomeView = () => (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-slate-200">
            <SparklesIcon className="w-10 h-10 text-indigo-400"/>
        </div>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">深度研报生成器</h2>
        <p className="text-sm max-w-md text-center leading-relaxed">
            全自动化的研究员。输入主题后，AI 将自动拆解大纲、全网搜集信源、阅读文献并撰写万字长文。
        </p>
    </div>
);

// --- 组件：大纲预览页 ---
const OutlinePreview: React.FC<{ 
    topic: string; 
    outline: { title: string; instruction: string }[];
    onStart: () => void; 
}> = ({ topic, outline, onStart }) => (
    <div className="max-w-3xl mx-auto py-12 px-6 h-full overflow-y-auto custom-scrollbar">
        <div className="mb-8 text-center">
            <h1 className="text-3xl font-black text-slate-900 mb-2">{topic}</h1>
            <p className="text-slate-500 text-sm">AI 已为您规划以下研究架构，确认无误后即可开始撰写。</p>
        </div>

        <div className="space-y-4 mb-20">
            {outline.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex gap-4 transition-all hover:shadow-md hover:border-indigo-200">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-sm">
                        {idx + 1}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">{item.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{item.instruction}</p>
                    </div>
                </div>
            ))}
        </div>

        <div className="fixed bottom-8 left-0 right-[400px] flex justify-center pointer-events-none">
            <button 
                onClick={onStart}
                className="pointer-events-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full shadow-xl shadow-indigo-200 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-2"
            >
                <SparklesIcon className="w-5 h-5" />
                确认架构并生成全网报告
            </button>
        </div>
    </div>
);

// --- 组件：正在工作的 Agent 卡片 ---
const ActiveAgentCard: React.FC<{ section: ReportSection }> = ({ section }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto scroll logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [section.logs]);

    return (
        <div className="my-8 bg-white rounded-2xl border border-indigo-100 shadow-xl overflow-hidden relative animate-in fade-in slide-in-from-bottom-4">
            {/* 顶部进度条 */}
            <div className="h-1 w-full bg-indigo-50">
                <div className="h-full bg-indigo-500 animate-progress-indeterminate"></div>
            </div>

            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-extrabold text-slate-800">{section.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                                {section.status === 'planning' && <BrainIcon className="w-3 h-3 animate-pulse"/>}
                                {section.status === 'searching' && <SearchIcon className="w-3 h-3 animate-bounce"/>}
                                {section.status === 'writing' && <PencilIcon className="w-3 h-3 animate-pulse"/>}
                                {section.status === 'planning' ? '规划思路中...' : 
                                 section.status === 'searching' ? '全网检索中...' : '撰写正文中...'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Terminal Logs */}
                    <div className="flex-1 bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 h-48 overflow-y-auto custom-scrollbar shadow-inner" ref={scrollRef}>
                        {section.logs.map((log, i) => (
                            <div key={i} className="mb-1.5 flex gap-2">
                                <span className="text-slate-600 mr-1">{'>'}</span>
                                <span className={i === section.logs.length - 1 ? 'text-green-400 font-bold' : ''}>{log}</span>
                            </div>
                        ))}
                        <div className="animate-pulse text-indigo-400 mt-2">_ Cursor Active</div>
                    </div>

                    {/* Right: Context / Preview */}
                    <div className="flex-1 flex flex-col gap-3">
                        {section.references.length > 0 && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <DatabaseIcon className="w-3 h-3" /> 已引用资料
                                </h4>
                                <div className="space-y-2">
                                    {section.references.slice(0, 3).map((ref, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 shadow-sm">
                                            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i+1}</span>
                                            <span className="truncate flex-1">{ref.title}</span>
                                        </div>
                                    ))}
                                    {section.references.length > 3 && (
                                        <div className="text-[10px] text-slate-400 text-center italic">... 以及其他 {section.references.length - 3} 篇</div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {section.status === 'writing' && (
                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                <p className="text-xs text-indigo-800 leading-relaxed line-clamp-3 italic opacity-80">
                                    {section.content.slice(-100) || "正在构思..."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes progress-indeterminate {
                    0% { transform: translateX(-100%) scaleX(0.2); }
                    50% { transform: translateX(0%) scaleX(0.5); }
                    100% { transform: translateX(100%) scaleX(0.2); }
                }
                .animate-progress-indeterminate {
                    animation: progress-indeterminate 1.5s infinite linear;
                    width: 100%;
                    transform-origin: left;
                }
            `}</style>
        </div>
    );
};

// --- 组件：已完成的章节视图 ---
const CompletedSection: React.FC<{ section: ReportSection }> = ({ section }) => (
    <div className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex items-baseline gap-4 mb-6 border-b border-slate-100 pb-2">
            <h2 className="text-2xl font-black text-slate-900">{section.title}</h2>
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold">
                <CheckCircleIcon className="w-3.5 h-3.5" /> 已完成
            </div>
        </div>
        
        <article 
            className="prose prose-slate max-w-none prose-p:leading-loose prose-headings:font-bold prose-a:text-indigo-600"
            dangerouslySetInnerHTML={{ __html: marked.parse(section.content) as string }}
        />
        
        {section.references.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 mb-2">参考来源：</p>
                <div className="flex flex-wrap gap-2">
                    {section.references.map((ref, i) => (
                        <a key={i} href={ref.url} target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded hover:bg-slate-100 hover:text-indigo-600 transition-colors">
                            [{i+1}] {ref.title}
                        </a>
                    ))}
                </div>
            </div>
        )}
    </div>
);

// --- 主视图 ---
export const ReportCanvas: React.FC<ReportCanvasProps> = ({ 
    mainStatus, topic, outline, sections, currentSectionIdx, onStart, onRetry 
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom when generating
    useEffect(() => {
        if (mainStatus === 'generating' && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [sections, mainStatus]);

    if (mainStatus === 'idle') return <WelcomeView />;
    
    if (mainStatus === 'planning' || mainStatus === 'review') {
        return <OutlinePreview topic={topic} outline={outline} onStart={onStart} />;
    }

    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar scroll-smooth">
            <div className="max-w-4xl mx-auto px-6 md:px-12 py-12">
                {/* Title Header */}
                <div className="text-center mb-16 border-b-2 border-slate-900 pb-8">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">{topic}</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Autonomous Research Report
                    </p>
                </div>

                {/* Sections Loop */}
                {sections.map((section, idx) => {
                    // 1. 已完成：显示文档视图
                    if (section.status === 'completed') {
                        return <CompletedSection key={section.id} section={section} />;
                    }
                    
                    // 2. 正在进行/错误：显示 Agent 卡片
                    if (idx === currentSectionIdx) {
                        if (section.status === 'error') {
                            return (
                                <div key={section.id} className="my-8 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
                                    <ShieldExclamationIcon className="w-8 h-8 text-red-500 mx-auto mb-2"/>
                                    <h3 className="font-bold text-red-700">章节生成中断</h3>
                                    <p className="text-sm text-red-600 mb-4">{section.logs[section.logs.length-1]}</p>
                                    <button 
                                        onClick={() => onRetry(idx)}
                                        className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                                    >
                                        <RefreshIcon className="w-4 h-4 inline mr-1"/> 重试本章
                                    </button>
                                </div>
                            );
                        }
                        return <ActiveAgentCard key={section.id} section={section} />;
                    }

                    // 3. 等待中：显示占位符
                    if (section.status === 'pending') {
                        return (
                            <div key={section.id} className="mb-8 opacity-40 grayscale select-none p-6 border border-dashed border-slate-300 rounded-xl">
                                <h2 className="text-xl font-bold text-slate-400">{section.title}</h2>
                                <p className="text-sm text-slate-300 mt-2">等待生成...</p>
                            </div>
                        );
                    }
                    return null;
                })}

                {mainStatus === 'finished' && (
                    <div className="mt-12 p-8 bg-green-50 rounded-2xl border border-green-100 text-center animate-in fade-in zoom-in">
                        <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <h2 className="text-xl font-bold text-green-800">全篇报告生成完毕</h2>
                        <p className="text-green-600 mt-1 text-sm">您可以复制内容或进行后续编辑。</p>
                    </div>
                )}
                
                <div ref={bottomRef} className="h-10"></div>
            </div>
        </div>
    );
};
