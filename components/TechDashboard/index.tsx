import React, { useState } from 'react';
import { ComparisonMode, VehicleTechSpec, TechDimensionCategory, SpecDetail } from '../../types';
import { techDimensionCategories, vehicleTechSpecs } from './data';
import { ChevronDownIcon, PlusIcon, QuestionMarkCircleIcon } from '../icons';

const modes: { key: ComparisonMode; label: string }[] = [
    { key: 'competitor', label: '竞品对比' },
    { key: 'brand', label: '品牌看板' },
    { key: 'evolution', label: '技术演进' },
    { key: 'supply_chain', label: '供应链' },
    { key: 'forecast', label: '技术预测' },
];

const ModeSelector: React.FC<{
    currentMode: ComparisonMode;
    onSelectMode: (mode: ComparisonMode) => void;
}> = ({ currentMode, onSelectMode }) => (
    <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
        {modes.map(mode => (
            <button
                key={mode.key}
                onClick={() => onSelectMode(mode.key)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    currentMode === mode.key
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                {mode.label}
            </button>
        ))}
    </div>
);

const VehicleSelector: React.FC<{
    vehicles: VehicleTechSpec[];
    selectedVehicles: VehicleTechSpec[];
    onToggleVehicle: (vehicle: VehicleTechSpec) => void;
}> = ({ vehicles, selectedVehicles, onToggleVehicle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedIds = new Set(selectedVehicles.map(v => v.id));

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition"
            >
                <PlusIcon className="w-4 h-4" />
                <span>添加/移除对比车辆</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-2 w-72 bg-white rounded-lg shadow-lg border max-h-80 overflow-y-auto">
                    {vehicles.map(vehicle => (
                        <div key={vehicle.id} className="flex items-center p-2 hover:bg-gray-50">
                            <input
                                type="checkbox"
                                id={`vehicle-${vehicle.id}`}
                                checked={selectedIds.has(vehicle.id)}
                                onChange={() => onToggleVehicle(vehicle)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`vehicle-${vehicle.id}`} className="ml-3 text-sm text-gray-700">{vehicle.name}</label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const CompetitorComparison: React.FC<{
    vehicles: VehicleTechSpec[];
    dimensions: TechDimensionCategory[];
}> = ({ vehicles, dimensions }) => {
    
    const renderSpec = (spec: string | SpecDetail | null | undefined) => {
        if (!spec) return <span className="text-gray-400">-</span>;
        if (typeof spec === 'string') return spec;
        
        const hasDetails = spec.supplier || (spec.details && Object.keys(spec.details).length > 0);

        return (
            <div className="flex items-center gap-1">
                <span>{spec.value}</span>
                {hasDetails && (
                    <div className="relative group">
                        <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400 cursor-pointer" />
                        <div className="absolute z-20 bottom-full mb-2 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {spec.supplier && <p>供应商: {spec.supplier}</p>}
                            {spec.details && Object.entries(spec.details).map(([key, val]) => (
                                <p key={key}>{key}: {val}</p>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/70">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700 w-1/4">技术维度</th>
                            {vehicles.map(vehicle => (
                                <th key={vehicle.id} className="px-6 py-4 font-semibold text-gray-700">
                                    {vehicle.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {dimensions.map(category => (
                            <React.Fragment key={category.key}>
                                <tr>
                                    <td colSpan={vehicles.length + 1} className="px-4 py-3 bg-gray-100 font-bold text-gray-800">
                                        {category.label}
                                    </td>
                                </tr>
                                {category.subDimensions.map(subDim => (
                                    <tr key={subDim.key} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-600">{subDim.label}</td>
                                        {vehicles.map(vehicle => (
                                            <td key={vehicle.id} className="px-6 py-4 text-gray-800">
                                                {renderSpec(vehicle.specs[category.key]?.[subDim.key])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const PlaceholderView: React.FC<{ mode: string }> = ({ mode }) => (
    <div className="mt-8 flex items-center justify-center h-96 bg-gray-100 rounded-lg border-2 border-dashed">
        <p className="text-gray-500 font-medium">"{mode}" 视图正在开发中...</p>
    </div>
);


export const TechDashboard: React.FC = () => {
    const [mode, setMode] = useState<ComparisonMode>('competitor');
    const [selectedVehicles, setSelectedVehicles] = useState<VehicleTechSpec[]>(vehicleTechSpecs.slice(0, 3));

    const handleToggleVehicle = (vehicle: VehicleTechSpec) => {
        setSelectedVehicles(prev => {
            if (prev.find(v => v.id === vehicle.id)) {
                return prev.filter(v => v.id !== vehicle.id);
            } else {
                return [...prev, vehicle];
            }
        });
    };
    
    const renderContent = () => {
        switch (mode) {
            case 'competitor':
                return <CompetitorComparison vehicles={selectedVehicles} dimensions={techDimensionCategories} />;
            case 'brand':
            case 'evolution':
            case 'supply_chain':
            case 'forecast':
                return <PlaceholderView mode={modes.find(m => m.key === mode)?.label || ''} />;
            default:
                return null;
        }
    }

    return (
        <div className="p-6 h-full overflow-y-auto bg-gray-50/50">
            <div className="flex justify-between items-center">
                <ModeSelector currentMode={mode} onSelectMode={setMode} />
                {mode === 'competitor' && (
                    <VehicleSelector 
                        vehicles={vehicleTechSpecs} 
                        selectedVehicles={selectedVehicles} 
                        onToggleVehicle={handleToggleVehicle} 
                    />
                )}
            </div>
            
            {renderContent()}
        </div>
    );
};
