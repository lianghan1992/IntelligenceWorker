
import React, { useState } from 'react';
import { CommonSearch } from '../../shared/CommonSearch';
import { CommonSearchItem } from '../../../types';
import { CodeIcon, ViewGridIcon, RefreshIcon } from '../../icons';

export const SearchPreview: React.FC = () => {
    const [lastResults, setLastResults] = useState<CommonSearchItem[]>([]);
    const [config, setConfig] = useState({
        region: 'cn-zh',
        maxResults: 5,
        searchType: 'text' as 'text' | 'news'
    });

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-8">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                {/* 配置面板 */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <CodeIcon className="w-4 h-4" /> 搜索参数
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">地区</label>
                                <select 
                                    value={config.region}
                                    onChange={e => setConfig({...config, region: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                                >
                                    <option value="wt-wt">自动 (Auto)</option>
                                    <option value="cn-zh">中国 (cn-zh)</option>
                                    <option value="us-en">美国 (us-en)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">数量限制: {config.maxResults}</label>
                                <input 
                                    type="range" min="1" max="20"
                                    value={config.maxResults}
                                    onChange={e => setConfig({...config, maxResults: parseInt(e.target.value)})}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 演示区域 */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col gap-6">
                        <CommonSearch 
                            key={JSON.stringify(config)}
                            region={config.region}
                            maxResults={config.maxResults}
                            searchType={config.searchType}
                            onResult={setLastResults}
                        />
                    </div>

                    {lastResults.length > 0 && (
                        <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <RefreshIcon className="w-4 h-4" /> 回调数据预览 (JSON)
                            </h4>
                            <div className="max-h-[300px] overflow-auto custom-scrollbar-dark font-mono text-[10px] text-emerald-400/90 leading-relaxed bg-black/40 p-4 rounded-xl shadow-inner">
                                <pre>{JSON.stringify(lastResults, null, 2)}</pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
