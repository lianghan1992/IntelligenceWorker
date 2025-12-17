
import React, { useState, useRef, useEffect } from 'react';
import { GearIcon, ArrowRightIcon, CalendarIcon, CheckIcon } from '../../icons';

interface ChatInputProps {
    onSend: (message: string, config: { startMonth: string; endMonth: string; needSummary: boolean }) => void;
    isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
    const [message, setMessage] = useState('');
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    
    // Config State
    const [startMonth, setStartMonth] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [needSummary, setNeedSummary] = useState(true);

    const configRef = useRef<HTMLDivElement>(null);

    // Close config when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (configRef.current && !configRef.current.contains(event.target as Node)) {
                setIsConfigOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSend = () => {
        if (!message.trim() || isLoading) return;
        onSend(message, { startMonth, endMonth, needSummary });
        setMessage('');
        setIsConfigOpen(false); // Auto close config on send
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="p-4 bg-white border-t border-gray-100 relative">
            {/* Config Popover */}
            {isConfigOpen && (
                <div 
                    ref={configRef}
                    className="absolute bottom-full left-4 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 animate-in fade-in slide-in-from-bottom-2 z-20"
                >
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">分析参数配置</h4>
                        <button onClick={() => setIsConfigOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <span className="text-xs">关闭</span>
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">时间范围 (可选)</label>
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="month" 
                                    value={startMonth}
                                    onChange={e => setStartMonth(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500"
                                />
                                <span className="text-gray-400">-</span>
                                <input 
                                    type="month" 
                                    value={endMonth}
                                    onChange={e => setEndMonth(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setNeedSummary(!needSummary)}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${needSummary ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                                {needSummary && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-xs text-gray-600 select-none">生成智能综述</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
                <button 
                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                    className={`p-2 rounded-xl transition-colors ${isConfigOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                    title="配置参数"
                >
                    <GearIcon className="w-5 h-5" />
                </button>
                
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入分析指令，例如：'分析小米汽车近期的座舱技术动态'"
                    className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400 py-3 resize-none custom-scrollbar"
                    rows={1}
                />

                <button 
                    onClick={handleSend}
                    disabled={!message.trim() || isLoading}
                    className={`p-2 rounded-xl transition-all shadow-sm ${
                        message.trim() && !isLoading
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <ArrowRightIcon className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
    );
};
