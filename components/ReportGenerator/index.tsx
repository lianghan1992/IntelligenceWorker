
import React, { useState, useEffect, useCallback } from 'react';
import { CopilotSidebar } from './Step1Collect'; 
import { MainCanvas } from './Step3Compose';     
import { Step4Finalize } from './Step4Finalize'; 
import { PPTStage, ChatMessage, PPTData } from './types';
import { createSession, getSession, updateSession } from '../../api/stratify';
import { CloudIcon, CheckIcon, RefreshIcon, ChartIcon } from '../icons';
import { SessionHistoryDrawer } from './SessionHistoryModal';
import { AGENTS } from '../../agentConfig';
import { User } from '../../types';

const DEFAULT_DATA: PPTData = {
    topic: '',
    referenceMaterials: '',
    outline: null,
    pages: []
};

const REPORT_GENERATOR_AGENT_ID = AGENTS.REPORT_GENERATOR;

interface ReportGeneratorProps {
    user: User | null;
    checkProAccess: () => boolean;
}

const ScenarioWorkstation: React.FC<ReportGeneratorProps> = ({ user, checkProAccess }) => {
    // --- State Initialization ---
    const [stage, setStage] = useState<PPTStage>('collect');
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [data, setData] = useState<PPTData>(DEFAULT_DATA);
    const [activePageIndex, setActivePageIndex] = useState<number>(0);
    const [isLlmActive, setIsLlmActive] = useState(false);
    
    // Session State
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionTitle, setSessionTitle] = useState<string>('未命名报告');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
    const [sessionCost, setSessionCost] = useState(0);
    
    // UI State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Helper: Load specific session
    const loadSession = useCallback(async (sid: string) => {
        try {
            const session = await getSession(sid);
            setSessionId(sid);
            setSessionTitle(session.title || '未命名报告');
            if (session.context_data) {
                const { stage: savedStage, history: savedHistory, data: savedData } = session.context_data;
                if (savedStage) setStage(savedStage);
                if (savedHistory) setHistory(savedHistory);
                if (savedData) setData(savedData);
            }
            setSessionCost(session.total_cost || 0);
            setSaveStatus('saved');
            
            // Update URL without reload
            const newUrl = window.location.pathname + `?session_id=${sid}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
        } catch (e) {
            console.error("Failed to load session", e);
            // Fail gracefully
            setSessionId(null);
            const cleanUrl = window.location.pathname;
            window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        }
    }, []);
    
    const refreshSession = useCallback(async () => {
        if (!sessionId) return;
        try {
             const session = await getSession(sessionId);
             setSessionCost(session.total_cost || 0);
        } catch (e) {
            console.warn("Failed to refresh session stats", e);
        }
    }, [sessionId]);

    const resetToNewDraft = useCallback(() => {
        setStage('collect');
        setHistory([]);
        setData(DEFAULT_DATA);
        setActivePageIndex(0);
        setIsLlmActive(false);
        setSessionTitle('未命名报告');
        setSessionId(null);
        setSessionCost(0);
        setSaveStatus('idle');

        const newUrl = window.location.pathname;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }, []);

    const ensureSessionCreated = async (): Promise<string> => {
        if (sessionId) return sessionId;

        try {
            const session = await createSession(REPORT_GENERATOR_AGENT_ID, '未命名报告');
            const newId = session.id;
            
            setSessionId(newId);
            setSessionCost(0);
            setSaveStatus('saved'); 

            const newUrl = window.location.pathname + `?session_id=${newId}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
            
            return newId;
        } catch (e) {
            console.error("Failed to create session lazily", e);
            throw e;
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sid = params.get('session_id');
        if (sid) {
            loadSession(sid);
        }
    }, [loadSession]);

    useEffect(() => {
        if (!sessionId) return;
        
        const save = async () => {
            setSaveStatus('saving');
            try {
                let titleToSave = sessionTitle;
                if (sessionTitle === '未命名报告' && data.topic) {
                    titleToSave = data.topic.length > 20 ? data.topic.slice(0, 20) + '...' : data.topic;
                    setSessionTitle(titleToSave);
                }
                
                const res = await updateSession(sessionId, {
                    title: titleToSave,
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

        const timer = setTimeout(save, 2000); 
        return () => clearTimeout(timer);
    }, [sessionId, data, history, stage, sessionTitle]); 

    const handleTitleChange = (newTitle: string) => {
        setSessionTitle(newTitle);
        if (sessionId) {
            updateSession(sessionId, { title: newTitle }).catch(console.error);
        }
    };

    const handleResetConfirm = () => {
        if (sessionId && confirm('确定要新建任务吗？当前进度将保存至历史记录。')) {
            resetToNewDraft();
        } else if (!sessionId) {
             resetToNewDraft();
        }
    };

    const sharedProps = {
        sessionId: sessionId || undefined, 
        onRefreshSession: refreshSession,
    };

    const StatusBar = () => (
        <div className="flex items-center gap-3 text-xs font-medium">
             {sessionId ? (
                 <>
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
                             saveStatus === 'error' ? '保存失败' : '草稿'}
                        </span>
                    </div>
                 </>
             ) : (
                 <div className="flex items-center gap-1 text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 italic">
                     草稿模式 (未保存)
                 </div>
             )}
        </div>
    );

    if (stage === 'finalize') {
        return (
            <Step4Finalize 
                topic={data.topic}
                pages={data.pages}
                onBackToCompose={() => setStage('compose')}
                onUpdatePages={(newPages) => setData(prev => ({ ...prev, pages: newPages }))}
                onLlmStatusChange={setIsLlmActive}
                checkProAccess={checkProAccess}
                {...sharedProps}
            />
        );
    }

    return (
        <div className="flex h-full w-full bg-[#f8fafc] overflow-hidden text-slate-900 font-sans relative">
            
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
                    onReset={handleResetConfirm}
                    statusBar={<StatusBar />}
                    sessionTitle={sessionTitle}
                    onTitleChange={handleTitleChange}
                    onSwitchSession={loadSession}
                    onEnsureSession={ensureSessionCreated}
                    onToggleHistory={() => setIsHistoryOpen(true)}
                    {...sharedProps}
                />
            </div>

            <div className="flex-1 relative bg-slate-50 overflow-hidden flex flex-col">
                <MainCanvas 
                    stage={stage}
                    data={data}
                    activePageIndex={activePageIndex}
                    setActivePageIndex={setActivePageIndex}
                    isLlmActive={isLlmActive}
                    setStage={setStage}
                    setData={setData}
                    checkProAccess={checkProAccess}
                    {...sharedProps}
                />
            </div>
            
            <SessionHistoryDrawer 
                isOpen={isHistoryOpen} 
                onClose={() => setIsHistoryOpen(false)} 
                currentSessionId={sessionId || undefined}
                onSwitchSession={loadSession}
            />
        </div>
    );
};

export const ReportGenerator: React.FC<ReportGeneratorProps> = (props) => {
    return (
        <div className="h-full w-full">
            <ScenarioWorkstation {...props} />
        </div>
    );
};
