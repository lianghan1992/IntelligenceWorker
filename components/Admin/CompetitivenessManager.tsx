import React from 'react';
import { CompetitivenessDashboard } from '../CompetitivenessDashboard/index';

export const CompetitivenessManager: React.FC = () => {
    // The CompetitivenessDashboard component contains its own sidebar navigation.
    // Rendering it within the AdminPage layout might result in nested sidebars,
    // but this change is necessary to resolve the module loading error.
    return <CompetitivenessDashboard />;
};
