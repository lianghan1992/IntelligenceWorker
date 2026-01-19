
import React, { useState, Suspense } from 'react';
import { MarketHome } from './MarketHome';
import { AgentLayout } from './AgentLayout';
import { AGENT_REGISTRY } from './registry';
import { AGENTS } from '../../agentConfig';

const AgentMarketplace: React.FC = () => {
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

    const activeAgent = activeAgentId 
        ? AGENT_REGISTRY.find(a => a.id === activeAgentId) 
        : null;

    if (activeAgent) {
        const AgentComponent = activeAgent.component;
        
        // For HTML Visual Editor AND Tech Decision Assistant, we bypass the default AgentLayout 
        // to allow custom integrated headers/layouts.
        if (activeAgentId === 'html-visual-editor' || activeAgentId === AGENTS.TECH_DECISION_ASSISTANT) {
            return (
                <Suspense fallback={
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                    </div>
                }>
                    {/* Pass onBack to the component so it can implement its own header with back button */}
                    <AgentComponent onBack={() => setActiveAgentId(null)} />
                </Suspense>
            );
        }

        return (
            <AgentLayout 
                title={activeAgent.name} 
                icon={activeAgent.icon} 
                onBack={() => setActiveAgentId(null)}
            >
                <Suspense fallback={
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                    </div>
                }>
                    <AgentComponent />
                </Suspense>
            </AgentLayout>
        );
    }

    return <MarketHome onSelectAgent={setActiveAgentId} />;
};

export default AgentMarketplace;
