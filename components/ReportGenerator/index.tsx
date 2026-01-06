
import React, { useState, useEffect } from 'react';
import { StratifyScenario } from '../../types';
import { CopilotSidebar } from './Step1Collect'; // Reuse file as Sidebar
import { MainCanvas } from './Step3Compose';     // Reuse file as Canvas
import { PPTStage, ChatMessage, PPTData } from './types';

const STORAGE_KEY = 'auto_insight_ppt_session_v3'; // Version bump for new layout

const DEFAULT_DATA: PPTData = {
    topic: '',
    referenceMaterials: '',
    outline: null,
    pages: []
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
                // Reset generating states on load
                if (parsedData.pages) {
                    parsedData.pages = parsedData.pages.map((p: any) => ({ ...p, isGenerating: false }));
                }
                return parsedData;
            }
            return DEFAULT_DATA;
        } catch { return DEFAULT_DATA; }
    });

    const [activePageIndex, setActivePageIndex] = useState<number>(0);
    const [isLlmActive, setIsLlmActive] = useState(false);
    
    // --- Persistence ---
    useEffect(() => {
        const stateToSave = { stage, history, data };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [stage, history, data]);

    const handleReset = () => {
        if (confirm('确定要清空当前会话并重新开始吗？')) {
            localStorage.removeItem(STORAGE_KEY);
            setStage('collect');
            setHistory([]);
            setData(DEFAULT_DATA);
            setActivePageIndex(0);
        }
    };

    return (
        <div className="flex h-full w-full bg-[#0f172a] overflow-hidden text-slate-100 font-sans">
            {/* Left: Copilot Sidebar (400px Fixed) */}
            <div className="w-[400px] flex-shrink-0 flex flex-col border-r border-slate-700/50 bg-[#0f172a] relative z-20">
                <CopilotSidebar 
                    stage={stage}
                    setStage={setStage}
                    history={history}
                    setHistory={setHistory}
                    data={data}
                    setData={setData}
                    isLlmActive={isLlmActive}
                    setIsLlmActive={setIsLlmActive}
                    activePageIndex={activePageIndex}
                    setActivePageIndex={setActivePageIndex}
                    onReset={handleReset}
                />
            </div>

            {/* Right: Main Canvas (Flex) */}
            <div className="flex-1 relative bg-slate-100 text-slate-900 overflow-hidden flex flex-col">
                {/* Background Texture */}
                <div className="absolute inset-0 opacity-[0.4] pointer-events-none" 
                     style={{ 
                         backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                         backgroundSize: '24px 24px' 
                     }}>
                </div>
                
                <MainCanvas 
                    stage={stage}
                    data={data}
                    activePageIndex={activePageIndex}
                    setActivePageIndex={setActivePageIndex}
                    isLlmActive={isLlmActive}
                />
            </div>
        </div>
    );
};

export const ReportGenerator: React.FC = () => {
    return (
        <div className="h-full w-full">
            <ScenarioWorkstation />
        </div>
    );
};
