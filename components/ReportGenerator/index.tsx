
import React, { useState, useEffect } from 'react';
import { StratifyScenario } from '../../types';
import { getScenarios } from '../../api/stratify';
import { ScenarioSelector } from './ScenarioSelector';
import { SparklesIcon } from '../icons';

// Import Specific Scenarios
import { ScenarioWorkstation as ScenarioWorkstation_5e99 } from './5e99897c-6d91-4c72-88e5-653ea162e52b/index';
import { ScenarioWorkstation as ScenarioWorkstation_8215 } from './821543a3-1c02-427c-a6ae-c18874eda0c4/index';
// NEW: PPT Generation Scenario
import { ScenarioWorkstation as ScenarioWorkstation_PPT } from './212fb1f7-9b92-42b9-a315-d05addaebcae/index';

export const ReportGenerator: React.FC = () => {
    const [scenarios, setScenarios] = useState<StratifyScenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<StratifyScenario | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await getScenarios();
                setScenarios(data);
            } catch (err: any) {
                console.error("Failed to load scenarios", err);
                setError(err.message || '加载场景失败');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleScenarioSelect = (scenario: StratifyScenario) => {
        setSelectedScenario(scenario);
    };

    const handleBack = () => {
        setSelectedScenario(null);
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-slate-400 text-sm font-medium animate-pulse">正在连接 AI 场景库...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-6">
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3">
                    <SparklesIcon className="w-6 h-6" />
                    <p>{error}</p>
                </div>
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-6 px-6 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
                >
                    重试
                </button>
            </div>
        );
    }

    // --- Routing Logic ---
    if (selectedScenario) {
        if (selectedScenario.id === '5e99897c-6d91-4c72-88e5-653ea162e52b') {
            return <ScenarioWorkstation_5e99 scenario={selectedScenario} onBack={handleBack} />;
        }
        if (selectedScenario.id === '821543a3-1c02-427c-a6ae-c18874eda0c4') {
            return <ScenarioWorkstation_8215 scenario={selectedScenario} onBack={handleBack} />;
        }
        // NEW: PPT Scene
        if (selectedScenario.id === '212fb1f7-9b92-42b9-a315-d05addaebcae') {
            return <ScenarioWorkstation_PPT scenario={selectedScenario} onBack={handleBack} />;
        }

        // Fallback
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">场景开发中</h2>
                    <p className="text-slate-500 mb-6">ID: {selectedScenario.id}</p>
                    <button onClick={handleBack} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">返回</button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-white">
            <ScenarioSelector 
                scenarios={scenarios} 
                onSelect={handleScenarioSelect} 
            />
        </div>
    );
};
