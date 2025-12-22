
import React, { useState, useEffect, useMemo } from 'react';
import { 
    PuzzleIcon, 
    BrainIcon,
    SparklesIcon,
    LightningBoltIcon,
    ServerIcon,
    ClockIcon,
    RefreshIcon
} from '../../../../icons';
import { VectorSearchModal } from '../../../ui/VectorSearchModal';
import { getScenarioFiles, getScenarios } from '../../../../../api/stratify';
import { StratifyScenarioFile } from '../../../../../types';

// Helper to format model names
const formatModelName = (model?: string) => {
    if (!model) return 'Auto (System Default)';
    let name = model.includes('@') ? model.split('@')[1] : model;
    if (name.includes('/')) name = name.split('/')[1];
    return name.replace(':free', '').replace(':beta', '');
};

// Mapping phase filenames to readable labels
const PHASE_LABELS: Record<string, string> = {
    '00_analyze_input': '意图分析',
    '01_Role_ProtocolSetup': '角色初始化',
    '02_DataIngestion': '知识库注入',
    '03_TriggerGeneration_step1': '技术路线分析',
    '03_TriggerGeneration_step2': '潜在风险识别',
    '03_TriggerGeneration_step3': '解决方案推荐',
    '03_TriggerGeneration_step4': '引用溯源',
    '04_Markdown2Html': '视觉渲染引擎'
};

