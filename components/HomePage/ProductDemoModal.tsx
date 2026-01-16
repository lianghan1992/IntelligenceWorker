
import React, { useState, useEffect } from 'react';
import { 
    CloseIcon, DocumentTextIcon, SparklesIcon, 
    ChartIcon, ArrowRightIcon, RssIcon, VideoCameraIcon, 
    BrainIcon, LightningBoltIcon, ChipIcon, GlobeIcon,
    RefreshIcon
} from '../icons';

interface ProductDemoModalProps {
    onClose: () => void;
    onRegister: () => void;
}

export const ProductDemoModal: React.FC<ProductDemoModalProps> = ({ onClose, onRegister }) => {
    const [scene, setScene] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [replayTrigger, setReplayTrigger] = useState(0);
    // 0: Anxiety (Industry Pain Points)
    // 1: Engine Start (Module Activation)
    // 2: Processing (The Matrix/Workflow)
    // 3: Output (The Deliverable)
    // 4: Call to Action

    useEffect(() => {
        const timings = [
            2800, // Scene 0: Anxiety
            2000, // Scene 1: Engine Start
            4500, // Scene 2: Processing (longer to see features)
            3000, // Scene 3: Output
        ];

        let currentStep = 0;
        let timer: any;
        
        const runSequence = () => {
            if (currentStep >= timings.length) {
                setScene(4);
                return;
            }
            
            setScene(currentStep as any);
            const duration = timings[currentStep];
            currentStep++;
            
            timer = setTimeout(runSequence, duration);
        };

        runSequence();

        return () => clearTimeout(timer);
    }, [replayTrigger]);

    const handleReplay = () => {
        setReplayTrigger(prev => prev + 1);
    };

    // Floating keywords for Scene 0
    const anxietyWords = [
        { text: "价格战内卷", x: 10, y: 20, size: "text-xl", color: "text-red-500" },
        { text: "800V高压平台", x: 70, y: 15, size: "text-lg", color: "text-orange-400" },
        { text: "城市NOA落地", x: 80, y: 60, size: "text-2xl", color: "text-red-600" },
        { text: "供应链断供", x: 20, y: 70, size: "text-base", color: "text-gray-400" },
        { text: "出海合规风险", x: 40, y: 40, size: "text-xl", color: "text-orange-500" },
        { text: "竞品突发降价", x: 60, y: 80, size: "text-lg", color: "text-red-400" },
        { text: "海量研报读不完", x: 15, y: 50, size: "text-2xl", color: "text-gray-300" },
    ];

    return (
        <div className="fixed inset-0 z-[150] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-500 font-sans">
            <button 
                onClick={onClose} 
                className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-50 transition-colors group"
            >
                <div className="group-hover:rotate-90 transition-transform duration-300">
                    <CloseIcon className="w-8 h-8" />
                </div>
            </button>

            {/* Stage Container */}
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-3xl border border-white/10 shadow-[0_0_100px_-20px_rgba(79,70,229,0.3)] overflow-hidden flex flex-col items-center justify-center">
                
                {/* --- Scene 0: Industry Anxiety --- */}
                <div className={`absolute inset-0 transition-all duration-1000 ${scene === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                         <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 tracking-tighter mb-4 drop-shadow-sm">
                            信息风暴中迷失？
                         </h2>
                         <p className="text-red-400/80 font-mono tracking-widest text-sm animate-pulse">WARNING: INFORMATION OVERLOAD</p>
                    </div>
                    {anxietyWords.map((word, i) => (
                        <div 
                            key={i}
                            className={`absolute font-bold opacity-0 animate-float-in ${word.size} ${word.color}`}
                            style={{
                                left: `${word.x}%`,
                                top: `${word.y}%`,
                                animationDelay: `${i * 0.2}s`,
                                animationFillMode: 'forwards'
                            }}
                        >
                            {word.text}
                        </div>
                    ))}
                </div>

                {/* --- Scene 1: Engine Activation (The Solution) --- */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${scene === 1 ? 'opacity-100 blur-0' : 'opacity-0 blur-xl pointer-events-none'}`}>
                     <div className="relative mb-8">
                        <div className="absolute inset-0 bg-indigo-500 blur-[80px] opacity-40 animate-pulse"></div>
                        <BrainIcon className="w-32 h-32 text-indigo-400 relative z-10 drop-shadow-[0_0_30px_rgba(99,102,241,0.8)]" />
                     </div>
                     <h2 className="text-4xl font-bold text-white tracking-tight">
                        Auto Insight <span className="text-indigo-400">智能引擎</span> 启动
                     </h2>
                     <div className="mt-8 flex gap-4">
                        {[
                            { icon: RssIcon, label: "情报雷达" },
                            { icon: ChartIcon, label: "竞品分析" },
                            { icon: DocumentTextIcon, label: "深度洞察" },
                            { icon: VideoCameraIcon, label: "视频解析" }
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shadow-lg">
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                            </div>
                        ))}
                     </div>
                </div>

                {/* --- Scene 2: The Workflow (Processing) --- */}
                <div className={`absolute inset-0 flex items-center justify-center bg-slate-950 transition-opacity duration-500 ${scene === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                     <div className="w-full max-w-4xl grid grid-cols-3 gap-8 items-center px-8">
                        
                        {/* Column 1: Input */}
                        <div className="space-y-4 flex flex-col items-end opacity-60">
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg w-48 text-right transform translate-x-4 animate-slide-right">
                                <div className="text-xs text-slate-500 mb-1">Source: Gasgoo</div>
                                <div className="h-2 w-24 bg-slate-700 rounded ml-auto"></div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg w-48 text-right transform translate-x-8 animate-slide-right delay-100">
                                <div className="text-xs text-slate-500 mb-1">PDF: Tech Whitepaper</div>
                                <div className="h-2 w-32 bg-slate-700 rounded ml-auto"></div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg w-48 text-right transform translate-x-4 animate-slide-right delay-200">
                                <div className="text-xs text-slate-500 mb-1">Live: Xiaomi Launch</div>
                                <div className="h-2 w-20 bg-slate-700 rounded ml-auto"></div>
                            </div>
                        </div>

                        {/* Column 2: Core Processing */}
                        <div className="relative flex justify-center">
                            <div className="w-64 h-64 relative">
                                <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                                <div className="absolute inset-4 border-2 border-purple-500/30 rounded-full animate-[spin_8s_linear_infinite_reverse]"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-indigo-400 font-bold text-2xl tracking-tighter">AI AGENT</div>
                                        <div className="text-purple-400 text-xs mt-1 animate-pulse">PROCESSING...</div>
                                    </div>
                                </div>
                                {/* Scanning line */}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent h-1/2 w-full animate-scan"></div>
                            </div>
                        </div>

                        {/* Column 3: Structured Output */}
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-indigo-900/50 to-slate-900 border border-indigo-500/30 p-4 rounded-xl w-60 transform -translate-x-4 animate-slide-left">
                                <div className="flex items-center gap-2 mb-2">
                                    <SparklesIcon className="w-4 h-4 text-yellow-400" />
                                    <span className="text-xs font-bold text-indigo-200">关键结论提取</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-1.5 w-full bg-indigo-400/20 rounded"></div>
                                    <div className="h-1.5 w-3/4 bg-indigo-400/20 rounded"></div>
                                </div>
                            </div>
                             <div className="bg-gradient-to-r from-purple-900/50 to-slate-900 border border-purple-500/30 p-4 rounded-xl w-60 transform -translate-x-8 animate-slide-left delay-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <ChartIcon className="w-4 h-4 text-green-400" />
                                    <span className="text-xs font-bold text-purple-200">参数对比矩阵</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    <div className="h-6 bg-purple-400/10 rounded"></div>
                                    <div className="h-6 bg-purple-400/10 rounded"></div>
                                    <div className="h-6 bg-purple-400/10 rounded"></div>
                                </div>
                            </div>
                        </div>
                     </div>
                </div>

                {/* --- Scene 3: The Result (Delivery) --- */}
                <div className={`absolute inset-0 flex items-center justify-center bg-white transition-all duration-700 ${scene === 3 || scene === 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                    <div className={`w-[80%] aspect-[16/9] bg-slate-50 rounded-lg shadow-2xl overflow-hidden flex flex-col transform transition-transform duration-1000 ${scene === 4 ? 'scale-95 opacity-50 blur-[2px]' : 'scale-100'}`}>
                        {/* PPT Header */}
                        <div className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                                <h1 className="text-xl font-bold text-slate-800">2025 智能底盘技术趋势分析</h1>
                            </div>
                            <div className="text-xs text-slate-400 font-mono">AUTO INSIGHT GENERATED</div>
                        </div>
                        {/* PPT Body */}
                        <div className="flex-1 p-8 grid grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <LightningBoltIcon className="w-5 h-5 text-yellow-500" /> 核心突破
                                    </h3>
                                    <ul className="space-y-3 text-sm text-slate-600">
                                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>线控转向渗透率提升至 15%</li>
                                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>多腔空气悬挂成本下探</li>
                                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>底盘域控制器国产化加速</li>
                                    </ul>
                                </div>
                                <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <h3 className="font-bold text-indigo-800 mb-2">AI 建议</h3>
                                    <p className="text-xs text-indigo-600 leading-relaxed">
                                        建议重点关注 XYZ 供应商的最新线控方案，其在成本控制上具有显著优势，可能影响明年中端车型的配置策略。
                                    </p>
                                </div>
                            </div>
                            <div className="bg-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-x-8 bottom-0 h-48 bg-gradient-to-t from-indigo-200 to-transparent opacity-50"></div>
                                <div className="flex items-end gap-4 h-40">
                                    <div className="w-12 bg-indigo-300 h-[40%] rounded-t-md animate-grow-bar" style={{animationDelay:'0.1s'}}></div>
                                    <div className="w-12 bg-indigo-400 h-[60%] rounded-t-md animate-grow-bar" style={{animationDelay:'0.2s'}}></div>
                                    <div className="w-12 bg-indigo-500 h-[85%] rounded-t-md animate-grow-bar" style={{animationDelay:'0.3s'}}></div>
                                    <div className="w-12 bg-indigo-600 h-[100%] rounded-t-md animate-grow-bar" style={{animationDelay:'0.4s'}}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Scene 4: CTA (End) --- */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 z-50 ${scene === 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
                    <div className="relative">
                        <div className="absolute -inset-10 bg-indigo-500/20 blur-3xl rounded-full"></div>
                        <h2 className="relative text-6xl md:text-8xl font-black text-white mb-6 text-center leading-tight tracking-tighter drop-shadow-2xl">
                            让情报<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">成为你的武器</span>
                        </h2>
                    </div>
                    <p className="text-slate-300 text-lg md:text-xl mb-12 max-w-2xl text-center font-light">
                        从全网监测到决策报告，Auto Insight 帮您缩短 90% 的研究时间。
                    </p>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                        <button 
                            onClick={onRegister}
                            className="group relative px-12 py-5 bg-white text-slate-950 font-bold text-xl rounded-full shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] hover:scale-105 transition-all overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                立即免费体验 <ArrowRightIcon className="w-6 h-6" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 via-white to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                    </div>

                    <button onClick={handleReplay} className="mt-12 text-slate-500 hover:text-white text-sm flex items-center gap-2 transition-colors">
                        <RefreshIcon className="w-4 h-4" /> 重播演示
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 transition-all duration-300 ease-linear z-50" style={{ width: `${(scene / 4) * 100}%` }}></div>

            </div>
            
            <style>{`
                @keyframes float-in {
                    0% { transform: translateY(20px) scale(0.9); opacity: 0; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                .animate-float-in { animation: float-in 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                
                @keyframes slide-right {
                    from { transform: translateX(-50px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-right { animation: slide-right 0.6s ease-out forwards; }

                @keyframes slide-left {
                    from { transform: translateX(50px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-left { animation: slide-left 0.6s ease-out forwards; }
                
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(200%); }
                }
                .animate-scan { animation: scan 2s linear infinite; }

                @keyframes grow-bar {
                    from { height: 0; }
                }
                .animate-grow-bar { animation: grow-bar 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

                @keyframes slide-up {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
            `}</style>
        </div>
    );
};
