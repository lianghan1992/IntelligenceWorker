
import { StratifyScenario } from '../../types';

export const isScenarioSupported = (scenario: StratifyScenario): boolean => {
    // All dynamic scenarios from the backend are supported
    return true;
};
