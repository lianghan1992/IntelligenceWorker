
import React, { useState, useEffect } from 'react';
import { 
    CloseIcon, DocumentTextIcon, SparklesIcon, SearchIcon, 
    ChartIcon, ArrowRightIcon, RssIcon, CloudIcon 
} from '../icons';

// Simple Bolt icon if not exists
const LightningIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.981 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
    </svg>
);

interface ProductDemoModalProps {
    onClose: () => void;
    onRegister: () => void;
}

export const ProductDemoModal: React.FC<ProductDemoModalProps> = ({ onClose, onRegister }) => {
    const [scene, setScene] = useState<0 | 1 | 2 | 3 | 4>(0);
    // 0: Chaos (Raw Data)
    // 1: Prompt (User Input)
    // 2: Process (AI Core)
    // 3: Result (PPT)
    // 4: CTA (End)

    useEffect(() => {
        const timings = [
            2500, // Scene 0 duration
            2500, // Scene 1 duration
            3000, // Scene 2 duration
            4000, // Scene 3 duration
        ];

        let currentStep = 0;
        
        const runSequence = () => {
            if (currentStep >= timings.length) {
                setScene(4);
                return;
            }
            
            setScene(currentStep as any);
            const duration = timings[currentStep];
            currentStep++;
            
            setTimeout(runSequence, duration);
        };

        runSequence();

        return () => {}; // Cleanup not strictly needed for this one-shot demo
    }, []);

    const handleReplay = () => {
        setScene(0);
        // Quick hack to restart sequence: re-mount component or reset logic
        // For simplicity here, we just rely on state reset, but the useEffect above runs once. 
        // In a real app, we'd extract the timer logic into a function called by useEffect dependent on a 'playId'.
        // For now, let's just close and user can re-open, or we manually trigger:
        setTimeout(() => window.location.reload(), 10); // Hard reset for demo purity
    };

    return (
        <div className="fixed inset-0 z-[150] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-500">
            <button 
                onClick={onClose} 
                className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-50 transition-colors"
            >
                <CloseIcon className="w-8 h-8" />
            </button>

            {/* Stage Container */}
            <div className="relative w-full max-w-5xl aspect-video bg-black/50 rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col items-center justify-center">
                
                {/* --- Scene 0: Chaos (Information Overload) --- */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${scene === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                         <h2 className="text-4xl font-black text-white tracking-tight z-10 drop-shadow-lg">
                            海量资讯，<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">杂乱无章</span>
                         </h2>
                    </div>
                    {/* Floating Items */}
                    {[...Array(20)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute bg-slate-800/80 p-4 rounded-lg border border-white/5 shadow-xl text-slate-400 text-xs font-mono whitespace-nowrap animate-float-random"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDuration: `${3 + Math.random() * 5}s`,
                                animationDelay: `-${Math.random() * 5}s`,
                                opacity: 0.3 + Math.random() * 0.4
                            }}
                        >
                            {['PDF报告.pdf', '行业新闻.html', '竞品参数.csv', '技术专利.xml'][i % 4]}
                        </div>
                    ))}
                </div>

                {/* --- Scene 1: The Prompt (Input) --- */}
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 transform ${scene === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                     <div className="w-[600px] bg-white rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] p-2 flex items-center gap-4 animate-slide-up">
                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-xl font-bold text-slate-800 typing-effect">
                            生成一份 2025 智能座舱趋势分析报告
                        </div>
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <ArrowRightIcon className="w-5 h-5" />
                        </div>
                     </div>
                </div>

                {/* --- Scene 2: The Core (AI Processing) --- */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${scene === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                     <div className="relative">
                         {/* Core */}
                         <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(79,70,229,0.6)] animate-pulse-fast relative z-10">
                            <LightningIcon className="w-16 h-16 text-white" />
                         </div>
                         {/* Orbiting Particles */}
                         <div className="absolute inset-0 border border-indigo-500/30 rounded-full w-64 h-64 -translate-x-16 -translate-y-16 animate-spin-slow">
                            <div className="absolute top-0 left-1/2 w-4 h-4 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa]"></div>
                         </div>
                         <div className="absolute inset-0 border border-purple-500/30 rounded-full w-96 h-96 -translate-x-32 -translate-y-32 animate-spin-slow-reverse">
                            <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-purple-400 rounded-full shadow-[0_0_10px_#a855f7]"></div>
                         </div>
                         
                         {/* Text */}
                         <div className="absolute top-48 left-1/2 -translate-x-1/2 text-center w-full">
                             <div className="text-indigo-400 font-mono text-sm tracking-[0.5em] animate-pulse">ANALYZING...</div>
                             <div className="text-white font-bold mt-2">全网情报 · 实时结构化</div>
                         </div>
                     </div>
                </div>

                {/* --- Scene 3: The Result (Delivery) --- */}
                <div className={`absolute inset-0 flex items-center justify-center bg-slate-900 transition-opacity duration-1000 ${scene === 3 || scene === 4 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className={`bg-white w-[80%] h-[80%] rounded-xl shadow-2xl overflow-hidden flex flex-col transform transition-all duration-1000 ${scene === 4 ? 'scale-90 opacity-40 blur-sm' : 'scale-100 opacity-100'}`}>
                        {/* Fake PPT UI */}
                        <div className="h-12 border-b border-slate-100 flex items-center px-6 justify-between bg-slate-50">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <div className="text-xs font-bold text-slate-400">AUTO INSIGHT GENERATOR</div>
                        </div>
                        <div className="flex-1 p-8 bg-slate-50 grid grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="h-8 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                                <div className="space-y-3">
                                    <div className="h-4 bg-slate-200 rounded w-full animate-pulse delay-75"></div>
                                    <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse delay-100"></div>
                                    <div className="h-4 bg-slate-200 rounded w-full animate-pulse delay-150"></div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <div className="h-24 flex-1 bg-blue-100 rounded-lg border border-blue-200 animate-slide-up"></div>
                                    <div className="h-24 flex-1 bg-purple-100 rounded-lg border border-purple-200 animate-slide-up delay-100"></div>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-center">
                                <ChartIcon className="w-32 h-32 text-indigo-500 animate-draw" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Scene 4: CTA (End) --- */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${scene === 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
                    <h2 className="text-5xl font-black text-white mb-6 text-center leading-tight">
                        在 AI 面前<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">您的决策效率可以提升 100 倍</span>
                    </h2>
                    <p className="text-slate-400 text-lg mb-10 max-w-xl text-center">
                        以全网最新情报为燃料，以顶级大模型为引擎。<br/>Auto Insight，为您自动交付高价值研报。
                    </p>
                    <button 
                        onClick={onRegister}
                        className="group relative px-10 py-4 bg-white text-slate-900 font-bold text-xl rounded-full shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:scale-105 transition-all overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            立即开启体验 <ArrowRightIcon className="w-6 h-6" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    </button>
                    <button onClick={onClose} className="mt-6 text-slate-500 hover:text-white text-sm">
                        再看一遍演示
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-indigo-600 transition-all duration-300 ease-linear" style={{ width: `${(scene / 4) * 100}%` }}></div>

            </div>
            
            <style>{`
                @keyframes float-random {
                    0%, 100% { transform: translate(0, 0); }
                    25% { transform: translate(10px, -10px); }
                    50% { transform: translate(-5px, 15px); }
                    75% { transform: translate(-15px, -5px); }
                }
                .animate-float-random { animation: float-random linear infinite; }
                
                @keyframes typing {
                    from { width: 0 }
                    to { width: 100% }
                }
                .typing-effect {
                    overflow: hidden;
                    white-space: nowrap;
                    border-right: 2px solid #6366f1;
                    animation: typing 2s steps(40, end), blink-caret .75s step-end infinite;
                    width: 100%;
                }
                
                @keyframes pulse-fast {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }
                .animate-pulse-fast { animation: pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 10s linear infinite; }
                
                @keyframes spin-slow-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
                .animate-spin-slow-reverse { animation: spin-slow-reverse 15s linear infinite; }
            `}</style>
        </div>
    );
};
