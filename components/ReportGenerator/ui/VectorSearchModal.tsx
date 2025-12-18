
import React, { useState } from 'react';
import { searchSemanticSegments } from '../../../api/intelligence';
import { InfoItem } from '../../../types';
import { SearchIcon, CloseIcon, PuzzleIcon, CheckIcon, SparklesIcon, PlusIcon } from '../../icons';

interface VectorSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSnippet: (snippet: { title: string; content: string }) => void;
}

export const VectorSearchModal: React.FC<VectorSearchModalProps> = ({ isOpen, onClose, onAddSnippet }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<InfoItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        try {
            const res = await searchSemanticSegments({
                query_text: query,
                page_size: 20,
                similarity_threshold: 0.3,
            });
            setResults(res.items || []);
        } catch (e) {
            alert('检索失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = (item: InfoItem) => {
        if (addedIds.has(item.id)) return;
        onAddSnippet({ title: item.title, content: item.content });
        setAddedIds(new Set([...Array.from(addedIds), item.id]));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                            <PuzzleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">情报库语义检索</h3>
                            <p className="text-xs text-slate-500">搜索并选取关键片段作为报告生成的参考资料</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
                        <CloseIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 border-b bg-white">
                    <div className="relative flex gap-3">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="输入关键词，如：‘小米SU7 智驾芯片对比’"
                                className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>
                        <button 
                            onClick={handleSearch}
                            disabled={isLoading || !query.trim()}
                            className="px-8 bg-slate-900 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? '检索中...' : '开始检索'}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                    {results.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <SparklesIcon className="w-16 h-16 mb-4" />
                            <p>输入关键词挖掘海量行业情报</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {results.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm group hover:border-emerald-300 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1 flex-1">{item.title}</h4>
                                        <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-2">
                                            {((item.similarity || 0) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-4 mb-4 leading-relaxed">{item.content}</p>
                                    <button 
                                        onClick={() => handleAdd(item)}
                                        disabled={addedIds.has(item.id)}
                                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                            addedIds.has(item.id) 
                                                ? 'bg-slate-100 text-slate-400 cursor-default' 
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                                        }`}
                                    >
                                        {addedIds.has(item.id) ? <CheckIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
                                        {addedIds.has(item.id) ? '已加入参考' : '加入参考资料'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
