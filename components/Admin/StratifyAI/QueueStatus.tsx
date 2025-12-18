
import React, { useState, useEffect } from 'react';
import { getStratifyQueueStatus } from '../../../api/stratify';
import { StratifyQueueStatus } from '../../../types';
import { RefreshIcon, CheckCircleIcon, SparklesIcon, ClockIcon } from '../../icons';

export const QueueStatus: React.FC = () => {
    const [status, setStatus] = useState<StratifyQueueStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            const data = await getStratifyQueueStatus();
            setStatus(data);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const getPressureColor = (count: number) => {
        if (count === 0) return 'text-slate-300';
        if (count < 3) return 'text-green-500';
        if (count < 8) return 'text-amber-500';
        return 'text-red-500 animate-pulse';
    };

    return (
        <div className="p-6 space-y-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-indigo-600" />
                    后端生成队列实时监控
                </h3>
                <button onClick={fetchStatus} className="p-2 hover:bg-white border rounded-lg shadow-sm text-slate-500">
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Running */}
                <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-6">
                        <SparklesIcon className="w-8 h-8" />
                    </div>
                    <div className="text-4xl font-black text-slate-800 tabular-nums">
                        {status?.running_tasks ?? '-'}
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">运行中 (Active)</p>
                    <div className="mt-6 flex gap-1 justify-center">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-1 h-3 rounded-full ${i < (status?.running_tasks || 0) ? 'bg-indigo-500' : 'bg-slate-100'}`}></div>
                        ))}
                    </div>
                </div>

                {/* Card 2: Pending */}
                <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-full mb-6">
                        <ClockIcon className="w-8 h-8" />
                    </div>
                    <div className={`text-4xl font-black tabular-nums ${getPressureColor(status?.pending_tasks || 0)}`}>
                        {status?.pending_tasks ?? '-'}
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">排队中 (Queue)</p>
                    <div className="mt-6 text-[10px] text-slate-400 font-medium">
                        当前服务器负载: {(status?.pending_tasks || 0) > 10 ? '极高 (High)' : '正常 (Normal)'}
                    </div>
                </div>

                {/* Card 3: Success */}
                <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center">
                    <div className="p-4 bg-green-50 text-green-600 rounded-full mb-6">
                        <CheckCircleIcon className="w-8 h-8" />
                    </div>
                    <div className="text-4xl font-black text-slate-800 tabular-nums">
                        {status?.completed_last_24h ?? '-'}
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">24H 已交付 (Done)</p>
                    <div className="mt-6 flex items-center gap-1 text-[10px] text-green-600 font-bold">
                        <SparklesIcon className="w-3 h-3" />
                        系统效率: 100%
                    </div>
                </div>
            </div>

            <div className="bg-indigo-900 rounded-[32px] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <SparklesIcon className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                    <h4 className="text-xl font-bold mb-4 flex items-center gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-400" />
                        Plumber 模式运行中
                    </h4>
                    <p className="text-indigo-100/70 text-sm leading-relaxed max-w-2xl">
                        StratifyAI 采用分布式 LLM 调度架构。所有任务阶段（Phases）由前端工作流引擎驱动，后端通过 Plumber 通道提供高并发的流式生成、分段持久化及向量化检索支持。
                    </p>
                </div>
            </div>
        </div>
    );
};
