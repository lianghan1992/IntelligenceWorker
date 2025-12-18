
import React, { useState, useRef, useEffect } from 'react';
import { BrainIcon, DocumentTextIcon, PuzzleIcon, ArrowRightIcon, TrashIcon, SparklesIcon, PlusIcon } from '../../../../icons';
import { VectorSearchModal } from '../../../ui/VectorSearchModal';
import { uploadStratifyFile } from '../../../../../api/stratify';

interface InputCollectorProps {
    initialTech: string;
    initialMaterials: string;
    isProcessing: boolean;
    onStart: (data: { targetTech: string; materials: string }) => void;
}

export const InputCollector: React.FC<InputCollectorProps> = ({ initialTech, initialMaterials, isProcessing, onStart }) => {
    const [targetTech, setTargetTech] = useState(initialTech);
    const [manualMaterials, setManualMaterials] = useState(initialMaterials);
    const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    const [references, setReferences] = useState<{ id: string; title: string; content: string; type: 'file' | 'vector' }[]>([]);

    useEffect(() => {
        setTargetTech(initialTech);
        setManualMaterials(initialMaterials);
    }, [initialTech, initialMaterials]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const res = await uploadStratifyFile(file);
            setReferences(prev => [...prev, { 
                id: Math.random().toString(36), 
                title: file.name, 
                content: `[已注入外部参考文件: ${file.name}]`, 
                type: 'file' 
            }]);
        } catch (err) {
            alert('上传失败');
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddVectorSnippet = (snippet: { title: string; content: string }) => {
        setReferences(prev => [...prev, { 
            id: Math.random().toString(36), 
            title: snippet.title, 
            content: snippet.content, 
            type: 'vector' 
        }]);
    };

    const removeReference = (id: string) => {
        setReferences(prev => prev.filter(r => r.id !== id));
    };

    const handleStart = () => {
        if (!targetTech.trim()) return;
        const allMaterials = [
            manualMaterials,
            ...references.map(r => `--- 来源: ${r.title} ---\n${r.content}`)
        ].filter(Boolean).join('\n\n');
        onStart({ targetTech, materials: allMaterials });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* 01. 评估对象 */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1 h-3 bg-indigo-600 rounded-full"></div>
                        Step 01. Target Definition
                    </label>
                    <textarea 
                        value={targetTech}
                        onChange={e => setTargetTech(e.target.value)}
                        placeholder="输入评估技术或功能名称..."
                        className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:font-medium"
                        disabled={isProcessing}
                    />
                </div>

                {/* 02. 参考资料注入 */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1 h-3 bg-indigo-600 rounded-full"></div>
                        Step 02. Knowledge Ingestion
                    </label>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <input type="file" id="tech-file-up-mini" className="hidden" onChange={handleFileUpload} />
                        <button 
                            onClick={() => document.getElementById('tech-file-up-mini')?.click()}
                            className="flex items-center justify-center gap-2 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-all group"
                            disabled={isProcessing}
                        >
                            <DocumentTextIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                            <span className="text-[10px] font-black text-slate-600">文件导入</span>
                        </button>
                        <button 
                            onClick={() => setIsVectorModalOpen(true)}
                            className="flex items-center justify-center gap-2 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-300 transition-all group"
                            disabled={isProcessing}
                        >
                            <PuzzleIcon className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                            <span className="text-[10px] font-black text-slate-600">情报联想</span>
                        </button>
                    </div>

                    {/* 已添加的引用列表 */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {references.map(r => (
                            <div key={r.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl group/item">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${r.type === 'file' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {r.type === 'file' ? <DocumentTextIcon className="w-3.5 h-3.5" /> : <PuzzleIcon className="w-3.5 h-3.5" />}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 truncate">{r.title}</span>
                                </div>
                                <button onClick={() => removeReference(r.id)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100"><TrashIcon className="w-3.5 h-3.5"/></button>
                            </div>
                        ))}
                    </div>

                    <textarea 
                        value={manualMaterials}
                        onChange={e => setManualMaterials(e.target.value)}
                        placeholder="在此手动粘贴情报正文或补充背景建议..."
                        className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                        disabled={isProcessing}
                    />
                </div>
            </div>

            {/* 底部启动按钮 */}
            <div className="p-6 border-t border-slate-100 bg-gray-50/50">
                <button 
                    onClick={handleStart}
                    disabled={!targetTech.trim() || isProcessing}
                    className="w-full relative group h-14 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl overflow-hidden shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
                >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                        {isProcessing ? 'AI Agent Analyzing...' : 'Run Depth Analysis'}
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                </button>
            </div>

            <VectorSearchModal 
                isOpen={isVectorModalOpen} 
                onClose={() => setIsVectorModalOpen(false)} 
                onAddSnippet={handleAddVectorSnippet}
            />
            
            <style>{`
                @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
            `}</style>
        </div>
    );
};
