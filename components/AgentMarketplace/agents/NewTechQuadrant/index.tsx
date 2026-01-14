
import React, { useState } from 'react';
import { ArticleSelectionStep } from './ArticleSelectionStep';
import { AnalysisWorkspace } from './AnalysisWorkspace';
import { ArticlePublic } from '../../../../types';

export interface TechItem {
    id: string;
    name: string;
    field: string;
    description: string;
    status: string;
    // Analysis State
    analysisState: 'idle' | 'analyzing' | 'review' | 'generating_html' | 'done';
    markdownContent?: string;
    htmlContent?: string;
    logs?: string[];
}

const NewTechQuadrant: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [step, setStep] = useState<'selection' | 'workspace'>('selection');
    const [selectedArticles, setSelectedArticles] = useState<ArticlePublic[]>([]);
    const [techList, setTechList] = useState<TechItem[]>([]);

    const handleArticlesConfirmed = (articles: ArticlePublic[]) => {
        setSelectedArticles(articles);
        setStep('workspace');
        // Mocking the extraction process immediately upon entering workspace
        mockExtractTechs();
    };

    // 模拟：从文章中提取技术点 (步骤 2 & 3)
    const mockExtractTechs = () => {
        setTimeout(() => {
            const mockData: TechItem[] = [
                {
                    id: '1',
                    name: '全固态硫化物电解质',
                    field: '动力电池',
                    description: '解决了传统液态电池的安全性问题，能量密度提升至 500Wh/kg。',
                    status: '预研阶段',
                    analysisState: 'idle'
                },
                {
                    id: '2',
                    name: '端到端自动驾驶大模型',
                    field: '智能驾驶',
                    description: '完全基于神经网络的感知决策一体化模型，不再依赖规则代码。',
                    status: '主机厂测试中',
                    analysisState: 'idle'
                },
                {
                    id: '3',
                    name: '900V 高压SiC平台',
                    field: '电气架构',
                    description: '充电5分钟续航400公里，全面提升补能效率。',
                    status: '量产应用',
                    analysisState: 'idle'
                }
            ];
            setTechList(mockData);
        }, 1500);
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc]">
            {/* Header is handled by AgentLayout usually, but if we need custom header inside workspace we can add it */}
            
            {step === 'selection' ? (
                <ArticleSelectionStep 
                    onConfirm={handleArticlesConfirmed} 
                    onBack={onBack}
                />
            ) : (
                <AnalysisWorkspace 
                    articles={selectedArticles}
                    techList={techList}
                    setTechList={setTechList}
                    onBack={() => setStep('selection')}
                />
            )}
        </div>
    );
};

export default NewTechQuadrant;
