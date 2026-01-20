
import React, { useState } from 'react';
import { CommonSearch } from '../../shared/CommonSearch';
import { CommonSearchItem } from '../../../types';
import { GlobeIcon, CodeIcon, ViewGridIcon, RefreshIcon } from '../../icons';

export const SearchPreview: React.FC = () => {
    const [lastResults, setLastResults] = useState<CommonSearchItem[]>([]);
    const [config, setConfig] = useState({
        region: 'cn-zh',
        maxResults: 5,
        searchType: 'text' as 'text' | 'news'
    });

    return (
        <div className="h-full flex flex-col bg-[#f8fafc]">
            <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
                <div className="flex justify-between items-end border-b border-slate-200 pb-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <GlobeIcon className="w-8 h-8 text-indigo-600" />
                            通用搜索组件预览
                        </h2>
                        <p className="text-slate-500 mt-2">
                            测试全局统一的联网搜索服务。支持多种参数配置与实时结果回调。
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Params Config */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <CodeIcon className="w-4 h-4" /> 
                                实时参数配置
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">地区代码 (Region)</label>
                                    <select 
                                        value={config.region}
                                        onChange={e => setConfig({...config, region: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="wt-wt">默认 (Auto)</option>
                                        <option value="cn-zh">中国 (cn-zh)</option>
                                        <option value="us-en">美国 (us-en)</option>
                                        <option value="uk-en">英国 (uk-en)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">搜索类型 (Type)</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button 
                                            onClick={() => setConfig({...config, searchType: 'text'})}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${config.searchType === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            网页
                                        </button>
                                        <button 
                                            onClick={() => setConfig({...config, searchType: 'news'})}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${config.searchType === 'news' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            新闻
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">结果上限: {config.maxResults}</label>
                                    <input 
                                        type="range"
                                        min="1" max="20"
                                        value={config.maxResults}
                                        onChange={e => setConfig({...config, maxResults: parseInt(e.target.value)})}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <CodeIcon className="w-20 h-20" />
                            </div>
                            <h4 className="text-sm font-bold mb-2">开发者模式</h4>
                            <p className="text-[10px] text-indigo-100/70 leading-relaxed mb-4">
                                该组件支持 <code>onResult</code> 回调，允许父组件在接收到结果后执行自定义逻辑（如存入知识库或作为 LLM RAG 上下文）。
                            </p>
                            <div className="bg-black/20 p-2 rounded-lg font-mono text-[10px] border border-white/10">
                                {`// 调用示例\n<CommonSearch \n  onResult={(items) => console.log(items)}\n/>`}
                            </div>
                        </div>
                    </div>

                    {/* Component Demo */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                    <ViewGridIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">集成示例</h3>
                            </div>
                            
                            {/* The Actual Component */}
                            <CommonSearch 
                                key={JSON.stringify(config)} // Force re-render if config changes drastically for preview
                                region={config.region}
                                maxResults={config.maxResults}
                                searchType={config.searchType}
                                onResult={setLastResults}
                            />
                        </div>

                        {/* Callback Visualizer */}
                        {lastResults.length > 0 && (
                            <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                        <RefreshIcon className="w-4 h-4" /> 
                                        父组件接收到的实时数据 (JSON Payload)
                                    </h4>
                                </div>
                                <div className="max-h-[300px] overflow-auto custom-scrollbar-dark font-mono text-[10px] text-emerald-400/90 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5 shadow-inner">
                                    <pre>{JSON.stringify(lastResults, null, 2)}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
