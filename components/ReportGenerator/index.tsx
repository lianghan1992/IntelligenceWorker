
import React, { useState, useEffect } from 'react';
import { CopilotSidebar } from './Step1Collect'; 
import { MainCanvas } from './Step3Compose';     
import { Step4Finalize } from './Step4Finalize'; 
import { PPTStage, ChatMessage, PPTData } from './types';
import { createSession, getSession, updateSession } from '../../api/stratify';
import { CloudIcon, CheckIcon, RefreshIcon, ChartIcon } from '../icons';

const DEFAULT_DATA: PPTData = {
    topic: '',
    referenceMaterials: '',
    outline: null,
    pages: []
};

const ScenarioWorkstation: React.FC = () => {
    // --- State Initialization ---
    const [stage, setStage] = useState<PPTStage>('collect');
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [data, setData] = useState<PPTData>(DEFAULT_DATA);
    const [activePageIndex, setActivePageIndex] = useState<number>(0);
    const [isLlmActive, setIsLlmActive] = useState(false);
    
    // Session State
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
    const [sessionCost, setSessionCost] = useState(0);

    // Initial Session Load / Creation
    useEffect(() => {
        const initSession = async () => {
             const params = new URLSearchParams(window.location.search);
             const sid = params.get('session_id');

             if (sid) {
                 try {
                     const session = await getSession(sid);
                     setSessionId(sid);
                     if (session.context_data) {
                         const { stage: savedStage, history: savedHistory, data: savedData } = session.context_data;
                         if (savedStage) setStage(savedStage);
                         if (savedHistory) setHistory(savedHistory);
                         if (savedData) setData(savedData);
                     }
                     setSessionCost(session.total_cost || 0);
                     setSaveStatus('saved');
                 } catch (e) {
                     console.error("Failed to load session", e);
                     // If load fails, maybe create new? For now just log error.
                 }
             } else {
                 try {
                     const session = await createSession('report-generator', '未命名报告');
                     setSessionId(session.id);
                     // Update URL without reload
                     const newUrl = window.location.pathname + `?session_id=${session.id}`;
                     window.history.replaceState({ path: newUrl }, '', newUrl);
                 } catch (e) {
                     console.error("Failed to create session", e);
                 }
             }
        };
        initSession();
    }, []);

    // Auto Save
    useEffect(() => {
        if (!sessionId) return;
        
        const save = async () => {
            setSaveStatus('saving');
            try {
                // Determine title from topic
                const title = data.topic ? (data.topic.length > 20 ? data.topic.slice(0, 20) + '...' : data.topic) : '未命名报告';
                
                const res = await updateSession(sessionId, {
                    title,
                    current_stage: stage,
                    context_data: { stage, history, data }
                });
                
                setSessionCost(res.total_cost || 0);
                setSaveStatus('saved');
            } catch (e) {
                console.error("Auto-save failed", e);
                setSaveStatus('error');
            }
        };

        const timer = setTimeout(save, 2000); // 2s debounce
        return () => clearTimeout(timer);
    }, [sessionId, data, history, stage]);

    const handleReset = () => {
        if (confirm('确定要清空当前会话并重新开始吗？')) {
            // Re-initialize with a new session instead of clearing local state only
            window.location.href = window.location.pathname; // Reload to clear query params and start fresh
        }
    };

    // Component Props for Children
    const sharedProps = {
        sessionId: sessionId || undefined, // Pass session ID to children
    };

    // Render Status Bar Component
    const StatusBar = () => (
        <div className="flex items-center gap-3 text-xs font-medium">
             <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                 <ChartIcon className="w-3.5 h-3.5 text-indigo-500" />
                 <span>消耗: ¥{sessionCost.toFixed(4)}</span>
             </div>
             <div className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                 saveStatus === 'saving' ? 'text-blue-500 bg-blue-50' :
                 saveStatus === 'saved' ? 'text-green-600 bg-green-50' :
                 saveStatus === 'error' ? 'text-red-500 bg-red-50' : 'text-slate-400'
             }`}>
                 {saveStatus === 'saving' && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                 {saveStatus === 'saved' && <CheckIcon className="w-3.5 h-3.5" />}
                 {saveStatus === 'error' && <CloudIcon className="w-3.5 h-3.5" />}
                 <span>
                     {saveStatus === 'saving' ? '保存中...' : 
                      saveStatus === 'saved' ? '已保存' : 
                      saveStatus === 'error' ? '保存失败' : ''}
                 </span>
             </div>
        </div>
    );

    // 如果处于 Finalize 阶段，全屏渲染精修器，不显示侧边栏
    if (stage === 'finalize') {
        return (
            <Step4Finalize 
                topic={data.topic}
                pages={data.pages}
                onBackToCompose={() => setStage('compose')}
                onUpdatePages={(newPages) => setData(prev => ({ ...prev, pages: newPages }))}
                onLlmStatusChange={setIsLlmActive}
                {...sharedProps}
            />
        );
    }

    return (
        <div className="flex h-full w-full bg-[#f8fafc] overflow-hidden text-slate-900 font-sans relative">
            
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
                    statusBar={<StatusBar />} // Pass status bar to sidebar header
                    {...sharedProps}
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
                    {...sharedProps}
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
