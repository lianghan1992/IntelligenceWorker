
import React, { useState, useEffect } from 'react';
import { 
    PuzzleIcon, 
    PlusIcon, 
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

    const textareaBaseClass = "flex-1 w-full bg-slate-50 border border-slate-200 rounded-[20px] p-5 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all resize-none placeholder:font-normal placeholder:text-slate-300 shadow-inner custom-scrollbar";

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
            {/* 1. 评估目标 (1/3) */}
            <div className="h-1/3 flex flex-col p-6 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-indigo-600 rounded-full"></div>
                    <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase">评估目标</h4>
                </div>
                <textarea 
                    value={targetTech}
                    onChange={e => setTargetTech(e.target.value)}
                    placeholder="输入需要评估的技术或功能名称..."
                    className={textareaBaseClass}
                    disabled={isProcessing}
                />
            </div>

            {/* 2. 参考资料 (1/3) */}
            <div className="h-1/3 flex flex-col p-6 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                    <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase">参考资料</h4>
                </div>
                <textarea 
                    value={manualMaterials}
                    onChange={e => setManualMaterials(e.target.value)}
                    placeholder="粘贴相关情报片段、参数文档或背景资料..."
                    className={textareaBaseClass}
                    disabled={isProcessing}
                />
            </div>

            {/* 3. 执行区 (1/3) */}
            <div className="h-1/3 flex flex-col p-6 justify-center bg-white">
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <button className="py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 group">
                            <PlusIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">文件导入</span>
                        </button>
                        <button 
                            onClick={() => setIsVectorModalOpen(true)}
                            className="py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2 group"
                        >
                            <PuzzleIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">情报库检索</span>
                        </button>
                    </div>

                    <button 
                        onClick={handleStart}
                        disabled={isProcessing || !targetTech.trim()}
                        className={`
                            w-full py-5 rounded-2xl font-black text-base transition-all active:scale-[0.98] flex items-center justify-center gap-3
                            ${isProcessing || !targetTech.trim() 
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-100' 
                                : 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-indigo-600 hover:-translate-y-0.5'
                            }
                        `}
                    >
                        {isProcessing ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <BrainIcon className="w-5 h-5" />
                        )}
                        <span>开始生成技术研报</span>
                    </button>
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
