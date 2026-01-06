
import React, { useState, useEffect, useRef } from 'react';
import { StratifyScenario } from '../../types';
import { 
    SparklesIcon, CubeIcon, ChevronRightIcon, 
    CheckIcon, DocumentTextIcon, ViewGridIcon, 
    LightningBoltIcon
} from '../icons';
import { Step1Collect } from './Step1Collect';
import { Step2Outline } from './Step2Outline';
import { Step3Compose } from './Step3Compose';
import { Step4Finalize } from './Step4Finalize';
import { getPromptDetail } from '../../api/stratify';
import { PPTStage, ChatMessage, PPTData } from './types';

const STORAGE_KEY = 'auto_insight_ppt_session_v2'; // Version bump

const DEFAULT_DATA: PPTData = {
    topic: '',
    referenceMaterials: '',
    outline: null,
    pages: []
};

// --- Blueprint Style Components ---

const PipelineIndicator: React.FC<{ currentStage: PPTStage }> = ({ currentStage }) => {
    const steps: { id: PPTStage; label: string; icon: any }[] = [
        { id: 'collect', label: '核心定义', icon: LightningBoltIcon },
        { id: 'outline', label: '架构蓝图', icon: ViewGridIcon },
        { id: 'compose', label: '模块建造', icon: CubeIcon },
        { id: 'finalize', label: '最终交付', icon: CheckIcon }
    ];
    
    const currentIndex = steps.findIndex(s => s.id === currentStage);

    return (
        <div className="flex items-center justify-center py-6 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
            <div className="flex items-center">
                {steps.map((step, idx) => {
                    const isActive = idx === currentIndex;
                    const isPast = idx < currentIndex;
                    
                    return (
                        <React.Fragment key={step.id}>
                            {/* Step Node */}
                            <div className="flex flex-col items-center group relative">
                                <div className={`
                                    w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 z-10 border-2
                                    ${isActive 
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-indigo-500/30 scale-110' 
                                        : isPast 
                                            ? 'bg-indigo-600 text-white border-indigo-600' 
                                            : 'bg-white text-slate-300 border-slate-200'
                                    }
                                `}>
                                    <step.icon className="w-5 h-5" />
                                </div>
                                <span className={`
                                    absolute top-12 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-300
                                    ${isActive ? 'text-slate-800' : isPast ? 'text-indigo-600' : 'text-slate-300'}
                                `}>
                                    {step.label}
                                </span>
                            </div>

                            {/* Connector Line */}
                            {idx < steps.length - 1 && (
                                <div className="w-16 md:w-24 h-0.5 mx-2 bg-slate-100 relative overflow-hidden">
                                    <div className={`
                                        absolute inset-0 bg-indigo-600 transition-transform duration-700 ease-in-out origin-left
                                        ${isPast ? 'scale-x-100' : 'scale-x-0'}
                                    `}></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

const ScenarioWorkstation: React.FC = () => {
    // --- State Initialization ---
    const [stage, setStage] = useState<PPTStage>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved).stage : 'collect';
        } catch { return 'collect'; }
    });

    const [history, setHistory] = useState<ChatMessage[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved).history : [];
        } catch { return []; }
    });

    const [data, setData] = useState<PPTData>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsedData = JSON.parse(saved).data;
                if (parsedData.pages) {
                    parsedData.pages = parsedData.pages.map((p: any) => ({ ...p, isGenerating: false }));
                }
                return parsedData;
            }
            return DEFAULT_DATA;
        } catch { return DEFAULT_DATA; }
    });

    const [isLlmActive, setIsLlmActive] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

    // --- Persistence ---
    useEffect(() => {
        setSaveStatus('saving');
        const stateToSave = { stage, history, data };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        
        const timer = setTimeout(() => setSaveStatus('saved'), 800);
        return () => clearTimeout(timer);
    }, [stage, history, data]);

    const handleReset = () => {
        if (confirm('确定要销毁当前蓝图并重新开始吗？')) {
            localStorage.removeItem(STORAGE_KEY);
            setStage('collect');
            setHistory([]);
            setData(DEFAULT_DATA);
        }
    };

    // Helper to initiate topic analysis
    const handleTopicSubmit = async (topic: string) => {
        try {
            setIsLlmActive(true);
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600");
            const materials = data.referenceMaterials;
            
            const initialHistory: ChatMessage[] = [
                { role: 'system', content: prompt.content, hidden: true },
                { role: 'user', content: `参考资料如下：\n${materials}`, hidden: true },
                { role: 'user', content: topic, hidden: false }
            ];
            
            setData(prev => ({ ...prev, topic: topic }));
            setHistory(initialHistory);
            setStage('outline');
        } catch (e) {
            console.error(e);
            alert("初始化分析失败，请重试");
        } finally {
            setIsLlmActive(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-slate-900 relative overflow-hidden">
            {/* Technical Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                 style={{ 
                     backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', 
                     backgroundSize: '40px 40px' 
                 }}>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80 pointer-events-none"></div>

            {/* Top Bar */}
            <header className="h-16 flex-shrink-0 px-6 flex items-center justify-between z-50 relative">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-900 rounded-lg">
                        <SparklesIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-slate-700 tracking-tight">Auto Insight <span className="text-slate-400 font-normal">/ Architect</span></span>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded border border-slate-200">
                        <div className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}></div>
                        {saveStatus === 'saving' ? 'SYNCING...' : 'SAVED'}
                    </div>
                    <button 
                        onClick={handleReset}
                        className="text-xs font-bold text-slate-400 hover:text-red-600 transition-colors"
                    >
                        [ 重置工程 ]
                    </button>
                </div>
            </header>

            {/* Pipeline Visualizer */}
            <PipelineIndicator currentStage={stage} />

            {/* Main Canvas */}
            <main className="flex-1 relative z-10 overflow-hidden flex flex-col">
                <div className="flex-1 h-full overflow-hidden">
                    {stage === 'collect' && (
                        <Step1Collect 
                            onUpdateMaterials={(m) => setData(prev => ({ ...prev, referenceMaterials: m }))} 
                            onNext={handleTopicSubmit}
                        />
                    )}
                    {stage === 'outline' && (
                        <Step2Outline 
                            topic={data.topic}
                            history={history}
                            onHistoryUpdate={setHistory}
                            onLlmStatusChange={setIsLlmActive}
                            onStreamingUpdate={setStreamingMessage}
                            onConfirm={(outline) => {
                                setData(prev => ({ 
                                    ...prev, 
                                    outline,
                                    pages: outline.pages.map(p => ({ title: p.title, summary: p.content, content: '', isGenerating: false }))
                                }));
                                setStage('compose');
                            }}
                        />
                    )}
                    {stage === 'compose' && (
                        <Step3Compose 
                            pages={data.pages}
                            history={history}
                            onUpdatePages={newPages => setData(prev => ({ ...prev, pages: newPages }))}
                            onHistoryUpdate={setHistory}
                            onLlmStatusChange={setIsLlmActive}
                            onStreamingUpdate={setStreamingMessage}
                            onFinish={() => setStage('finalize')}
                        />
                    )}
                    {stage === 'finalize' && (
                        <Step4Finalize 
                            topic={data.topic}
                            pages={data.pages}
                            onBackToCompose={() => setStage('compose')}
                            onUpdatePages={newPages => setData(prev => ({ ...prev, pages: newPages }))}
                            onLlmStatusChange={setIsLlmActive}
                            onStreamingUpdate={setStreamingMessage}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export const ReportGenerator: React.FC = () => {
    return (
        <div className="h-full w-full bg-white">
            <ScenarioWorkstation />
        </div>
    );
};
