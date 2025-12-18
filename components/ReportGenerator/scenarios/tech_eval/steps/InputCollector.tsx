
import React, { useState, useRef, useEffect } from 'react';
import { BrainIcon, DocumentTextIcon, PuzzleIcon, ArrowRightIcon, TrashIcon, SparklesIcon, PlusIcon, GearIcon, CheckCircleIcon } from '../../../../icons';
import { VectorSearchModal } from '../../../ui/VectorSearchModal';
import { uploadStratifyFile } from '../../../../../api/stratify';

export const InputCollector: React.FC<{
    initialTech: string;
    initialMaterials: string;
    isProcessing: boolean;
    onStart: (data: { targetTech: string; materials: string }) => void;
}> = ({ initialTech, initialMaterials, isProcessing, onStart }) => {
    const [targetTech, setTargetTech] = useState(initialTech);
    const [manualMaterials, setManualMaterials] = useState(initialMaterials);
    const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
    const [references, setReferences] = useState<{ id: string; title: string; type: 'file' | 'vector' }[]>([]);

    useEffect(() => {
        setTargetTech(initialTech);
    }, [initialTech]);

    const handleStart = () => {
        if (!targetTech.trim()) return;
        onStart({ targetTech, materials: manualMaterials });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative">
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                
                {/* Section 01: Target Objective */}
                <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Objective</h4>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    </div>
                    <div className="group relative bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all hover:border-indigo-300">
                        <div className="absolute top-3 left-4 p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                            <DocumentTextIcon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <input 
                            value={targetTech}
                            onChange={e => setTargetTech(e.target.value)}
                            placeholder="输入评估技术..."
                            className="w-full bg-transparent pl-10 pt-1 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-300"
                            disabled={isProcessing}
                        />
                        <p className="pl-10 text-[10px] text-slate-400 mt-1">深度技术路线与行业研究报告</p>
                    </div>
                </div>

                <div className="h-px bg-slate-100 mx-5"></div>

                {/* Section 02: Knowledge Base */}
                <div className="p-5 flex-1 flex flex-col">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Knowledge Base</h4>
                    <div className="space-y-2 flex-1">
                        {/* Mocking current references */}
                        {[
                            { title: '长城/吉利沉箱设计规范.pdf', type: 'file' },
                            { title: 'SMA驱动材料特性表.csv', type: 'vector', injected: true },
                            { title: '第一代EAP推杆测试数据.docx', type: 'file' },
                        ].map((ref, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {ref.type === 'file' ? <DocumentTextIcon className="w-4 h-4 text-slate-300" /> : <PuzzleIcon className="w-4 h-4 text-indigo-300" />}
                                    <span className="text-[11px] font-medium text-slate-600 truncate">{ref.title}</span>
                                </div>
                                {ref.injected ? (
                                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">已注入</span>
                                ) : (
                                    <button className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500"><TrashIcon className="w-3.5 h-3.5"/></button>
                                )}
                            </div>
                        ))}
                        
                        <button 
                            onClick={() => setIsVectorModalOpen(true)}
                            className="w-full py-2.5 mt-2 border border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                        >
                            <PlusIcon className="w-3 h-3" /> Add Source
                        </button>
                    </div>
                </div>

                {/* Bottom Settings Bar */}
                <div className="mt-auto p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                        <GearIcon className="w-4 h-4" />
                        <span className="text-xs font-bold">System Settings</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-300 uppercase">v2.1</span>
                </div>
            </div>

            <VectorSearchModal isOpen={isVectorModalOpen} onClose={() => setIsVectorModalOpen(false)} onAddSnippet={() => {}} />
        </div>
    );
};
