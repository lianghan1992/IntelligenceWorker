import React, { useState, useRef } from 'react';
/* Added missing RefreshIcon and ArrowRightIcon to imports */
import { SparklesIcon, DocumentTextIcon, GlobeIcon, PuzzleIcon, PlusIcon, CloseIcon, LinkIcon, CheckIcon, RefreshIcon, ArrowRightIcon } from '../../icons';
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
        <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-indigo-50/30 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-indigo-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-xl shadow-indigo-200 transform hover:rotate-12 transition-transform">
                        <SparklesIcon className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">智绘演示报告架构师</h2>
                    <p className="text-slate-500 text-lg font-medium">输入您的想法并汇聚参考资料，AI 将为您构建专业的报告蓝图。</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Idea Input */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-[32px] shadow-2xl shadow-indigo-100/50 border border-slate-100 flex flex-col h-full ring-1 ring-black/5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4" /> 您的想法/主题
                            </label>
                            <textarea 
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder="例如：生成一份关于 2024 年小米汽车技术架构深度对标特斯拉的研报..."
                                className="flex-1 w-full bg-slate-50 rounded-2xl p-5 text-base border-none outline-none resize-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium min-h-[200px]"
                            />
                        </div>
                    </div>

                    {/* Right: Materials Ingestion */}
                    <div className="space-y-6 flex flex-col">
                        <div className="bg-white p-6 rounded-[32px] shadow-2xl shadow-indigo-100/50 border border-slate-100 flex flex-col flex-1 ring-1 ring-black/5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <PlusIcon className="w-4 h-4" /> 补充参考资料
                            </label>
                            
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input 
                                        value={urlInput}
                                        onChange={e => setUrlInput(e.target.value)}
                                        placeholder="输入网页 URL 抓取..."
                                        className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                    <button 
                                        onClick={handleAddUrl}
                                        disabled={isFetching || !urlInput.trim()}
                                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-100"
                                    >
                                        {isFetching ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <GlobeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsKMOpen(true)} className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 border border-slate-100">
                                        <PuzzleIcon className="w-4 h-4" /> 检索知识库
                                    </button>
                                    <label className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 border border-slate-100 cursor-pointer">
                                        <DocumentTextIcon className="w-4 h-4" /> 上传本地文件
                                        <input type="file" className="hidden" onChange={handleFileChange} />
                                    </label>
                                </div>
                            </div>

                            <div className="flex-1 mt-6 overflow-y-auto custom-scrollbar space-y-2 max-h-[160px]">
                                {materials.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-300 text-xs italic">暂无外部资料引用</div>
                                ) : (
                                    materials.map(m => (
                                        <div key={m.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 group">
                                            <span className="text-xs font-medium text-slate-600 truncate flex-1">{m.name}</span>
                                            <button onClick={() => setMaterials(prev => prev.filter(i => i.id !== m.id))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <CloseIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button 
                        onClick={() => onNext(topic, combinedMaterials)}
                        disabled={!topic.trim()}
                        className="group relative px-12 py-4 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-[0_20px_50px_-10px_rgba(79,70,229,0.4)] hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            构建报告大纲 <ArrowRightIcon className="w-6 h-6 transition-transform group-hover:translate-x-2" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
                    </button>
                </div>
            </div>

            {isKMOpen && <KnowledgeSearchModal isOpen={isKMOpen} onClose={() => setIsKMOpen(false)} onSelect={handleKMSelect} />}
        </div>
    );
};