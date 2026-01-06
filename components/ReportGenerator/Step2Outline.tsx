
import React from 'react';
import { StratifyOutline } from '../../types';
import { CheckIcon, DocumentTextIcon } from '../icons';

interface OutlineWidgetProps {
    topic: string;
    outlineData: StratifyOutline | null;
    onConfirm: () => void;
}

export const Step2Outline: React.FC<OutlineWidgetProps> = ({ 
    topic, outlineData, onConfirm 
}) => {
    
    if (!outlineData) {
         return (
             <div className="flex flex-col items-center justify-center h-full space-y-6 text-slate-400 bg-slate-50">
                 <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                    <DocumentTextIcon className="w-10 h-10 opacity-20" />
                 </div>
                 <div className="text-center">
                     <h3 className="text-lg font-bold text-slate-600">等待大纲生成</h3>
                     <p className="text-sm mt-2 max-w-xs mx-auto">请在左侧对话框输入您的研报主题，AI 将为您构建分析框架。</p>
                 </div>
             </div>
         );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
             {/* Header */}
             <div className="px-8 py-6 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                 <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{outlineData.title || topic}</h2>
                    <p className="text-sm text-slate-500 mt-1">共 {outlineData.pages.length} 页 • 结构预览</p>
                 </div>
                 <button 
                     onClick={onConfirm}
                     className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95"
                 >
                     <CheckIcon className="w-5 h-5" /> 确认大纲并生成内容
                 </button>
             </div>

             {/* Tree Grid */}
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {outlineData.pages.map((page, idx) => (
                         <div key={idx} className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-100 group-hover:bg-indigo-500 transition-colors"></div>
                             <div className="pl-4">
                                 <div className="flex justify-between items-start mb-3">
                                     <span className="text-4xl font-black text-slate-100 group-hover:text-indigo-50 transition-colors select-none">
                                         {String(idx + 1).padStart(2, '0')}
                                     </span>
                                     <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                         <DocumentTextIcon className="w-4 h-4" />
                                     </div>
                                 </div>
                                 <h3 className="text-lg font-bold text-slate-800 mb-2 leading-snug group-hover:text-indigo-700 transition-colors">
                                     {page.title}
                                 </h3>
                                 <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                                     {page.content}
                                 </p>
                             </div>
                         </div>
                    ))}
                    
                    {/* Add Placeholder Card */}
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/10 transition-all cursor-help">
                        <span className="text-sm font-bold">需要调整结构？</span>
                        <span className="text-xs mt-1">请在左侧对话框直接告知 AI</span>
                    </div>
                 </div>
             </div>
        </div>
    );
};
