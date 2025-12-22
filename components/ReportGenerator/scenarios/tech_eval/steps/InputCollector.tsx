
import React, { useState, useEffect } from 'react';
import { 
    PuzzleIcon, 
    BrainIcon,
    DocumentTextIcon,
    SparklesIcon
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

    useEffect(() => { setTargetTech(initialTech); }, [initialTech]);

    const handleStart = () => {
        if (!targetTech.trim()) return;
        onStart({ targetTech, materials: manualMaterials });
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] p-6 relative overflow-hidden">
            {/* 背景装饰 */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none"></div>
            
            <div className="w-full max-w-4xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                        定义您的<span className="text-indigo-600">技术评估</span>目标
                    </h1>
                    <p className="text-slate-500 text-lg font-medium">
                        AI 专家 Agent 将基于您提供的资料，生成深度技术白皮书。
                    </p>
                </div>

                <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 h-auto md:h-96">
                        
                        {/* 左侧：目标设定 */}
                        <div className="flex-1 p-8 flex flex-col group transition-colors hover:bg-slate-50/50">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                Target Technology
                            </label>
                            <textarea 
                                value={targetTech}
                                onChange={e => setTargetTech(e.target.value)}
                                placeholder="输入具体的技术名称，例如：'小米SU7 800V 高压平台' 或 '特斯拉 FSD V12 端到端算法'..."
                                className="flex-1 w-full bg-transparent border-none p-0 text-xl md:text-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:ring-0 resize-none leading-relaxed"
                                disabled={isProcessing}
                            />
                        </div>

                        {/* 右侧：资料注入 */}
                        <div className="flex-1 p-8 flex flex-col bg-slate-50/30 group transition-colors hover:bg-slate-50/80">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Context & Data
                                </label>
                                <button 
                                    onClick={() => setIsVectorModalOpen(true)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    <PuzzleIcon className="w-3.5 h-3.5" /> 知识库检索
                                </button>
                            </div>
                            <textarea 
                                value={manualMaterials}
                                onChange={e => setManualMaterials(e.target.value)}
                                placeholder="在此处粘贴相关技术参数、新闻报道或竞品分析资料。资料越详实，报告越深入。"
                                className="flex-1 w-full bg-transparent border-none p-0 text-sm md:text-base text-slate-600 placeholder:text-slate-300 focus:ring-0 resize-none leading-relaxed"
                                disabled={isProcessing}
                            />
                        </div>
                    </div>

                    {/* 底部 Action Bar */}
                    <div className="p-4 bg-white border-t border-slate-100 flex justify-end items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-medium mr-auto pl-4">
                            <SparklesIcon className="w-4 h-4 text-indigo-400" />
                            AI 将自动进行竞品对比、风险排查与方案推荐
                        </div>
                        <button 
                            onClick={handleStart}
                            disabled={isProcessing || !targetTech.trim()}
                            className={`
                                px-8 py-4 rounded-2xl font-bold text-sm md:text-base shadow-xl shadow-indigo-200 transition-all flex items-center gap-3
                                ${isProcessing || !targetTech.trim() 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                                    : 'bg-slate-900 text-white hover:bg-indigo-600 hover:scale-[1.02] active:scale-95'
                                }
                            `}
                        >
                            {isProcessing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <BrainIcon className="w-5 h-5" />
                            )}
                            <span>启动深度分析引擎</span>
                        </button>
                    </div>
                </div>
            </div>

            <VectorSearchModal 
                isOpen={isVectorModalOpen} 
                onClose={() => setIsVectorModalOpen(false)} 
                onAddSnippet={(s) => setManualMaterials(prev => (prev ? prev + "\n\n" : "") + `【参考资料：${s.title}】\n${s.content}`)} 
            />
        </div>
    );
};
