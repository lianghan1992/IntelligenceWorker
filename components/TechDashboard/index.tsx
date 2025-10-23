import React, { useState, useMemo, useEffect } from 'react';
import { VehicleTechSpec } from '../../types';
import { techDimensions, mockVehicleSpecs } from '../../mockData';
import { ChevronDownIcon } from '../icons';

type ComparisonMode = 'evolution' | 'brand' | 'competitor';

// --- Helper Functions ---
const getSpec = (spec: VehicleTechSpec | undefined, catKey: string, subKey: string) => {
    return spec?.specs[catKey]?.[subKey] || 'N/A';
};

const getDifferences = (comparisonData: VehicleTechSpec[], catKey: string, subKey: string) => {
    if (comparisonData.length <= 1) return false;
    const firstValue = getSpec(comparisonData[0], catKey, subKey);
    for (let i = 1; i < comparisonData.length; i++) {
        if (getSpec(comparisonData[i], catKey, subKey) !== firstValue) {
            return true; // Found a difference
        }
    }
    return false; // All values are the same
};

// --- Sub-Components ---

// A more robust multi-select component for future use if needed, for now using simple selects.
const VehicleSelector: React.FC<{
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
}> = ({ label, options, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

// --- Main Component ---
export const TechDashboard: React.FC = () => {
    const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('competitor');
    
    // State to manage user selections in the control panel
    const [selections, setSelections] = useState<string[]>(['xiaomi-su7-max', 'wenjie-m7-2024', 'li-l7-2024']);
    
    // State that holds the final data to be rendered in the table
    const [comparisonData, setComparisonData] = useState<VehicleTechSpec[]>([]);

    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(techDimensions.map(c => c.key))
    );

    const toggleCategory = (key: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const uniqueBrands = useMemo(() => Array.from(new Set(mockVehicleSpecs.map(v => v.brand))), []);
    const modelsByBrand = useMemo(() => {
        return mockVehicleSpecs.reduce((acc, v) => {
            if (!acc[v.brand]) acc[v.brand] = [];
            acc[v.brand].push({ value: v.id, label: v.name });
            return acc;
        }, {} as Record<string, { value: string; label: string }[]>);
    }, []);

    const handleGenerateComparison = () => {
        const data = selections.map(id => mockVehicleSpecs.find(v => v.id === id)).filter(Boolean) as VehicleTechSpec[];
        setComparisonData(data);
    };

    // Trigger initial comparison on load
    useEffect(() => {
        handleGenerateComparison();
    }, []);

    const renderSelectors = () => {
        switch (comparisonMode) {
            case 'evolution':
                // For simplicity, we'll use a single brand for evolution demo
                const brandForEvolution = '问界';
                const models = modelsByBrand[brandForEvolution] || [];
                return (
                     <VehicleSelector label="选择车型" options={models} value={selections[0] || ''} onChange={(val) => setSelections([val, ...models.map(m => m.value).filter(m => m !== val)])} />
                );
            case 'brand':
                 const brand = uniqueBrands[0]; // Default to first brand
                 const brandModels = modelsByBrand[brand] || [];
                return (
                    <div className="flex gap-4">
                        <p className="font-semibold p-2">{brand}</p>
                         {/* This should be a multi-select component in a real app */}
                        <p className="text-gray-500 p-2"> (选择 {brand} 旗下车型进行对比)</p>
                    </div>
                );
            case 'competitor':
                return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[0, 1, 2].map(i => (
                             <VehicleSelector
                                key={i}
                                label={`竞品 ${i + 1}`}
                                options={mockVehicleSpecs.map(v => ({ value: v.id, label: v.name }))}
                                value={selections[i] || ''}
                                onChange={(val) => {
                                    const newSelections = [...selections];
                                    newSelections[i] = val;
                                    setSelections(newSelections);
                                }}
                            />
                        ))}
                    </div>
                );
        }
    };
    

    return (
        <div className="h-full flex flex-col bg-gray-100 p-6">
            <header className="flex-shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                <div className="flex justify-between items-center mb-4">
                     <h1 className="text-xl font-bold text-gray-900">车型技术看板</h1>
                     <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                        {(['competitor', 'brand', 'evolution'] as ComparisonMode[]).map(mode => (
                             <button
                                key={mode}
                                onClick={() => setComparisonMode(mode)}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${comparisonMode === mode ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                            >
                                {{ competitor: '跨品牌竞品', brand: '同品牌对比', evolution: '单车演进' }[mode]}
                            </button>
                        ))}
                     </div>
                </div>
                <div className="flex items-end gap-4">
                    <div className="flex-grow">{renderSelectors()}</div>
                    <button onClick={handleGenerateComparison} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition h-10">
                        生成对比
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full min-w-[1000px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b bg-gray-50 sticky top-0">
                            <th className="w-1/4 p-3 text-left font-semibold text-gray-600">技术维度</th>
                            {comparisonData.map(vehicle => (
                                <th key={vehicle.id} className="w-1/4 p-3 text-left font-semibold text-gray-800">{vehicle.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {techDimensions.map(category => (
                            <React.Fragment key={category.key}>
                                <tr className="border-b bg-gray-50/70 cursor-pointer" onClick={() => toggleCategory(category.key)}>
                                    <td colSpan={comparisonData.length + 1} className="p-2 pl-3 font-semibold text-gray-800 flex items-center gap-2">
                                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${expandedCategories.has(category.key) ? 'rotate-0' : '-rotate-90'}`} />
                                        {category.label}
                                    </td>
                                </tr>
                                {expandedCategories.has(category.key) && category.subDimensions.map(subDim => {
                                    const isDifferent = getDifferences(comparisonData, category.key, subDim.key);
                                    return (
                                        <tr key={subDim.key} className="border-b hover:bg-gray-50">
                                            <td className="p-3 pl-8 text-gray-600">{subDim.label}</td>
                                            {comparisonData.map(vehicle => (
                                                <td key={vehicle.id} className={`p-3 font-medium ${isDifferent ? 'bg-yellow-50/70 text-yellow-900' : 'text-gray-900'}`}>
                                                    {getSpec(vehicle, category.key, subDim.key)}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </main>
        </div>
    );
};
