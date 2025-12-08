
import React, { useState, useEffect } from 'react';
import { SpiderPoint } from '../../../types';
import { createSpiderPoint, updateSpiderPoint } from '../../../api/intelligence';
import { CloseIcon, RssIcon, ClockIcon, CheckCircleIcon, RefreshIcon } from '../../icons';

interface PointModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    sourceId?: string;
    pointToEdit?: SpiderPoint | null;
}

const FREQUENCY_OPTIONS = [
    { value: 'interval_min', label: '分钟间隔', prefix: '每', suffix: '分钟' },
    { value: 'interval_hour', label: '小时间隔', prefix: '每', suffix: '小时' },
    { value: 'daily', label: '每天定时', prefix: '每天', suffix: '' },
    { value: 'days', label: '间隔天数', prefix: '每', suffix: '天' },
    { value: 'weekly', label: '每周定时', prefix: '每周', suffix: '' },
    { value: 'monthly', label: '每月定时', prefix: '每月', suffix: '日' },
];

const WEEKDAYS = [
    { val: '1', label: '周一' }, { val: '2', label: '周二' }, { val: '3', label: '周三' },
    { val: '4', label: '周四' }, { val: '5', label: '周五' }, { val: '6', label: '周六' },
    { val: '0', label: '周日' },
];

