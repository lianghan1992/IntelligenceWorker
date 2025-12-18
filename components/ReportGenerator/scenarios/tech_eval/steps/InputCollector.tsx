
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
        <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
            {/* 1. 评估目标 (1/3) */}
            <div className="h-1/3 flex flex-col p-5 border-b border-slate-50">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">评估目标</h4>
                <textarea 
                    value={targetTech}
                    onChange={e => setTargetTech(e.target.value)}
                    placeholder="输入需要评估的技术功能或核心目标..."
                    className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none placeholder:font-normal"
                    disabled={isProcessing}
                />
            </div>

            {/* 2. 参考资料 (1/3) */}
            <div className="h-1/3 flex flex-col p-5 border-b border-slate-50">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">参考资料</h4>
                <textarea 
                    value={manualMaterials}
                    onChange={e => setManualMaterials(e.target.value)}
                    placeholder="在此输入参考文本或数据背景..."
                    className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium text-slate-600 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none"
                    disabled={isProcessing}
                />
                
                {/* 辅助工具 */}
                <div className="flex gap-2 mt-3">
                    <button className="flex-1 flex flex-col items-center justify-center gap-1 p-2 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-all text-slate-400 hover:text-indigo-600">
                        <PlusIcon className="w-4 h-4" />
                        <span className="text-[9px] font-bold">上传文件</span>
                    </button>
                    <button onClick={() => setIsVectorModalOpen(true)} className="flex-1 flex flex-col items-center justify-center gap-1 p-2 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-all text-slate-400 hover:text-emerald-600">
                        <PuzzleIcon className="w-4 h-4" />
                        <span className="text-[9px] font-bold">向量检索</span>
                    </button>
                    <button className="flex-1 flex flex-col items-center justify-center gap-1 p-2 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-all text-slate-400 hover:text-purple-600">
                        <SparklesIcon className="w-4 h-4" />
                        <span className="text-[9px] font-bold">LLM 检索</span>
                    </button>
                </div>
            </div>

            {/* 3. 执行区 (1/3) */}
            <div className="h-1/3 flex flex-col p-6 justify-between bg-slate-50/50">
                <div className="space-y-4 pt-4">
                     <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>系统引擎</span>
                        <span className="text-emerald-500">Ready</span>
                    </div>
                    <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-1/4 opacity-30"></div>
                    </div>
                </div>

                <div className="space-y-4">
                    <button 
                        onClick={handleStart}
                        disabled={isProcessing || !targetTech.trim()}
                        className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-3"
                    >
                        {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <BrainIcon className="w-5 h-5" />
                        )}
                        <span>开始生成技术研报</span>
                    </button>

                    <div className="flex items-center justify-between text-slate-400 px-1">
                        <div className="flex items-center gap-2 hover:text-slate-600 cursor-pointer transition-colors">
                            <GearIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase">系统设置</span>
                        </div>
                        <span className="text-[9px] font-mono opacity-50 uppercase tracking-widest">v2.1.0_PRO</span>
                    </div>
                </div>
            </div>

            <VectorSearchModal isOpen={isVectorModalOpen} onClose={() => setIsVectorModalOpen(false)} onAddSnippet={(s) => setManualMaterials(prev => prev + "\n" + s.content)} />
        </div>
    );
};
