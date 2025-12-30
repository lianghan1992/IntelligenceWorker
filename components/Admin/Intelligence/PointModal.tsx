

import React, { useState, useEffect } from 'react';
import { createSpiderPoint, updateSpiderPoint } from '../../../api/intelligence';
import { CloseIcon, RssIcon, ClockIcon } from '../../icons';
import { IntelligencePointPublic } from '../../../types';

interface PointModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    sourceId?: string;
    pointToEdit?: IntelligencePointPublic | null;
}

export const PointModal: React.FC<PointModalProps> = ({ isOpen, onClose, onSave, sourceId, pointToEdit }) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [pages, setPages] = useState(100);
    const [isLoading, setIsLoading] = useState(false);

    // Cron Builder State
    const [cron, setCron] = useState('0 8 */1 * *');
    const [cronMode, setCronMode] = useState<'interval' | 'weekly' | 'monthly' | 'custom'>('interval');
    const [time, setTime] = useState('08:00');
    const [intervalDays, setIntervalDays] = useState(1);
    const [weekDay, setWeekDay] = useState(1); // 1 = Monday
    const [monthDay, setMonthDay] = useState(1);
    const [customCron, setCustomCron] = useState('30 13 */2 * *');

    // Helper to parse cron string to UI state
    const parseCronToState = (cronStr: string) => {
        const parts = cronStr.split(' ');
        if (parts.length !== 5) return; // Invalid basic cron

        const [mm, hh, dom, mon, dow] = parts;
        const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

        // Interval Mode: "mm hh */n * *"
        if (dom.startsWith('*/') && mon === '*' && dow === '*') {
            setCronMode('interval');
            setTime(timeStr);
            setIntervalDays(parseInt(dom.substring(2)) || 1);
            return;
        }
        // Daily Mode (Special case of Interval): "mm hh * * *"
        if (dom === '*' && mon === '*' && dow === '*') {
            setCronMode('interval');
            setTime(timeStr);
            setIntervalDays(1);
            return;
        }

        // Weekly Mode: "mm hh * * n"
        if (dom === '*' && mon === '*' && !isNaN(parseInt(dow))) {
            setCronMode('weekly');
            setTime(timeStr);
            setWeekDay(parseInt(dow));
            return;
        }

        // Monthly Mode: "mm hh n * *"
        if (!isNaN(parseInt(dom)) && mon === '*' && dow === '*') {
            setCronMode('monthly');
            setTime(timeStr);
            setMonthDay(parseInt(dom));
            return;
        }

        // Default to Custom
        setCronMode('custom');
        setCustomCron(cronStr);
    };

    // Initialize state when opening
    useEffect(() => {
        if (isOpen) {
            if (pointToEdit) {
                setName(pointToEdit.name || pointToEdit.point_name || '');
                setUrl(pointToEdit.url || pointToEdit.point_url || '');
                setPages(pointToEdit.initial_pages || 100);
                setCron(pointToEdit.cron_schedule || '0 8 */1 * *');
                // Parse cron to restore UI
                if (pointToEdit.cron_schedule) {
                    parseCronToState(pointToEdit.cron_schedule);
                } else {
                    setCronMode('custom');
                }
            } else {
                // Reset for create
                setName('');
                setUrl('');
                setPages(100);
                setCron('0 8 */1 * *');
                setCronMode('interval');
                setTime('08:00');
                setIntervalDays(1);
            }
        }
    }, [isOpen, pointToEdit]);

    // Auto-update cron expression when builder state changes
    useEffect(() => {
        if (!isOpen) return;
        
        if (cronMode === 'custom') {
            setCron(customCron);
            return;
        }

        const [hh, mm] = time.split(':').map(Number);
        const validH = isNaN(hh) ? 0 : hh;
        const validM = isNaN(mm) ? 0 : mm;
        
        let newCron = '';

        if (cronMode === 'interval') {
            newCron = `${validM} ${validH} ${intervalDays === 1 ? '*' : '*/' + intervalDays} * *`;
        } else if (cronMode === 'weekly') {
            newCron = `${validM} ${validH} * * ${weekDay}`;
        } else if (cronMode === 'monthly') {
            newCron = `${validM} ${validH} ${Math.max(1, Math.min(31, monthDay))} * *`;
        }
        setCron(newCron);
    }, [cronMode, time, intervalDays, weekDay, monthDay, customCron, isOpen]);

    const handleSubmit = async () => {
        if (!name || !url) return;
        setIsLoading(true);
        try {
            if (pointToEdit) {
                await updateSpiderPoint(pointToEdit.uuid, {
                    name,
                    url,
                    cron_schedule: cron,
                    initial_pages: pages
                });
            } else {
                if (!sourceId) return;
                await createSpiderPoint({
                    source_uuid: sourceId,
                    name,
                    url,
                    cron_schedule: cron,
                    initial_pages: pages,
                    is_active: true
                });
            }
            onSave();
            onClose();
        } catch (e) {
            console.error(e);
            alert(pointToEdit ? '更新采集点失败' : '创建采集点失败');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <RssIcon className="w-5 h-5 text-indigo-600"/> {pointToEdit ? '编辑采集点' : '新建采集点'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><CloseIcon className="w-5 h-5"/></button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">采集点名称 <span className="text-red-500">*</span></label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 车企资讯" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">列表页 URL <span className="text-red-500">*</span></label>
                        <input value={url} onChange={e => setUrl(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-600" placeholder="https://..." />
                    </div>
                    
                    {/* Friendly Cron Builder */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 mb-3 uppercase flex items-center gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5" /> 采集频率调度
                        </label>
                        
                        <div className="flex gap-2 mb-4 overflow-x-auto">
                            {[
                                { id: 'interval', label: '按天循环' },
                                { id: 'weekly', label: '每周定时' },
                                { id: 'monthly', label: '每月定时' },
                                { id: 'custom', label: '自定义' },
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setCronMode(mode.id as any)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                        cronMode === mode.id 
                                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-200' 
                                            : 'text-slate-500 hover:bg-white hover:text-slate-700'
                                    }`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            {cronMode !== 'custom' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600 font-medium w-16">执行时间:</span>
                                    <input 
                                        type="time" 
                                        value={time} 
                                        onChange={e => setTime(e.target.value)} 
                                        className="border border-slate-300 rounded-md px-2 py-1 text-sm outline-none focus:border-indigo-500"
                                    />
                                </div>
                            )}

                            {cronMode === 'interval' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600 font-medium w-16">间隔天数:</span>
                                    <span className="text-sm text-slate-500">每</span>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="365"
                                        value={intervalDays} 
                                        onChange={e => setIntervalDays(parseInt(e.target.value))} 
                                        className="w-16 border border-slate-300 rounded-md px-2 py-1 text-sm text-center outline-none focus:border-indigo-500"
                                    />
                                    <span className="text-sm text-slate-500">天</span>
                                </div>
                            )}

                            {cronMode === 'weekly' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600 font-medium w-16">重复周期:</span>
                                    <select 
                                        value={weekDay} 
                                        onChange={e => setWeekDay(parseInt(e.target.value))}
                                        className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm outline-none focus:border-indigo-500"
                                    >
                                        <option value={1}>周一 (Monday)</option>
                                        <option value={2}>周二 (Tuesday)</option>
                                        <option value={3}>周三 (Wednesday)</option>
                                        <option value={4}>周四 (Thursday)</option>
                                        <option value={5}>周五 (Friday)</option>
                                        <option value={6}>周六 (Saturday)</option>
                                        <option value={0}>周日 (Sunday)</option>
                                    </select>
                                </div>
                            )}

                            {cronMode === 'monthly' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600 font-medium w-16">每月日期:</span>
                                    <span className="text-sm text-slate-500">每月</span>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="31"
                                        value={monthDay} 
                                        onChange={e => setMonthDay(parseInt(e.target.value))} 
                                        className="w-16 border border-slate-300 rounded-md px-2 py-1 text-sm text-center outline-none focus:border-indigo-500"
                                    />
                                    <span className="text-sm text-slate-500">日</span>
                                </div>
                            )}

                            {cronMode === 'custom' && (
                                <div>
                                    <input 
                                        value={customCron} 
                                        onChange={e => setCustomCron(e.target.value)} 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        placeholder="* * * * *"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">分 时 日 月 周</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-xs text-slate-400">生成的表达式:</span>
                            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{cron}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">首次采集页数限制</label>
                        <input type="number" value={pages} onChange={e => setPages(parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>

                <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100">取消</button>
                    <button onClick={handleSubmit} disabled={isLoading || !name || !url} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {pointToEdit ? '保存中...' : '提交中...'}
                            </>
                        ) : (pointToEdit ? '保存修改' : '创建')}
                    </button>
                </div>
            </div>
        </div>
    );
};