export const PointModal: React.FC<PointModalProps> = ({ isOpen, onClose, onSave, sourceId, pointToEdit }) => {
    const isEdit = !!pointToEdit;
    
    // Basic Form
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [maxDepth, setMaxDepth] = useState(3);
    const [pagination, setPagination] = useState('page/{n}');
    const [filters, setFilters] = useState(''); // Newline separated
    
    // Scheduler State
    const [cronMode, setCronMode] = useState<'smart' | 'raw'>('smart');
    const [rawCron, setRawCron] = useState('*/30 * * * *');
    
    // Smart Scheduler State
    const [freq, setFreq] = useState('interval_min'); // interval_min, interval_hour, daily, days, weekly, monthly
    const [intervalVal, setIntervalVal] = useState(30);
    const [timeVal, setTimeVal] = useState('08:00');
    const [weekdayVal, setWeekdayVal] = useState('1'); // 0-6 (Sun-Sat)
    const [dayOfMonth, setDayOfMonth] = useState(1);

    const [isLoading, setIsLoading] = useState(false);

    // Initialize form when opening
    useEffect(() => {
        if (isOpen) {
            if (pointToEdit) {
                setName(pointToEdit.point_name);
                setUrl(pointToEdit.point_url);
                setMaxDepth(pointToEdit.max_depth || 3);
                setPagination(pointToEdit.pagination_instruction || 'page/{n}');
                setFilters(pointToEdit.article_url_filters ? pointToEdit.article_url_filters.join('\n') : '');
                setRawCron(pointToEdit.cron_schedule);
                // Default to raw for edit to allow any expression
                setCronMode('raw');
            } else {
                // Reset for create
                setName('');
                setUrl('');
                setMaxDepth(3);
                setPagination('page/{n}');
                setFilters('');
                setRawCron('*/30 * * * *');
                setCronMode('smart');
                setFreq('interval_min');
                setIntervalVal(30);
                setTimeVal('08:00');
            }
        }
    }, [isOpen, pointToEdit]);

    // Update raw cron when smart options change
    useEffect(() => {
        if (cronMode === 'smart') {
            const [hh, mm] = timeVal.split(':').map(Number);
            let cron = '';
            
            switch (freq) {
                case 'interval_min':
                    cron = `*/${Math.max(1, intervalVal)} * * * *`;
                    break;
                case 'interval_hour':
                    cron = `0 */${Math.max(1, intervalVal)} * * *`;
                    break;
                case 'daily':
                    cron = `${mm} ${hh} * * *`;
                    break;
                case 'days':
                    // Every N days at HH:MM
                    cron = `${mm} ${hh} */${Math.max(1, intervalVal)} * *`;
                    break;
                case 'weekly':
                    cron = `${mm} ${hh} * * ${weekdayVal}`;
                    break;
                case 'monthly':
                    cron = `${mm} ${hh} ${Math.max(1, Math.min(31, dayOfMonth))} * *`;
                    break;
                default:
                    cron = '*/30 * * * *';
            }
            setRawCron(cron);
        }
    }, [cronMode, freq, intervalVal, timeVal, weekdayVal, dayOfMonth]);

    const handleSubmit = async () => {
        if (!name || !url) return;
        setIsLoading(true);
        try {
            const payload = {
                point_name: name,
                point_url: url,
                cron_schedule: rawCron,
                max_depth: maxDepth,
                pagination_instruction: pagination,
                article_url_filters: filters.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
            };

            if (isEdit && pointToEdit) {
                await updateSpiderPoint(pointToEdit.id, payload);
            } else {
                if (!sourceId) throw new Error("Source ID missing");
                await createSpiderPoint({ ...payload, source_id: sourceId });
            }
            onSave();
            onClose();
        } catch (e) {
            console.error(e);
            alert('保存失败');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b bg-gray-50 flex justify-between items-center flex-shrink-0">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <RssIcon className="w-5 h-5 text-indigo-600"/>
                        {isEdit ? '编辑采集点' : '新建采集点'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><CloseIcon className="w-5 h-5"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 border-b pb-2">基础信息</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">采集点名称 <span className="text-red-500">*</span></label>
                                <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 行业新闻" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">最大翻页深度</label>
                                <input type="number" min="1" value={maxDepth} onChange={e => setMaxDepth(parseInt(e.target.value)||1)} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">列表页 URL <span className="text-red-500">*</span></label>
                                <input value={url} onChange={e => setUrl(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" placeholder="https://example.com/news/" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">翻页规则 (Pagination)</label>
                                <input value={pagination} onChange={e => setPagination(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" placeholder="page/{n}" />
                                <p className="text-[10px] text-gray-400 mt-1">使用 {"{n}"} 代表页码。例如：<code>page/{"{n}"}</code> 或 <code>index_{"{n}"}.html</code></p>
                            </div>
                        </div>
                    </div>

                    {/* Scheduler */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h4 className="text-sm font-bold text-gray-900">采集频率配置</h4>
                            <div className="flex bg-gray-100 rounded-lg p-0.5">
                                <button 
                                    onClick={() => setCronMode('smart')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${cronMode === 'smart' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                                >
                                    智能模式
                                </button>
                                <button 
                                    onClick={() => setCronMode('raw')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${cronMode === 'raw' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                                >
                                    高级 Cron
                                </button>
                            </div>
                        </div>

                        {cronMode === 'smart' ? (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">执行频率</label>
                                    <div className="flex flex-wrap gap-2">
                                        {FREQUENCY_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setFreq(opt.value)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${freq === opt.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    {(freq === 'interval_min' || freq === 'interval_hour' || freq === 'days') && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600 font-bold">每</span>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={intervalVal} 
                                                onChange={e => setIntervalVal(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-20 p-2 rounded-lg border text-center text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                            <span className="text-sm text-gray-600 font-bold">
                                                {freq === 'interval_min' ? '分钟' : freq === 'interval_hour' ? '小时' : '天'}
                                            </span>
                                        </div>
                                    )}

                                    {freq === 'monthly' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600 font-bold">每月</span>
                                            <input 
                                                type="number" 
                                                min="1" max="31"
                                                value={dayOfMonth} 
                                                onChange={e => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                                                className="w-20 p-2 rounded-lg border text-center text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                            <span className="text-sm text-gray-600 font-bold">日</span>
                                        </div>
                                    )}

                                    {freq === 'weekly' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600 font-bold">每周</span>
                                            <select 
                                                value={weekdayVal}
                                                onChange={e => setWeekdayVal(e.target.value)}
                                                className="p-2 rounded-lg border text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                {WEEKDAYS.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {(freq === 'daily' || freq === 'days' || freq === 'weekly' || freq === 'monthly') && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600 font-bold">时间</span>
                                            <input 
                                                type="time" 
                                                value={timeVal} 
                                                onChange={e => setTimeVal(e.target.value)} 
                                                className="p-2 rounded-lg border text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Cron 表达式</label>
                                <input value={rawCron} onChange={e => setRawCron(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="*/30 * * * *" />
                                <p className="text-[10px] text-gray-400 mt-1">格式: 分 时 日 月 周</p>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-xs bg-indigo-50 text-indigo-700 p-2 rounded border border-indigo-100">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>当前规则: <span className="font-mono font-bold">{rawCron}</span></span>
                        </div>
                    </div>

                    {/* Filters */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-3">过滤规则</h4>
                        <label className="block text-xs font-bold text-gray-500 mb-1">文章 URL 前缀过滤 (每行一个)</label>
                        <textarea 
                            value={filters} 
                            onChange={e => setFilters(e.target.value)} 
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 font-mono"
                            placeholder="https://example.com/news/&#10;https://example.com/tech/" 
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100">取消</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isLoading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition-all active:scale-95"
                    >
                        {isLoading ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                        保存配置
                    </button>
                </div>
            </div>
        </div>
    );
};
