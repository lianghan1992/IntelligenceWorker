
import React, { useState, useRef } from 'react';
import { BrainIcon, DocumentTextIcon, PuzzleIcon, ArrowRightIcon, TrashIcon, SparklesIcon } from '../../../../icons';
import { VectorSearchModal } from '../../../ui/VectorSearchModal';
import { uploadStratifyFile } from '../../../../../api/stratify';

export const InputCollector: React.FC<{
    onStart: (data: { targetTech: string; materials: string }) => void;
}> = ({ onStart }) => {
    const [targetTech, setTargetTech] = useState('');
    const [manualMaterials, setManualMaterials] = useState('');
    const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // 存储参考资料（文件或向量片段）
    const [references, setReferences] = useState<{ id: string; title: string; content: string; type: 'file' | 'vector' }[]>([]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const res = await uploadStratifyFile(file);
            setReferences(prev => [...prev, { 
                id: Math.random().toString(36), 
                title: file.name, 
                content: `[参考文件: ${file.name}]`, // 这里建议在实际 prompt 中包含对文件URL的引用或内容注入
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
        
        // 汇总所有资料文本
        const allMaterials = [
            manualMaterials,
            ...references.map(r => `--- 来源: ${r.title} ---\n${r.content}`)
        ].filter(Boolean).join('\n\n');

        onStart({ targetTech, materials: allMaterials });
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col items-center py-12 px-6">
            <div className="max-w-5xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <header className="text-center space-y-2">
                    <div className="inline-flex p-3 bg-white rounded-2xl shadow-sm border border-indigo-100 text-indigo-600 mb-2">
                        <BrainIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">新技术深度评估 Agent</h2>
                    <p className="text-slate-500 font-medium">输入技术现状，关联情报库，由行业专家级 Agent 撰写专业评估报告。</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 左：技术现状 */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">1. 需要评估的技术现状描述 (必填)</label>
                        <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl shadow-slate-200/40 p-4 focus-within:border-indigo-500 transition-all flex flex-col h-[400px]">
                            <textarea 
                                value={targetTech}
                                onChange={e => setTargetTech(e.target.value)}
                                placeholder="输入您现有技术方案的详细描述，例如：‘我们正在研发一种基于单目相机的自适应远光灯(ADB)算法，主要挑战在于...' "
                                className="flex-1 w-full p-2 text-lg border-none focus:ring-0 outline-none resize-none text-slate-800 placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* 右：资料库 */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">2. 参考资料与背景上下文</label>
                        <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-[400px] overflow-hidden">
                            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                                <textarea 
                                    value={manualMaterials}
                                    onChange={e => setManualMaterials(e.target.value)}
                                    placeholder="在此粘贴参考文本..."
                                    className="w-full h-32 p-2 text-sm border-none focus:ring-0 outline-none resize-none text-slate-600 placeholder:text-slate-300"
                                />
                                
                                {references.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">已加载的参考资料项</p>
                                        {references.map(r => (
                                            <div key={r.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl group">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {r.type === 'file' ? <DocumentTextIcon className="w-4 h-4 text-blue-500" /> : <PuzzleIcon className="w-4 h-4 text-emerald-500" />}
                                                    <span className="text-xs font-bold text-slate-600 truncate">{r.title}</span>
                                                </div>
                                                <button onClick={() => removeReference(r.id)} className="text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-slate-50 flex items-center gap-2">
                                <input type="file" className="hidden" id="tech-upload" onChange={handleFileUpload} />
                                <button 
                                    onClick={() => document.getElementById('tech-upload')?.click()}
                                    className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm flex items-center gap-2 text-xs font-bold"
                                >
                                    <DocumentTextIcon className="w-4 h-4" /> 上传文件
                                </button>
                                <button 
                                    onClick={() => setIsVectorModalOpen(true)}
                                    className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm flex items-center gap-2 text-xs font-bold"
                                >
                                    <PuzzleIcon className="w-4 h-4" /> 向量检索
                                </button>
                                {isUploading && <span className="ml-auto text-[10px] font-black text-indigo-500 animate-pulse">UPLOADING...</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                    <button 
                        onClick={handleStart}
                        disabled={!targetTech.trim() || isUploading}
                        className="group relative px-16 py-5 bg-slate-900 text-white font-black text-xl rounded-3xl shadow-2xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-4"
                    >
                        <SparklesIcon className="w-6 h-6 text-indigo-300" />
                        <span>开始 Agent 评估流程</span>
                        <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            <VectorSearchModal 
                isOpen={isVectorModalOpen} 
                onClose={() => setIsVectorModalOpen(false)} 
                onAddSnippet={handleAddVectorSnippet}
            />
        </div>
    );
};
