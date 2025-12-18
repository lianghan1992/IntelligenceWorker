
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

    const textareaBaseClass = "flex-1 w-full bg-slate-50 border border-slate-200 rounded-[24px] p-5 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all resize-none placeholder:font-normal placeholder:text-slate-300 shadow-inner custom-scrollbar";

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
            {/* 1. 评估目标 (1/3) */}
            <div className="h-1/3 flex flex-col p-6 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">评估目标</h4>
                </div>
                <textarea 
                    value={targetTech}
                    onChange={e => setTargetTech(e.target.value)}
                    placeholder="输入需要评估的技术功能或核心目标..."
                    className={textareaBaseClass}
                    disabled={isProcessing}
                />
            </div>

            {/* 2. 参考资料 (1/3) */}
            <div className="h-1/3 flex flex-col p-6 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">参考资料</h4>
                </div>
                <textarea 
                    value={manualMaterials}
                    onChange={e => setManualMaterials(e.target.value)}
                    placeholder="在此输入参考文本或情报片段..."
                    className={textareaBaseClass}
                    disabled={isProcessing}
                />
            </div>

            {/* 3. 执行区 (1/3) - 改为纯净白色背景 */}
            <div className="h-1/3 flex flex-col p-6 justify-between bg-white relative overflow-hidden">
                <div className="relative z-10 space-y-6 pt-4">
                    {/* 辅助工具 - 统一色系风格 */}
                    <div className="flex gap-2">
                        <button className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 group">
                            <PlusIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">上传文件</span>
                        </button>
                        <button 
                            onClick={() => setIsVectorModalOpen(true)}
                            className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 transition-all flex items-center justify-center gap-2 group"
                        >
                            <PuzzleIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">向量检索</span>
                        </button>
                        <button className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-400 hover:text-purple-600 transition-all flex items-center justify-center gap-2 group">
                            <SparklesIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">LLM 检索</span>
                        </button>
                    </div>

                    {/* 主执行按钮 - 极简高对比度设计 */}
                    <div className="pt-2">
                        <button 
                            onClick={handleStart}
                            disabled={isProcessing || !targetTech.trim()}
                            className={`
                                w-full py-5 rounded-[24px] font-black text-base shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-4
                                ${isProcessing || !targetTech.trim() 
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none border border-slate-100' 
                                    : 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-indigo-600 hover:shadow-indigo-500/30 hover:-translate-y-1'
                                }
                            `}
                        >
                            {isProcessing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <BrainIcon className="w-6 h-6" />
                            )}
                            <span>开始生成技术研报</span>
                        </button>
                    </div>
                </div>

                {/* 底部信息 - 仅保留极简提示 */}
                <div className="relative z-10 flex items-center justify-center text-slate-300 px-2 mt-auto">
                    <div className="flex items-center gap-1.5 opacity-40">
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        <span className="text-[8px] font-black uppercase tracking-[0.4em]">Engine Intelligence v3.1</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                    </div>
                </div>
            </div>

            <VectorSearchModal 
                isOpen={isVectorModalOpen} 
                onClose={() => setIsVectorModalOpen(false)} 
                onAddSnippet={(s) => setManualMaterials(prev => prev + "\n" + s.content)} 
            />
        </div>
    );
};
