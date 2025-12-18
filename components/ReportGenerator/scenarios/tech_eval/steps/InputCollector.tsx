
import React, { useState, useEffect } from 'react';
import { 
    PuzzleIcon, 
    SparklesIcon, 
    PlusIcon, 
    GearIcon, 
    BrainIcon
} from '../../../../icons';
import { VectorSearchModal } from '../../../ui/VectorSearchModal';

export const InputCollector: React.FC<{
    initialTech: string;
    initialMaterials: string;
    isProcessing: boolean;
    onStart: (data: { targetTech: string; materials: string }) => void;
}> = ({ initialTech, initialMaterials, isProcessing, onStart }) => {
    const [targetTech, setTargetTech] = useState(initialTech);
    const [manualMaterials, setManualMaterials] = useState(initialMaterials);
    const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);

    useEffect(() => {
        setTargetTech(initialTech);
    }, [initialTech]);

    const handleStart = () => {
        if (!targetTech.trim()) return;
        onStart({ targetTech, materials: manualMaterials });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* 1. 评估目标 (1/3) */}
            <div className="h-1/3 flex flex-col p-6 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">评估目标</h4>
                </div>
                <textarea 
                    value={targetTech}
                    onChange={e => setTargetTech(e.target.value)}
                    placeholder="请输入需要分析的技术功能或核心目标..."
                    className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all resize-none placeholder:font-normal placeholder:text-slate-300 shadow-inner"
                    disabled={isProcessing}
                />
            </div>

            {/* 2. 参考资料 (1/3) */}
            <div className="h-1/3 flex flex-col p-6 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">参考资料</h4>
                </div>
                <textarea 
                    value={manualMaterials}
                    onChange={e => setManualMaterials(e.target.value)}
                    placeholder="在此输入参考文本或情报片段..."
                    className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-600 outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all resize-none shadow-inner"
                    disabled={isProcessing}
                />
                
                {/* 辅助工具 */}
                <div className="flex gap-2 mt-4">
                    <button className="flex-1 flex flex-col items-center justify-center gap-1 p-2 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all text-indigo-700 shadow-sm">
                        <PlusIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase">上传文件</span>
                    </button>
                    <button onClick={() => setIsVectorModalOpen(true)} className="flex-1 flex flex-col items-center justify-center gap-1 p-2 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all text-emerald-700 shadow-sm">
                        <PuzzleIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase">向量检索</span>
                    </button>
                    <button className="flex-1 flex flex-col items-center justify-center gap-1 p-2 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition-all text-purple-700 shadow-sm">
                        <SparklesIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase">LLM 检索</span>
                    </button>
                </div>
            </div>

            {/* 3. 执行区 (1/3) */}
            <div className="h-1/3 flex flex-col p-8 justify-center bg-slate-900 relative overflow-hidden">
                {/* 背景装饰 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

                <div className="relative z-10 space-y-6">
                    <div className="text-center space-y-1">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Ready for Generation</p>
                        <p className="text-xs text-slate-500 font-medium italic">系统引擎已就绪，等待指令触发</p>
                    </div>

                    <button 
                        onClick={handleStart}
                        disabled={isProcessing || !targetTech.trim()}
                        className="w-full py-5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-[24px] font-black text-base shadow-2xl shadow-indigo-900/50 hover:scale-[1.02] hover:from-indigo-500 hover:to-indigo-400 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-4"
                    >
                        {isProcessing ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <BrainIcon className="w-6 h-6" />
                        )}
                        <span>开始生成技术研报</span>
                    </button>

                    <div className="flex items-center justify-between text-slate-600 px-2 pt-4">
                        <div className="flex items-center gap-2 hover:text-slate-400 cursor-pointer transition-colors group">
                            <GearIcon className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">高级设置</span>
                        </div>
                        <span className="text-[9px] font-mono opacity-50 uppercase tracking-widest">v3.1.0_ENTERPRISE</span>
                    </div>
                </div>
            </div>

            <VectorSearchModal isOpen={isVectorModalOpen} onClose={() => setIsVectorModalOpen(false)} onAddSnippet={(s) => setManualMaterials(prev => prev + "\n" + s.content)} />
        </div>
    );
};