export const InputCollector: React.FC<{
    scenarioId: string;
    initialTech: string;
    initialMaterials: string;
    isProcessing: boolean;
    onStart: (data: { targetTech: string; materials: string }) => void;
}> = ({ scenarioId, initialTech, initialMaterials, isProcessing, onStart }) => {
    const [targetTech, setTargetTech] = useState(initialTech);
    const [manualMaterials, setManualMaterials] = useState(initialMaterials);
    const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
    
    // Model Config State
    const [files, setFiles] = useState<StratifyScenarioFile[]>([]);
    const [defaultModel, setDefaultModel] = useState<string>('Loading...');
    const [isConfigLoading, setIsConfigLoading] = useState(false);

    useEffect(() => { setTargetTech(initialTech); }, [initialTech]);

    // Load Scenario Configuration
    useEffect(() => {
        const loadConfig = async () => {
            setIsConfigLoading(true);
            try {
                // Fetch scenario default model
                const scenarios = await getScenarios();
                const currentScenario = scenarios.find(s => s.id === scenarioId || s.name === scenarioId);
                setDefaultModel(currentScenario?.default_model || 'System Default');

                // Fetch files for specific steps
                const scenarioFiles = await getScenarioFiles(scenarioId);
                setFiles(scenarioFiles);
            } catch (e) {
                console.error("Failed to load scenario config", e);
            } finally {
                setIsConfigLoading(false);
            }
        };
        loadConfig();
    }, [scenarioId]);

    const handleStart = () => {
        if (!targetTech.trim()) return;
        onStart({ targetTech, materials: manualMaterials });
    };

    // Filter interesting phases for display
    const visiblePhases = useMemo(() => {
        const order = [
            '03_TriggerGeneration_step1',
            '03_TriggerGeneration_step2',
            '03_TriggerGeneration_step3',
            '04_Markdown2Html'
        ];
        return order.map(key => {
            const file = files.find(f => f.name.includes(key));
            return {
                key,
                label: PHASE_LABELS[key] || key,
                model: file?.model || null // null implies using default
            };
        });
    }, [files]);

    return (
        <div className="flex-1 bg-[#f8fafc] overflow-y-auto custom-scrollbar">
            <div className="max-w-[1600px] mx-auto p-6 md:p-12 min-h-full flex flex-col items-center">
                
                {/* Header Section */}
                <div className="text-center mb-10 w-full max-w-3xl">
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
                        技术评估 <span className="text-indigo-600">Agent</span>
                    </h1>
                    <p className="text-slate-500 text-sm md:text-base font-medium">
                        输入目标技术，Agent 将自动调用知识库，进行竞品对比、风险排查与方案推荐。
                    </p>
                </div>

                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left: Input Form (8/12) */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* 1. Target Tech Input */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
                            <div className="p-4 border-b border-slate-50 bg-slate-50/50 rounded-t-xl flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm"></span>
                                    Target Technology (评估目标)
                                </label>
                                <span className="text-[10px] text-slate-400 font-medium bg-white px-2 py-0.5 rounded border border-slate-100">Required</span>
                            </div>
                            <textarea 
                                value={targetTech}
                                onChange={e => setTargetTech(e.target.value)}
                                placeholder="请输入具体的技术名称，例如：'小米SU7 800V 高压平台' 或 '特斯拉 FSD V12 端到端算法'..."
                                className="w-full h-32 p-5 text-lg md:text-xl font-bold text-slate-800 placeholder:text-slate-300 border-none resize-none focus:ring-0 outline-none leading-relaxed font-sans bg-transparent"
                                disabled={isProcessing}
                            />
                        </div>

                        {/* 2. Materials Input */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 focus-within:ring-4 focus-within:ring-emerald-100 focus-within:border-emerald-300 transition-all">
                            <div className="p-3 border-b border-slate-50 bg-slate-50/50 rounded-t-xl flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></span>
                                    Context & Data (参考资料)
                                </label>
                                <button 
                                    onClick={() => setIsVectorModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 rounded-lg text-xs font-bold text-slate-600 transition-all shadow-sm active:scale-95"
                                >
                                    <PuzzleIcon className="w-3.5 h-3.5" /> 知识库检索
                                </button>
                            </div>
                            <textarea 
                                value={manualMaterials}
                                onChange={e => setManualMaterials(e.target.value)}
                                placeholder="在此处粘贴相关技术参数、新闻报道或竞品分析资料。资料越详实，报告越深入..."
                                className="w-full h-48 p-5 text-sm md:text-base text-slate-600 placeholder:text-slate-300 border-none resize-none focus:ring-0 outline-none leading-relaxed font-sans bg-transparent"
                                disabled={isProcessing}
                            />
                        </div>

                    </div>

                    {/* Right: Configuration & Action (4/12) */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        
                        {/* Model Configuration Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    <ServerIcon className="w-4 h-4 text-indigo-500"/> 执行模型配置
                                </h3>
                                {isConfigLoading && <RefreshIcon className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                            </div>
                            
                            <div className="p-4 space-y-4">
                                {/* Default Model */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Default Model</span>
                                    <div className="text-xs font-mono bg-slate-100 text-slate-600 px-3 py-2 rounded-lg border border-slate-200 break-all">
                                        {formatModelName(defaultModel)}
                                    </div>
                                </div>

                                {/* Phase Specifics */}
                                <div className="space-y-2">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Phase Overrides</span>
                                    {visiblePhases.map((phase, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
                                            <span className="text-slate-600 font-medium flex items-center gap-1.5">
                                                <div className={`w-1 h-1 rounded-full ${phase.model ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                                                {phase.label}
                                            </span>
                                            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${phase.model ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 italic'}`}>
                                                {phase.model ? formatModelName(phase.model) : 'Default'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <ClockIcon className="w-3 h-3" />
                                    配置由后端数据库加载，仅供调试确认
                                </p>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button 
                            onClick={handleStart}
                            disabled={isProcessing || !targetTech.trim()}
                            className={`
                                w-full py-4 rounded-2xl font-bold text-base shadow-xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group
                                ${isProcessing || !targetTech.trim() 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                                    : 'bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-indigo-500/30 active:scale-95'
                                }
                            `}
                        >
                            <div className="relative z-10 flex items-center gap-2">
                                {isProcessing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Agent Running...</span>
                                    </>
                                ) : (
                                    <>
                                        <LightningBoltIcon className="w-5 h-5" />
                                        <span>启动分析引擎</span>
                                    </>
                                )}
                            </div>
                            {/* Shine Effect */}
                            {!isProcessing && targetTech.trim() && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            )}
                        </button>

                        {/* Helper Text */}
                        <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 text-xs text-indigo-800/80 leading-relaxed">
                            <p className="font-bold mb-1 flex items-center gap-1"><SparklesIcon className="w-3.5 h-3.5"/> 提示：</p>
                            AI 将按照 <span className="font-bold">技术路线 -> 风险识别 -> 方案推荐</span> 的逻辑链进行推理，并最终生成 HTML 格式报告。
                        </div>

                    </div>
                </div>
            </div>

            <VectorSearchModal 
                isOpen={isVectorModalOpen} 
                onClose={() => setIsVectorModalOpen(false)} 
                onAddSnippet={(s) => setManualMaterials(prev => (prev ? prev + "\n\n" : "") + `【参考资料：${s.title}】\n${s.content}`)} 
            />
        </div>
    );
};
