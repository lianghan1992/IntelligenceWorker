
import React, { useRef, useEffect } from 'react';
import { ReportSection, StepId } from './types';
import VisualEditor from '../../../shared/VisualEditor';
import { marked } from 'marked';
import { RefreshIcon, DocumentTextIcon, ChartIcon } from '../../../icons';

interface ReportCanvasProps {
    sections: Record<StepId, ReportSection>;
    currentStep: StepId;
    techName: string;
}

const stepsOrder: StepId[] = ['route', 'risk', 'solution', 'compare'];

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
                                scale={0.5} 
                                canvasSize={{ width: 1000, height: 1000 }} 
                            /> 
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
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
