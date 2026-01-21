
import React from 'react';
import { 
    SparklesIcon, RefreshIcon, CheckCircleIcon, SearchIcon, 
    DocumentTextIcon, DatabaseIcon, GlobeIcon 
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
}

// --- Sub-components ---

const IdleState = () => (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200">
            <SparklesIcon className="w-12 h-12 text-indigo-300"/>
        </div>
        <h3 className="text-xl font-bold text-slate-700">万能研报助手</h3>
        <p className="text-sm mt-2 max-w-xs text-center leading-relaxed">
            请在右侧输入研究主题，AI 将自动进行全网检索、构建大纲并撰写报告。
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
            <DocumentTextIcon className="w-6 h-6 text-indigo-600"/> 研究大纲规划
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
                     <RefreshIcon className="w-4 h-4 animate-spin"/> 正在生成正文内容...
                 </div>
             </div>
        </div>
    </div>
);

const ReportViewer: React.FC<{ sections: ReportSection[]; topic: string }> = ({ sections, topic }) => (
    <div className="w-full max-w-4xl mx-auto bg-white min-h-[90vh] shadow-lg my-8 p-10 md:p-16 rounded-sm">
        <div className="border-b border-slate-200 pb-8 mb-10 text-center">
            <h1 className="text-4xl font-black text-slate-900 mb-4">{topic}</h1>
            <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">Auto Insight AI Research Report</p>
        </div>
        
        <div className="space-y-12">
            {sections.map((section, idx) => (
                <section key={idx} className="animate-in fade-in duration-700">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                        <span className="text-indigo-200 font-black text-3xl opacity-50 select-none">0{idx + 1}</span>
                        {section.title}
                    </h2>
                    <article 
                        className="prose prose-slate max-w-none prose-headings:font-bold prose-p:text-justify prose-p:leading-relaxed prose-li:marker:text-indigo-400"
                        dangerouslySetInnerHTML={{ __html: marked.parse(section.content || '*撰写中...*') as string }}
                    />
                </section>
            ))}
        </div>
        
        <div className="mt-20 pt-10 border-t border-slate-100 text-center text-slate-300 text-xs">
            Generated by StratifyAI Engine
        </div>
    </div>
);

// --- Main Canvas Component ---

export const ReportCanvas: React.FC<ReportCanvasProps> = ({ status, logs, outline, sections, topic }) => {
    return (
        <div className="flex-1 h-full overflow-y-auto bg-slate-50 custom-scrollbar relative">
            <div className="min-h-full p-6">
                {status === 'idle' && <IdleState />}
                
                {status === 'researching' && <ResearchVisualizer logs={logs} />}
                
                {status === 'planning' && <OutlineVisualizer outline={outline} />}
                
                {(status === 'generating' || status === 'done') && (
                    <ReportViewer sections={sections} topic={topic} />
                )}
            </div>
        </div>
    );
};
