
import React, { useState, useEffect } from 'react';
import { SparklesIcon, CalendarIcon, CheckIcon } from '../../icons';

interface TaskCreationFormProps {
    onCreate: (description: string, config: { startMonth: string; endMonth: string; needSummary: boolean }) => void;
    isLoading: boolean;
}

export const TaskCreationForm: React.FC<TaskCreationFormProps> = ({ onCreate, isLoading }) => {
    const [description, setDescription] = useState('');
    const [needSummary, setNeedSummary] = useState(true);
    
    // Date Logic
    const [startMonth, setStartMonth] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [minMonth, setMinMonth] = useState('');
    const [maxMonth, setMaxMonth] = useState('');

    useEffect(() => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const currentMonthStr = `${yyyy}-${mm}`;
        
        // Calculate 3 months ago
        const pastDate = new Date();
        pastDate.setMonth(now.getMonth() - 2); // Current month - 2 = range of 3 months (e.g., May, Apr, Mar)
        const pastYyyy = pastDate.getFullYear();
        const pastMm = String(pastDate.getMonth() + 1).padStart(2, '0');
        const minMonthStr = `${pastYyyy}-${pastMm}`;

        setMaxMonth(currentMonthStr);
        setMinMonth(minMonthStr);
        setEndMonth(currentMonthStr);
        setStartMonth(minMonthStr); // Default to 3 months ago
    }, []);

    const handleSubmit = () => {
        if (!description.trim() || isLoading) return;
        onCreate(description, { startMonth, endMonth, needSummary });
        setDescription('');
    };

    const handleStartMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val < minMonth) {
            // If user tries to select earlier than 3 months, clamp it (or UI prevents it via min attr)
            setStartMonth(minMonth);
        } else {
            setStartMonth(val);
        }
    };

    return (
        <div className="p-5 bg-gradient-to-br from-indigo-50 to-white border-b border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-indigo-600" />
                新建分析任务
            </h3>
            
            <div className="space-y-4">
                {/* Text Area */}
                <div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="描述您的分析需求，例如：'分析比亚迪最近的降价策略对销量的影响'"
                        className="w-full h-24 p-3 bg-white border border-indigo-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none shadow-sm placeholder:text-slate-400"
                    />
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">时间范围 (近3个月):</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="month" 
                            value={startMonth}
                            min={minMonth}
                            max={maxMonth}
                            onChange={handleStartMonthChange}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <span className="text-slate-300">-</span>
                        <input 
                            type="month" 
                            value={endMonth}
                            min={startMonth}
                            max={maxMonth}
                            onChange={(e) => setEndMonth(e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div className="flex items-center justify-between mt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${needSummary ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                {needSummary && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={needSummary} 
                                onChange={(e) => setNeedSummary(e.target.checked)} 
                            />
                            <span className="text-xs text-slate-600">生成智能综述</span>
                        </label>

                        <button 
                            onClick={handleSubmit}
                            disabled={!description.trim() || isLoading}
                            className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            {isLoading ? '提交中...' : '提交任务'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
