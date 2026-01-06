
import React from 'react';
import { StratifyScenario } from '../../types';
// Import PPT Generation Scenario directly
import { ScenarioWorkstation as ScenarioWorkstation_PPT } from './212fb1f7-9b92-42b9-a315-d05addaebcae/index';

// Define the static scenario configuration for PPT Agent
const PPT_SCENARIO: StratifyScenario = {
    id: '212fb1f7-9b92-42b9-a315-d05addaebcae',
    name: 'ppt_agent',
    title: 'AI 智能研报生成 (PPT Agent)',
    description: 'Automated Research Report Generation Agent',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

export const ReportGenerator: React.FC = () => {
    // Directly render the PPT workstation. 
    // We pass an empty function for onBack since this is now the root view for this module.
    return (
        <div className="h-full w-full bg-white">
            <ScenarioWorkstation_PPT 
                scenario={PPT_SCENARIO} 
                onBack={() => {}} 
            />
        </div>
    );
};
