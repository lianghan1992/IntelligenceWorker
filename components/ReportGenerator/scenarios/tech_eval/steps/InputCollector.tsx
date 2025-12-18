
import React, { useState, useRef } from 'react';
import { BrainIcon, DocumentTextIcon, PuzzleIcon, ArrowRightIcon, TrashIcon, SparklesIcon, CodeIcon } from '../../icons';
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
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] flex flex-col items-center py-10 px-6 custom-scrollbar">
            <style>{`
                .input-glow:focus-within {
                    box-shadow: 0 0 25px rgba(99, 102, 241, 0.08);
                    border-color: rgba(99, 102, 241, 0.3);
                }
                .tech-gradient-border {
                    background: linear-gradient(white, white) padding-box,
                                linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) border-box;
                    border: 2px solid transparent;
                }
                .tech-gradient-border:focus-within {
                    background: linear-gradient(white, white) padding-box,
                                linear-gradient(135deg, #6366f1 0%, #a855f7 100%) border-box;
                }
                .custom-input-font {
                    font-family: 'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
                }
            `}</style>

            <div className="max-w-4xl w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <header className="text-center space-y-2">
                    <div className="inline-flex p-3.5 bg-white rounded-2xl shadow-xl shadow-indigo-500/5 border border-indigo-50 text-indigo-600 mb-2 transform hover:rotate-3 transition-transform">
                        <BrainIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">新技术深度评估 Agent</h2>
                    <p className="text-slate-500 text-sm font-medium max-w-xl mx-auto opacity-80">
                        结合行业情报库与专家评估逻辑，生成参数级技术可行性分析报告
                    </p>
                </header>

                <div className="flex flex-col gap-8">
                    {/* 01. 技术现状描述 */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2.5">
                                <div className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-[9px] font-black">01</div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analysis Target</label>
                            </div>
                            <span className="text-[9px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">必填</span>
                        </div>
                        
                        <div className="relative tech-gradient-border input-glow rounded-3xl shadow-xl shadow-slate-200/40 bg-white transition-all duration-300">
                            <div className="absolute top-5 left-5 pointer-events-none">
                                <CodeIcon className="w-4 h-4 text-slate-300" />
                            </div>
                            <textarea 
                                value={targetTech}
                                onChange={e => setTargetTech(e.target.value)}
                                placeholder="输入待评估技术的描述。例如：‘我们正在开发一种高倍率快充圆柱电池方案，采用硅碳负极技术...’"
                                className="custom-input-font w-full h-[220px] p-6 pl-14 text-sm border-none focus:ring-0 outline-none resize-none text-slate-700 placeholder:text-slate-300 leading-relaxed bg-transparent"
                            />
                            <div className="absolute bottom-4 right-6 flex items-center gap-2">
                                <div className={`w-1 h-1 rounded-full ${targetTech.length > 10 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{targetTech.length} chars</span>
                            </div>
                        </div>
                    </div>

                    {/* 02. 资料库注入 */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2.5">
                                <div className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-[9px] font-black">02</div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contextual Ingestion</label>
                            </div>
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">可选</span>
                        </div>

                        <div className="tech-gradient-border input-glow rounded-3xl shadow-xl shadow-slate-200/40 bg-white overflow-hidden transition-all duration-300 flex flex-col min-h-[300px] max-h-[500px]">
                            <div className="flex-1 flex flex-col p-5 overflow-hidden">
                                {/* Textarea 弹性填充空间，解决无法占满问题 */}
                                <textarea 
                                    value={manualMaterials}
                                    onChange={e => setManualMaterials(e.target.value)}
                                    placeholder="在此粘贴参考文本或补充背景资料（AI将优先基于此内容进行RAG分析）..."
                                    className="custom-input-font flex-1 w-full p-2 text-sm border-none focus:ring-0 outline-none resize-none text-slate-600 placeholder:text-slate-300 leading-relaxed bg-transparent custom-scrollbar"
                                />
                                
                                {/* 附件列表区域：仅在有内容时显示 */}
                                {references.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-50 overflow-y-auto max-h-[160px] custom-scrollbar">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                                            <SparklesIcon className="w-3 h-3 text-indigo-400" />
                                            Active Knowledge Packets
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {references.map(r => (
                                                <div key={r.id} className="flex items-center justify-between bg-slate-50/80 border border-slate-100 p-2.5 rounded-xl group/item hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${r.type === 'file' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                            {r.type === 'file' ? <DocumentTextIcon className="w-3.5 h-3.5" /> : <PuzzleIcon className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600 truncate">{r.title}</span>
                                                    </div>
                                                    <button onClick={() => removeReference(r.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-slate-50/50 backdrop-blur-sm flex items-center justify-between border-t border-slate-100 px-5">
                                <div className="flex items-center gap-2">
                                    <input type="file" className="hidden" id="tech-upload" onChange={handleFileUpload} />
                                    <button 
                                        onClick={() => document.getElementById('tech-upload')?.click()}
                                        disabled={isUploading}
                                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm flex items-center gap-2 text-[11px] font-bold active:scale-95 disabled:opacity-50"
                                    >
                                        <DocumentTextIcon className="w-3.5 h-3.5" /> 
                                        <span>上传文档</span>
                                    </button>
                                    <button 
                                        onClick={() => setIsVectorModalOpen(true)}
                                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm flex items-center gap-2 text-[11px] font-bold active:scale-95"
                                    >
                                        <PuzzleIcon className="w-3.5 h-3.5" /> 
                                        <span>知识库检索</span>
                                    </button>
                                </div>
                                
                                {isUploading && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Uploading</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-4 pb-10">
                    <button 
                        onClick={handleStart}
                        disabled={!targetTech.trim() || isUploading}
                        className="group relative px-16 py-4 bg-slate-900 text-white font-black text-lg rounded-2xl shadow-2xl shadow-indigo-500/10 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3.5 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        <SparklesIcon className="w-5 h-5 text-indigo-300" />
                        <span>开始深度评估</span>
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
