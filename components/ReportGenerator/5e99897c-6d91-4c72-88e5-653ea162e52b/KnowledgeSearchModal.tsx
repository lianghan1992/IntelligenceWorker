
import React, { useState } from 'react';
import { searchSemanticSegments } from '../../../api/intelligence';
import { InfoItem } from '../../../types';
import { SearchIcon, CloseIcon, PuzzleIcon, PlusIcon } from '../../icons';

interface KnowledgeSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (content: string, source: string) => void;
}

export const KnowledgeSearchModal: React.FC<KnowledgeSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<InfoItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        setHasSearched(true);
        try {
            const res = await searchSemanticSegments({
                query_text: query,
                page: 1,
                page_size: 10,
                similarity_threshold: 0.3,
                max_segments: 20
            });
            setResults(res.items || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white w-full max-w-2xl h-[70vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <PuzzleIcon className="w-5 h-5 text-indigo-600" />
                        引用知识库
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="relative flex gap-2">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            className="flex-1 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-shadow"
                            placeholder="输入关键词搜索知识片段..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        <button 
                            onClick={handleSearch}
                            disabled={isLoading || !query.trim()}
                            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
                        >
                            {isLoading ? '...' : '搜索'}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                    {!hasSearched ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                            <PuzzleIcon className="w-12 h-12" />
                            <p className="text-xs">搜索并引用高质量情报</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">未找到相关内容</div>
                    ) : (
                        results.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{item.title}</h4>
                                    <button 
                                        onClick={() => onSelect(item.content, item.title)}
                                        className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-bold hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                                    >
                                        <PlusIcon className="w-3 h-3" /> 引用
                                    </button>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-2">{item.content}</p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded">{item.source_name}</span>
                                    <span>相似度: {((item.similarity || 0) * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
