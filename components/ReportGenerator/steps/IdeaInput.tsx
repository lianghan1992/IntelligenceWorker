
import React, { useState } from 'react';
import { SparklesIcon, ArrowRightIcon, BrainIcon, DocumentTextIcon, LightBulbIcon } from '../../icons';

export const IdeaInput: React.FC<{ 
    onStart: (idea: string) => void, 
    isLoading: boolean, 
}> = ({ onStart, isLoading }) => {
    const [idea, setIdea] = useState('');

    return (
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[600px] overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-[100px] -z-10 pointer-events-none animate-pulse-slow"></div>

            <div className="w-full max-w-3xl px-6 relative z-10">
                <div className="text-center mb-10 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <SparklesIcon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Professional Intelligence Suite</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        从一个想法，<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">抵达专业报告。</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        输入研究主题、粗略大纲或现有素材，AI 将自动完成深度调研、逻辑构建与视觉排版。
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-2 ring-1 ring-slate-200/60 focus-within:ring-4 focus-within:ring-indigo-100 transition-all duration-500 animate-in fade-in zoom-in-95 delay-300">
                    <div className="relative">
                        <textarea
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            placeholder="例如：请帮我写一份关于 2024年中国新能源汽车出海战略 的分析报告，重点关注欧洲和东南亚市场..."
                            className="w-full h-40 p-6 text-xl bg-transparent border-none resize-none focus:ring-0 focus:outline-none text-slate-800 placeholder:text-slate-300 font-medium leading-relaxed rounded-2xl"
                            disabled={isLoading}
                        />
                        <div className="absolute bottom-4 right-4">
                            <button 
                                onClick={() => onStart(idea)}
                                disabled={!idea.trim() || isLoading}
                                className="h-12 px-8 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 group"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>思考中...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>开始生成</span>
                                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    <div className="border-t border-slate-100/80 p-4 bg-slate-50/50 rounded-b-2xl flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase mr-2">快速开始:</span>
                        {[
                            { icon: LightBulbIcon, text: '行业研究' },
                            { icon: DocumentTextIcon, text: '竞品分析' },
                            { icon: BrainIcon, text: '市场趋势' }
                        ].map((tag, i) => (
                            <button 
                                key={i} 
                                onClick={() => setIdea(prev => prev + tag.text + " ")}
                                disabled={isLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 text-xs font-medium rounded-lg transition-all shadow-sm hover:shadow active:scale-95"
                            >
                                <tag.icon className="w-3.5 h-3.5" />
                                {tag.text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
