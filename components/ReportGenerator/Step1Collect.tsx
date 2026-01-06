
import React, { useState, useEffect } from 'react';
import { SparklesIcon, DocumentTextIcon, GlobeIcon, PuzzleIcon, CloseIcon, RefreshIcon, ArrowRightIcon } from '../icons';
import { fetchJinaReader } from '../../api/intelligence';
import { KnowledgeSearchModal } from './KnowledgeSearchModal';

interface Step1CollectProps {
    onUpdateMaterials: (materials: string) => void;
    onNext: (topic: string) => void;
}

export const Step1Collect: React.FC<Step1CollectProps> = ({ onUpdateMaterials, onNext }) => {
    const [topicInput, setTopicInput] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [materials, setMaterials] = useState<Array<{ id: string; name: string; content: string }>>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isKMOpen, setIsKMOpen] = useState(false);

    // Sync materials
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
        <div className="h-full flex items-center justify-center p-4 relative">
            {/* Center Core Node */}
            <div className="w-full max-w-2xl flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700">
                
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-4 bg-indigo-50 rounded-full border-2 border-indigo-100 shadow-xl shadow-indigo-100 mb-2">
                        <SparklesIcon className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">定义研究核心</h2>
                    <p className="text-slate-500 text-sm font-medium max-w-md mx-auto">
                        输入您想生成的研报主题。AI 将以此为圆心，结合右侧资料库构建逻辑蓝图。
                    </p>
                </div>

                {/* Main Input */}
                <div className="w-full relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
                    <div className="relative bg-white rounded-xl shadow-lg flex items-center p-2 border border-slate-100">
                        <input 
                            value={topicInput}
                            onChange={e => setTopicInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && topicInput.trim() && onNext(topicInput)}
                            placeholder="例如：小米汽车 SU7 产品竞争力深度分析..."
                            className="flex-1 px-6 py-4 text-lg font-bold text-slate-800 placeholder:text-slate-300 outline-none bg-transparent"
                            autoFocus
                        />
                        <button 
                            onClick={() => onNext(topicInput)}
                            disabled={!topicInput.trim()}
                            className="p-3 bg-slate-900 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:bg-slate-200 transition-all active:scale-95"
                        >
                            <ArrowRightIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Side: Data Injector (Knowledge Base) */}
            <div className="absolute top-10 right-10 bottom-10 w-80 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-700">
                <div className="p-5 border-b border-slate-100 bg-slate-50/80">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <PuzzleIcon className="w-4 h-4 text-indigo-500" /> 
                        Data Injection ({materials.length})
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {/* Add Controls */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button onClick={() => setIsKMOpen(true)} className="flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-100">
                            <PuzzleIcon className="w-4 h-4" /> 知识库引用
                        </button>
                        <label className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer">
                            <DocumentTextIcon className="w-4 h-4" /> 本地上传
                            <input type="file" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>

                    <div className="relative">
                        <input 
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            placeholder="抓取 URL..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none pr-8"
                        />
                        <button 
                            onClick={handleAddUrl}
                            disabled={isFetching || !urlInput.trim()}
                            className="absolute right-1 top-1 p-1.5 text-slate-400 hover:text-indigo-600"
                        >
                            <RefreshIcon className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-2">
                        {materials.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-[10px]">暂无外挂资料，将使用模型通用知识</div>
                        ) : (
                            materials.map(m => (
                                <div key={m.id} className="group flex items-start gap-2 p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-200 transition-colors">
                                    <div className="mt-0.5 p-1 bg-slate-100 rounded text-slate-500">
                                        <DocumentTextIcon className="w-3 h-3" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{m.name}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{m.content.length} chars</p>
                                    </div>
                                    <button onClick={() => setMaterials(prev => prev.filter(i => i.id !== m.id))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <CloseIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {isKMOpen && <KnowledgeSearchModal isOpen={isKMOpen} onClose={() => setIsKMOpen(false)} onSelect={handleKMSelect} />}
        </div>
    );
};
