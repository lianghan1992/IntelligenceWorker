
import React, { useState } from 'react';
import { CommonSearch } from '../../shared/CommonSearch';
import { CommonSearchItem } from '../../../types';
import { CodeIcon, RefreshIcon, DatabaseIcon, GlobeIcon, ClockIcon } from '../../icons';

export const SearchPreview: React.FC = () => {
    const [lastResults, setLastResults] = useState<CommonSearchItem[]>([]);
    const [config, setConfig] = useState({
        region: 'cn-zh',
        maxResults: 5,
        searchType: 'text' as 'text' | 'news',
        fileType: '',
        timeLimit: ''
    });

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-10">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                {/* 左侧配置面板 */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <CodeIcon className="w-4 h-4" /> 搜索高级参数
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">目标地区</label>
                                <select 
                                    value={config.region}
                                    onChange={e => setConfig({...config, region: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="wt-wt">自动 (wt-wt)</option>
                                    <option value="cn-zh">中国 (cn-zh)</option>
                                    <option value="us-en">美国 (us-en)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 text-nowrap">文件过滤</label>
                                    <select 
                                        value={config.fileType}
                                        onChange={e => setConfig({...config, fileType: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    >
                                        <option value="">全部格式</option>
                                        <option value="pdf">PDF</option>
                                        <option value="doc">Word</option>
                                        <option value="xls">Excel</option>
                                        <option value="ppt">PPT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">时间限制</label>
                                    <select 
                                        value={config.timeLimit}
                                        onChange={e => setConfig({...config, timeLimit: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    >
                                        <option value="">不限时间</option>
                                        <option value="d">一天内</option>
                                        <option value="w">一周内</option>
                                        <option value="m">一月内</option>
                                        <option value="y">一年内</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">搜索类型 (Type)</label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setConfig({...config, searchType: 'text'})}
                                        className={`py-2 text-[11px] font-bold rounded-lg transition-all ${config.searchType === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        网页
                                    </button>
                                    <button 
                                        onClick={() => setConfig({...config, searchType: 'news'})}
                                        className={`py-2 text-[11px] font-bold rounded-lg transition-all ${config.searchType === 'news' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        新闻
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">结果数量: {config.maxResults}</label>
                                <input 
                                    type="range" min="1" max="20"
                                    value={config.maxResults}
                                    onChange={e => setConfig({...config, maxResults: parseInt(e.target.value)})}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Developer Info Card */}
                    <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <DatabaseIcon className="w-16 h-16" />
                        </div>
                        <h4 className="font-bold text-sm mb-2">集成指南</h4>
                        <p className="text-[11px] text-indigo-100/70 leading-relaxed mb-4">
                            <code>CommonSearch</code> 组件已封装最新 API 逻辑。通过 <code>onResult</code> 钩子可获取结构化数据。
                        </p>
                        <div className="bg-black/20 p-3 rounded-xl font-mono text-[10px] border border-white/5 leading-relaxed overflow-x-auto no-scrollbar">
                            {`<CommonSearch \n  fileType="${config.fileType || 'pdf'}"\n  timeLimit="${config.timeLimit || 'w'}"\n/>`}
                        </div>
                    </div>
                </div>

                {/* 右侧演示与回调数据区域 */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                <GlobeIcon className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">服务集成预览</h3>
                        </div>
                        <CommonSearch 
                            key={JSON.stringify(config)}
                            region={config.region}
                            maxResults={config.maxResults}
                            searchType={config.searchType}
                            fileType={config.fileType}
                            timeLimit={config.timeLimit}
                            onResult={setLastResults}
                        />
                    </div>

                    {/* Callback JSON Data Preview */}
                    {lastResults.length > 0 && (
                        <div className="bg-[#0f172a] rounded-2xl p-6 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    <RefreshIcon className="w-4 h-4" /> 原始回调数据 (JSON Payload)
                                </h4>
                                <span className="text-[10px] text-slate-500 font-mono">Size: {(JSON.stringify(lastResults).length / 1024).toFixed(1)} KB</span>
                            </div>
                            <div className="max-h-[400px] overflow-auto custom-scrollbar-dark font-mono text-[11px] text-emerald-400/90 leading-relaxed bg-black/40 p-5 rounded-xl shadow-inner border border-white/5">
                                <pre>{JSON.stringify(lastResults, null, 2)}</pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
