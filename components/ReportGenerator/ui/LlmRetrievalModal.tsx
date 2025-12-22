
import React, { useState, useEffect, useRef } from 'react';
import { createIntelLlmTask, getIntelLlmTasks, downloadIntelLlmTaskReport } from '../../../api/intelligence';
import { uploadStratifyFile } from '../../../api/stratify';
import { getMe } from '../../../api/auth';
import { CloseIcon, SparklesIcon, RefreshIcon, CheckCircleIcon, CalendarIcon } from '../../icons';

interface LlmRetrievalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (file: { name: string; url: string; type: string }) => void;
}

export const LlmRetrievalModal: React.FC<LlmRetrievalModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<'input' | 'processing' | 'uploading'>('input');
    const [query, setQuery] = useState('');
    
    // Default: Last 1 month
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const [taskId, setTaskId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState('');

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const validateDateRange = (start: string, end: string) => {
        if (!start || !end) return false;
        const s = new Date(start);
        const e = new Date(end);
        if (s > e) return false;
        
        // 3 months approximation (93 days)
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays <= 93;
    };

    const handleStart = async () => {
        if (!query.trim()) return;
        
        if (!startDate || !endDate) {
             setError('请选择时间范围');
             return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setError('开始日期不能晚于结束日期');
            return;
        }

        if (!validateDateRange(startDate, endDate)) {
            setError('时间范围不能超过 3 个月');
            return;
        }

        setStep('processing');
        setError('');
        setProgress(0);
        setStatusText('正在创建分析任务...');

        try {
            const user = await getMe();
            // Create Task
            await createIntelLlmTask({
                user_uuid: user.id,
                description: query,
                need_summary: true,
                time_range: `${startDate},${endDate}`
            });

            // Start Polling (Wait a bit for creation to propagate or just fetch latest)
            setStatusText('AI 正在全网检索与分析 (约需 1-2 分钟)...');
            pollingRef.current = setInterval(checkStatus, 3000);

        } catch (e: any) {
            setError(e.message || '任务创建失败');
            setStep('input');
        }
    };

    const checkStatus = async () => {
        try {
            // Fetch latest tasks to find ours (assuming it's the latest one created by user)
            // In a real scenario, createIntelLlmTask should return the ID, but based on current API it returns void.
            // We fetch the list and pick the latest one matching our description/time.
            const res = await getIntelLlmTasks({ page: 1, page_size: 1 });
            if (res.items && res.items.length > 0) {
                const task = res.items[0];
                // Simple match check
                if (task.description === query) {
                    setTaskId(task.uuid);
                    setProgress(task.progress);
                    
                    if (task.status === 'completed') {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        await handleDownloadAndUpload(task.uuid);
                    } else if (task.status === 'failed') {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        setError('AI 分析任务执行失败');
                        setStep('input');
                    }
                }
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    };

    const handleDownloadAndUpload = async (uuid: string) => {
        setStep('uploading');
        setStatusText('正在生成并导入报告文件...');
        try {
            // 1. Download Report Blob
            const blob = await downloadIntelLlmTaskReport(uuid);
            const fileName = `AI_Analysis_${new Date().toISOString().slice(0, 10)}.csv`;
            const file = new File([blob], fileName, { type: 'text/csv' });

            // 2. Upload to Stratify System
            const uploadRes = await uploadStratifyFile(file);

            // 3. Callback
            onSuccess({
                name: fileName,
                url: uploadRes.url,
                type: 'csv'
            });
            onClose();
        } catch (e: any) {
            setError('文件处理失败: ' + e.message);
            setStep('input');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-indigo-600" /> AI 智能检索
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
                        <CloseIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6">
                    {step === 'input' ? (
                        <>
                            <div className="mb-4 space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <CalendarIcon className="w-3.5 h-3.5" /> 检索时间范围 (Max 3 Months)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        max={endDate}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <span className="text-slate-300">-</span>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        min={startDate}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <textarea
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="输入您的调研需求，例如：'收集最近三个月关于固态电池量产的所有新闻报道及技术参数'..."
                                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none resize-none text-sm leading-relaxed"
                            />
                            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleStart}
                                    disabled={!query.trim()}
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    开始分析
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="py-8 text-center flex flex-col items-center">
                            {step === 'processing' ? (
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-indigo-600">
                                        {progress}%
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                                    <CheckCircleIcon className="w-8 h-8 text-green-600" />
                                </div>
                            )}
                            <h4 className="text-slate-800 font-bold mb-2">{step === 'processing' ? 'AI 正在深度作业' : '处理完成'}</h4>
                            <p className="text-slate-500 text-sm animate-pulse">{statusText}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
