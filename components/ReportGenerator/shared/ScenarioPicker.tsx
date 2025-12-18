
import React from 'react';
import { Scenario } from '../../../types';
import { isScenarioSupported } from '../scenarios/registry';

// 动画背景组件映射
const BG_EFFECTS = [
    // 1. Matrix Grid (Code)
    () => (
        <div className="absolute inset-0 z-0 bg-[#0f172a] animate-grid-move" style={{
            backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
        }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.15),transparent_70%)]"></div>
        </div>
    ),
    // 2. Aurora Fluid (Creative)
    () => (
        <div className="absolute inset-0 z-0 bg-[#1e1b4b] overflow-hidden">
            <div className="absolute -top-[20%] -left-[10%] w-[180px] h-[180px] bg-indigo-500 rounded-full blur-[40px] opacity-40 animate-float-blob"></div>
            <div className="absolute -bottom-[20%] -right-[10%] w-[220px] h-[220px] bg-fuchsia-500 rounded-full blur-[40px] opacity-40 animate-float-blob-delay"></div>
        </div>
    ),
    // 3. Scanner (Data)
    () => (
        <div className="absolute inset-0 z-0 bg-[#022c22] overflow-hidden" style={{
            backgroundImage: 'radial-gradient(#10b981 0.8px, transparent 0.8px)',
            backgroundSize: '15px 15px'
        }}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#10b98122] to-transparent animate-scan-y"></div>
        </div>
    ),
    // 4. Prism Rotate (Visual)
    () => (
        <div className="absolute inset-0 z-0 bg-[#18181b] overflow-hidden">
            <div className="absolute top-1/2 left-1/2 w-[160%] h-[160%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,#f472b6,#3b82f6,#f472b6)] blur-[50px] opacity-30 animate-spin-slow"></div>
        </div>
    ),
    // 5. Deep Breath (Research)
    () => (
        <div className="absolute inset-0 z-0 bg-[#082f49] flex items-center justify-center overflow-hidden">
            <div className="absolute border border-white/5 rounded-full animate-ripple" style={{ width: '80px', height: '80px' }}></div>
            <div className="absolute border border-white/5 rounded-full animate-ripple delay-1000" style={{ width: '80px', height: '80px' }}></div>
            <div className="absolute border border-white/5 rounded-full animate-ripple delay-2000" style={{ width: '80px', height: '80px' }}></div>
        </div>
    ),
    // 6. Network Network (Trans)
    () => (
        <div className="absolute inset-0 z-0 bg-[#451a03] overflow-hidden">
            <div className="absolute w-[90px] h-[90px] top-[20%] left-[25%] bg-[radial-gradient(circle,#fbbf24_0%,transparent_70%)] opacity-30 animate-move-orb"></div>
            <div className="absolute w-[70px] h-[70px] bottom-[20%] right-[25%] bg-[radial-gradient(circle,#f59e0b_0%,transparent_70%)] opacity-30 animate-move-orb-delay"></div>
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
                @keyframes grid-move { from { background-position: 0 0; } to { background-position: 30px 30px; } }
                .animate-grid-move { animation: grid-move 25s linear infinite; }
                @keyframes float-blob { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(15px,25px) scale(1.1); } }
                .animate-float-blob { animation: float-blob 10s infinite alternate ease-in-out; }
                .animate-float-blob-delay { animation: float-blob 10s infinite alternate-reverse ease-in-out; }
                @keyframes scan-y { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
                .animate-scan-y { animation: scan-y 3.5s linear infinite; }
                @keyframes spin-slow { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 18s linear infinite; }
                @keyframes ripple { 0% { transform: scale(1); opacity: 0.6; border-color: rgba(255, 255, 255, 0.1); } 100% { transform: scale(3.5); opacity: 0; border-color: rgba(255, 255, 255, 0); } }
                .animate-ripple { animation: ripple 5s infinite linear; }
                @keyframes move-orb { 0% { transform: translate(0,0); } 100% { transform: translate(25px,-15px); } }
                .animate-move-orb { animation: move-orb 7s infinite alternate ease-in-out; }
                .animate-move-orb-delay { animation: move-orb 7s infinite alternate-reverse ease-in-out; }
                
                @keyframes popIn { 
                    from { opacity: 0; transform: scale(0.92) translateY(15px); } 
                    to { opacity: 1; transform: scale(1) translateY(0); } 
                }
                .card-pop-in { animation: popIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }
            `}</style>

            <div className="max-w-[1100px] w-full">
                <header className="mb-14">
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">选择创作场景</h2>
                    <p className="text-slate-500 text-sm font-medium tracking-wide">基于行业专家逻辑链条构建的 AI 创作流水线。</p>
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
                                className={`card-pop-in group relative h-[200px] rounded-[24px] border border-slate-200 overflow-hidden transition-all duration-500 ${
                                    supported 
                                    ? 'cursor-pointer hover:scale-[1.02] hover:border-indigo-400 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]' 
                                    : 'cursor-not-allowed grayscale opacity-30'
                                }`}
                                style={{ animationDelay: `${idx * 0.08}s` }}
                            >
                                {/* 核心动态特效背景 */}
                                <BgEffect />

                                {/* 深度遮罩层：确保在白色页面上内容的清晰度 */}
                                <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/5 to-black/80 backdrop-blur-[1px] transition-opacity duration-500 group-hover:opacity-60"></div>

                                {/* 内容渲染层 */}
                                <div className="relative z-[2] p-6 h-full flex flex-col justify-between">
                                    <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-lg font-bold text-white shadow-inner group-hover:scale-110 group-hover:bg-white/20 transition-all">
                                        {icon}
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <h3 className="text-lg font-bold text-white tracking-tight drop-shadow-lg">
                                            {s.title || s.name}
                                        </h3>
                                        <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed font-medium transition-colors group-hover:text-white/80">
                                            {s.description || '基于行业专家逻辑链条构建的智能创作流水线。'}
                                        </p>
                                    </div>
                                </div>

                                {/* 悬停效果底边 */}
                                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-white/40 group-hover:w-full transition-all duration-700"></div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
