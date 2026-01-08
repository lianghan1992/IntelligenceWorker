
import React, { useState, useEffect } from 'react';
import { CopilotSidebar } from './Step1Collect'; 
import { MainCanvas } from './Step3Compose';     
import { Step4Finalize } from './Step4Finalize'; // Import Step4
import { PPTStage, ChatMessage, PPTData } from './types';

const STORAGE_KEY = 'auto_insight_ppt_session_v4'; 

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
                // Ensure pages is always an array
                if (!parsedData.pages) parsedData.pages = [];
                // Reset generating states on load to prevent stuck spinners
                parsedData.pages = parsedData.pages.map((p: any) => ({ ...p, isGenerating: false }));
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
            setIsLlmActive(false);
        }
    };

    // 如果处于 Finalize 阶段，全屏渲染精修器，不显示侧边栏
    if (stage === 'finalize') {
        return (
            <Step4Finalize 
                topic={data.topic}
                pages={data.pages}
                onBackToCompose={() => setStage('compose')}
                onUpdatePages={(newPages) => setData(prev => ({ ...prev, pages: newPages }))}
                onLlmStatusChange={setIsLlmActive}
            />
        );
    }

    return (
        <div className="flex h-full w-full bg-[#f8fafc] overflow-hidden text-slate-900 font-sans">
            {/* Left: Copilot Sidebar (Wider) */}
            <div className="w-[450px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-[#0f172a] relative z-20 transition-all duration-300">
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

            {/* Right: Main Canvas (Flex - The Business Presentation View) */}
            <div className="flex-1 relative bg-slate-50 overflow-hidden flex flex-col">
                <MainCanvas 
                    stage={stage}
                    data={data}
                    activePageIndex={activePageIndex}
                    setActivePageIndex={setActivePageIndex}
                    isLlmActive={isLlmActive}
                    setStage={setStage}
                    setData={setData}
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
