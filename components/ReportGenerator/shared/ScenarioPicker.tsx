
import React from 'react';
import { Scenario } from '../../../types';
import { isScenarioSupported } from '../scenarios/registry';

// 动画背景组件映射
const BG_EFFECTS = [
    // 1. Matrix Grid (Code)
    () => (
        <div className="absolute inset-0 z-0 bg-[#0f172a] animate-grid-move" style={{
            backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
        }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.2),transparent_70%)]"></div>
        </div>
    ),
    // 2. Aurora Fluid (Creative)
    () => (
        <div className="absolute inset-0 z-0 bg-[#2e1065] overflow-hidden">
            <div className="absolute -top-[10%] -left-[10%] w-[200px] h-[200px] bg-[#c084fc] rounded-full blur-[40px] opacity-60 animate-float-blob"></div>
            <div className="absolute -bottom-[10%] -right-[10%] w-[250px] h-[250px] bg-[#db2777] rounded-full blur-[40px] opacity-60 animate-float-blob-delay"></div>
        </div>
    ),
    // 3. Scanner (Data)
    () => (
        <div className="absolute inset-0 z-0 bg-[#022c22] overflow-hidden" style={{
            backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)',
            backgroundSize: '20px 20px'
        }}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#10b98133] to-transparent animate-scan-y"></div>
        </div>
    ),
    // 4. Prism Rotate (Visual)
    () => (
        <div className="absolute inset-0 z-0 bg-[#18181b] overflow-hidden">
            <div className="absolute top-1/2 left-1/2 w-[150%] h-[150%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,#f472b6,#3b82f6,#f472b6)] blur-[60px] opacity-40 animate-spin-slow"></div>
        </div>
    ),
    // 5. Deep Breath (Research)
    () => (
        <div className="absolute inset-0 z-0 bg-[#0c4a6e] flex items-center justify-center overflow-hidden">
            <div className="absolute border border-white/10 rounded-full animate-ripple" style={{ width: '100px', height: '100px' }}></div>
            <div className="absolute border border-white/10 rounded-full animate-ripple delay-700" style={{ width: '100px', height: '100px' }}></div>
            <div className="absolute border border-white/10 rounded-full animate-ripple delay-1500" style={{ width: '100px', height: '100px' }}></div>
        </div>
    ),
    // 6. Network Network (Trans)
    () => (
        <div className="absolute inset-0 z-0 bg-[#431407] overflow-hidden">
            <div className="absolute w-[100px] h-[100px] top-[20%] left-[20%] bg-[radial-gradient(circle,#fbbf24_0%,transparent_70%)] opacity-40 animate-move-orb"></div>
            <div className="absolute w-[80px] h-[80px] bottom-[20%] right-[20%] bg-[radial-gradient(circle,#fbbf24_0%,transparent_70%)] opacity-40 animate-move-orb-delay"></div>
        </div>
    )
];

const ICONS = ['</>', '✎', '📊', '🎨', '🔍', '文'];

export const ScenarioPicker: React.FC<{
    scenarios: Scenario[];
    onSelect: (name: string) => void;
}> = ({ scenarios, onSelect }) => {
    return (
        <div className="flex-1 overflow-y-auto p-8 md:p-20 flex flex-col items-center custom-scrollbar">
            <style>{`
                @keyframes grid-move { from { background-position: 0 0; } to { background-position: 40px 40px; } }
                .animate-grid-move { animation: grid-move 20s linear infinite; }
                @keyframes float-blob { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(20px,30px) scale(1.1); } }
                .animate-float-blob { animation: float-blob 10s infinite alternate ease-in-out; }
                .animate-float-blob-delay { animation: float-blob 10s infinite alternate-reverse ease-in-out; }
                @keyframes scan-y { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
                .animate-scan-y { animation: scan-y 4s linear infinite; }
                @keyframes spin-slow { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 15s linear infinite; }
                @keyframes ripple { 0% { transform: scale(1); opacity: 0.8; border-color: rgba(125, 211, 252, 0.5); } 100% { transform: scale(3); opacity: 0; border-color: rgba(125, 211, 252, 0); } }
                .animate-ripple { animation: ripple 4s infinite linear; }
                @keyframes move-orb { 0% { transform: translate(0,0); } 100% { transform: translate(30px,-20px); } }
                .animate-move-orb { animation: move-orb 8s infinite alternate ease-in-out; }
                .animate-move-orb-delay { animation: move-orb 8s infinite alternate-reverse ease-in-out; }
                
                @keyframes popIn { 
                    from { opacity: 0; transform: scale(0.9) translateY(20px); } 
                    to { opacity: 1; transform: scale(1) translateY(0); } 
                }
                .card-pop-in { animation: popIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }
            `}</style>

            <div className="max-w-[1100px] w-full">
                <header className="mb-12">
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">选择创作 Agent</h2>
                    <p className="text-slate-400 text-sm font-medium">请选择合适的行业专家流水线开启您的报告创作。</p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scenarios.map((s, idx) => {
                        const supported = isScenarioSupported(s.name);
                        const BgEffect = BG_EFFECTS[idx % BG_EFFECTS.length];
                        const icon = ICONS[idx % ICONS.length];

                        return (
                            <div 
                                key={s.name}
                                onClick={() => supported && onSelect(s.name)}
                                className={`card-pop-in group relative h-[200px] rounded-[24px] border border-white/10 overflow-hidden transition-all duration-500 ${
                                    supported 
                                    ? 'cursor-pointer hover:scale-[1.02] hover:border-white/40 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
                                    : 'cursor-not-allowed grayscale opacity-40'
                                }`}
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                {/* 背景动效层 */}
                                <BgEffect />

                                {/* 磨砂玻璃层 */}
                                <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/10 to-black/70 backdrop-blur-[2px]"></div>

                                {/* 内容层 */}
                                <div className="relative z-[2] p-6 h-full flex flex-col justify-between">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl font-bold shadow-inner">
                                        {icon}
                                    </div>
                                    <div className="txt-box">
                                        <h3 className="text-lg font-bold text-white mb-1 drop-shadow-md">
                                            {s.title || s.name}
                                        </h3>
                                        <p className="text-xs text-white/60 line-clamp-2 leading-relaxed font-medium">
                                            {s.description || '由行业专家逻辑链条驱动的智能创作流水线。'}
                                        </p>
                                    </div>
                                </div>

                                {/* 底部装饰 */}
                                <div className="absolute bottom-0 left-0 h-1 w-0 bg-white/30 group-hover:w-full transition-all duration-700"></div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
