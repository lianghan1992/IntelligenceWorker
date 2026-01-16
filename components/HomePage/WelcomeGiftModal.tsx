
import React, { useEffect } from 'react';
import { SparklesIcon, CheckCircleIcon, DocumentTextIcon, CloseIcon } from '../icons';

interface WelcomeGiftModalProps {
    onClose: () => void;
}

export const WelcomeGiftModal: React.FC<WelcomeGiftModalProps> = ({ onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 6000); // Auto close after 6 seconds
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500">
            {/* Confetti Animation Layer (CSS) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute w-2 h-2 rounded-full animate-confetti"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `-10%`,
                            backgroundColor: ['#4f46e5', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 5)],
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${Math.random() * 2 + 2}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="bg-white rounded-[40px] w-full max-w-sm relative shadow-[0_20px_70px_-10px_rgba(79,70,229,0.3)] border border-indigo-100 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-700">
                {/* Decorative Header Background */}
                <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/10">
                        <SparklesIcon className="w-24 h-24 rotate-12" />
                    </div>
                </div>

                {/* Gift Icon Overlay */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-3xl shadow-xl border-4 border-white flex items-center justify-center animate-bounce duration-[2000ms]">
                    <div className="p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl text-white shadow-lg shadow-orange-200">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25m18 0l-3-3m3 3h-7.5M3 11.25l3-3m-3 3h7.5M7.5 11.25a4.5 4.5 0 119 0m-9 0h9" />
                         </svg>
                    </div>
                </div>

                <div className="p-8 pt-16 text-center space-y-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">欢迎加入 Auto Insight</h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">系统已为您发放新人专享礼包</p>
                    </div>

                    <div className="py-4 px-6 bg-slate-50 rounded-2xl border border-slate-100 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-5 text-indigo-600 group-hover:scale-110 transition-transform">
                            <CheckCircleIcon className="w-16 h-16" />
                        </div>
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">赠送余额</div>
                        <div className="text-5xl font-black text-slate-900 tracking-tighter flex items-baseline justify-center gap-1">
                            <span className="text-2xl font-light text-slate-400">¥</span>2.00
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 text-xs text-slate-500 font-bold bg-indigo-50/50 py-3 rounded-xl border border-indigo-100/50">
                        <DocumentTextIcon className="w-4 h-4 text-indigo-600" />
                        <span>约可生成 <strong className="text-indigo-700 text-sm font-black">10</strong> 页精美报告 PPT</span>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-indigo-600 transition-all transform active:scale-95 hover:scale-[1.02]"
                    >
                        开启智能情报之旅
                    </button>

                    <p className="text-[10px] text-slate-400 font-medium">
                        此窗口将在 6 秒后自动关闭
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes confetti {
                    0% { transform: translateY(0) rotate(0); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                .animate-confetti {
                    animation: confetti linear forwards;
                }
            `}</style>
        </div>
    );
};
