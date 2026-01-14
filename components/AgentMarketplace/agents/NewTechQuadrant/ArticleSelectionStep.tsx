
import React, { useState, useEffect } from 'react';
import { getArticles } from '../../../../api/intelligence';
import { ArticlePublic } from '../../../../types';
import { SearchIcon, RefreshIcon, CheckCircleIcon, ArrowRightIcon, DocumentTextIcon, CalendarIcon } from '../../../../components/icons';

interface ArticleSelectionStepProps {
    onConfirm: (articles: ArticlePublic[]) => void;
    onBack: () => void;
}

export const ArticleSelectionStep: React.FC<ArticleSelectionStepProps> = ({ onConfirm, onBack }) => {
    const [articles, setArticles] = useState<ArticlePublic[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadArticles();
    }, []);

    const loadArticles = async () => {
        setIsLoading(true);
        try {
            const res = await getArticles({ page: 1, limit: 50 });
            setArticles(res.items || []);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleConfirm = () => {
        const selected = articles.filter(a => selectedIds.has(a.id));
        onConfirm(selected);
    };

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full p-6">
            <div className="mb-8 text-center space-y-2">
                <h2 className="text-3xl font-extrabold text-slate-900">选择分析素材</h2>
                <p className="text-slate-500">从文章库中选择一篇或多篇技术文档，AI 将自动提取其中的创新技术点。</p>
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="relative w-96">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="搜索文章标题..." 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={loadArticles} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors">
                            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="text-xs uppercase text-slate-400 bg-white sticky top-0 z-10">
                            <tr>
                                <th className="p-3 w-12 text-center">选择</th>
                                <th className="p-3">文章标题</th>
                                <th className="p-3 w-40">来源</th>
                                <th className="p-3 w-40">发布时间</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {articles
                                .filter(a => a.title.toLowerCase().includes(search.toLowerCase()))
                                .map(article => (
                                <tr 
                                    key={article.id} 
                                    className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${selectedIds.has(article.id) ? 'bg-indigo-50/50' : ''}`}
                                    onClick={() => toggleSelection(article.id)}
                                >
                                    <td className="p-3 text-center">
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${selectedIds.has(article.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                            {selectedIds.has(article.id) && <CheckCircleIcon className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </td>
                                    <td className="p-3 font-medium text-slate-900">
                                        {article.title}
                                    </td>
                                    <td className="p-3">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500">{article.source_name}</span>
                                    </td>
                                    <td className="p-3 text-slate-400 font-mono text-xs">
                                        {new Date(article.publish_date || article.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
                    <span className="text-sm text-slate-500">已选择 <strong className="text-indigo-600">{selectedIds.size}</strong> 篇文章</span>
                    <button 
                        onClick={handleConfirm}
                        disabled={selectedIds.size === 0}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                    >
                        下一步：提取技术点 <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
