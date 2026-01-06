
import React, { useState, useEffect } from 'react';
import { StratifyScenario } from '../../types';
import { getScenarios } from '../../api/stratify';
import { ScenarioSelector } from './ScenarioSelector';
// 使用最新的通用工作台组件 (基于 Chat + Preview 模式)
import { ScenarioWorkstation } from './5e99897c-6d91-4c72-88e5-653ea162e52b/index'; 

export const ReportGenerator: React.FC = () => {
    const [scenarios, setScenarios] = useState<StratifyScenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<StratifyScenario | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchScenarios = async () => {
            try {
                const data = await getScenarios();
                setScenarios(data);
            } catch (e) {
                console.error("Failed to load scenarios", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchScenarios();
    }, []);

    // 如果选中了场景，进入工作台
    if (selectedScenario) {
        return (
            <div className="h-full w-full bg-white">
                <ScenarioWorkstation 
                    scenario={selectedScenario} 
                    onBack={() => setSelectedScenario(null)} 
                />
            </div>
        );
    }

    // 否则显示场景选择器
    return (
        <div className="h-full w-full bg-slate-50">
            <ScenarioSelector 
                scenarios={scenarios} 
                onSelect={setSelectedScenario} 
            />
        </div>
    );
};
