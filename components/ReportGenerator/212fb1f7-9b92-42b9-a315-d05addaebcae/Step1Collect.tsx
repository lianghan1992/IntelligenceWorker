
import React, { useState, useEffect } from 'react';
import { SparklesIcon, DocumentTextIcon, GlobeIcon, PuzzleIcon, PlusIcon, CloseIcon, RefreshIcon } from '../../icons';
import { fetchJinaReader } from '../../../api/intelligence';
import { KnowledgeSearchModal } from '../5e99897c-6d91-4c72-88e5-653ea162e52b/KnowledgeSearchModal';

interface Step1CollectProps {
    onUpdateMaterials: (materials: string) => void;
}

export const Step1Collect: React.FC<Step1CollectProps> = ({ onUpdateMaterials }) => {
    const [urlInput, setUrlInput] = useState('');
    const [materials, setMaterials] = useState<Array<{ id: string; name: string; content: string }>>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isKMOpen, setIsKMOpen] = useState(false);

    // 每次资料变动时同步给父组件
    useEffect(() => {
        const combined = materials.map(m => `--- 资料名: ${m.name} ---\n内容: ${m.content}`).join('\n\n');
        onUpdateMaterials(combined);
    }, [materials, onUpdateMaterials]);

    const handleAddUrl = async () => {
        if (!urlInput.trim()) return;
        setIsFetching(true);
        try {
            const content = await fetchJinaReader(urlInput);
            setMaterials(prev => [...prev, { id: crypto.randomUUID(), name: `网页: ${urlInput}`, content }]);
            setUrlInput('');
        } catch (e) {
            alert('网页抓取失败');
        } finally {
            setIsFetching(false);
        }
    };

    const handleKMSelect = (items: { title: string; content: string }[]) => {
        const newItems = items.map(i => ({ id: crypto.randomUUID(), name: `知识库: ${i.title}`, content: i.content }));
        setMaterials(prev => [...prev, ...newItems]);
        setIsKMOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setMaterials(prev => [...prev, { id: crypto.randomUUID(), name: `文件: ${file.name}`, content }]);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-3xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-800">汇聚参考资料</h2>
                    <p className="text-slate-500 text-sm font-medium">在开始报告生成前，请在此添加相关的行业研报、竞争情报或技术白皮书。</p>
                </div>

                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 ring-1 ring-black/5 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex gap-2">
                            <input 
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                placeholder="输入网页 URL 抓取..."
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
                            <button onClick={() => setIsKMOpen(true)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 border border-slate-100">
                                <PuzzleIcon className="w-4 h-4" /> 知识库
                            </button>
                            <label className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 border border-slate-100 cursor-pointer">
                                <DocumentTextIcon className="w-4 h-4" /> 本地文件
                                <input type="file" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-50">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">已添加的资料库 ({materials.length})</label>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {materials.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-300 text-xs italic border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                    暂无资料引用，AI 将仅根据通用知识创作
                                </div>
                            ) : (
                                materials.map(m => (
                                    <div key={m.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 group shadow-sm">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                <DocumentTextIcon className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 truncate">{m.name}</span>
                                        </div>
                                        <button onClick={() => setMaterials(prev => prev.filter(i => i.id !== m.id))} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                            <CloseIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-200/50">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <SparklesIcon className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <h4 className="font-bold mb-2 flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-indigo-300" />
                            智能体已就绪
                        </h4>
                        <p className="text-indigo-100/70 text-sm leading-relaxed">
                            请在左侧对话框告诉我们您的报告主题（例如：小米SU7技术架构深度剖析）。<br/>
                            我们将结合右侧的参考资料为您生成大纲。
                        </p>
                    </div>
                </div>
            </div>

            {isKMOpen && <KnowledgeSearchModal isOpen={isKMOpen} onClose={() => setIsKMOpen(false)} onSelect={handleKMSelect} />}
        </div>
    );
};
