
import React, { useState, useEffect } from 'react';
import { getSpiderStatus } from '../../../api/intelligence';
import { SpiderStatus } from '../../../types';
import { RefreshIcon, ServerIcon, SparklesIcon, ChipIcon } from '../../icons';

export const ServiceStatus: React.FC = () => {
    const [status, setStatus] = useState<SpiderStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            const res = await getSpiderStatus();
            setStatus(res);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchStatus(); }, []);

    if (!status && isLoading) return <div className="p-8 text-center text-gray-500">加载服务状态...</div>;
    if (!status) return <div className="p-8 text-center text-red-500">无法获取服务状态</div>;

    return (
        <div className="space-y-4 md:space-y-6 overflow-y-auto h-full pb-20 md:pb-0">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">IntelSpider 运行概况</h3>
                <button onClick={fetchStatus} className="p-2 bg-white border rounded-lg text-gray-500 hover:text-indigo-600 shadow-sm"><RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3"><ServerIcon className="w-6 h-6"/></div>
                    <div className="text-sm text-gray-500 font-medium">Jina 并发数</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{status.jina_concurrency}</div>
                </div>
                
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-full mb-3"><SparklesIcon className="w-6 h-6"/></div>
                    <div className="text-sm text-gray-500 font-medium">LLM 模型</div>
                    <div className="text-lg font-bold text-gray-900 mt-1 truncate max-w-full px-2" title={status.llm_model}>{status.llm_model}</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
                    <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3"><ChipIcon className="w-6 h-6"/></div>
                    <div className="text-sm text-gray-500 font-medium">LLM 并发/Keys</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{status.llm_concurrency} <span className="text-sm text-gray-400 font-normal">/ {status.zhipu_keys_count} Keys</span></div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-full mb-3"><ServerIcon className="w-6 h-6"/></div>
                    <div className="text-sm text-gray-500 font-medium">全局最大并发</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{status.global_max_concurrent}</div>
                </div>
            </div>
        </div>
    );
};
