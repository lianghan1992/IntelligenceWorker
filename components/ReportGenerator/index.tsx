
import React, { useState, useEffect } from 'react';
import { StratifyTask, StratifyScenario } from '../../types';
import { getScenarios, getStratifyTaskDetail } from '../../api/stratify';

// Shared UI Components
import { HistoryDrawer } from './shared/HistoryDrawer';
import { ScenarioPicker } from './shared/ScenarioPicker';
import { AgentWorkstation } from './AgentWorkstation';
import { ClockIcon, ChevronLeftIcon } from '../icons';

export const ReportGenerator: React.FC = () => {
    const [view, setView] = useState<'picker' | 'workstation'>('picker');
    const [scenarios, setScenarios] = useState<StratifyScenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<StratifyScenario | null>(null);
    
    // Task State (for history loading)
    const [task, setTask] = useState<StratifyTask | undefined>(undefined);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    useEffect(() => {
        if (view === 'picker') {
            getScenarios().then(setScenarios).catch(console.error);
        }
    }, [view]);

    const handleScenarioSelect = (id: string) => {
        const scenario = scenarios.find(s => s.id === id);
        if (!scenario) return;
        
        setSelectedScenario(scenario);
        setTask(undefined); // New task
        setView('workstation');
    };

    const handleHistoryLoad = async (taskId: string) => {
        setIsHistoryOpen(false);
        try {
            const detail = await getStratifyTaskDetail(taskId);
            setTask(detail);
            
            // Find corresponding scenario object for metadata
            // Fallback to a mock object if scenario was deleted but task exists
            const scenario = scenarios.find(s => s.name === detail.scenario_name || s.id === detail.scenario_name) || {
                id: detail.scenario_name,
                name: detail.scenario_name,
                title: detail.scenario_name,
                description: 'Historical Task',
                created_at: '',
                updated_at: ''
            };
            
            setSelectedScenario(scenario);
            setView('workstation');
        } catch (e) {
            alert('加载历史任务失败');
        }
    };

    return (
        <div className="h-full flex flex-col bg-white relative overflow-hidden font-sans">
            {/* Top Toolbar: Only visible in picker */}
            {view === 'picker' && (
                <div className="absolute top-8 right-8 z-[60]">
                    <button 
                        onClick={() => setIsHistoryOpen(true)} 
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-full text-xs font-bold border border-slate-200 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all active:scale-95"
                    >
                        <ClockIcon className="w-3.5 h-3.5 opacity-60" /> 历史任务
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-hidden relative flex flex-col z-20">
                {view === 'picker' && <ScenarioPicker scenarios={scenarios} onSelect={handleScenarioSelect} />}
                
                {view === 'workstation' && selectedScenario && (
                    <AgentWorkstation 
                        scenario={selectedScenario}
                        initialTask={task}
                        onBack={() => {
                            setView('picker');
                            setSelectedScenario(null);
                            setTask(undefined);
                        }}
                    />
                )}
            </div>

            <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onSelect={handleHistoryLoad} />
        </div>
    );
};
