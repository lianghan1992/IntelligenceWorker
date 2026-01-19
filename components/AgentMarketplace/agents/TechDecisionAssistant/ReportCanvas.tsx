
import React, { useRef, useEffect } from 'react';
import { ReportSection, StepId } from './types';
import VisualEditor from '../../../shared/VisualEditor';
import { marked } from 'marked';
import { RefreshIcon, DocumentTextIcon, ChartIcon, CheckCircleIcon } from '../../../icons';

interface ReportCanvasProps {
    sections: Record<StepId, ReportSection>;
    currentStep: StepId;
    techName: string;
}

const stepsOrder: StepId[] = ['route', 'risk', 'solution', 'compare'];

const StepIndicator: React.FC<{ status: string, index: number, title: string, isActive: boolean }> = ({ status, index, title, isActive }) => {
    let colorClass = 'bg-slate-100 text-slate-400 border-slate-200';
    if (status === 'done') colorClass = 'bg-green-100 text-green-700 border-green-200';
    else if (status === 'generating' || status === 'review') colorClass = 'bg-indigo-100 text-indigo-700 border-indigo-200';
    
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${colorClass} ${isActive ? 'ring-2 ring-indigo-500/30 shadow-sm' : 'opacity-70'}`}>
            <span className="w-5 h-5 rounded-full bg-white/50 flex items-center justify-center text-[10px]">{index + 1}</span>
            <span>{title}</span>
            {status === 'generating' && <RefreshIcon className="w-3 h-3 animate-spin"/>}
            {status === 'done' && <CheckCircleIcon className="w-3.5 h-3.5"/>}
        </div>
    );
};

export const ReportCanvas: React.FC<ReportCanvasProps> = ({ sections, currentStep, techName }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom when new content arrives
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [sections]);

    const renderSection = (key: StepId) => {
        const section = sections[key];
        if (section.status === 'pending' && !section.markdown) return null;

        return (
            <div key={key} className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-2">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-md">
                        {key === 'compare' ? <ChartIcon className="w-5 h-5"/> : <DocumentTextIcon className="w-5 h-5"/>}
                    </div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{section.title}</h2>
                    {section.status === 'generating' && (
                        <span className="text-xs text-indigo-500 font-bold animate-pulse flex items-center gap-1">
                            <RefreshIcon className="w-3 h-3 animate-spin"/> 生成中...
                        </span>
                    )}
                </div>

                {/* Markdown Content */}
                <div className="prose prose-sm max-w-none text-slate-700 mb-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div dangerouslySetInnerHTML={{ __html: marked.parse(section.markdown) as string }} />
                </div>

                {/* HTML Widget */}
                {section.html && (
                    <div className="relative w-full aspect-[16/9] bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-md group">
                        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">Visual Widget</span>
                        </div>
                        {/* We use VisualEditor in read-only mode (conceptually) or just Scaled wrapper */}
                        <div className="w-full h-full transform scale-100 origin-top-left">
                             <VisualEditor 
                                initialHtml={section.html} 
                                onSave={() => {}} // Read-only in this flow mostly
                                scale={0.5} // Initial scale, but VisualEditor handles auto-fit if container constrained? 
                                // Actually VisualEditor's scale prop controls internal zoom. 
                                // We rely on its auto-fit or specific scale here.
                                // For simplicity, let's use a simpler iframe wrapper if VisualEditor is too heavy,
                                // BUT requirement said "reuse VisualEditor". VisualEditor is draggable.
                                // Let's try auto-scaling based on width.
                                canvasSize={{ width: 1000, height: 1000 }} // Square-ish widgets usually? Prompt says Visual Widget. 
                                // Let's assume standard slide size or flexible. Prompt said "HTML Chart".
                                // Let's stick to standard 1600x900 base for consistency.
                            /> 
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Toolbar / Status Bar */}
            <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="font-black text-lg text-slate-800">{techName || '技术评估报告'}</div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-mono">DRAFT</span>
                </div>
                <div className="flex gap-2">
                    {stepsOrder.map((step, idx) => (
                        <StepIndicator 
                            key={step} 
                            status={sections[step].status} 
                            index={idx} 
                            title={sections[step].title} 
                            isActive={currentStep === step}
                        />
                    ))}
                </div>
            </div>

            {/* Canvas Content */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    {techName ? (
                        <>
                            {stepsOrder.map(step => renderSection(step))}
                            {/* Scroll Anchor */}
                            <div ref={bottomRef} className="h-20"></div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-96 text-slate-400 opacity-60">
                            <DocumentTextIcon className="w-16 h-16 mb-4"/>
                            <p className="text-lg font-medium">请在右侧输入技术名称开始评估</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
