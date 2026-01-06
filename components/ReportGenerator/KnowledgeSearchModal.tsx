
import React, { useState } from 'react';
import { searchSemanticSegments } from '../../api/intelligence';
import { InfoItem } from '../../types';
import { SearchIcon, CloseIcon, PuzzleIcon, CheckIcon } from '../icons';

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

    const handleConfirm = () => {
        const payload = selectedItems.map(i => ({ content: i.content, title: i.title }));
        onSelect(payload);
        setSelectedItems([]);
        onClose();
    };

    const toggleSelection = (item: InfoItem) => {
        if (selectedItems.find(i => i.id === item.id)) {
            setSelectedItems(prev => prev.filter(i => i.id !== item.id));
        } else {
            setSelectedItems(prev => [...prev, item]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-white w-full max-w-2xl h-[70vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 relative z-10 animate-in zoom-in-95">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <PuzzleIcon className="w-5 h-5 text-indigo-600" /> 引用知识库
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400"><CloseIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-4 border-b border-slate-100">
                    <div className="relative flex gap-2">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            className="flex-1 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            placeholder="输入关键词..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            autoFocus
                        />
                        <button onClick={handleSearch} disabled={isLoading || !query.trim()} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
                            {isLoading ? '...' : '搜索'}
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                    {!hasSearched ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                            <PuzzleIcon className="w-12 h-12 text-slate-300" />
                            <p className="text-xs font-medium">搜索高质量情报</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">未找到相关内容</div>
                    ) : (
                        results.map((item, idx) => {
                            const isSelected = selectedItems.some(i => i.id === item.id);
                            return (
                                <div key={idx} onClick={() => toggleSelection(item)} className={`p-4 rounded-xl border shadow-sm cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1 flex-1">{item.title}</h4>
                                        {isSelected && <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center ml-2"><CheckIcon className="w-3 h-3 text-white" /></div>}
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-2">{item.content}</p>
                                </div>
                            );
                        })
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
                    <span className="text-sm text-slate-500">已选 <strong className="text-indigo-600">{selectedItems.length}</strong> 条</span>
                    <button onClick={handleConfirm} disabled={selectedItems.length === 0} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-indigo-600 disabled:opacity-50 text-sm">确认引用</button>
                </div>
            </div>
        </div>
    );
};
