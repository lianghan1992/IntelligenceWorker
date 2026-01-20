
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { streamCommonSearch } from '../../../api/common';
import { uploadDocs } from '../../../api/intelligence';
import { CommonSearchItem } from '../../../types';
import { 
    GlobeIcon, RefreshIcon, CheckIcon, CloudIcon, SearchIcon, 
    ExternalLinkIcon, TrashIcon, ClockIcon, DocumentTextIcon,
    ShieldCheckIcon, PlusIcon, CloseIcon
} from '../../icons';

// 扩展前端状态类型
interface SearchResultItem extends CommonSearchItem {
    id: string; // 前端生成的唯一 ID，用于列表 key
    isSelected: boolean;
    customName: string; // 用户编辑后的文件名
    importStatus: 'idle' | 'loading' | 'success' | 'error';
    importMessage?: string;
}

export const DiscoverySearch: React.FC = () => {
    // --- State ---
    const [query, setQuery] = useState('');
    const [maxResults, setMaxResults] = useState(100);
    const [timeLimit, setTimeLimit] = useState('w'); // d, w, m, y
    const [fileType, setFileType] = useState('pdf');
    const [region, setRegion] = useState('cn-zh');

    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // UI Refs for scrolling
    const listEndRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    // --- Actions ---

    // 1. 执行搜索 (SSE Stream)
    const handleSearch = async () => {
        if (!query.trim() || isSearching) return;
        
        setIsSearching(true);
        setResults([]); // Clear previous
        setAutoScroll(true);

        await streamCommonSearch({
            query: query.trim(),
            max_results: maxResults,
            time_limit: timeLimit || undefined,
            file_type: fileType,
            region: region,
            search_type: 'text'
        }, (data) => {
            // On Data Chunk
            if (data && data.href) {
                const newItem: SearchResultItem = {
                    id: crypto.randomUUID(), // Unique ID for React Key
                    title: data.title,
                    href: data.href,
                    body: data.body,
                    isSelected: true, // 默认选中
                    customName: data.title, // 默认自定义名为原标题
                    importStatus: 'idle'
                };
                setResults(prev => [...prev, newItem]);
            }
        }, () => {
            // On Complete
            setIsSearching(false);
        }, (err) => {
            // On Error
            console.error(err);
            setIsSearching(false);
            alert('搜索连接中断，请重试');
        });
    };

    // Auto-scroll effect
    useEffect(() => {
        if (isSearching && autoScroll && listEndRef.current) {
            listEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [results, isSearching, autoScroll]);

    // 2. 单个/批量入库
    const handleImport = async (itemsToImport: SearchResultItem[]) => {
        const validItems = itemsToImport.filter(i => i.importStatus === 'idle' || i.importStatus === 'error');
        if (validItems.length === 0) return;

        // Optimistic update
        setResults(prev => prev.map(item => 
            validItems.find(v => v.id === item.id) 
                ? { ...item, importStatus: 'loading' } 
                : item
        ));

        // Prepare API payload (Batch upload supports arrays)
        const pdfUrls = validItems.map(i => i.href);
        const customNames = validItems.map(i => i.customName.trim() || i.title); // Use custom name or fallback

        try {
            await uploadDocs({
                pdf_urls: pdfUrls,
                custom_filenames: customNames,
                // point_id: undefined // 留空，让后端 LLM 自动分类
            });

            // Success update
            setResults(prev => prev.map(item => 
                validItems.find(v => v.id === item.id) 
                    ? { ...item, importStatus: 'success', isSelected: false } 
                    : item
            ));
        } catch (e: any) {
            // Error update
            setResults(prev => prev.map(item => 
                validItems.find(v => v.id === item.id) 
                    ? { ...item, importStatus: 'error', importMessage: e.message || '上传失败' } 
                    : item
            ));
            alert(`批量入库失败: ${e.message}`);
        }
    };

    const handleImportSelected = () => {
        const selected = results.filter(r => r.isSelected);
        handleImport(selected);
    };

    // 3. 列表交互
    const toggleSelect = (id: string) => {
        setResults(prev => prev.map(r => r.id === id ? { ...r, isSelected: !r.isSelected } : r));
    };

    const toggleSelectAll = () => {
        const allSelected = results.every(r => r.isSelected);
        setResults(prev => prev.map(r => ({ ...r, isSelected: !allSelected })));
    };

    const updateCustomName = (id: string, name: string) => {
        setResults(prev => prev.map(r => r.id === id ? { ...r, customName: name } : r));
    };
    
    const removeResult = (id: string) => {
        setResults(prev => prev.filter(r => r.id !== id));
    };

    // Stats
    const selectedCount = results.filter(r => r.isSelected).length;

    return (
        <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
            {/* 1. Control Bar (Top) */}
            <div className="bg-white border-b border-slate-200 p-4 shadow-sm z-10">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    {/* Search Input Group */}
                    <div className="flex-1 w-full md:w-auto flex gap-2">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                {isSearching ? <RefreshIcon className="h-5 w-5 text-indigo-500 animate-spin"/> : <SearchIcon className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors"/>}
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl leading-5 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                                placeholder="输入关键词 (如：2024 智能驾驶 行业报告)..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                disabled={isSearching}
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={isSearching || !query.trim()}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                        >
                            {isSearching ? '侦测中...' : '启动雷达'}
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 h-11 shadow-sm shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Time</span>
                            <select value={timeLimit} onChange={e => setTimeLimit(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                                <option value="">不限</option>
                                <option value="w">本周</option>
                                <option value="m">本月</option>
                                <option value="y">本年</option>
                            </select>
                        </div>
                         <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 h-11 shadow-sm shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Limit</span>
                            <select value={maxResults} onChange={e => setMaxResults(Number(e.target.value))} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                                <option value={20}>20 条</option>
                                <option value={50}>50 条</option>
                                <option value={100}>100 条</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Results List (Scrollable Area) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6" onScroll={() => setAutoScroll(false)}>
                {results.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-200">
                            <GlobeIcon className="w-12 h-12 text-indigo-200" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-600">全网 PDF 情报雷达</h3>
                        <p className="text-sm mt-2 max-w-xs text-center text-slate-400">输入关键词，系统将实时扫描全网公开的 PDF 报告资源。</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* List Header */}
                        <div className="flex items-center justify-between px-2 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <div className="flex items-center gap-3">
                                <button onClick={toggleSelectAll} className="hover:text-indigo-600 transition-colors">
                                    {results.every(r => r.isSelected) ? '取消全选' : '全选'}
                                </button>
                                <span>已找到 {results.length} 份文档</span>
                            </div>
                            {isSearching && <span className="text-indigo-500 animate-pulse flex items-center gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> 实时接收中...</span>}
                        </div>

                        {results.map((item) => (
                            <div 
                                key={item.id} 
                                className={`
                                    group relative bg-white border rounded-xl p-4 transition-all duration-200
                                    ${item.isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/20 shadow-md' : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'}
                                    ${item.importStatus === 'success' ? 'bg-green-50/30 border-green-200' : ''}
                                `}
                            >
                                <div className="flex gap-4">
                                    {/* Checkbox */}
                                    <div className="pt-1 flex-shrink-0">
                                        <input 
                                            type="checkbox" 
                                            checked={item.isSelected} 
                                            onChange={() => toggleSelect(item.id)}
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            disabled={item.importStatus === 'success' || item.importStatus === 'loading'}
                                        />
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                                        {/* Left: Info */}
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-slate-800 leading-snug truncate" title={item.title}>
                                                <a href={item.href} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline decoration-2 underline-offset-2">
                                                    {item.title}
                                                </a>
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px] text-slate-600 truncate max-w-[120px]">
                                                    {new URL(item.href).hostname}
                                                </span>
                                                {item.body && <span className="truncate max-w-xs opacity-70 border-l border-slate-300 pl-2">{item.body}</span>}
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 relative group/input">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <DocumentTextIcon className="h-4 w-4 text-slate-400 group-focus-within/input:text-indigo-500" />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={item.customName}
                                                    onChange={(e) => updateCustomName(item.id, e.target.value)}
                                                    className="block w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium placeholder:text-slate-400"
                                                    placeholder="重命名文档..."
                                                    disabled={item.importStatus === 'success'}
                                                />
                                            </div>
                                            
                                            {/* Status / Single Action */}
                                            <div className="flex-shrink-0 w-24 flex justify-end">
                                                {item.importStatus === 'idle' && (
                                                    <button 
                                                        onClick={() => handleImport([item])}
                                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        入库
                                                    </button>
                                                )}
                                                {item.importStatus === 'loading' && (
                                                    <span className="flex items-center gap-1 text-xs font-bold text-indigo-500">
                                                        <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> 处理中
                                                    </span>
                                                )}
                                                {item.importStatus === 'success' && (
                                                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
                                                        <CheckIcon className="w-3.5 h-3.5"/> 已完成
                                                    </span>
                                                )}
                                                {item.importStatus === 'error' && (
                                                    <button 
                                                        onClick={() => handleImport([item])}
                                                        className="text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
                                                        title={item.importMessage}
                                                    >
                                                        重试
                                                    </button>
                                                )}
                                            </div>

                                            {/* Remove Button */}
                                            <button 
                                                onClick={() => removeResult(item.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={listEndRef} className="h-4"></div>
                    </div>
                )}
            </div>

            {/* 3. Batch Action Bar (Sticky Bottom) */}
            {selectedCount > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center animate-in slide-in-from-bottom-4 fade-in">
                    <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                                {selectedCount}
                            </div>
                            <span className="text-sm font-bold">个项目待处理</span>
                        </div>
                        
                        <div className="h-6 w-px bg-white/20"></div>

                        <button 
                            onClick={handleImportSelected}
                            className="flex items-center gap-2 text-sm font-bold hover:text-indigo-300 transition-colors group"
                        >
                            <CloudIcon className="w-5 h-5 group-hover:scale-110 transition-transform"/>
                            <span>批量入库并分析</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
