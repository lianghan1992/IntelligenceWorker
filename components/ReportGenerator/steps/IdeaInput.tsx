
import React, { useState } from 'react';
import { SparklesIcon, ArrowRightIcon } from '../../icons';

export const IdeaInput: React.FC<{ 
    onStart: (idea: string) => void, 
    isLoading: boolean, 
}> = ({ onStart, isLoading }) => {
    const [idea, setIdea] = useState('');

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-full max-w-2xl px-4 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] -z-10 pointer-events-none"></div>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100 mb-4">
                        <SparklesIcon className="w-3 h-3" />
                        <span>AI 智能报告引擎 V2.0</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
                        从一个想法，<br/>到一份专业报告
                    </h1>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2 ring-4 ring-slate-50/50 transition-all duration-300 focus-within:ring-indigo-100 focus-within:border-indigo-200">
                    <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="输入您的研究主题，例如：'2024年中国新能源汽车出海战略分析'..."
                        className="w-full h-32 p-4 text-lg bg-transparent border-none resize-none focus:ring-0 focus:outline-none outline-none text-slate-800 placeholder:text-slate-300 font-medium leading-relaxed"
                        disabled={isLoading}
                    />
                    
                    <div className="flex justify-between items-center px-4 pb-2 pt-2 border-t border-slate-50">
                        <div className="flex gap-2">
                             {['行业研究', '竞品分析', '市场趋势'].map(tag => (
                                <button 
                                    key={tag} 
                                    onClick={() => setIdea(tag + " ")}
                                    disabled={isLoading}
                                    className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs rounded-md transition-colors"
                                >
                                    {tag}
                                </button>
                             ))}
                        </div>
                        <button 
                            onClick={() => onStart(idea)}
                            disabled={!idea.trim() || isLoading}
                            className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-indigo-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            <span>立即生成</span>
                            <ArrowRightIcon className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
