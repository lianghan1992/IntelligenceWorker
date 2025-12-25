
import React, { useState, useEffect } from 'react';
import { StratifyScenario } from '../../types';
import { getScenarios } from '../../api/stratify';
import { ScenarioSelector } from './ScenarioSelector';
import { SparklesIcon } from '../icons';

export const ReportGenerator: React.FC = () => {
    const [scenarios, setScenarios] = useState<StratifyScenario[]>([]);
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
        // TODO: 根据 scenario.name 或 id 路由到具体的子文件夹/组件
        // 目前仅做占位提示
        console.log("Selected scenario:", scenario);
        alert(`即将进入场景：${scenario.title}\n(独立场景页面开发中)`);
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

    return (
        <div className="h-full w-full bg-white">
            <ScenarioSelector 
                scenarios={scenarios} 
                onSelect={handleScenarioSelect} 
            />
        </div>
    );
};
