
import React, { useState, Suspense } from 'react';
import { MarketHome } from './MarketHome';
import { AgentLayout } from './AgentLayout';
import { AGENT_REGISTRY } from './registry';

const AgentMarketplace: React.FC = () => {
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

    const activeAgent = activeAgentId 
        ? AGENT_REGISTRY.find(a => a.id === activeAgentId) 
        : null;

    if (activeAgent) {
        const AgentComponent = activeAgent.component;
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
