
import React, { useState, useEffect } from 'react';
import { SparklesIcon, DocumentTextIcon, GlobeIcon, PuzzleIcon, RefreshIcon, CloseIcon, ArrowRightIcon } from '../icons';
import { fetchJinaReader } from '../../api/intelligence';
import { KnowledgeSearchModal } from './KnowledgeSearchModal';

interface Step1CollectProps {
    onUpdateMaterials: (materials: string) => void;
    onStart?: (topic: string) => void;
}

export const Step1Collect: React.FC<Step1CollectProps> = ({ onUpdateMaterials, onStart }) => {
    const [topic, setTopic] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [materials, setMaterials] = useState<Array<{ id: string; name: string; content: string }>>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isKMOpen, setIsKMOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'topic' | 'materials'>('topic');

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
            alert('网页抓取失败，请检查 URL 或网络');
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
        <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
            
            <div className="w-full max-w-2xl text-center space-y-8">
                {/* Hero Header */}
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wide">
                        <SparklesIcon className="w-3.5 h-3.5" />
                        AI Agent Powered
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                        从一个想法，<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">到专业洞察报告</span>
                    </h1>
                    <p className="text-slate-500 text-lg max-w-lg mx-auto">
                        汇聚全网情报，AI 深度分析，一键生成精美演示文稿。
                    </p>
                </div>

                {/* Main Input Box */}
                <div className="bg-white p-2 rounded-[24px] shadow-2xl shadow-indigo-100/50 border border-slate-200 relative overflow-hidden group transition-all hover:border-indigo-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <textarea 
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onStart?.(topic)}
                        placeholder="在此输入您的研究主题，例如：'分析小米SU7的市场竞争力与技术架构'..."
                        className="w-full h-32 p-6 text-lg bg-transparent border-none outline-none resize-none placeholder:text-slate-300 text-slate-800 font-medium leading-relaxed"
                    />
                    
                    <div className="flex items-center justify-between px-6 pb-4 pt-2">
                        {/* Attachments Trigger */}
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setActiveTab(activeTab === 'materials' ? 'topic' : 'materials')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${materials.length > 0 ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
                            >
                                <DocumentTextIcon className="w-4 h-4" />
                                {materials.length > 0 ? `${materials.length} 份参考资料` : '添加参考资料'}
                            </button>
                        </div>

                        <button 
                            onClick={() => onStart?.(topic)}
                            disabled={!topic.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:bg-slate-300 disabled:scale-100 disabled:shadow-none"
                        >
                            开始生成 <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Materials Drawer (Conditionally Visible) */}
                {activeTab === 'materials' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left animate-in slide-in-from-top-2 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <PuzzleIcon className="w-5 h-5 text-indigo-500" />
                                资料库挂载
                            </h3>
                            <button onClick={() => setActiveTab('topic')} className="text-slate-400 hover:text-slate-600"><CloseIcon className="w-5 h-5" /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                             <div className="flex gap-2">
                                <input 
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    placeholder="输入网页 URL 抓取..."
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 transition-colors"
                                />
                                <button 
                                    onClick={handleAddUrl}
                                    disabled={isFetching || !urlInput.trim()}
                                    className="p-2 bg-white border border-slate-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                                >
                                    {isFetching ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <GlobeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsKMOpen(true)} className="flex-1 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all">
                                    引用知识库
                                </button>
                                <label className="flex-1 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer text-center flex items-center justify-center">
                                    上传本地文件
                                    <input type="file" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>
                        </div>

                        {materials.length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {materials.map(m => (
                                    <div key={m.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-xs">
                                        <span className="truncate flex-1 text-slate-600 font-medium">{m.name}</span>
                                        <button onClick={() => setMaterials(prev => prev.filter(i => i.id !== m.id))} className="text-slate-400 hover:text-red-500 ml-2">
                                            <CloseIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {isKMOpen && <KnowledgeSearchModal isOpen={isKMOpen} onClose={() => setIsKMOpen(false)} onSelect={handleKMSelect} />}
        </div>
    );
};
