
import React, { useState } from 'react';
import { SparklesIcon, DocumentTextIcon, GlobeIcon, PuzzleIcon, PlusIcon, CloseIcon, CheckIcon, RefreshIcon, ArrowRightIcon } from '../../icons';
import { fetchJinaReader } from '../../../api/intelligence';
import { KnowledgeSearchModal } from '../5e99897c-6d91-4c72-88e5-653ea162e52b/KnowledgeSearchModal';

interface Step1CollectProps {
    onNext: (topic: string, materials: string) => void;
}

export const Step1Collect: React.FC<Step1CollectProps> = ({ onNext }) => {
    const [topic, setTopic] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [materials, setMaterials] = useState<Array<{ id: string; name: string; content: string }>>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isKMOpen, setIsKMOpen] = useState(false);

    const handleAddUrl = async () => {
        if (!urlInput.trim()) return;
        setIsFetching(true);
        try {
            const content = await fetchJinaReader(urlInput);
            setMaterials(prev => [...prev, { id: crypto.randomUUID(), name: `URL: ${urlInput}`, content }]);
            setUrlInput('');
        } catch (e) {
            alert('网页抓取失败，请检查 URL 是否有效');
        } finally {
            setIsFetching(false);
        }
    };

    const handleKMSelect = (items: { title: string; content: string }[]) => {
        const newItems = items.map(i => ({ id: crypto.randomUUID(), name: `KB: ${i.title}`, content: i.content }));
        setMaterials(prev => [...prev, ...newItems]);
        setIsKMOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setMaterials(prev => [...prev, { id: crypto.randomUUID(), name: `File: ${file.name}`, content }]);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const combinedMaterials = materials.map(m => `--- ${m.name} ---\n${m.content}`).join('\n\n');

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-800">构思报告灵感</h2>
                    <p className="text-slate-500 text-sm font-medium">输入核心主题并汇总参考背景资料，作为 AI 规划大纲的基石。</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Topic Input */}
                    <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 ring-1 ring-black/5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <DocumentTextIcon className="w-4 h-4 text-indigo-500" /> 研究主题 / 想法
                        </label>
                        <textarea 
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            placeholder="例如：生成一份关于 2024 年小米汽车技术架构深度对标特斯拉的研报..."
                            className="w-full bg-slate-50 rounded-xl p-4 text-sm border-none outline-none resize-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium min-h-[120px] shadow-inner"
                        />
                    </div>

                    {/* Materials area */}
                    <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 ring-1 ring-black/5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <PlusIcon className="w-4 h-4 text-indigo-500" /> 参考背景资料
                        </label>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex gap-2">
                                <input 
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    placeholder="输入网页 URL..."
                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                                />
                                <button 
                                    onClick={handleAddUrl}
                                    disabled={isFetching || !urlInput.trim()}
                                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-md"
                                >
                                    {isFetching ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <GlobeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsKMOpen(true)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 border border-slate-100 shadow-sm">
                                    <PuzzleIcon className="w-4 h-4" /> 知识库
                                </button>
                                <label className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 border border-slate-100 cursor-pointer shadow-sm">
                                    <DocumentTextIcon className="w-4 h-4" /> 本地文件
                                    <input type="file" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 overflow-y-auto custom-scrollbar space-y-2 max-h-[200px]">
                            {materials.length === 0 ? (
                                <div className="py-10 flex flex-col items-center justify-center text-slate-300 text-xs italic border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                    暂无外部资料引用
                                </div>
                            ) : (
                                materials.map(m => (
                                    <div key={m.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 group shadow-sm">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                                            <span className="text-xs font-bold text-slate-700 truncate">{m.name}</span>
                                        </div>
                                        <button onClick={() => setMaterials(prev => prev.filter(i => i.id !== m.id))} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <CloseIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button 
                        onClick={() => onNext(topic, combinedMaterials)}
                        disabled={!topic.trim()}
                        className="group flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                    >
                        下一步：构建大纲 <ArrowRightIcon className="w-6 h-6 transition-transform group-hover:translate-x-2" />
                    </button>
                </div>
            </div>

            {isKMOpen && <KnowledgeSearchModal isOpen={isKMOpen} onClose={() => setIsKMOpen(false)} onSelect={handleKMSelect} />}
        </div>
    );
};
