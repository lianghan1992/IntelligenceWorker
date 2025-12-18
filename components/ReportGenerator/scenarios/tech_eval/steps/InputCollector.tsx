
import React, { useState, useRef } from 'react';
import { BrainIcon, DocumentTextIcon, PuzzleIcon, ArrowRightIcon, TrashIcon, SparklesIcon, CodeIcon } from '../../../../icons';
import { VectorSearchModal } from '../../../ui/VectorSearchModal';
import { uploadStratifyFile } from '../../../../../api/stratify';

export const InputCollector: React.FC<{
    onStart: (data: { targetTech: string; materials: string }) => void;
}> = ({ onStart }) => {
    const [targetTech, setTargetTech] = useState('');
    const [manualMaterials, setManualMaterials] = useState('');
    const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    const [references, setReferences] = useState<{ id: string; title: string; content: string; type: 'file' | 'vector' }[]>([]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            await uploadStratifyFile(file);
            setReferences(prev => [...prev, { 
                id: Math.random().toString(36), 
                title: file.name, 
                content: `[参考文件: ${file.name}]`, 
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
        <div className="flex-1 overflow-y-auto bg-white flex flex-col items-center py-12 px-6 custom-scrollbar relative">
            {/* 背景修饰：极细网格 */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>

            <div className="max-w-4xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 relative z-10">
                <header className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl">
                        Agent Workspace
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">
                        新技术深度评估 <span className="text-indigo-600">v3.2</span>
                    </h2>
                    <p className="text-slate-400 font-medium max-w-xl mx-auto">
                        注入专业情报，启动 AI 专家逻辑。我们将为您生成包含技术路线、风险评估与决策建议的高保真研报。
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-10">
                    {/* Step 01: Analysis Target */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                                01. 评估目标定义
                            </h3>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[32px] opacity-0 group-focus-within:opacity-10 transition duration-500 blur"></div>
                            <div className="relative bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm group-focus-within:shadow-2xl group-focus-within:border-indigo-200 transition-all duration-500">
                                <textarea 
                                    value={targetTech}
                                    onChange={e => setTargetTech(e.target.value)}
                                    placeholder="描述您要评估的技术。例如：小米SU7搭载的 9100t 大压铸技术及其对供应链的影响..."
                                    className="w-full h-48 p-8 text-lg border-none focus:ring-0 outline-none resize-none text-slate-800 placeholder:text-slate-300 font-medium leading-relaxed"
                                />
                                <div className="p-4 bg-slate-50 flex justify-end items-center border-t border-slate-50 px-8">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{targetTech.length} CHARACTERS</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 02: Context Ingestion */}
                    <div className="space-y-4">
                         <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-slate-900 rounded-full"></div>
                                02. 情报上下文注入
                            </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Actions Column */}
                            <div className="md:col-span-1 space-y-3">
                                <input type="file" id="tech-file-up" className="hidden" onChange={handleFileUpload} />
                                <button 
                                    onClick={() => document.getElementById('tech-file-up')?.click()}
                                    disabled={isUploading}
                                    className="w-full p-6 bg-white border border-slate-200 rounded-3xl hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center gap-3 text-center"
                                >
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <DocumentTextIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">上传私有文档</div>
                                        <div className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-tighter">PDF / DOCX / MD</div>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => setIsVectorModalOpen(true)}
                                    className="w-full p-6 bg-white border border-slate-200 rounded-3xl hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center gap-3 text-center"
                                >
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <PuzzleIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">检索情报库</div>
                                        <div className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-tighter">Semantic Search</div>
                                    </div>
                                </button>
                            </div>

                            {/* Reference Display Column */}
                            <div className="md:col-span-2 bg-slate-50 rounded-[32px] border border-slate-100 p-6 flex flex-col min-h-[200px]">
                                {references.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-200 rounded-2xl">
                                        <SparklesIcon className="w-8 h-8 opacity-20" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Waiting for input</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {references.map(r => (
                                            <div key={r.id} className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm flex items-center justify-between group/item">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.type === 'file' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {r.type === 'file' ? <DocumentTextIcon className="w-4 h-4" /> : <PuzzleIcon className="w-4 h-4" />}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700 truncate">{r.title}</span>
                                                </div>
                                                <button onClick={() => removeReference(r.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-4 pt-4 border-t border-slate-200/50">
                                    <textarea 
                                        value={manualMaterials}
                                        onChange={e => setManualMaterials(e.target.value)}
                                        placeholder="补充额外背景或分析约束..."
                                        className="w-full h-24 bg-transparent border-none focus:ring-0 outline-none resize-none text-xs text-slate-500 font-medium leading-relaxed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-8 pb-12">
                    <button 
                        onClick={handleStart}
                        disabled={!targetTech.trim() || isUploading}
                        className="group relative px-24 py-5 bg-slate-900 text-white font-black text-xl rounded-full shadow-2xl hover:bg-indigo-600 hover:shadow-indigo-500/40 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-4">
                            启动深度分析流程 <ArrowRightIcon className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
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
