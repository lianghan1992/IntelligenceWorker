
import React, { useState, useEffect } from 'react';
import { SparklesIcon, DocumentTextIcon, GlobeIcon, PuzzleIcon, RefreshIcon, CloseIcon, ArrowRightIcon, PlusIcon } from '../icons';
import { fetchJinaReader } from '../../api/intelligence';
import { KnowledgeSearchModal } from './KnowledgeSearchModal';

interface Step1CollectProps {
    onUpdateMaterials: (materials: string) => void;
    onStart: (topic: string) => void;
}

export const Step1Collect: React.FC<Step1CollectProps> = ({ onUpdateMaterials, onStart }) => {
    const [topic, setTopic] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [materials, setMaterials] = useState<Array<{ id: string; name: string; content: string; type: string }>>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isKMOpen, setIsKMOpen] = useState(false);
    const [showMaterials, setShowMaterials] = useState(false);

    useEffect(() => {
        const combined = materials.map(m => `--- 资料[${m.type}]: ${m.name} ---\n内容: ${m.content}`).join('\n\n');
        onUpdateMaterials(combined);
    }, [materials, onUpdateMaterials]);

    const handleAddUrl = async () => {
        if (!urlInput.trim()) return;
        setIsFetching(true);
        try {
            const content = await fetchJinaReader(urlInput);
            setMaterials(prev => [...prev, { id: crypto.randomUUID(), name: urlInput, content, type: '网页' }]);
            setUrlInput('');
            setShowMaterials(true);
        } catch (e) {
            alert('抓取失败，请检查 URL');
        } finally {
            setIsFetching(false);
        }
    };

    const handleKMSelect = (items: { title: string; content: string }[]) => {
        const newItems = items.map(i => ({ id: crypto.randomUUID(), name: i.title, content: i.content, type: '知识库' }));
        setMaterials(prev => [...prev, ...newItems]);
        setIsKMOpen(false);
        setShowMaterials(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setMaterials(prev => [...prev, { id: crypto.randomUUID(), name: file.name, content, type: '文件' }]);
            setShowMaterials(true);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-[#fcfcfc] relative">
            {/* 动态背景修饰 */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>

            <div className="w-full max-w-2xl space-y-10 relative z-10 text-center">
                {/* Header */}
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-indigo-100 shadow-sm mb-4">
                        <SparklesIcon className="w-4 h-4 text-indigo-600" />
                        <span className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em]">Next-Gen Architect</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
                        你想分析什么主题？
                    </h1>
                </div>

                {/* Magical Input */}
                <div className="bg-white p-2 rounded-[32px] shadow-2xl shadow-indigo-200/40 border border-slate-200 group transition-all focus-within:ring-8 focus-within:ring-indigo-500/5 focus-within:border-indigo-500">
                    <textarea 
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="在此输入您的研究方向..."
                        className="w-full h-32 p-6 text-xl bg-transparent border-none outline-none resize-none placeholder:text-slate-300 text-slate-800 font-bold leading-relaxed"
                    />
                    
                    <div className="flex items-center justify-between p-3 border-t border-slate-50">
                        <div className="flex gap-1">
                             <button onClick={() => setIsKMOpen(true)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all" title="从知识库引用">
                                <PuzzleIcon className="w-6 h-6" />
                             </button>
                             <label className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all cursor-pointer" title="上传本地文件">
                                <PlusIcon className="w-6 h-6" />
                                <input type="file" className="hidden" onChange={handleFileChange} />
                             </label>
                        </div>

                        <button 
                            onClick={() => onStart(topic)}
                            disabled={!topic.trim()}
                            className="group flex items-center gap-3 px-8 py-3 bg-slate-900 text-white rounded-[20px] font-black text-sm hover:bg-indigo-600 transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:scale-100"
                        >
                            开始生成报告 <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Materials Tray */}
                <div className={`transition-all duration-500 ${materials.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                    <div className="flex flex-wrap justify-center gap-2">
                        {materials.map(m => (
                            <div key={m.id} className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm group hover:border-red-200 transition-all">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{m.type}</span>
                                <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{m.name}</span>
                                <button onClick={() => setMaterials(prev => prev.filter(i => i.id !== m.id))} className="text-slate-300 hover:text-red-500">
                                    <CloseIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {isKMOpen && <KnowledgeSearchModal isOpen={isKMOpen} onClose={() => setIsKMOpen(false)} onSelect={handleKMSelect} />}
        </div>
    );
};
