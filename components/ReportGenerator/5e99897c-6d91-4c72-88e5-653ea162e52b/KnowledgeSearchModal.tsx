
import React, { useState } from 'react';
import { searchSemanticSegments } from '../../../api/intelligence';
import { InfoItem } from '../../../types';
import { SearchIcon, CloseIcon, PuzzleIcon, PlusIcon, CheckIcon } from '../../icons';

interface KnowledgeSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (items: { content: string; title: string }[]) => void;
}

export const KnowledgeSearchModal: React.FC<KnowledgeSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<InfoItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    
    // Store selected items
    const [selectedItems, setSelectedItems] = useState<InfoItem[]>([]);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        setHasSearched(true);
        try {
            const res = await searchSemanticSegments({
                query_text: query,
                page: 1,
                page_size: 20,
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
    
    const toggleSelection = (item: InfoItem) => {
        const exists = selectedItems.find(i => i.id === item.id);
        if (exists) {
            setSelectedItems(prev => prev.filter(i => i.id !== item.id));
        } else {
            setSelectedItems(prev => [...prev, item]);
        }
    };

    const handleConfirm = () => {
        const payload = selectedItems.map(i => ({
            content: i.content,
            title: i.title,
        }));
        onSelect(payload);
        setSelectedItems([]); // Reset
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Transparent/Blurred Backdrop - No dark color */}
            <div 
                className="absolute inset-0 bg-white/20 backdrop-blur-[2px] transition-opacity duration-300" 
                onClick={onClose}
            ></div>
            
            {/* Modal Window - Floating Effect */}
            <div className="bg-white/95 backdrop-blur-md w-full max-w-2xl h-[70vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 relative z-10 animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <PuzzleIcon className="w-5 h-5 text-indigo-600" />
                        引用知识库
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100 bg-white/80">
                    <div className="relative flex gap-2">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            className="flex-1 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-shadow focus:bg-white"
                            placeholder="输入关键词搜索知识片段..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        <button 
                            onClick={handleSearch}
                            disabled={isLoading || !query.trim()}
                            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md text-sm"
                        >
                            {isLoading ? '...' : '搜索'}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50 pb-20">
                    {!hasSearched ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                            <PuzzleIcon className="w-12 h-12 text-slate-300" />
                            <p className="text-xs font-medium">搜索并引用高质量情报</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">未找到相关内容</div>
                    ) : (
                        results.map((item, idx) => {
                            const isSelected = selectedItems.some(i => i.id === item.id);
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => toggleSelection(item)}
                                    className={`
                                        p-4 rounded-xl border shadow-sm transition-all group cursor-pointer
                                        ${isSelected 
                                            ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' 
                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1 flex-1">{item.title}</h4>
                                        <div className={`
                                            w-5 h-5 rounded-full border flex items-center justify-center transition-colors ml-2 flex-shrink-0
                                            ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}
                                        `}>
                                            {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-2 font-medium">{item.content}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-100">{item.source_name}</span>
                                        <span>相似度: <span className="font-mono text-indigo-500 font-bold">{((item.similarity || 0) * 100).toFixed(0)}%</span></span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Selection Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-lg flex justify-between items-center z-20">
                    <span className="text-sm text-slate-600 font-medium">
                        已选择 <strong className="text-indigo-600">{selectedItems.length}</strong> 条
                    </span>
                    <button 
                        onClick={handleConfirm}
                        disabled={selectedItems.length === 0}
                        className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:bg-slate-400 transition-colors shadow-md text-sm"
                    >
                        确认引用
                    </button>
                </div>
            </div>
        </div>
    );
};
