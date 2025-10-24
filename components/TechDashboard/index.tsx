import React, { useState, useMemo } from 'react';
import { ComparisonMode, VehicleTechSpec } from '../../types';
import { techDimensions, vehicleSpecs } from './data';
import { ChartIcon, CloseIcon, PlusIcon } from '../icons';

const ComparisonModeSelector: React.FC<{
    selectedMode: ComparisonMode;
    onSelectMode: (mode: ComparisonMode) => void;
}> = ({ selectedMode, onSelectMode }) => {
    const modes: { key: ComparisonMode; label: string }[] = [
        { key: 'competitor', label: '竞品对比' },
        { key: 'brand', label: '品牌纵览' },
        { key: 'evolution', label: '代际演进' },
        { key: 'tech', label: '技术方案' },
    ];
    return (
        <div className="flex items-center space-x-2 bg-gray-100 p-1.5 rounded-xl">
            {modes.map(mode => (
                <button
                    key={mode.key}
                    onClick={() => onSelectMode(mode.key)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 w-full ${
                        selectedMode === mode.key
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:bg-white/60'
                    }`}
                >
                    {mode.label}
                </button>
            ))}
        </div>
    );
};

const VehicleSelector: React.FC<{
    availableVehicles: VehicleTechSpec[];
    selectedVehicles: VehicleTechSpec[];
    onSelectVehicle: (vehicle: VehicleTechSpec) => void;
    onRemoveVehicle: (vehicleId: string) => void;
}> = ({ availableVehicles, selectedVehicles, onSelectVehicle, onRemoveVehicle }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const selectedIds = new Set(selectedVehicles.map(v => v.id));
    const unselectedVehicles = availableVehicles.filter(v => !selectedIds.has(v.id));

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-gray-300 text-gray-600 font-semibold rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
                <PlusIcon className="w-5 h-5" />
                <span>添加对比车辆</span>
            </button>
            {isOpen && (
                <div
                    className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto bg-white rounded-lg shadow-lg border"
                    onMouseLeave={() => setIsOpen(false)}
                >
                    {unselectedVehicles.map(vehicle => (
                        <div
                            key={vehicle.id}
                            onClick={() => {
                                onSelectVehicle(vehicle);
                                setIsOpen(false);
                            }}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                        >
                            {vehicle.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const TechDashboard: React.FC = () => {
    const [mode, setMode] = useState<ComparisonMode>('competitor');
    const [selectedVehicles, setSelectedVehicles] = useState<VehicleTechSpec[]>(() => [
        vehicleSpecs[0],
        vehicleSpecs[2],
    ]);

    const addVehicle = (vehicle: VehicleTechSpec) => {
        if (selectedVehicles.length < 4) { // Limit to 4 for better display
            setSelectedVehicles(prev => [...prev, vehicle]);
        }
    };

    const removeVehicle = (vehicleId: string) => {
        setSelectedVehicles(prev => prev.filter(v => v.id !== vehicleId));
    };

    const tableHeaders = useMemo(() => [
        { key: 'parameter', label: '参数' },
        ...selectedVehicles.map(v => ({ key: v.id, label: v.name }))
    ], [selectedVehicles]);

    return (
        <div className="h-full bg-gray-50 p-6 overflow-y-auto">
            <div className="max-w-screen-xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ChartIcon className="w-8 h-8 text-blue-600" />
                        技术看板
                    </h1>
                    <p className="text-gray-500 mt-1">从多个维度对比分析车辆关键技术参数。</p>
                </header>
                
                <div className="sticky top-0 bg-gray-50/80 backdrop-blur-sm py-4 z-10">
                    <div className="max-w-lg mx-auto mb-6">
                        <ComparisonModeSelector selectedMode={mode} onSelectMode={setMode} />
                    </div>
                </div>

                <div className="overflow-x-auto bg-white rounded-2xl border shadow-sm">
                    <table className="w-full min-w-[800px] text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-6 py-4 font-semibold w-1/5">技术维度</th>
                                {selectedVehicles.map(vehicle => (
                                    <th key={vehicle.id} className="px-6 py-4 font-semibold">
                                        <div className="flex items-center justify-between">
                                            <span>{vehicle.name}</span>
                                            <button onClick={() => removeVehicle(vehicle.id)} className="p-1 rounded-full hover:bg-gray-200">
                                                <CloseIcon className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </div>
                                    </th>
                                ))}
                                {selectedVehicles.length < 4 && (
                                     <th className="px-6 py-4 w-1/5">
                                        <VehicleSelector 
                                            availableVehicles={vehicleSpecs}
                                            selectedVehicles={selectedVehicles}
                                            onSelectVehicle={addVehicle}
                                            onRemoveVehicle={removeVehicle}
                                        />
                                     </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {techDimensions.map((category, catIndex) => (
                                <React.Fragment key={category.key}>
                                    <tr>
                                        <td colSpan={tableHeaders.length + 1} className="px-6 py-3 bg-gray-50/50 font-bold text-gray-800">
                                            {category.label}
                                        </td>
                                    </tr>
                                    {category.subDimensions.map(subDim => (
                                        <tr key={subDim.key} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-500">{subDim.label}</td>
                                            {selectedVehicles.map(vehicle => {
                                                const spec = vehicle.specs[category.key]?.[subDim.key];
                                                const specValue = typeof spec === 'object' && spec !== null ? spec.value : spec;
                                                const specSupplier = typeof spec === 'object' && spec !== null ? spec.supplier : undefined;

                                                return (
                                                    <td key={`${vehicle.id}-${subDim.key}`} className="px-6 py-4 text-gray-800">
                                                        {specValue || '-'}
                                                        {specSupplier && <span className="text-xs text-gray-400 ml-1">({specSupplier})</span>}
                                                    </td>
                                                );
                                            })}
                                            {selectedVehicles.length < 4 && <td></td>}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
