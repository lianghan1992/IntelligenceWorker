
import React from 'react';
import { StratifyOutline } from '../../types';
import { PPTData } from './types';
import { CheckIcon, DocumentTextIcon, ArrowRightIcon, PencilIcon, RefreshIcon } from '../icons';

interface OutlineWidgetProps {
    topic: string;
    outlineData: StratifyOutline | null;
    onConfirm: () => void;
    // 新增：用于更新父级数据的回调
    setData?: React.Dispatch<React.SetStateAction<PPTData>>;
}

export const Step2Outline: React.FC<OutlineWidgetProps> = ({ 
    topic, outlineData, onConfirm, setData
}) => {
    
    // 处理标题修改
    const handleTitleChange = (pageIndex: number, newTitle: string) => {
        if (!setData || !outlineData) return;
        setData((prev: PPTData) => {
            if (!prev.outline) return prev;
            const newPages = [...prev.outline.pages];
            newPages[pageIndex] = { ...newPages[pageIndex], title: newTitle };
            return {
                ...prev,
                outline: { ...prev.outline, pages: newPages }
            };
        });
    };

    // 处理内容概要修改
    const handleContentChange = (pageIndex: number, newContent: string) => {
        if (!setData || !outlineData) return;
        setData((prev: PPTData) => {
            if (!prev.outline) return prev;
            const newPages = [...prev.outline.pages];
            newPages[pageIndex] = { ...newPages[pageIndex], content: newContent };
            return {
                ...prev,
                outline: { ...prev.outline, pages: newPages }
            };
        });
    };

    // 空值或无效数据保护
    if (!outlineData || !outlineData.pages || !Array.isArray(outlineData.pages)) {
         return (
             <div className="flex flex-col items-center justify-center h-full space-y-6 text-slate-400 bg-slate-50">
                 <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                    <DocumentTextIcon className="w-10 h-10 opacity-20" />
                 </div>
                 <div className="text-center">
                     <h3 className="text-lg font-bold text-slate-600">等待大纲生成...</h3>
                     <p className="text-sm mt-2 max-w-xs mx-auto">AI 正在努力构建分析框架，请稍候。</p>
                 </div>
             </div>
         );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
             {/* Header */}
             <div className="px-8 py-6 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                 <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        {outlineData.title || topic}
                        {(!outlineData.title || outlineData.pages.length === 0) && <RefreshIcon className="w-5 h-5 animate-spin text-indigo-500" />}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">共 {outlineData.pages.length} 页 • 结构预览（可直接编辑）</p>
                 </div>
             </div>

             {/* Tree Grid */}
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar pb-32">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {outlineData.pages.map((page, idx) => (
                         <div key={idx} className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all relative overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                             <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-100 group-hover:bg-indigo-500 transition-colors"></div>
                             <div className="pl-4 flex flex-col h-full">
                                 <div className="flex justify-between items-start mb-3">
                                     <span className="text-4xl font-black text-slate-100 group-hover:text-indigo-50 transition-colors select-none">
                                         {String(idx + 1).padStart(2, '0')}
                                     </span>
                                     <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                         <PencilIcon className="w-4 h-4" />
                                     </div>
                                 </div>
                                 
                                 {/* Editable Title */}
                                 <input 
                                    className="text-lg font-bold text-slate-800 mb-2 leading-snug group-hover:text-indigo-700 transition-colors bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none w-full"
                                    value={page.title || ''}
                                    onChange={(e) => handleTitleChange(idx, e.target.value)}
                                    placeholder="生成中..."
                                 />

                                 {/* Editable Summary/Content */}
                                 <textarea 
                                    className="text-sm text-slate-500 leading-relaxed bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-slate-50 focus:outline-none rounded p-1 -ml-1 w-full resize-none flex-1 min-h-[80px]"
                                    value={page.content || ''}
                                    onChange={(e) => handleContentChange(idx, e.target.value)}
                                    placeholder="等待 AI 填充要点..."
                                 />
                             </div>
                         </div>
                    ))}
                    
                    {/* Add Placeholder Card - Only show when we have at least one page to avoid confusion during initial load */}
                    {outlineData.pages.length > 0 && (
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/10 transition-all cursor-help min-h-[250px]">
                            <span className="text-sm font-bold">需要增加页面？</span>
                            <span className="text-xs mt-1">请在左侧对话框告诉 AI：“增加一页关于XXX的分析”</span>
                        </div>
                    )}
                 </div>
             </div>

             {/* Floating Action Button */}
             <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20 pointer-events-none">
                 <button 
                     onClick={onConfirm}
                     disabled={outlineData.pages.length === 0}
                     className="pointer-events-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-full shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-2 hover:-translate-y-1 active:translate-y-0 active:scale-95"
                 >
                     <span>{outlineData.pages.length > 0 ? '确认大纲并生成内容' : '等待大纲生成...'}</span>
                     {outlineData.pages.length > 0 ? <ArrowRightIcon className="w-5 h-5" /> : <RefreshIcon className="w-5 h-5 animate-spin"/>}
                 </button>
             </div>
        </div>
    );
};
