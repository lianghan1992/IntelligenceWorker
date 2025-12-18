
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
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] flex flex-col items-center py-12 px-6 custom-scrollbar">
            <style>{`
                .input-glow:focus-within {
                    box-shadow: 0 0 20px rgba(79, 70, 229, 0.1);
                    border-color: rgba(79, 70, 229, 0.4);
                }
                .tech-gradient-border {
                    background: linear-gradient(white, white) padding-box,
                                linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%) border-box;
                }
                .tech-gradient-border:focus-within {
                    background: linear-gradient(white, white) padding-box,
                                linear-gradient(135deg, #6366f1 0%, #a855f7 100%) border-box;
                }
            `}</style>

            <div className="max-w-4xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <header className="text-center space-y-3">
                    <div className="inline-flex p-4 bg-white rounded-[24px] shadow-xl shadow-indigo-500/5 border border-indigo-50 text-indigo-600 mb-2 transform hover:rotate-3 transition-transform">
                        <BrainIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">新技术深度评估 Agent</h2>
                    <p className="text-slate-500 font-medium max-w-2xl mx-auto">
                        融合实时情报库与专家逻辑，为您提供参数级、链路级的技术可行性与竞争对标报告。
                    </p>
                </header>

                <div className="flex flex-col gap-10">
                    {/* 1. 技术现状描述区域 */}
                    <div className="group space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg">01</div>
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Analysis Target Descriptor</label>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-500/60 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">Required</span>
                        </div>
                        
                        <div className="relative tech-gradient-border input-glow border-2 border-transparent rounded-[32px] shadow-2xl shadow-slate-200/50 bg-white transition-all duration-300">
                            <div className="absolute top-6 left-6 pointer-events-none">
                                <CodeIcon className="w-5 h-5 text-slate-200" />
                            </div>
                            <textarea 
                                value={targetTech}
                                onChange={e => setTargetTech(e.target.value)}
                                placeholder="请输入需要评估的技术现状描述。例如：&#10;‘我们正在开发一种高倍率快充圆柱电池方案，采用硅碳负极技术，目标是在10分钟内完成0-80%充电...’"
                                className="w-full h-[280px] p-8 pl-16 text-lg border-none focus:ring-0 outline-none resize-none text-slate-800 placeholder:text-slate-300 font-medium leading-relaxed bg-transparent"
                            />
                            <div className="absolute bottom-6 right-8 flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${targetTech.length > 20 ? 'bg-emerald-500' : 'bg-slate-200 animate-pulse'}`}></div>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{targetTech.length} chars</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. 资料库注入区域 */}
                    <div className="group space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg">02</div>
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Contextual Intelligence Buffer</label>
                            </div>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Knowledge Ingestion</span>
                        </div>

                        <div className="tech-gradient-border input-glow border-2 border-transparent rounded-[32px] shadow-2xl shadow-slate-200/50 bg-white overflow-hidden transition-all duration-300 flex flex-col min-h-[350px]">
                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                <textarea 
                                    value={manualMaterials}
                                    onChange={e => setManualMaterials(e.target.value)}
                                    rows={4}
                                    placeholder="在此粘贴参考文本或补充背景资料..."
                                    className="w-full p-2 text-base border-none focus:ring-0 outline-none resize-none text-slate-600 placeholder:text-slate-300 leading-relaxed bg-transparent mb-4"
                                />
                                
                                {references.length > 0 && (
                                    <div className="pt-4 border-t border-slate-50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <SparklesIcon className="w-3 h-3 text-indigo-400" />
                                                Ingested Packets
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {references.map(r => (
                                                <div key={r.id} className="flex items-center justify-between bg-slate-50/50 border border-slate-100 p-3 rounded-2xl group/item hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${r.type === 'file' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                            {r.type === 'file' ? <DocumentTextIcon className="w-4 h-4" /> : <PuzzleIcon className="w-4 h-4" />}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-600 truncate">{r.title}</span>
                                                    </div>
                                                    <button onClick={() => removeReference(r.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 底部控制栏 */}
                            <div className="p-4 bg-slate-50/80 backdrop-blur-sm flex items-center justify-between border-t border-slate-100 px-6">
                                <div className="flex items-center gap-3">
                                    <input type="file" className="hidden" id="tech-upload" onChange={handleFileUpload} />
                                    <button 
                                        onClick={() => document.getElementById('tech-upload')?.click()}
                                        disabled={isUploading}
                                        className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm flex items-center gap-2 text-xs font-bold active:scale-95 disabled:opacity-50"
                                    >
                                        <DocumentTextIcon className="w-4 h-4" /> 
                                        <span>{isUploading ? '正在上传...' : '上传文档'}</span>
                                    </button>
                                    <button 
                                        onClick={() => setIsVectorModalOpen(true)}
                                        className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm flex items-center gap-2 text-xs font-bold active:scale-95"
                                    >
                                        <PuzzleIcon className="w-4 h-4" /> 
                                        <span>知识库检索</span>
                                    </button>
                                </div>
                                
                                {isUploading && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Processing</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-8 pb-12">
                    <button 
                        onClick={handleStart}
                        disabled={!targetTech.trim() || isUploading}
                        className="group relative px-20 py-5 bg-slate-900 text-white font-black text-xl rounded-[32px] shadow-2xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-4 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
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
