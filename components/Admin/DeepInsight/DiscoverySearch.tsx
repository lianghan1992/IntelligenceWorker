
import React, { useState } from 'react';
import { CommonSearch } from '../../shared/CommonSearch';
import { CommonSearchItem } from '../../../types';
import { uploadDocs } from '../../../api/intelligence';
import { 
    GlobeIcon, EyeIcon, CloudIcon, RefreshIcon, 
    ClockIcon, DocumentTextIcon, CheckIcon, SearchIcon,
    ExternalLinkIcon, TrashIcon
} from '../../icons';

export const DiscoverySearch: React.FC = () => {
    const [results, setResults] = useState<CommonSearchItem[]>([]);
    
    // Tracking integration status for each URL
    const [integratingUrls, setIntegratingUrls] = useState<Record<string, 'loading' | 'success' | 'error'>>({});
    // Tracking custom filenames for each URL
    const [customFilenames, setCustomFilenames] = useState<Record<string, string>>({});
    
    // Config for search
    const [timeLimit, setTimeLimit] = useState('w'); // Default one week

    const handleImport = async (item: CommonSearchItem) => {
        const url = item.href;
        if (integratingUrls[url] === 'loading' || integratingUrls[url] === 'success') return;

        const customName = customFilenames[url]?.trim();

        setIntegratingUrls(prev => ({ ...prev, [url]: 'loading' }));
        
        try {
            // Updated uploadDocs call with custom_filenames
            await uploadDocs({
                pdf_urls: [url],
                custom_filenames: customName ? [customName] : undefined
            });
            
            setIntegratingUrls(prev => ({ ...prev, [url]: 'success' }));
        } catch (e) {
            console.error("Integration failed", e);
            setIntegratingUrls(prev => ({ ...prev, [url]: 'error' }));
            alert(`集成失败: ${e instanceof Error ? e.message : '未知错误'}`);
        }
    };

    const handleFilenameChange = (url: string, name: string) => {
        setCustomFilenames(prev => ({ ...prev, [url]: name }));
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header / Info bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <GlobeIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">全网 PDF 情报雷达</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Discover & Integrate Industry Reports</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                        <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                        <select 
                            value={timeLimit} 
                            onChange={e => setTimeLimit(e.target.value)}
                            className="text-xs font-bold text-slate-600 outline-none bg-transparent cursor-pointer"
                        >
                            <option value="">不限时间</option>
                            <option value="d">最近 24 小时</option>
                            <option value="w">最近一周</option>
                            <option value="m">最近一月</option>
                            <option value="y">最近一年</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Search Component */}
            <div className="p-6 border-b border-slate-100">
                <CommonSearch 
                    fileType="pdf"
                    timeLimit={timeLimit}
                    onResult={(items) => setResults(items)}
                    hideResults={true} // We render our own list below
                    placeholder="输入关键词发现行业研报 (e.g. 2024 智能驾驶 市场份额)..."
                />
            </div>

            {/* Results Table List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                {results.length > 0 ? (
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-6 py-3 w-12 text-center">#</th>
                                <th className="px-6 py-3 min-w-[300px]">文档标题 (原始) / 来源</th>
                                <th className="px-6 py-3 min-w-[250px]">集成重命名 (可选)</th>
                                <th className="px-6 py-3 w-40 text-center">状态</th>
                                <th className="px-6 py-3 w-48 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.map((item, idx) => {
                                const status = integratingUrls[item.href];
                                const hostname = new URL(item.href).hostname;
                                return (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 text-center font-mono text-slate-400">{idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 max-w-xl">
                                                <div className="font-bold text-slate-800 line-clamp-1" title={item.title}>
                                                    {item.title}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                                    <GlobeIcon className="w-3 h-3"/>
                                                    <span>{hostname}</span>
                                                    <span>•</span>
                                                    <a 
                                                        href={item.href} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="text-indigo-500 hover:underline flex items-center gap-1"
                                                    >
                                                        PDF 原文 <ExternalLinkIcon className="w-2.5 h-2.5"/>
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="text"
                                                placeholder="留空则使用原文标题"
                                                value={customFilenames[item.href] || ''}
                                                onChange={(e) => handleFilenameChange(item.href, e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                disabled={status === 'loading' || status === 'success'}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {status === 'loading' && (
                                                <span className="inline-flex items-center gap-1.5 text-indigo-500 font-bold text-[10px] animate-pulse">
                                                    <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> 集成中
                                                </span>
                                            )}
                                            {status === 'success' && (
                                                <span className="inline-flex items-center gap-1.5 text-green-600 font-bold text-[10px] bg-green-50 px-2 py-1 rounded border border-green-100">
                                                    <CheckIcon className="w-3.5 h-3.5" /> 已在队列
                                                </span>
                                            )}
                                            {status === 'error' && (
                                                <span className="inline-flex items-center gap-1.5 text-red-500 font-bold text-[10px]">
                                                    失败
                                                </span>
                                            )}
                                            {!status && <span className="text-slate-300 text-[10px] font-medium">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <a 
                                                    href={item.href} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-all"
                                                >
                                                    <EyeIcon className="w-3.5 h-3.5" /> 预览
                                                </a>
                                                <button 
                                                    onClick={() => handleImport(item)}
                                                    disabled={status === 'loading' || status === 'success'}
                                                    className={`
                                                        inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm
                                                        ${status === 'success' 
                                                            ? 'bg-slate-100 text-slate-400 cursor-default' 
                                                            : status === 'loading'
                                                                ? 'bg-indigo-50 text-indigo-300'
                                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                                                        }
                                                    `}
                                                >
                                                    {status === 'loading' ? (
                                                        '处理中'
                                                    ) : status === 'success' ? (
                                                        '集成成功'
                                                    ) : (
                                                        <>
                                                            <CloudIcon className="w-3.5 h-3.5" /> 一键导入
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20 opacity-60">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-slate-100">
                            <SearchIcon className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-500">探索全网行业研报</h3>
                        <p className="text-sm mt-1 max-w-xs text-center">输入关键词进行深度搜索，找到后可一键重命名并集成至分析库。</p>
                    </div>
                )}
            </div>
        </div>
    );
};
