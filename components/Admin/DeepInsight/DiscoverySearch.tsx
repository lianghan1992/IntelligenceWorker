import React, { useState } from 'react';
import { CommonSearch } from '../../shared/CommonSearch';
import { CommonSearchItem } from '../../../types';
import { uploadDocs } from '../../../api/intelligence';
// Added SearchIcon to the imports from icons
import { 
    GlobeIcon, EyeIcon, CloudIcon, RefreshIcon, 
    ExternalLinkIcon, CheckCircleIcon, ShieldExclamationIcon,
    ClockIcon, DocumentTextIcon, CheckIcon, SearchIcon
} from '../../icons';
import { ExternalPdfPreview } from './ExternalPdfPreview';

export const DiscoverySearch: React.FC = () => {
    const [results, setResults] = useState<CommonSearchItem[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string>('');
    
    // Tracking integration status for each URL
    const [integratingUrls, setIntegratingUrls] = useState<Record<string, 'loading' | 'success' | 'error'>>({});
    
    // Config for search
    const [timeLimit, setTimeLimit] = useState('w'); // Default one week

    const handleImport = async (item: CommonSearchItem) => {
        const url = item.href;
        if (integratingUrls[url] === 'loading' || integratingUrls[url] === 'success') return;

        setIntegratingUrls(prev => ({ ...prev, [url]: 'loading' }));
        
        try {
            // New API feature: Upload PDF by URL
            await uploadDocs({
                pdf_urls: [url]
            });
            
            setIntegratingUrls(prev => ({ ...prev, [url]: 'success' }));
        } catch (e) {
            console.error("Integration failed", e);
            setIntegratingUrls(prev => ({ ...prev, [url]: 'error' }));
            alert(`集成失败: ${e instanceof Error ? e.message : '未知错误'}`);
        }
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
                    hideResults={true} // We will render our own cards below
                    placeholder="输入关键词发现行业研报 (e.g. 2024 智能驾驶 市场份额)..."
                />
            </div>

            {/* Specialized Results Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
                {results.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {results.map((item, idx) => {
                            const status = integratingUrls[item.href];
                            return (
                                <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col shadow-sm hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className="flex-1 min-w-0 mb-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-2 bg-red-50 text-red-500 rounded-lg flex-shrink-0">
                                                <DocumentTextIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter uppercase">{new URL(item.href).hostname}</span>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-base leading-snug line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors" title={item.title}>
                                            {item.title}
                                        </h4>
                                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 opacity-80">
                                            {item.body}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-slate-50 flex gap-2">
                                        <button 
                                            onClick={() => { setPreviewUrl(item.href); setPreviewTitle(item.title); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
                                        >
                                            <EyeIcon className="w-4 h-4" /> 预览
                                        </button>
                                        <button 
                                            onClick={() => handleImport(item)}
                                            disabled={status === 'loading' || status === 'success'}
                                            className={`
                                                flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all shadow-sm
                                                ${status === 'success' 
                                                    ? 'bg-green-100 text-green-700 border border-green-200' 
                                                    : status === 'loading'
                                                        ? 'bg-indigo-50 text-indigo-400 border border-indigo-100'
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 active:scale-95'
                                                }
                                            `}
                                        >
                                            {status === 'loading' ? (
                                                <>
                                                    <RefreshIcon className="w-4 h-4 animate-spin" />
                                                    集成中
                                                </>
                                            ) : status === 'success' ? (
                                                <>
                                                    <CheckIcon className="w-4 h-4" />
                                                    已加入队列
                                                </>
                                            ) : (
                                                <>
                                                    <CloudIcon className="w-4 h-4" />
                                                    分析集成
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                            <SearchIcon className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-500">发现全网价值研报</h3>
                        <p className="text-sm mt-1 max-w-xs text-center">输入关键词进行全网 PDF 深度搜索，找到后可一键集成至分析库。</p>
                    </div>
                )}
            </div>

            {/* External Preview Modal */}
            {previewUrl && (
                <ExternalPdfPreview 
                    url={previewUrl} 
                    title={previewTitle} 
                    onClose={() => setPreviewUrl(null)} 
                    onImport={() => {
                        const item = results.find(r => r.href === previewUrl);
                        if (item) handleImport(item);
                        setPreviewUrl(null);
                    }}
                    integrationStatus={integratingUrls[previewUrl]}
                />
            )}
        </div>
    );
};
