import React from 'react';
import { LightBulbIcon, CloseIcon, SparklesIcon, DocumentTextIcon, PencilIcon, CheckCircleIcon } from '../icons';

// --- 上下文锚点：常驻显示当前 AI 对话所针对的对象 ---
export const ContextAnchor: React.FC<{
    stage: string;
    pageIndex: number;
    pageTitle?: string;
    isVisualMode: boolean;
}> = ({ stage, pageIndex, pageTitle, isVisualMode }) => {
    // 收集阶段不需要显示上下文
    if (stage === 'collect') return null;

    return (
        <div className="mx-4 mb-2 px-3 py-2 bg-indigo-50/80 border border-indigo-100 rounded-lg flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 backdrop-blur-sm transition-all duration-300">
            <div className="flex items-center gap-2.5 text-indigo-900 min-w-0">
                <div className={`p-1.5 rounded-md shadow-sm flex-shrink-0 ${stage === 'outline' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {stage === 'outline' ? <DocumentTextIcon className="w-3.5 h-3.5" /> : (isVisualMode ? <SparklesIcon className="w-3.5 h-3.5" /> : <PencilIcon className="w-3.5 h-3.5" />)}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[9px] uppercase opacity-60 tracking-wider leading-none mb-0.5">
                        {stage === 'outline' ? 'CURRENT CONTEXT' : 'ACTIVE SLIDE'}
                    </span>
                    <span className="font-bold truncate text-[11px]">
                        {stage === 'outline' 
                            ? '全局大纲模式 (Global Outline)' 
                            : `第 ${pageIndex + 1} 页: ${pageTitle || '无标题'}`}
                    </span>
                </div>
            </div>
            
            {stage === 'compose' && (
                <div className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${isVisualMode ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {isVisualMode ? '视觉模式' : '文本模式'}
                </div>
            )}
        </div>
    );
};

// --- 引导气泡：一次性提示用户如何操作 ---
export const GuidanceBubble: React.FC<{
    message: string;
    onDismiss: () => void;
}> = ({ message, onDismiss }) => {
    return (
        <div className="absolute bottom-full left-4 right-4 mb-3 z-30 animate-in zoom-in-95 slide-in-from-bottom-2 duration-500">
            <div className="bg-slate-800 text-white p-3.5 rounded-xl shadow-xl shadow-slate-500/20 relative border border-slate-700 flex gap-3">
                <div className="p-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg shrink-0 h-fit">
                    <LightBulbIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed font-medium text-slate-200">
                        {message}
                    </p>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                    className="text-slate-500 hover:text-white transition-colors -mr-1 -mt-1 p-1 h-fit"
                >
                    <CloseIcon className="w-4 h-4" />
                </button>
                
                {/* Arrow pointing down */}
                <div className="absolute -bottom-1.5 left-8 w-3 h-3 bg-slate-800 transform rotate-45 border-r border-b border-slate-700"></div>
            </div>
        </div>
    );
};
