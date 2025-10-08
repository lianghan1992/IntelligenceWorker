import React, { useState, useMemo, useEffect } from 'react';
import { InfoItem, Subscription, StrategicFocus, CompetitorWatch, SearchResult } from '../types';
import { LightBulbIcon, SearchIcon, PlusIcon, CloseIcon, TagIcon, RssIcon } from './icons';
import { extractKeywords, searchArticles } from '../api';

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Modals ---
const AddFocusModal: React.FC<{
    onClose: () => void;
    onAdd: (intent: string) => void;
    isLoading: boolean;
}> = ({ onClose, onAdd, isLoading }) => {
    const [intent, setIntent] = useState('');
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold">新增战略情报焦点</h3>
                    <button onClick={onClose} disabled={isLoading}><CloseIcon className="w-6 h-6 text-gray-400" /></button>
                </div>
                <div className="p-6">
                    <textarea value={intent} onChange={e => setIntent(e.target.value)} rows={5} placeholder="输入您关心的话题或问题，例如：‘我想了解最近关于芯片禁令对国内半导体行业的影响’" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end">
                    <button onClick={() => onAdd(intent)} disabled={!intent.trim() || isLoading} className="w-28 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg disabled:bg-blue-300 flex items-center justify-center">
                        {isLoading ? <Spinner /> : '添加焦点'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AddCompetitorModal: React.FC<{
    onClose: () => void;
    onAdd: (entities: string[], intent: string) => void;
    isLoading: boolean;
    sources: { id: string, name: string }[];
}> = ({ onClose, onAdd, isLoading, sources }) => {
    const [selected, setSelected] = useState<string[]>([]);
    const [intent, setIntent] = useState('');

    const toggleSelection = (name: string) => {
        setSelected(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold">新增实体监控</h3>
                     <button onClick={onClose} disabled={isLoading}><CloseIcon className="w-6 h-6 text-gray-400" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="font-medium text-gray-700">选择车企 (可多选)</label>
                        <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border">
                            {sources.map(s => (
                                <button key={s.id} onClick={() => toggleSelection(s.name)} className={`px-3 py-1.5 text-sm rounded-full border ${selected.includes(s.name) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}>
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                         <label className="font-medium text-gray-700">输入监控意图</label>
                        <textarea value={intent} onChange={e => setIntent(e.target.value)} rows={3} placeholder="例如：智驾功能最新OTA内容" className="mt-2 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end">
                    <button onClick={() => onAdd(selected, intent)} disabled={selected.length === 0 || !intent.trim() || isLoading} className="w-32 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg disabled:bg-blue-300 flex items-center justify-center">
                         {isLoading ? <Spinner /> : '添加监控'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Left Panel ---
const LeftPanel: React.FC<{
    focuses: StrategicFocus[];
    watches: CompetitorWatch[];
    sources: { id: string, name: string }[];
    onNewFocus: (intent: string) => void;
    onNewWatch: (entities: string[], intent: string) => void;
    onSelect: (item: StrategicFocus | CompetitorWatch) => void;
    isLoading: boolean;
}> = ({ focuses, watches, sources, onNewFocus, onNewWatch, onSelect, isLoading }) => {
    const [isFocusModalOpen, setFocusModalOpen] = useState(false);
    const [isWatchModalOpen, setWatchModalOpen] = useState(false);
    
    return (
        <div className="w-1/4 bg-white border-r p-4 flex flex-col h-full">
            {/* Strategic Focus */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><LightBulbIcon className="w-5 h-5 text-yellow-500" /> 战略情报焦点</h3>
                    <button onClick={() => setFocusModalOpen(true)} className="p-1 hover:bg-gray-100 rounded-full"><PlusIcon className="w-5 h-5 text-gray-500" /></button>
                </div>
                <ul className="space-y-1">
                    {focuses.map(f => (
                        <li key={f.id} onClick={() => onSelect(f)} className="p-2 rounded-lg cursor-pointer hover:bg-blue-50 group">
                            <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 truncate">{f.title}</p>
                            <p className="text-xs text-gray-500 truncate">{f.content}</p>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Competitor Watchlist */}
             <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><RssIcon className="w-5 h-5 text-blue-500" /> 竞争对手看板</h3>
                    <button onClick={() => setWatchModalOpen(true)} className="p-1 hover:bg-gray-100 rounded-full"><PlusIcon className="w-5 h-5 text-gray-500" /></button>
                </div>
                 <ul className="space-y-1">
                    {watches.map(w => (
                        <li key={w.id} onClick={() => onSelect(w)} className="p-2 rounded-lg cursor-pointer hover:bg-blue-50 group">
                             <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 truncate">{w.intent}</p>
                             <p className="text-xs text-gray-500 truncate">实体: {w.entities.join(', ')}</p>
                        </li>
                    ))}
                </ul>
            </div>
            
             {/* Warning Strategy (Placeholder) */}
            <div>
                 <h3 className="font-bold text-gray-800">预警策略</h3>
                 <p className="text-sm text-gray-400 mt-2">即将推出...</p>
            </div>

            {isFocusModalOpen && <AddFocusModal onClose={() => setFocusModalOpen(false)} onAdd={onNewFocus} isLoading={isLoading} />}
            {isWatchModalOpen && <AddCompetitorModal onClose={() => setWatchModalOpen(false)} onAdd={onNewWatch} isLoading={isLoading} sources={sources} />}
        </div>
    );
};

// --- Center Panel ---
const ReportPanel: React.FC<{ reportHtml: string | null; isLoading: boolean; }> = ({ reportHtml, isLoading }) => {
    return (
        <div className="w-1/2 bg-gray-50 p-6 overflow-y-auto h-full">
            {isLoading && <div className="flex items-center justify-center h-full"><p>AI 正在生成简报...</p></div>}
            {!isLoading && !reportHtml && <div className="flex items-center justify-center h-full"><p className="text-gray-500">请在左侧选择一个焦点以生成报告</p></div>}
            {!isLoading && reportHtml && (
                <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: reportHtml }} />
            )}
        </div>
    );
};


// --- Right Panel ---
const IntelligenceStream: React.FC<{ articles: SearchResult[]; isLoading: boolean }> = ({ articles, isLoading }) => {
    return (
        <div className="w-1/4 bg-white border-l p-4 overflow-y-auto h-full">
            <h3 className="font-bold text-gray-800 mb-4">实时情报流</h3>
            {isLoading && <p>正在检索情报...</p>}
            {!isLoading && articles.length === 0 && <p className="text-sm text-gray-500">暂无相关情报。</p>}
            <div className="space-y-3">
                {articles.map(article => (
                    <div key={article.id} className="p-3 bg-gray-50 rounded-lg border">
                        <p className="text-xs text-gray-600">{article.source_name}</p>
                        <p className="text-sm font-semibold text-gray-800 mt-1 line-clamp-2">{article.title}</p>
                        <a href={article.original_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1">查看原文</a>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Component ---
export const StrategicCockpit: React.FC<{ subscriptions: Subscription[] }> = ({ subscriptions }) => {
    const [focuses, setFocuses] = useState<StrategicFocus[]>([]);
    const [watches, setWatches] = useState<CompetitorWatch[]>([]);
    const [reportHtml, setReportHtml] = useState<string | null>(null);
    const [streamArticles, setStreamArticles] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const allPointIds = useMemo(() => subscriptions.map(sub => sub.id), [subscriptions]);
    const allSources = useMemo(() => {
        const uniqueSources = new Map<string, string>();
        subscriptions.forEach(sub => {
            if (!uniqueSources.has(sub.source_name)) {
                uniqueSources.set(sub.source_name, sub.source_id || sub.source_name);
            }
        });
        return Array.from(uniqueSources.entries()).map(([name, id]) => ({ id, name }));
    }, [subscriptions]);

    const handleNewFocus = async (intent: string) => {
        setIsLoading(true);
        // Simulate AI processing
        await new Promise(res => setTimeout(res, 1500)); 
        const title = intent.substring(0, 15) + '...';
        const content = await extractKeywords(intent);
        const newFocus: StrategicFocus = { id: Date.now(), title, content: content.join(', '), originalIntent: intent };
        setFocuses(prev => [newFocus, ...prev]);
        setIsLoading(false);
    };

    const handleNewWatch = async (entities: string[], intent: string) => {
        setIsLoading(true);
        // Simulate AI processing
        await new Promise(res => setTimeout(res, 1000));
        const newWatch: CompetitorWatch = { id: Date.now(), entities, intent };
        setWatches(prev => [newWatch, ...prev]);
        setIsLoading(false);
    };

    const handleSelect = async (item: StrategicFocus | CompetitorWatch) => {
        setIsLoading(true);
        setReportHtml(null);
        setStreamArticles([]);
        setError(null);
        
        try {
            const queryText = 'originalIntent' in item ? item.originalIntent : `${item.entities.join(' ')} ${item.intent}`;
            const results = await searchArticles(queryText, allPointIds, 30);
            setStreamArticles(results);
            
            // Simulate AI generating HTML report
            await new Promise(res => setTimeout(res, 2000)); 
            const mockHtml = `
                <h1>${'title' in item ? item.title : item.intent} - AI洞察简报</h1>
                <p>根据您的情报意图，AI分析了 ${results.length} 条相关情报，总结如下：</p>
                <h2>核心发现</h2>
                <ul>
                    <li><strong>关键趋势一:</strong> 这是根据检索到的情报提炼出的第一个核心趋势或观点。</li>
                    <li><strong>关键趋势二:</strong> 这是第二个关键发现，可能涉及市场变化、技术突破或竞争对手动态。</li>
                    <li><strong>潜在影响:</strong> 分析这些情报可能带来的潜在商业影响或机遇。</li>
                </ul>
                <p><em>注意：此报告由AI模拟生成，用于演示目的。</em></p>
            `;
            setReportHtml(mockHtml);
            
        } catch (err: any) {
            setError(err.message || '处理请求时出错');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-full overflow-hidden">
            <LeftPanel
                focuses={focuses}
                watches={watches}
                sources={allSources}
                onNewFocus={handleNewFocus}
                onNewWatch={handleNewWatch}
                onSelect={handleSelect}
                isLoading={isLoading}
            />
            <ReportPanel reportHtml={reportHtml} isLoading={isLoading} />
            <IntelligenceStream articles={streamArticles} isLoading={isLoading} />
        </div>
    );
};
