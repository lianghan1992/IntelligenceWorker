
import React, { useState, useRef, useEffect } from 'react';
import { 
    DocumentTextIcon, 
    PuzzleIcon, 
    SparklesIcon, 
    PlusIcon, 
    GearIcon, 
    SearchIcon,
    BrainIcon,
    ArrowRightIcon
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
            {/* 1. 评估目标 (占1/3) */}
            <div className="flex-1 flex flex-col p-5 min-h-0 border-b border-slate-50">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">评估目标</h4>
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"></div>
                </div>
                <textarea 
                    value={targetTech}
                    onChange={e => setTargetTech(e.target.value)}
                    placeholder="请输入需要评估的技术功能或核心目标..."
                    className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none placeholder:text-slate-300 placeholder:font-normal"
                    disabled={isProcessing}
                />
            </div>

            {/* 2. 参考资料 (占1/3) */}
            <div className="flex-1 flex flex-col p-5 min-h-0">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">参考资料</h4>
                    <span className="text-[10px] text-slate-300 font-mono">CONTEXT_ENGINE</span>
                </div>
                
                {/* 文本输入框 */}
                <textarea 
                    value={manualMaterials}
                    onChange={e => setManualMaterials(e.target.value)}
                    placeholder="在此粘贴参考文本或数据片段..."
                    className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium text-slate-600 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none placeholder:text-slate-300"
                    disabled={isProcessing}
                />

                {/* 功能图标按钮组 */}
                <div className="flex items-center gap-2 mt-3">
                    <button 
                        className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                        title="上传本地文件"
                    >
                        <PlusIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-indigo-600">上传文件</span>
                    </button>
                    <button 
                        onClick={() => setIsVectorModalOpen(true)}
                        className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50 transition-all group"
                        title="情报库向量检索"
                    >
                        <PuzzleIcon className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-emerald-600">向量检索</span>
                    </button>
                    <button 
                        className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-slate-100 bg-white hover:border-purple-200 hover:bg-purple-50 transition-all group"
                        title="LLM 实时检索"
                    >
                        <SparklesIcon className="w-4 h-4 text-slate-400 group-hover:text-purple-500" />
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-purple-600">LLM 检索</span>
                    </button>
                </div>
            </div>

            {/* 3. 执行区 (占1/3) */}
            <div className="flex-1 flex flex-col p-5 justify-end gap-4 min-h-0 bg-slate-50/30">
                <div className="space-y-2 opacity-50">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400">
                        <span>引擎状态</span>
                        <span className="text-emerald-500">READY</span>
                    </div>
                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-full opacity-20"></div>
                    </div>
                </div>

                <button 
                    onClick={handleStart}
                    disabled={isProcessing || !targetTech.trim()}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3"
                >
                    {isProcessing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>正在生成报告...</span>
                        </>
                    ) : (
                        <>
                            <BrainIcon className="w-5 h-5" />
                            <span>开始生成技术研报</span>
                        </>
                    )}
                </button>

                {/* 系统设置栏 */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-slate-400">
                    <div className="flex items-center gap-2 hover:text-slate-600 cursor-pointer transition-colors">
                        <GearIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">系统设置</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-50 uppercase">v2.1.0_PRO</span>
                </div>
            </div>

            <VectorSearchModal isOpen={isVectorModalOpen} onClose={() => setIsVectorModalOpen(false)} onAddSnippet={(s) => setManualMaterials(prev => prev + "\n" + s.content)} />
        </div>
    );
};
