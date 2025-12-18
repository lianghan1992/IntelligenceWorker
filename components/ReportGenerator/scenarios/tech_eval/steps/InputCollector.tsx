
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

            {/* 2. 参考资料 (1/3) - 纯净输入区，与上方高度绝对一致 */}
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

            {/* 3. 执行与辅助工具区 (1/3) */}
            <div className="h-1/3 flex flex-col p-6 justify-between bg-slate-950 relative overflow-hidden group">
                {/* 背景科幻光效 */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full blur-[80px]"></div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600 rounded-full blur-[80px]"></div>
                </div>

                <div className="relative z-10 space-y-6">
                    {/* 辅助工具行 - 移至此处以释放上方输入框空间 */}
                    <div className="flex gap-2">
                        <button className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all flex items-center justify-center gap-2 group/tool">
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">上传文件</span>
                        </button>
                        <button 
                            onClick={() => setIsVectorModalOpen(true)}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all flex items-center justify-center gap-2 group/tool"
                        >
                            <PuzzleIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">向量检索</span>
                        </button>
                        <button className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all flex items-center justify-center gap-2 group/tool">
                            <SparklesIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">LLM 检索</span>
                        </button>
                    </div>

                    {/* 主执行按钮 */}
                    <div className="pt-4">
                        <button 
                            onClick={handleStart}
                            disabled={isProcessing || !targetTech.trim()}
                            className={`
                                w-full py-5 rounded-[24px] font-black text-base shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-4
                                ${isProcessing || !targetTech.trim() 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 shadow-none' 
                                    : 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-indigo-900/40 hover:shadow-indigo-500/20 hover:-translate-y-1'
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

                {/* 底部设置项 */}
                <div className="relative z-10 flex items-center justify-between text-white/20 px-2 mt-auto">
                    <div className="flex items-center gap-2 hover:text-white/60 cursor-pointer transition-colors group/set">
                        <GearIcon className="w-3.5 h-3.5 group-hover/set:rotate-90 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">System Config</span>
                    </div>
                    <span className="text-[8px] font-mono uppercase tracking-[0.3em]">v3.5.0_PRO_CORE</span>
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
